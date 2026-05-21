import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { dataRequests } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

async function getUserId() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    try {
        const secretKey = process.env.JWT_SECRET || 'my-super-secret';
        const SECRET = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(token, SECRET);
        return payload.id as number;
    } catch {
        return null;
    }
}

export async function GET() {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requests = await db.select()
        .from(dataRequests)
        .where(eq(dataRequests.userId, userId))
        .orderBy(desc(dataRequests.requestDate));

    return NextResponse.json({ requests });
}

export async function POST() {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if there is already a pending request
    const pendingRequest = await db.select()
        .from(dataRequests)
        .where(and(eq(dataRequests.userId, userId), eq(dataRequests.status, 'pending')));

    if (pendingRequest.length > 0) {
        return NextResponse.json({ error: 'คุณมีคำขอที่อยู่ระหว่างการพิจารณาแล้ว' }, { status: 400 });
    }

    await db.insert(dataRequests).values({
        userId,
        dataType: 'bigdata_hdc',
        status: 'pending'
    });

    return NextResponse.json({ message: 'ส่งคำขอเรียบร้อยแล้ว' });
}
