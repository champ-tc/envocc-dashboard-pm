import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
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

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Missing filters' }, { status: 400 });
        }

        const ddb = new duckdb.Database(':memory:');
        const csvPath = path.join(process.cwd(), 'public', 'duckdb', 'pm25.csv');
        
        // Construct query
        const query = `
            SELECT *
            FROM read_csv_auto('${csvPath}', ignore_errors=true)
            WHERE date BETWEEN CAST('${startDate}' AS DATE) AND CAST('${endDate}' AS DATE)
            ORDER BY date DESC, "Regional Health", province
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
                'Content-Disposition': `attachment; filename="pm25_export_${startDate}_to_${endDate}.csv"`,
            },
        });
    } catch (error: any) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ' + error.message }, { status: 500 });
    }
}
