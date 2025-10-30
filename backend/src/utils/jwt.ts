import jwt from 'jsonwebtoken';

export interface JwtClaims {
  sub: string;
  deviceId?: string;
  role?: 'user' | 'admin';
}

export function signJwt(claims: JwtClaims, expiresIn: string = '15m'): string {
  return jwt.sign(claims, process.env.JWT_SECRET as string, { expiresIn });
}


