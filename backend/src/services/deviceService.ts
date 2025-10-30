import { firestore } from '../utils/firebase';
import { z } from 'zod';

const devicesCol = () => firestore.collection('devices');
const usersCol = () => firestore.collection('users');

export const DeviceRegisterSchema = z.object({
  userId: z.string().min(1),
  deviceId: z.string().min(8),
});

export const DeviceRegisterByEmailSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  deviceId: z.string().min(8),
});

export async function registerDevice(input: z.infer<typeof DeviceRegisterSchema>) {
  const { userId, deviceId } = DeviceRegisterSchema.parse(input);
  const userRef = usersCol().doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) throw new Error('User not found');

  const existing = await devicesCol().where('userId', '==', userId).where('deviceId', '==', deviceId).limit(1).get();
  if (!existing.empty) return { message: 'Device already registered' };

  const deviceRef = devicesCol().doc();
  await deviceRef.set({
    id: deviceRef.id,
    userId,
    deviceId,
    verifiedAt: null,
    createdAt: new Date(),
  });
  return { message: 'Device registered. Await admin verification.' };
}

export async function registerDeviceByEmail(input: z.infer<typeof DeviceRegisterByEmailSchema>) {
  const { email, deviceId } = DeviceRegisterByEmailSchema.parse(input);
  const userSnap = await usersCol().where('email', '==', email).limit(1).get();
  if (userSnap.empty) throw new Error('User not found');
  const user = userSnap.docs[0].data() as any;
  return registerDevice({ userId: user.id, deviceId });
}



