import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { dataRequests } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

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
    try {
        const userId = await getUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check if user has an approved request for BigData (HDC)
        const approvedRequest = await db.select()
            .from(dataRequests)
            .where(and(
                eq(dataRequests.userId, userId),
                eq(dataRequests.status, 'approved'),
                eq(dataRequests.dataType, 'bigdata_hdc')
            ))
            .orderBy(desc(dataRequests.approvedDate))
            .limit(1);

        if (approvedRequest.length === 0) {
            return NextResponse.json({ error: 'คุณยังไม่ได้รับอนุมัติให้เข้าถึงข้อมูลนี้' }, { status: 403 });
        }

        const requestData = approvedRequest[0];
        const isExpired = requestData.expiredDate && new Date(requestData.expiredDate) < new Date();
        if (isExpired) {
            return NextResponse.json({ error: 'สิทธิ์การเข้าถึงข้อมูลของคุณหมดอายุแล้ว' }, { status: 403 });
        }

        const dataDir = process.env.DUCKDB_DATA_DIR || path.join(process.cwd(), 'public', 'duckdb');
        const csvPath = path.join(dataDir, 'hdc.csv');
        const metadata = await stat(csvPath);
        const stream = Readable.toWeb(createReadStream(csvPath)) as ReadableStream;

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Length': metadata.size.toString(),
                'Content-Disposition': 'attachment; filename="hdc.csv"',
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error: unknown) {
        console.error('Download error:', error);
        return NextResponse.json(
            { error: 'ไม่สามารถดาวน์โหลดไฟล์ HDC ได้' },
            { status: 500 },
        );
    }
}
