import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        const foundUser = await db.select().from(users).where(eq(users.username, username));

        if (foundUser.length === 0 || !(await bcrypt.compare(password, foundUser[0].password))) {
            return NextResponse.json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
        }

        if (foundUser[0].status === 'pending') {
            return NextResponse.json({ error: 'บัญชีกำลังรออนุมัติ' }, { status: 403 });
        }

        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);

        const token = await new SignJWT({
            id: foundUser[0].id, role: foundUser[0].role, name: foundUser[0].name
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('24h')
            .sign(SECRET);

        return NextResponse.json({ token, role: foundUser[0].role });
    } catch (error: any) {
        console.error('Login backend error:', error);
        return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', stack: error.stack }, { status: 500 });
    }
}