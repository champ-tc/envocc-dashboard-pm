import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Helper to get session payload from token
async function getSessionPayload() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    try {
        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, SECRET);
        return payload;
    } catch (e) {
        return null;
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getSessionPayload();
    // Only admin or superadmin can modify roles
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const userId = Number(id);
        const body = await request.json();
        const { role } = body;

        if (!role) return NextResponse.json({ error: 'Missing role' }, { status: 400 });

        // Prevent self-modification
        if (userId === payload.id) {
            return NextResponse.json({ error: 'ไม่สามารถแก้ไขข้อมูลตัวเองได้ในหน้านี้' }, { status: 400 });
        }

        await db.update(users).set({ role }).where(eq(users.id, userId));
        return NextResponse.json({ message: 'เปลี่ยนบทบาทสำเร็จ' });
    } catch (error) {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const payload = await getSessionPayload();
    // Only admin or superadmin can delete users
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const userId = Number(id);

        if (!userId) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

        // Prevent self-deletion
        if (userId === payload.id) {
            return NextResponse.json({ error: 'ไม่สามารถลบตัวเองได้' }, { status: 400 });
        }

        await db.delete(users).where(eq(users.id, userId));
        return NextResponse.json({ message: 'ลบผู้ใช้สำเร็จ' });
    } catch (error) {
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' }, { status: 500 });
    }
}
