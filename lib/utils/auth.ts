// lib/utils/auth.ts

import * as argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

// ============================================
// Configuration Constants
// ============================================
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

// ============================================
// Password Handling
// ============================================
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

// ============================================
// JWT Token Generation
// ============================================
export interface TokenPayload {
  userId: string;
  email: string;
  tenantId?: string;
  role?: string;
}

export async function generateAccessToken(
  payload: TokenPayload
): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .setJti(nanoid())
    .sign(JWT_SECRET);

  return token;
}

export async function generateRefreshToken(): Promise<string> {
  return nanoid(64);
}

export async function verifyAccessToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

// ============================================
// Token Expiration Calculation
// ============================================
export function getRefreshTokenExpiry(): Date {
  const now = new Date();
  now.setDate(now.getDate() + 7); // 7 days later
  return now;
}

export function getAccessTokenExpiry(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15); // 15 minutes later
  return now;
}
