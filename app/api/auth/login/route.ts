
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { 
  verifyPassword, 
  generateAccessToken, 
  generateRefreshToken, 
  getRefreshTokenExpiry 
} from '@/lib/utils/auth';
import { loginSchema } from '@/lib/utils/validation';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the request body
    const body = await req.json();

    // 2. Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Input validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // 3. Find the user (including memberships and tenant info)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    // 4. Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 5. Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'This account has been deactivated' },
        { status: 403 }
      );
    }

    // 6. Verify password
    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 7. Get the user's first tenant (can be modified later to allow tenant selection)
    const membership = user.memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not associated with any team' },
        { status: 400 }
      );
    }

    // 8. Generate tokens
    const accessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: membership.tenantId,
      role: membership.role,
    });

    const refreshToken = await generateRefreshToken();

    // 9. Save refresh token to the database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // 10. Clean up expired refresh tokens (optional)
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // 11. Return success response
    return NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        tenant: {
          id: membership.tenant.id,
          name: membership.tenant.name,
          slug: membership.tenant.slug,
        },
        role: membership.role,
        accessToken,
        refreshToken,
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`, // 7 days
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed, please try again later' },
      { status: 500 }
    );
  }
}
