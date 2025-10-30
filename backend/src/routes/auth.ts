import { Router } from 'express';
import { registerUser, RegisterSchema, loginUser, LoginSchema } from '../services/authService';
import { signJwt } from '../utils/jwt';
import { requestPasswordReset, resetPassword, ForgotSchema, ResetSchema } from '../services/passwordResetService';
import { createRefreshToken, verifyAndRotateRefreshToken } from '../services/tokenService';
import { firestore, messaging } from '../utils/firebase';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const input = RegisterSchema.parse(req.body);
    const result = await registerUser(input);
    res.status(201).json(result);
  } catch (e: any) {
    const msg = e?.message || 'Invalid input';
    const status = typeof msg === 'string' && msg.toLowerCase().includes('email already registered')
      ? 409
      : 400;
    res.status(status).json({ message: msg });
  }
});

authRouter.post('/forgot-password', async (req, res) => {
  try {
    const input = ForgotSchema.parse(req.body);
    const result = await requestPasswordReset(input);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid input' });
  }
});

authRouter.post('/reset-password', async (req, res) => {
  try {
    const input = ResetSchema.parse(req.body);
    const result = await resetPassword(input);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid input' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const input = LoginSchema.parse(req.body);
    const { userId } = await loginUser(input);
    const token = signJwt({ sub: userId, deviceId: input.deviceId }, '15m');
    const refresh = await createRefreshToken(userId, input.deviceId, 7);
    // Fire-and-forget: notify user's verified devices of successful login
    (async () => {
      try {
        const devSnap = await firestore.collection('devices').where('userId', '==', userId).get();
        const tokens: string[] = [];
        devSnap.forEach(d => {
          const data = d.data() as any;
          if (data?.verifiedAt && data?.fcmToken) tokens.push(String(data.fcmToken));
        });
        if (tokens.length) {
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title: 'Login successful', body: 'You signed in successfully.' },
            data: { type: 'login', deviceId: String(input.deviceId || '') }
          });
        } else {
          console.warn('[auth] login: no tokens for user', userId);
        }
      } catch (e) {
        console.error('[auth] login notify error:', e);
      }
    })();
    res.json({ token, refreshToken: refresh.refreshToken });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid credentials' });
  }
});

authRouter.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, deviceId } = req.body as { refreshToken?: string; deviceId?: string };
    if (!refreshToken || !deviceId) return res.status(400).json({ message: 'Missing token/device' });
    const out = await verifyAndRotateRefreshToken(refreshToken, deviceId);
    const token = signJwt({ sub: out.userId, deviceId }, '15m');
    res.json({ token, refreshToken: out.refreshToken });
  } catch (e: any) {
    res.status(401).json({ message: e.message || 'Unauthorized' });
  }
});
