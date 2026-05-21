import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { dataRequests } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import path from 'path';

// Load duckdb using eval to avoid bundling issues
const duckdb = typeof window === 'undefined' ? eval('require("duckdb")') : null;

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

export async function GET(request: Request) {
    try {
        const userId = await getUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const year = searchParams.get('year');

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing filters' }, { status: 400 });
        }

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

        const ddb = new duckdb.Database(':memory:');
        const parquetPath = path.join(process.cwd(), 'public', 'duckdb', 'hdc.parquet');
        
        // Construct query - Using make_date for precise filtering
        const query = `
            SELECT *
            FROM '${parquetPath}'
            WHERE make_date(CAST(year AS INT), CAST(month AS INT), 1) BETWEEN CAST('${startDate}' AS DATE) AND CAST('${endDate}' AS DATE)
            ORDER BY year, month, province_name
        `;

        const data: any[] = await new Promise((resolve, reject) => {
            ddb.all(query, (err: any, res: any[]) => {
                if (err) reject(err);
                else resolve(res);
            });
        });

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลในช่วงเวลาที่เลือก' }, { status: 404 });
        }

        // Convert to CSV
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                if (val === null || val === undefined) return '""';
                const escaped = ('' + val).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        
        const csvString = csvRows.join('\n');
        
        return new NextResponse(csvString, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="hdc_export_${startDate}_to_${endDate}.csv"`,
            },
        });
    } catch (error: any) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ' + error.message }, { status: 500 });
    }
}
