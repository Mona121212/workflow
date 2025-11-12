
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearAuthCookies, verifyRefreshToken, revokeRefreshToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = cookies();
    const refreshJwt = cookieStore.get('refresh_token')?.value;

    if (refreshJwt) {
      const payload = await verifyRefreshToken(refreshJwt);
      if (payload?.tokenId) {
        await revokeRefreshToken(payload.tokenId);
      }
    }

    await clearAuthCookies();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
   
    await clearAuthCookies();
    return NextResponse.json({ ok: true, note: 'Cookies cleared' });
  }
}
