import { Router } from 'express';
import { registerDevice, DeviceRegisterSchema, registerDeviceByEmail, DeviceRegisterByEmailSchema } from '../services/deviceService';
import { requireAuth, AuthedRequest } from '../middlewares/auth';
import { firestore } from '../utils/firebase';

export const deviceRouter = Router();

deviceRouter.post('/register', async (req, res) => {
  try {
    const input = DeviceRegisterSchema.parse(req.body);
    const result = await registerDevice(input);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid input' });
  }
});

deviceRouter.post('/register-by-email', async (req, res) => {
  try {
    const input = DeviceRegisterByEmailSchema.parse(req.body);
    const result = await registerDeviceByEmail(input);
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Invalid input' });
  }
});

// Save FCM/Web push token for this device (authorized user)
deviceRouter.post('/push-token', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { fcmToken } = req.body as { fcmToken?: string };
    if (!fcmToken) return res.status(400).json({ message: 'Missing token' });
    const userId = req.userId!;
    const deviceId = req.deviceId!;
    const snap = await firestore.collection('devices')
      .where('userId', '==', userId)
      .where('deviceId', '==', deviceId)
      .limit(1)
      .get();
    if (snap.empty) return res.status(404).json({ message: 'Device not found' });
    await snap.docs[0].ref.update({ fcmToken, updatedAt: new Date() });
    res.json({ message: 'Push token saved' });
  } catch (e: any) {
    res.status(400).json({ message: e.message || 'Error' });
  }
});
