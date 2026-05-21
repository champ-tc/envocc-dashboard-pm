import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * ตรวจสอบสิทธิ์ผู้ใช้งานและคืนค่าข้อมูลผู้ใช้พร้อมขอบเขตการเข้าถึง (Scope)
 */
export async function requireRoles(allowedRoles: string[]) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) redirect('/login');

    try {
        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, SECRET);
        const userRole = payload.role as string;

        if (!allowedRoles.includes(userRole)) redirect('/login');

        // ดึงข้อมูลผู้ใช้ล่าสุดจาก DB
        const latestUser = await db.select().from(users).where(eq(users.id, payload.id as number));
        if (!latestUser.length) redirect('/login');

        const user = latestUser[0];

        // กำหนด Scope การกรองข้อมูล
        const scope = {
            isGlobal: user.role === 'superadmin' || user.role === 'admin',
            isRegion: user.role === 'admin_region',
            isProvince: user.role === 'admin_province',
            region: user.ddcRegion,
            province: user.workplaceProvince
        };

        return { ...user, scope };
    } catch (error) {
        redirect('/login');
    }
}

/**
 * ดึงข้อมูลผู้ใช้งานถ้ามีการล็อกอิน แต่ถ้าไม่มีจะไม่ Redirect (ใช้สำหรับหน้าที่เป็น Public แต่แสดงข้อมูลตามสิทธิ์ถ้าล็อกอิน)
 */
export async function getOptionalUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    try {
        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, SECRET);

        const latestUser = await db.select().from(users).where(eq(users.id, payload.id as number));
        if (!latestUser.length) return null;

        const user = latestUser[0];
        const scope = {
            isGlobal: user.role === 'superadmin' || user.role === 'admin',
            isRegion: user.role === 'admin_region',
            isProvince: user.role === 'admin_province',
            region: user.ddcRegion,
            province: user.workplaceProvince
        };

        return { ...user, scope };
    } catch (error) {
        return null;
    }
}
