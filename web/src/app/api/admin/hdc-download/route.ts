import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATA_DIR = process.env.DUCKDB_DATA_DIR || path.join(process.cwd(), 'public', 'duckdb');
const HDC_CSV_PATH = path.join(DATA_DIR, 'hdc.csv');


async function isSuperadmin() {
    const token = (await cookies()).get('token')?.value;
    if (!token) return false;

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'my-super-secret');
        const { payload } = await jwtVerify(token, secret);
        return payload.role === 'superadmin';
    } catch {
        return false;
    }
}


function unauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}


export async function GET(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const metadata = await stat(HDC_CSV_PATH);
        const mode = new URL(request.url).searchParams.get('mode');

        if (mode === 'status') {
            return NextResponse.json({
                exists: true,
                filename: 'hdc.csv',
                size: metadata.size,
                updatedAt: metadata.mtime.toISOString(),
            });
        }

        const stream = Readable.toWeb(createReadStream(HDC_CSV_PATH)) as ReadableStream;
        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Length': metadata.size.toString(),
                'Content-Disposition': 'attachment; filename="hdc.csv"',
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error: unknown) {
        if (
            typeof error === 'object'
            && error !== null
            && 'code' in error
            && error.code === 'ENOENT'
        ) {
            return NextResponse.json(
                { exists: false, error: 'ยังไม่มีไฟล์ hdc.csv จาก pipeline' },
                { status: 404 },
            );
        }
        console.error('HDC admin download error:', error);
        return NextResponse.json(
            { error: 'ไม่สามารถอ่านไฟล์ HDC จาก pipeline volume ได้' },
            { status: 500 },
        );
    }
}
