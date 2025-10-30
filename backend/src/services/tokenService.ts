import { firestore } from '../utils/firebase';
import crypto from 'crypto';
import { sha512WithPepper } from '../utils/crypto';

const tokensCol = () => firestore.collection('refresh_tokens');

export interface RefreshRecord {
  id: string;
  userId: string;
  deviceId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
}

function generateTokenString(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function createRefreshToken(userId: string, deviceId: string, days: number = 7) {
  const raw = generateTokenString(48);
  const pepper = process.env.PASSWORD_PEPPER || '';
  const tokenHash = sha512WithPepper(raw, pepper);
  const id = tokensCol().doc().id;
  const rec: RefreshRecord = {
    id,
    userId,
    deviceId,
    tokenHash,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    revokedAt: null,
  };
  await tokensCol().doc(id).set(rec);
  return { refreshToken: raw, recordId: id };
}

export async function verifyAndRotateRefreshToken(rawToken: string, deviceId: string, days: number = 7) {
  const pepper = process.env.PASSWORD_PEPPER || '';
  const tokenHash = sha512WithPepper(rawToken, pepper);
  const snap = await tokensCol()
    .where('tokenHash', '==', tokenHash)
    .where('deviceId', '==', deviceId)
    .where('revokedAt', '==', null)
    .limit(1)
    .get();
  if (snap.empty) throw new Error('Invalid refresh');
  const doc = snap.docs[0];
  const rec = doc.data() as RefreshRecord;
  if (rec.expiresAt && (rec.expiresAt as any).toDate && (rec.expiresAt as any).toDate() < new Date()) {
    throw new Error('Refresh expired');
  }
  if (rec.expiresAt && rec.expiresAt instanceof Date && rec.expiresAt < new Date()) {
    throw new Error('Refresh expired');
  }

  // rotate: revoke old and issue new
  await doc.ref.update({ revokedAt: new Date() });
  const next = await createRefreshToken(rec.userId, rec.deviceId, days);
  return { userId: rec.userId, refreshToken: next.refreshToken };
}







