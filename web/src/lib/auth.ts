import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const getVerifiedUser = cache(async () => {
    const token = (await cookies()).get('token')?.value;
    if (!token) return null;

    try {
        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const secret = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, secret);
        const [user] = await db.select().from(users).where(eq(users.id, payload.id as number));

        if (!user) return null;

        return {
            payloadRole: payload.role as string,
            user,
        };
    } catch {
        return null;
    }
});

function withScope<T extends typeof users.$inferSelect>(user: T) {
    return {
        ...user,
        scope: {
            isGlobal: user.role === 'superadmin' || user.role === 'adminenvocc' || user.role === 'admin',
            isRegion: user.role === 'admin_region',
            isProvince: user.role === 'admin_province',
            region: user.ddcRegion,
            province: user.workplaceProvince,
        },
    };
}

/**
 * ตรวจสอบสิทธิ์ผู้ใช้งานและคืนค่าข้อมูลผู้ใช้พร้อมขอบเขตการเข้าถึง (Scope)
 */
export async function requireRoles(allowedRoles: string[]) {
    const verified = await getVerifiedUser();
    if (!verified || !allowedRoles.includes(verified.payloadRole)) redirect('/login');

    return withScope(verified.user);
}

/**
 * ดึงข้อมูลผู้ใช้งานถ้ามีการล็อกอิน แต่ถ้าไม่มีจะไม่ Redirect (ใช้สำหรับหน้าที่เป็น Public แต่แสดงข้อมูลตามสิทธิ์ถ้าล็อกอิน)
 */
export async function getOptionalUser() {
    const verified = await getVerifiedUser();
    return verified ? withScope(verified.user) : null;
}
