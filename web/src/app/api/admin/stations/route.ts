import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { stations } from '@/db/schema';

const optionalText = z.string().trim().max(255).optional().nullable()
    .transform((value) => value || null);
const optionalCoordinate = z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value, context) => {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            context.addIssue({ code: 'custom', message: 'พิกัดต้องเป็นตัวเลข' });
            return z.NEVER;
        }
        return parsed;
    });
const stationSchema = z.object({
    stationId: z.string().trim().min(1, 'กรุณาระบุ Station ID').max(100),
    stationIdNew: optionalText,
    stationName: optionalText,
    stationType: optionalText,
    latitude: optionalCoordinate,
    longitude: optionalCoordinate,
    province: optionalText,
    district: optionalText,
    subdistrict: optionalText,
    healthRegion: optionalText,
});
const rowIdSchema = z.string().regex(/^\(\d+,\d+\)$/, 'Invalid station row ID');

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
    console.error('Station Management Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการจัดการข้อมูลสถานี' }, { status: 500 });
}

const stationSelection = {
    rowId: sql<string>`ctid::text`.as('rowId'),
    stationId: stations.stationId,
    stationIdNew: stations.stationIdNew,
    stationName: stations.stationName,
    stationType: stations.stationType,
    latitude: stations.latitude,
    longitude: stations.longitude,
    province: stations.province,
    district: stations.district,
    subdistrict: stations.subdistrict,
    healthRegion: stations.healthRegion,
    createdAt: stations.createdAt,
};

export async function GET() {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const latestStationRow = sql`ctid = (
            SELECT station_latest.ctid
            FROM stations AS station_latest
            WHERE (
                station_latest.station_id_new IS NOT DISTINCT FROM ${stations.stationIdNew}
                AND ${stations.stationIdNew} IS NOT NULL
            ) OR (
                ${stations.stationIdNew} IS NULL
                AND station_latest.station_id = ${stations.stationId}
            )
            ORDER BY
                (NULLIF(BTRIM(station_latest.district), '') IS NOT NULL) DESC,
                station_latest.created_at DESC NULLS LAST,
                station_latest.ctid DESC
            LIMIT 1
        )`;
        const allStations = await db.select(stationSelection)
            .from(stations)
            .where(latestStationRow)
            .orderBy(asc(stations.province), asc(stations.stationName), asc(stations.stationId));
        return NextResponse.json({ stations: allStations });
    } catch (error) {
        return validationError(error);
    }
}

export async function POST(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const station = stationSchema.parse(await request.json());
        const existing = await db.select({ stationId: stations.stationId })
            .from(stations)
            .where(eq(stations.stationId, station.stationId))
            .limit(1);
        if (existing.length) {
            return NextResponse.json({ error: 'Station ID นี้มีอยู่แล้ว' }, { status: 409 });
        }

        await db.insert(stations).values(station);
        return NextResponse.json({ message: 'เพิ่มสถานีสำเร็จ' }, { status: 201 });
    } catch (error) {
        return validationError(error);
    }
}

export async function PATCH(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const body = await request.json();
        const rowId = rowIdSchema.parse(body.rowId);
        const station = stationSchema.parse(body);
        const duplicate = await db.select({ stationId: stations.stationId })
            .from(stations)
            .where(and(eq(stations.stationId, station.stationId), ne(sql`ctid::text`, rowId)))
            .limit(1);
        if (duplicate.length) {
            return NextResponse.json({ error: 'Station ID นี้มีอยู่แล้ว' }, { status: 409 });
        }

        const updated = await db.update(stations)
            .set(station)
            .where(eq(sql`ctid::text`, rowId))
            .returning({
                rowId: sql<string>`ctid::text`,
                stationId: stations.stationId,
            });
        if (!updated.length) {
            return NextResponse.json({ error: 'ไม่พบสถานีที่ต้องการแก้ไข' }, { status: 404 });
        }
        return NextResponse.json({ message: 'แก้ไขสถานีสำเร็จ', station: updated[0] });
    } catch (error) {
        return validationError(error);
    }
}

export async function DELETE(request: Request) {
    if (!await isSuperadmin()) return unauthorized();

    try {
        const rowId = rowIdSchema.parse(new URL(request.url).searchParams.get('rowId'));
        const deleted = await db.delete(stations)
            .where(eq(sql`ctid::text`, rowId))
            .returning({ stationId: stations.stationId });
        if (!deleted.length) {
            return NextResponse.json({ error: 'ไม่พบสถานีที่ต้องการลบ' }, { status: 404 });
        }
        return NextResponse.json({ message: 'ลบสถานีสำเร็จ' });
    } catch (error) {
        return validationError(error);
    }
}
