import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { pm25Hourly, stations } from '@/db/schema';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'กรุณาระบุวันที่');
const dateTimeSchema = z.string().datetime({ offset: true, message: 'กรุณาระบุวันและเวลา' });
const optionalNumber = z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value, context) => {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            context.addIssue({ code: 'custom', message: 'ค่ามลพิษต้องเป็นตัวเลข' });
            return z.NEVER;
        }
        return parsed;
    });
const hourlySchema = z.object({
    stationIdNew: z.string().trim().min(1, 'กรุณาระบุสถานี'),
    air4Time: dateTimeSchema.transform((value) => new Date(value)),
    pm25: optionalNumber,
    pm10: optionalNumber,
    o3: optionalNumber,
    co: optionalNumber,
    no2: optionalNumber,
    so2: optionalNumber,
});
const keySchema = z.object({
    originalStationIdNew: z.string().trim().min(1, 'กรุณาระบุสถานีเดิม'),
    originalAir4Time: dateTimeSchema.transform((value) => new Date(value)),
});

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

function validationError(error: unknown) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }
    console.error('PM2.5 Hourly Management Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการจัดการข้อมูลค่าฝุ่นรายชั่วโมง' }, { status: 500 });
}

function bangkokDayRange(date: string) {
    dateSchema.parse(date);
    const start = new Date(`${date}T00:00:00+07:00`);
    return {
        start,
        end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    };
}

async function stationExists(stationIdNew: string) {
    const rows = await db.select({ stationIdNew: stations.stationIdNew })
        .from(stations)
        .where(eq(stations.stationIdNew, stationIdNew))
        .limit(1);
    return rows.length > 0;
}

export async function GET(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const date = dateSchema.parse(new URL(request.url).searchParams.get('date'));
        const { start, end } = bangkokDayRange(date);
        const rows = await db.select({
            stationIdNew: pm25Hourly.stationIdNew,
            stationName: stations.stationName,
            province: stations.province,
            air4Time: pm25Hourly.air4Time,
            pm25: pm25Hourly.pm25,
            pm10: pm25Hourly.pm10,
            o3: pm25Hourly.o3,
            co: pm25Hourly.co,
            no2: pm25Hourly.no2,
            so2: pm25Hourly.so2,
        })
            .from(pm25Hourly)
            .leftJoin(stations, eq(pm25Hourly.stationIdNew, stations.stationIdNew))
            .where(and(gte(pm25Hourly.air4Time, start), lt(pm25Hourly.air4Time, end)))
            .orderBy(asc(pm25Hourly.air4Time), asc(pm25Hourly.stationIdNew));
        return NextResponse.json({ rows });
    } catch (error) {
        return validationError(error);
    }
}

export async function POST(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const row = hourlySchema.parse(await request.json());
        if (!await stationExists(row.stationIdNew)) {
            return NextResponse.json({ error: 'ไม่พบสถานีที่เลือก' }, { status: 400 });
        }
        await db.insert(pm25Hourly).values(row);
        return NextResponse.json({ message: 'เพิ่มข้อมูลค่าฝุ่นสำเร็จ' }, { status: 201 });
    } catch (error: unknown) {
        if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'สถานีและเวลานี้มีข้อมูลอยู่แล้ว' }, { status: 409 });
        }
        return validationError(error);
    }
}

export async function PATCH(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const body = await request.json();
        const key = keySchema.parse(body);
        const row = hourlySchema.parse(body);
        if (!await stationExists(row.stationIdNew)) {
            return NextResponse.json({ error: 'ไม่พบสถานีที่เลือก' }, { status: 400 });
        }
        const updated = await db.update(pm25Hourly)
            .set(row)
            .where(and(
                eq(pm25Hourly.stationIdNew, key.originalStationIdNew),
                eq(pm25Hourly.air4Time, key.originalAir4Time),
            ))
            .returning({ stationIdNew: pm25Hourly.stationIdNew });
        if (!updated.length) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลที่ต้องการแก้ไข' }, { status: 404 });
        }
        return NextResponse.json({ message: 'แก้ไขข้อมูลค่าฝุ่นสำเร็จ' });
    } catch (error: unknown) {
        if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'สถานีและเวลานี้มีข้อมูลอยู่แล้ว' }, { status: 409 });
        }
        return validationError(error);
    }
}

export async function DELETE(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const searchParams = new URL(request.url).searchParams;
        const key = keySchema.parse({
            originalStationIdNew: searchParams.get('stationIdNew'),
            originalAir4Time: searchParams.get('air4Time'),
        });
        const deleted = await db.delete(pm25Hourly)
            .where(and(
                eq(pm25Hourly.stationIdNew, key.originalStationIdNew),
                eq(pm25Hourly.air4Time, key.originalAir4Time),
            ))
            .returning({ stationIdNew: pm25Hourly.stationIdNew });
        if (!deleted.length) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลที่ต้องการลบ' }, { status: 404 });
        }
        return NextResponse.json({ message: 'ลบข้อมูลค่าฝุ่นสำเร็จ' });
    } catch (error) {
        return validationError(error);
    }
}
