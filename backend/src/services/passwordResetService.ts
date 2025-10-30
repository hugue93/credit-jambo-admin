import { firestore } from '../utils/firebase';
import { z } from 'zod';
import { sha512WithPepper } from '../utils/crypto';

const usersCol = () => firestore.collection('users');
const resetsCol = () => firestore.collection('password_resets');

export const ForgotSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export const ResetSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  token: z.string().min(6),
  newPassword: z.string().min(8)
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[0-9]/, 'Must include a digit')
    .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
});

function generateToken(): string {
  // Simple 6-digit code for demo; replace with secure UUID for production
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export async function requestPasswordReset(input: z.infer<typeof ForgotSchema>) {
  const { email } = ForgotSchema.parse(input);
  const userSnap = await usersCol().where('email', '==', email).limit(1).get();
  if (userSnap.empty) return { message: 'If account exists, an email has been sent.' };
  const user = userSnap.docs[0].data() as any;
  const token = generateToken();
  const resetRef = resetsCol().doc();
  await resetRef.set({ id: resetRef.id, userId: user.id, email, token, usedAt: null, createdAt: new Date(), expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
  // In production, send token via email. For dev, return it in response.
  return { message: 'Reset code generated', token };
}

export async function resetPassword(input: z.infer<typeof ResetSchema>) {
  const { email, token, newPassword } = ResetSchema.parse(input);
  const resetSnap = await resetsCol()
    .where('email', '==', email)
    .where('token', '==', token)
    .where('usedAt', '==', null)
    .limit(1)
    .get();
  if (resetSnap.empty) throw new Error('Invalid or expired token');
  const resetDoc = resetSnap.docs[0];
  const reset = resetDoc.data() as any;
  if (reset.expiresAt?.toDate && reset.expiresAt.toDate() < new Date()) throw new Error('Token expired');

  const userSnap = await usersCol().where('email', '==', email).limit(1).get();
  if (userSnap.empty) throw new Error('Account not found');
  const userDoc = userSnap.docs[0];
  const pepper = process.env.PASSWORD_PEPPER || '';
  const passwordSha512 = sha512WithPepper(newPassword, pepper);

  await firestore.runTransaction(async (tx) => {
    tx.update(userDoc.ref, { passwordSha512 });
    tx.update(resetDoc.ref, { usedAt: new Date() });
  });

  return { message: 'Password reset successful' };
}


