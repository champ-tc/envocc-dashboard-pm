import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        const result = await db.select().from(users).where(eq(users.username, username));
        const user = result[0];
        const isPasswordCorrect = user && await bcrypt.compare(password, user.password);

        if (!user || !isPasswordCorrect) {
            return NextResponse.json(
                { error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            );
        }

        if (user.status === 'pending') {
            return NextResponse.json(
                { error: 'บัญชีของท่านยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ' },
                { status: 403 }
            );
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is not defined in environment');

        const SECRET_KEY = new TextEncoder().encode(secret);

        const token = await new SignJWT({
            id: user.id,
            role: user.role,
            name: user.name
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('1h') // Token มีอายุ 1 ชั่วโมง
            .sign(SECRET_KEY);

        return NextResponse.json({
            token,
            role: user.role,
            name: user.name
        });

    } catch (error: any) {
        console.error('Login Error:', error.message);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' },
            { status: 500 }
        );
    }
}