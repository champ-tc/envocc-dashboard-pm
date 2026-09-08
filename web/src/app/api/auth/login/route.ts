import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createSessionToken } from '@/lib/session-token';

const loginSchema = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1).max(128),
});

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}

function isRateLimited(key: string) {
    const now = Date.now();
    const entry = loginAttempts.get(key);
    if (!entry || entry.resetAt <= now) {
        loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
        return false;
    }
    return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(key: string) {
    const entry = loginAttempts.get(key);
    if (entry) entry.count += 1;
}

export async function POST(request: Request) {
    try {
        const origin = request.headers.get('origin');
        const requestUrl = new URL(request.url);
        if (origin && new URL(origin).origin !== requestUrl.origin) {
            return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
        }

        const clientKey = getClientKey(request);
        if (isRateLimited(clientKey)) {
            return NextResponse.json(
                { error: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' },
                { status: 429, headers: { 'Retry-After': '900' } },
            );
        }

        const parsed = loginSchema.safeParse(await request.json());

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' },
                { status: 400 },
            );
        }

        const { username, password } = parsed.data;
        const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        const isPasswordCorrect = user ? await bcrypt.compare(password, user.password) : false;

        if (!user || !isPasswordCorrect) {
            recordFailedLogin(clientKey);
            return NextResponse.json(
                { error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            );
        }

        if (user.status !== 'approved') {
            return NextResponse.json(
                { error: 'บัญชีของท่านยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ' },
                { status: 403 }
            );
        }

        const token = await createSessionToken({
            id: user.id,
            role: user.role ?? 'user',
            name: user.name
        });
        loginAttempts.delete(clientKey);

        const response = NextResponse.json({
            role: user.role,
            name: user.name
        });
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60,
            priority: 'high',
        });
        return response;

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' },
            { status: 500 }
        );
    }
}
