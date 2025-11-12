
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rotateRefreshToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const refreshJwt = cookieStore.get('refresh_token')?.value;

    if (!refreshJwt) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const ua = req.headers.get('user-agent') ?? undefined;
    const ip =
      (req.headers.get('x-forwarded-for')?.split(',')[0] ||
        (req as any).ip ||
        undefined) as string | undefined;

    const tokens = await rotateRefreshToken(refreshJwt, ua, ip);

    return NextResponse.json({ ok: true, rotated: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Refresh failed' }, { status: 401 });
  }
}
