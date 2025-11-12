// lib/auth.ts
/**
 * Authentication Library
 *
 * Secure auth with Argon2 + Access/Refresh JWT + rotation + session via cookies.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

// ===== Config =====
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long'
);
const ISSUER = process.env.JWT_ISSUER || 'your-app';
const AUDIENCE = process.env.JWT_AUDIENCE || 'your-app-users';

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

// ===== Types =====
export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  tokenId: string;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: string;
  };
  tenant: {
    id: string;
    slug: string;
  };
}

// ===== Password Hashing =====
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// ===== JWT Sign & Verify =====
export async function generateAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(
  payload: AccessTokenPayload,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const tokenId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  // Persist metadata for revocation & auditing
  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId: payload.userId,
      userAgent: userAgent?.slice(0, 255),
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const refreshPayload: RefreshTokenPayload = { ...payload, tokenId };

  return new SignJWT(refreshPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

// ===== Cookies =====
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = cookies();

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 可按需改 'strict'
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token', { path: '/api/auth' });
}

// ===== Session =====
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  if (!accessToken) return null;

  const payload = await verifyAccessToken(accessToken);
  if (!payload) return null;

  // Pull fresh role/tenant info
  const membership = await prisma.membership.findFirst({
    where: { userId: payload.userId, tenantId: payload.tenantId },
    include: {
      user: { select: { id: true, email: true } },
      tenant: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!membership) return null;

  return {
    user: { id: membership.user.id, email: membership.user.email, role: membership.role },
    tenant: { id: membership.tenant.id, slug: membership.tenant.slug },
  };
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

// ===== Revocation / Cleanup =====
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
    },
  });
  return result.count;
}

// ===== Rotation (used by /api/auth/refresh) =====
export async function rotateRefreshToken(
  refreshJwt: string,
  userAgent?: string,
  ipAddress?: string
) {
  const payload = await verifyRefreshToken(refreshJwt);
  if (!payload) throw new Error('Invalid refresh token');

  const record = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
  if (!record) throw new Error('Refresh token not found');
  if (record.revokedAt) throw new Error('Refresh token revoked');
  if (record.expiresAt < new Date()) throw new Error('Refresh token expired');

  // Revoke old to prevent replay
  await prisma.refreshToken.update({
    where: { id: payload.tokenId },
    data: { revokedAt: new Date() },
  });

  const access = await generateAccessToken({
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
    role: payload.role,
  });

  const refresh = await generateRefreshToken(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    },
    userAgent,
    ipAddress
  );

  await setAuthCookies(access, refresh);

  return { access, refresh };
}
