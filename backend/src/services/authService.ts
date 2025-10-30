import { firestore } from '../utils/firebase';
import { sha512WithPepper } from '../utils/crypto';
import { z } from 'zod';

const usersCol = () => firestore.collection('users');
const accountsCol = () => firestore.collection('accounts');
const devicesCol = () => firestore.collection('devices');

const passwordPolicy = z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[0-9]/, 'Must include a digit')
  .regex(/[^A-Za-z0-9]/, 'Must include a special character');

export const RegisterSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  email: z.string().email().trim().toLowerCase(),
  phone: z.string().min(7).max(20).trim(),
  password: passwordPolicy,
  deviceId: z.string().min(8)
});

export const LoginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8),
  deviceId: z.string().min(8)
});

export async function registerUser(input: z.infer<typeof RegisterSchema>) {
  const parsed = RegisterSchema.parse(input);
  const pepper = process.env.PASSWORD_PEPPER || '';
  const passwordSha512 = sha512WithPepper(parsed.password, pepper);

  const existing = await usersCol().where('email', '==', parsed.email).limit(1).get();
  if (!existing.empty) {
    throw new Error('Email already registered');
  }

  const userRef = usersCol().doc();
  const accountRef = accountsCol().doc();
  const deviceRef = devicesCol().doc();

  await firestore.runTransaction(async (tx) => {
    tx.set(userRef, {
      id: userRef.id,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      passwordSha512,
      isActive: true,
      createdAt: new Date()
    });
    tx.set(accountRef, {
      id: accountRef.id,
      userId: userRef.id,
      balance: 0,
      createdAt: new Date()
    });
    tx.set(deviceRef, {
      id: deviceRef.id,
      userId: userRef.id,
      deviceId: parsed.deviceId,
      verifiedAt: null,
      createdAt: new Date()
    });
  });

  return { message: 'Registration successful. Device pending verification.' };
}

export async function loginUser(input: z.infer<typeof LoginSchema>) {
  const parsed = LoginSchema.parse(input);
  const pepper = process.env.PASSWORD_PEPPER || '';
  const passwordSha512 = sha512WithPepper(parsed.password, pepper);

  const userSnap = await usersCol().where('email', '==', parsed.email).limit(1).get();
  if (userSnap.empty) throw new Error('Invalid credentials');
  const user = userSnap.docs[0].data() as any;
  if (user.passwordSha512 !== passwordSha512) throw new Error('Invalid credentials');

  const deviceSnap = await devicesCol()
    .where('userId', '==', user.id)
    .where('deviceId', '==', parsed.deviceId)
    .limit(1)
    .get();
  if (deviceSnap.empty) throw new Error('Device not registered');
  const device = deviceSnap.docs[0].data() as any;
  if (!device.verifiedAt) throw new Error('Device not verified');

  return { userId: user.id };
}


