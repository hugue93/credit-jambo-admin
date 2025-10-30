import crypto from 'crypto';
export function sha512WithPepper(input: string, pepper: string): string {
  return crypto.createHash('sha512').update(input + pepper, 'utf8').digest('hex');
}
