import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { pm25Daily, stations } from '@/db/schema';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'กรุณาระบุวันที่');
const optionalNumber = z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value, context) => {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            context.addIssue({ code: 'custom', message: 'ค่ามลพิษต้องเป็นตัวเลข' });
            return z.NEVER;
        }
        return Math.round((parsed + Number.EPSILON) * 100) / 100;
    });
const dailySchema = z.object({
    air4Date: dateSchema,
    stationIdNew: z.string().trim().min(1, 'กรุณาระบุสถานี'),
    pm25Max: optionalNumber,
    pm25Min: optionalNumber,
    pm25Avg: optionalNumber,
    pm10Max: optionalNumber,
    pm10Min: optionalNumber,
    pm10Avg: optionalNumber,
    o3Max: optionalNumber,
    o3Min: optionalNumber,
    o3Avg: optionalNumber,
    coMax: optionalNumber,
    coMin: optionalNumber,
    coAvg: optionalNumber,
    no2Max: optionalNumber,
    no2Min: optionalNumber,
    no2Avg: optionalNumber,
    so2Max: optionalNumber,
    so2Min: optionalNumber,
    so2Avg: optionalNumber,
});
const keySchema = z.object({
    originalAir4Date: dateSchema,
    originalStationIdNew: z.string().trim().min(1, 'กรุณาระบุสถานีเดิม'),
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
    console.error('PM2.5 Daily Management Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการจัดการข้อมูลค่าฝุ่นรายวัน' }, { status: 500 });
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
        const rows = await db.select({
            air4Date: pm25Daily.air4Date,
            stationIdNew: pm25Daily.stationIdNew,
            stationName: stations.stationName,
            province: stations.province,
            pm25Max: pm25Daily.pm25Max,
            pm25Min: pm25Daily.pm25Min,
            pm25Avg: pm25Daily.pm25Avg,
            pm10Max: pm25Daily.pm10Max,
            pm10Min: pm25Daily.pm10Min,
            pm10Avg: pm25Daily.pm10Avg,
            o3Max: pm25Daily.o3Max,
            o3Min: pm25Daily.o3Min,
            o3Avg: pm25Daily.o3Avg,
            coMax: pm25Daily.coMax,
            coMin: pm25Daily.coMin,
            coAvg: pm25Daily.coAvg,
            no2Max: pm25Daily.no2Max,
            no2Min: pm25Daily.no2Min,
            no2Avg: pm25Daily.no2Avg,
            so2Max: pm25Daily.so2Max,
            so2Min: pm25Daily.so2Min,
            so2Avg: pm25Daily.so2Avg,
        })
            .from(pm25Daily)
            .leftJoin(stations, eq(pm25Daily.stationIdNew, stations.stationIdNew))
            .where(eq(pm25Daily.air4Date, date))
            .orderBy(asc(pm25Daily.stationIdNew));
        return NextResponse.json({ rows });
    } catch (error) {
        return validationError(error);
    }
}

export async function POST(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const row = dailySchema.parse(await request.json());
        if (!await stationExists(row.stationIdNew)) {
            return NextResponse.json({ error: 'ไม่พบสถานีที่เลือก' }, { status: 400 });
        }
        await db.insert(pm25Daily).values(row);
        return NextResponse.json({ message: 'เพิ่มข้อมูลค่าฝุ่นรายวันสำเร็จ' }, { status: 201 });
    } catch (error: unknown) {
        if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'สถานีและวันที่นี้มีข้อมูลอยู่แล้ว' }, { status: 409 });
        }
        return validationError(error);
    }
}

export async function PATCH(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const body = await request.json();
        const key = keySchema.parse(body);
        const row = dailySchema.parse(body);
        if (!await stationExists(row.stationIdNew)) {
            return NextResponse.json({ error: 'ไม่พบสถานีที่เลือก' }, { status: 400 });
        }
        const updated = await db.update(pm25Daily)
            .set(row)
            .where(and(
                eq(pm25Daily.stationIdNew, key.originalStationIdNew),
                eq(pm25Daily.air4Date, key.originalAir4Date),
            ))
            .returning({ stationIdNew: pm25Daily.stationIdNew });
        if (!updated.length) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลที่ต้องการแก้ไข' }, { status: 404 });
        }
        return NextResponse.json({ message: 'แก้ไขข้อมูลค่าฝุ่นรายวันสำเร็จ' });
    } catch (error: unknown) {
        if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: 'สถานีและวันที่นี้มีข้อมูลอยู่แล้ว' }, { status: 409 });
        }
        return validationError(error);
    }
}

export async function DELETE(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const searchParams = new URL(request.url).searchParams;
        const key = keySchema.parse({
            originalAir4Date: searchParams.get('date'),
            originalStationIdNew: searchParams.get('stationIdNew'),
        });
        const deleted = await db.delete(pm25Daily)
            .where(and(
                eq(pm25Daily.stationIdNew, key.originalStationIdNew),
                eq(pm25Daily.air4Date, key.originalAir4Date),
            ))
            .returning({ stationIdNew: pm25Daily.stationIdNew });
        if (!deleted.length) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลที่ต้องการลบ' }, { status: 404 });
        }
        return NextResponse.json({ message: 'ลบข้อมูลค่าฝุ่นรายวันสำเร็จ' });
    } catch (error) {
        return validationError(error);
    }
}
