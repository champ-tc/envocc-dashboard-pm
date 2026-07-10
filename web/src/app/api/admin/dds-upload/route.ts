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
const AIRFLOW_DDS_DAG_ID = process.env.AIRFLOW_DDS_DAG_ID || 'dds_dashboard_pipeline';
const AIRFLOW_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_AIRFLOW_BASE_URLS = [
    'http://airflow-webserver:8080/airflow',
    'http://airflow-webserver:8080',
    'http://localhost:8080/airflow',
    'http://localhost:8080',
    'http://127.0.0.1:8080/airflow',
    'http://127.0.0.1:8080',
];


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


function getAirflowAuthHeader() {
    const username = process.env.AIRFLOW_API_USERNAME || process.env._AIRFLOW_WWW_USER_USERNAME;
    const password = process.env.AIRFLOW_API_PASSWORD || process.env._AIRFLOW_WWW_USER_PASSWORD;
    if (!username || !password) {
        throw new Error('Airflow API credentials are not configured');
    }

    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}


function getAirflowBaseUrls() {
    const configured = process.env.AIRFLOW_API_BASE_URL
        ? [process.env.AIRFLOW_API_BASE_URL]
        : [];

    return Array.from(new Set([...configured, ...DEFAULT_AIRFLOW_BASE_URLS]
        .map((url) => url.trim().replace(/\/$/, ''))
        .filter(Boolean)));
}


async function triggerAirflowPipeline(fileMetadata: { size: number; updatedAt: string }) {
    const dagRunId = `dds_upload__${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const body = {
        dag_run_id: dagRunId,
        conf: {
            source: 'web_dds_upload',
            filename: 'original_dds.xlsx',
            size: fileMetadata.size,
            updatedAt: fileMetadata.updatedAt,
        },
    };

    const authHeader = getAirflowAuthHeader();
    const endpoints = getAirflowBaseUrls().flatMap((baseUrl) => [
        `${baseUrl}/api/v2/dags/${encodeURIComponent(AIRFLOW_DDS_DAG_ID)}/dagRuns`,
        `${baseUrl}/api/v1/dags/${encodeURIComponent(AIRFLOW_DDS_DAG_ID)}/dagRuns`,
    ]);

    const errors: string[] = [];
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(AIRFLOW_REQUEST_TIMEOUT_MS),
            });

            const responseBody = await response.text();
            if (response.ok) {
                return {
                    dagId: AIRFLOW_DDS_DAG_ID,
                    dagRunId,
                };
            }

            errors.push(`${endpoint}: ${response.status} ${responseBody.slice(0, 300)}`);
        } catch (error) {
            errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    throw new Error(`Airflow trigger failed. ${errors.join(' | ')}`);
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
        const updatedAt = metadata.mtime.toISOString();
        const dagRun = await triggerAirflowPipeline({
            size: metadata.size,
            updatedAt,
        });

        return NextResponse.json({
            message: 'อัปโหลดสำเร็จ และเริ่ม DDS pipeline แล้ว',
            filename: 'original_dds.xlsx',
            size: metadata.size,
            updatedAt,
            dagId: dagRun.dagId,
            dagRunId: dagRun.dagRunId,
        });
    } catch (error) {
        console.error('DDS upload error:', error);
        if (
            error instanceof Error
            && error.message.startsWith('Airflow trigger failed.')
        ) {
            return NextResponse.json(
                {
                    error: `อัปโหลดไฟล์แล้ว แต่ไม่สามารถเริ่ม Airflow DDS pipeline ได้: ${error.message}`,
                },
                { status: 502 },
            );
        }

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
