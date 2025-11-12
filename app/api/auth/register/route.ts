
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { 
  hashPassword, 
  generateAccessToken, 
  generateRefreshToken, 
  getRefreshTokenExpiry 
} from '@/lib/utils/auth';
import { registerSchema } from '@/lib/utils/validation';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the request body
    const body = await req.json();

    // 2. Validate the input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Input validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, tenantName } = validationResult.data;

    // 3. Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 }
      );
    }

    // 4. Generate a slug for the tenant
    const slug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // 5. Check if the slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'This team name is already in use, please choose another one' },
        { status: 409 }
      );
    }

    // 6. Hash the password
    const passwordHash = await hashPassword(password);

    // 7. Create tenant, user, and membership relationship in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
        },
      });

      // Create membership (user is OWNER of the tenant)
      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });

      return { user, tenant };
    });

    // 8. Generate tokens
    const accessToken = await generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      role: 'OWNER',
    });

    const refreshToken = await generateRefreshToken();

    // 9. Save the refresh token to the database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: result.user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // 10. Return success response
    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
        accessToken,
        refreshToken,
      },
      { 
        status: 201,
        headers: {
          'Set-Cookie': `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`, // 7 days
        },
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed, please try again later' },
      { status: 500 }
    );
  }
}
