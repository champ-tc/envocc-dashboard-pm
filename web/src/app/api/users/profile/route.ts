import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { getPasswordValidationError } from '@/lib/password';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, SECRET);
        const userId = payload.id as number;

        const formData = await request.formData();
        const name = formData.get('name') as string;
        const password = formData.get('password') as string;

        if (!name) {
            return NextResponse.json({ error: 'กรุณากรอกชื่อ' }, { status: 400 });
        }

        // อัปเดตข้อมูลผู้ใช้ในฐานข้อมูล
        const updateData: any = { name };

        // เช็คว่ามีการขอเปลี่ยนรหัสผ่านหรือไม่
        if (password) {
            const passwordError = getPasswordValidationError(password);
            if (passwordError) {
                return NextResponse.json({ error: passwordError }, { status: 400 });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        await db.update(users)
            .set(updateData)
            .where(eq(users.id, userId));

        return NextResponse.json({ message: 'อัปเดตข้อมูลสำเร็จ' });

    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' }, { status: 500 });
    }
}
