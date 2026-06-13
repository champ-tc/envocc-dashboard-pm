import { randomUUID } from 'crypto';
import { mkdir, rename, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const INPUT_DIR = process.env.DDS_INPUT_DIR || path.join(process.cwd(), 'uploads', 'dds');
const TARGET_FILE = path.join(INPUT_DIR, 'original_dds.xlsx');


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


function isXlsxFile(file: File, bytes: Uint8Array) {
    const extensionValid = path.extname(file.name).toLowerCase() === '.xlsx';
    const mimeValid = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
        '',
    ].includes(file.type);
    const zipSignatureValid = bytes.length >= 4
        && bytes[0] === 0x50
        && bytes[1] === 0x4b
        && bytes[2] === 0x03
        && bytes[3] === 0x04;
    return extensionValid && mimeValid && zipSignatureValid;
}


export async function GET() {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const metadata = await stat(TARGET_FILE);
        return NextResponse.json({
            exists: true,
            filename: 'original_dds.xlsx',
            size: metadata.size,
            updatedAt: metadata.mtime.toISOString(),
        });
    } catch (error: unknown) {
        if (
            typeof error === 'object'
            && error !== null
            && 'code' in error
            && error.code === 'ENOENT'
        ) {
            return NextResponse.json({ exists: false });
        }
        console.error('DDS upload status error:', error);
        return NextResponse.json(
            { error: 'ไม่สามารถตรวจสอบไฟล์ DDS ได้' },
            { status: 500 },
        );
    }
}


export async function POST(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    let temporaryFile = '';
    try {
        const formData = await request.formData();
        const uploaded = formData.get('file');
        if (!(uploaded instanceof File)) {
            return NextResponse.json({ error: 'กรุณาเลือกไฟล์ Excel' }, { status: 400 });
        }
        if (uploaded.size <= 0) {
            return NextResponse.json({ error: 'ไฟล์ที่อัปโหลดไม่มีข้อมูล' }, { status: 400 });
        }
        if (uploaded.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'ไฟล์ต้องมีขนาดไม่เกิน 100 MB' }, { status: 413 });
        }

        const bytes = new Uint8Array(await uploaded.arrayBuffer());
        if (!isXlsxFile(uploaded, bytes)) {
            return NextResponse.json(
                { error: 'รองรับเฉพาะไฟล์ .xlsx ที่ถูกต้องเท่านั้น' },
                { status: 400 },
            );
        }

        await mkdir(INPUT_DIR, { recursive: true });
        temporaryFile = path.join(INPUT_DIR, `.original_dds.${randomUUID()}.tmp`);
        await writeFile(temporaryFile, bytes, { flag: 'wx' });
        await rename(temporaryFile, TARGET_FILE);
        temporaryFile = '';

        const metadata = await stat(TARGET_FILE);
        return NextResponse.json({
            message: 'อัปโหลดสำเร็จ Airflow จะเริ่มประมวลผลไฟล์ใหม่',
            filename: 'original_dds.xlsx',
            size: metadata.size,
            updatedAt: metadata.mtime.toISOString(),
        });
    } catch (error) {
        console.error('DDS upload error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ DDS' },
            { status: 500 },
        );
    } finally {
        if (temporaryFile) {
            await unlink(temporaryFile).catch(() => undefined);
        }
    }
}
