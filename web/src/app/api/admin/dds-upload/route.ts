import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, rename, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const INPUT_DIR = process.env.DDS_INPUT_DIR || path.join(process.cwd(), 'uploads', 'dds');
const TARGET_FILE = path.join(INPUT_DIR, 'original_dds.xlsx');
const DATA_DIR = process.env.DUCKDB_DATA_DIR || path.join(process.cwd(), 'public', 'duckdb');
const ETL_FILENAME = process.env.DDS_DOWNLOAD_FILE || 'dashboard_dds.csv';
const ETL_FILE = path.join(DATA_DIR, ETL_FILENAME);
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
const AIRFLOW_AUTH_PATHS = ['/auth/token', '/api/v2/auth/token'];


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


function getAirflowCredentials() {
    const username = process.env.AIRFLOW_API_USERNAME || process.env._AIRFLOW_WWW_USER_USERNAME;
    const password = process.env.AIRFLOW_API_PASSWORD || process.env._AIRFLOW_WWW_USER_PASSWORD;
    if (!username || !password) {
        throw new Error('Airflow API credentials are not configured');
    }

    return { username, password };
}


function getAirflowBasicAuthHeader(credentials: { username: string; password: string }) {
    return `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;
}


function getAirflowBaseUrls() {
    const baseUrls = process.env.AIRFLOW_API_BASE_URL
        ? process.env.AIRFLOW_API_BASE_URL.split(',')
        : DEFAULT_AIRFLOW_BASE_URLS;

    return Array.from(new Set(baseUrls
        .map((url) => url.trim().replace(/\/$/, ''))
        .filter(Boolean)));
}


async function fetchWithTimeout(url: string, init: RequestInit) {
    return fetch(url, {
        ...init,
        signal: AbortSignal.timeout(AIRFLOW_REQUEST_TIMEOUT_MS),
    });
}


function describeError(error: unknown) {
    if (!(error instanceof Error)) return String(error);

    const cause = (error as Error & {
        cause?: {
            code?: string;
            errno?: string | number;
            syscall?: string;
            hostname?: string;
            address?: string;
            port?: number;
            message?: string;
        };
    }).cause;

    const details = [
        cause?.code,
        cause?.errno,
        cause?.syscall,
        cause?.hostname,
        cause?.address,
        cause?.port,
        cause?.message,
    ].filter((value) => value !== undefined && value !== '');

    return details.length > 0
        ? `${error.message} (${details.join(', ')})`
        : error.message;
}


async function createAirflowToken(
    baseUrl: string,
    credentials: { username: string; password: string },
) {
    const attempts: RequestInit[] = [
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(credentials),
        },
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: new URLSearchParams(credentials),
        },
    ];

    const errors: string[] = [];
    for (const authPath of AIRFLOW_AUTH_PATHS) {
        const tokenEndpoint = `${baseUrl}${authPath}`;
        for (const attempt of attempts) {
            try {
                const response = await fetchWithTimeout(tokenEndpoint, attempt);
                const responseBody = await response.text();
                if (!response.ok) {
                    errors.push(`${tokenEndpoint}: ${response.status} ${responseBody.slice(0, 300)}`);
                    continue;
                }

                const tokenBody = JSON.parse(responseBody) as {
                    access_token?: string;
                    token?: string;
                };
                const token = tokenBody.access_token || tokenBody.token;
                if (!token) {
                    errors.push(`${tokenEndpoint}: 200 missing access_token ${responseBody.slice(0, 300)}`);
                    continue;
                }

                return token;
            } catch (error) {
                errors.push(`${tokenEndpoint}: ${describeError(error)}`);
            }
        }
    }

    throw new Error(errors.join(' | '));
}


async function triggerAirflowPipeline(fileMetadata: { size: number; updatedAt: string }) {
    const logicalDate = new Date().toISOString();
    const dagRunId = `dds_upload__${logicalDate.replace(/[:.]/g, '-')}`;
    const body = {
        dag_run_id: dagRunId,
        logical_date: logicalDate,
        conf: {
            source: 'web_dds_upload',
            filename: 'original_dds.xlsx',
            size: fileMetadata.size,
            updatedAt: fileMetadata.updatedAt,
        },
    };

    const credentials = getAirflowCredentials();
    const errors: string[] = [];
    for (const baseUrl of getAirflowBaseUrls()) {
        const endpoint = `${baseUrl}/api/v2/dags/${encodeURIComponent(AIRFLOW_DDS_DAG_ID)}/dagRuns`;
        try {
            const token = await createAirflowToken(baseUrl, credentials);
            const response = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(body),
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
            errors.push(`${endpoint}: ${describeError(error)}`);
        }

        try {
            const response = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: getAirflowBasicAuthHeader(credentials),
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(body),
            });

            const responseBody = await response.text();
            if (response.ok) {
                return {
                    dagId: AIRFLOW_DDS_DAG_ID,
                    dagRunId,
                };
            }

            errors.push(`${endpoint} basic-auth fallback: ${response.status} ${responseBody.slice(0, 300)}`);
        } catch (error) {
            errors.push(`${endpoint} basic-auth fallback: ${describeError(error)}`);
        }
    }

    throw new Error(`Airflow trigger failed. ${errors.join(' | ')}`);
}


export async function GET(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    const mode = new URL(request.url).searchParams.get('mode');
    if (mode === 'download') {
        try {
            const metadata = await stat(ETL_FILE);
            const stream = Readable.toWeb(createReadStream(ETL_FILE)) as ReadableStream;
            return new NextResponse(stream, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Length': metadata.size.toString(),
                    'Content-Disposition': `attachment; filename="${ETL_FILENAME}"`,
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
                    { error: `ยังไม่มีไฟล์ ${ETL_FILENAME} จาก pipeline` },
                    { status: 404 },
                );
            }
            console.error('DDS ETL download error:', error);
            return NextResponse.json(
                { error: 'ไม่สามารถดาวน์โหลดไฟล์ DDS ที่ผ่าน ETL แล้วได้' },
                { status: 500 },
            );
        }
    }

    try {
        const metadata = await stat(TARGET_FILE);
        const etlMetadata = await stat(ETL_FILE).catch(() => null);
        return NextResponse.json({
            exists: true,
            filename: 'original_dds.xlsx',
            size: metadata.size,
            updatedAt: metadata.mtime.toISOString(),
            etl: etlMetadata ? {
                exists: true,
                filename: ETL_FILENAME,
                size: etlMetadata.size,
                updatedAt: etlMetadata.mtime.toISOString(),
            } : { exists: false },
        });
    } catch (error: unknown) {
        if (
            typeof error === 'object'
            && error !== null
            && 'code' in error
            && error.code === 'ENOENT'
        ) {
            const etlMetadata = await stat(ETL_FILE).catch(() => null);
            return NextResponse.json({
                exists: false,
                etl: etlMetadata ? {
                    exists: true,
                    filename: ETL_FILENAME,
                    size: etlMetadata.size,
                    updatedAt: etlMetadata.mtime.toISOString(),
                } : { exists: false },
            });
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
