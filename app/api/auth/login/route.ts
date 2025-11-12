import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
    hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, setAuthCookies,
} from "@/lib/auth";
import { error } from "console";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {

    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({
                error: 'Email and password required'
            }, { status: 400 });
        }

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

        if (!user || !user.passwordHash) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const ok = await verifyPassword(user.passwordHash, password);

        if (!ok) {
            return NextResponse.json({
                error: 'Invalid credentials'
            }, { status: 401 });
        }

        const m = user.memberships[0];
        if (!m) {
            return NextResponse.json({error: 'No tenant membership'}, {status: 403})
        }

        const ua = req.headers.get('user-agent') ?? undefined;

        const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || (req as any).ip || undefined) as string | undefined;

        const access = await generateAccessToken({
            userId: user.id,
            tenantId: m.tenantId,
            email: user.email,
            role: m.role,
        });

        const refresh = await generateRefreshToken(
            {
                userId: user.id,
                tenantId: m.tenantId,
                email: user.email,
                role: m.role
            }, ua, ip
        );

        await setAuthCookies(access, refresh);

        return NextResponse.json({
            user: {
                id: user.id, email: user.email, role: m.role
            },
            tenant: {
                id: m.tenant.id, slug: m.tenant.slug, name: m.tenant.name
            },
        });
    } catch (e: any) {
        return NextResponse.json({
            error: e?.message || 'Login failed'
        }, { status: 500 });
    }
    
}