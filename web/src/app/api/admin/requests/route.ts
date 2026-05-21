import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { dataRequests, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

async function checkAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return false;
    try {
        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, SECRET);
        return payload.role === 'admin' || payload.role === 'superadmin';
    } catch {
        return false;
    }
}

export async function GET() {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requests = await db.select({
        id: dataRequests.id,
        status: dataRequests.status,
        requestDate: dataRequests.requestDate,
        approvedDate: dataRequests.approvedDate,
        expiredDate: dataRequests.expiredDate,
        dataType: dataRequests.dataType,
        userId: dataRequests.userId,
        userName: users.name,
        userEmail: users.email
    })
    .from(dataRequests)
    .leftJoin(users, eq(dataRequests.userId, users.id))
    .orderBy(desc(dataRequests.requestDate));

    return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
    if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, notes } = await request.json();

    if (!id || !status) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const updateData: any = { status, adminNotes: notes };

    if (status === 'approved') {
        const now = new Date();
        const expired = new Date();
        expired.setMonth(expired.getMonth() + 1); // 1 month validity

        updateData.approvedDate = now;
        updateData.expiredDate = expired;
    }

    await db.update(dataRequests)
        .set(updateData)
        .where(eq(dataRequests.id, id));

    return NextResponse.json({ message: 'อัปเดตสถานะเรียบร้อยแล้ว' });
}
