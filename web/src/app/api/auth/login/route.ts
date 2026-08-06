import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createSessionToken } from '@/lib/session-token';

const loginSchema = z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

export async function POST(request: Request) {
    try {
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
