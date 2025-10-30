import { Router } from 'express';
import { z } from 'zod';
import { firestore, messaging } from '../utils/firebase';
import jwt from 'jsonwebtoken';
import { sha512WithPepper } from '../utils/crypto';
import { signJwt } from '../utils/jwt';

export const adminRouter = Router();

const AdminLoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8),
});

const adminsCol = () => firestore.collection('admins');
const devicesCol = () => firestore.collection('devices');
const usersCol = () => firestore.collection('users');
const accountsCol = () => firestore.collection('accounts');
const transactionsCol = () => firestore.collection('transactions');

adminRouter.post('/login', async (req, res) => {
  try {
    const input = AdminLoginSchema.parse(req.body);
    const snap = await adminsCol().where('email', '==', input.email).limit(1).get();
    if (snap.empty) return res.status(400).json({ message: 'Invalid credentials' });
    const admin = snap.docs[0].data() as any;
    const pepper = process.env.PASSWORD_PEPPER || '';
    const hash = sha512WithPepper(input.password, pepper);
    if (hash !== admin.passwordSha512) return res.status(400).json({ message: 'Invalid credentials' });
    const token = signJwt({ sub: admin.id, role: 'admin' }, '30m');
    res.json({ token });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid input' });
  }
});

adminRouter.get('/devices/pending', async (_req, res) => {
  const snap = await devicesCol().where('verifiedAt', '==', null).limit(100).get();
  res.json(snap.docs.map(d => d.data()));
});

adminRouter.post('/devices/:id/verify', async (req, res) => {
  const id = req.params.id;
  const ref = devicesCol().doc(id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ message: 'Device not found' });
  await ref.update({ verifiedAt: new Date() });
  // Attempt to notify the device
  try {
    const device = doc.data() as any;
    const token = device?.fcmToken as string | undefined;
    if (token) {
      await messaging.send({
        token,
        notification: {
          title: 'Device verified',
          body: 'Your device has been approved. You can now log in.',
        },
        data: { type: 'device_verified', deviceId: String(device?.deviceId || '') },
      });
    }
    // Notify admins that verification occurred
    const admins = await adminsCol().get();
    const adminTokens: string[] = [];
    admins.forEach(a => {
      const t = (a.data() as any).fcmToken as string | undefined;
      if (t) adminTokens.push(t);
    });
    if (adminTokens.length) {
      await messaging.sendEachForMulticast({
        tokens: adminTokens,
        notification: { title: 'Device verified', body: `Device ${String(device?.deviceId || id)} verified.` },
        data: { type: 'admin_device_verified', deviceId: String(device?.deviceId || '') }
      })
    }
  } catch {}
  res.json({ message: 'Device verified' });
});

// Save admin web push token (requires admin JWT)
adminRouter.post('/push-token', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!bearer) return res.status(401).json({ message: 'Unauthorized' });
    const payload = jwt.verify(bearer, process.env.JWT_SECRET as string) as any;
    const adminId = payload?.sub as string | undefined;
    if (!adminId) return res.status(401).json({ message: 'Unauthorized' });
    const { fcmToken } = req.body as { fcmToken?: string };
    if (!fcmToken) return res.status(400).json({ message: 'Missing token' });
    await adminsCol().doc(adminId).update({ fcmToken, updatedAt: new Date() });
    res.json({ message: 'Admin push token saved' });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Error' });
  }
});

adminRouter.get('/customers', async (_req, res) => {
  const accSnap = await accountsCol().limit(100).get();
  const results: any[] = [];
  for (const d of accSnap.docs) {
    const acc = d.data() as any;
    const u = await usersCol().doc(acc.userId).get();
    const user = u.exists ? u.data() : null;
    results.push({
      accountId: acc.id,
      userId: acc.userId,
      balance: acc.balance,
      userEmail: user?.email,
      userName: user?.name,
      createdAt: acc.createdAt,
    });
  }
  res.json(results);
});

adminRouter.get('/transactions', async (req, res) => {
  const { userId, type, limit, start, end } = req.query as any;
  let q: FirebaseFirestore.Query = transactionsCol();
  if (userId) q = q.where('userId', '==', userId);
  if (type) q = q.where('type', '==', type);
  if (start) q = q.where('createdAt', '>=', new Date(start));
  if (end) q = q.where('createdAt', '<=', new Date(end));
  const lim = Math.min(Number(limit || 50), 500);
  // Avoid orderBy to skip composite index in dev
  const snap = await q.limit(lim).get();
  res.json(snap.docs.map(d => d.data()));
});

adminRouter.get('/stats', async (req, res) => {
  const { start, end } = req.query as any;
  const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = end ? new Date(end) : new Date();
  const accSnap = await accountsCol().get();
  let totalBalance = 0;
  accSnap.forEach(d => { const a = d.data() as any; totalBalance += Number(a.balance || 0); });
  let deposits = 0, withdrawals = 0, txCount = 0;
  const txSnap = await transactionsCol()
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .limit(1000)
    .get();
  txSnap.forEach(d => {
    const t = d.data() as any;
    txCount++;
    if (t.type === 'deposit') deposits += Number(t.amount || 0);
    if (t.type === 'withdraw') withdrawals += Number(t.amount || 0);
  });
  res.json({
    range: { start: startDate, end: endDate },
    customers: accSnap.size,
    totalBalance,
    deposits,
    withdrawals,
    transactions: txCount,
  });
});






