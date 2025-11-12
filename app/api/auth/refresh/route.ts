// app/api/auth/refresh/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  getRefreshTokenExpiry 
} from '@/lib/utils/auth';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Get refresh token from cookies or request body
    const cookieStore = await cookies();
    let refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      const body = await req.json();
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // 2. Look up the refresh token in the database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            memberships: {
              include: {
                tenant: true,
              },
            },
          },
        },
      },
    });

    // 3. Validate the token (check if it exists and has not expired)
    if (!storedToken) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return NextResponse.json(
        { error: 'Refresh token has expired' },
        { status: 401 }
      );
    }

    // 4. Check if the user is active
    if (!storedToken.user.isActive) {
      return NextResponse.json(
        { error: 'This account has been deactivated' },
        { status: 403 }
      );
    }

    // 5. Get the user’s tenant information
    const membership = storedToken.user.memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not associated with any team' },
        { status: 400 }
      );
    }

    // 6. Generate a new access token
    const newAccessToken = await generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      tenantId: membership.tenantId,
      role: membership.role,
    });

    // 7. Generate a new refresh token (optional: token rotation)
    const newRefreshToken = await generateRefreshToken();

    // 8. Delete the old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // 9. Save the new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // 10. Return the new tokens
    return NextResponse.json(
      {
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': `refreshToken=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`, // 7 days
        },
      }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
