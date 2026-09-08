import { NextResponse } from 'next/server';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { stations } from '@/db/schema';
import { requireRoles } from '@/lib/auth';

export async function GET() {
    try {
        await requireRoles(['user', 'admin_region', 'admin_province']);
        const latestStationRow = sql`ctid = (SELECT station_latest.ctid FROM stations AS station_latest WHERE (station_latest.station_id_new IS NOT DISTINCT FROM ${stations.stationIdNew} AND ${stations.stationIdNew} IS NOT NULL) OR (${stations.stationIdNew} IS NULL AND station_latest.station_id = ${stations.stationId}) ORDER BY (NULLIF(BTRIM(station_latest.district), '') IS NOT NULL) DESC, station_latest.created_at DESC NULLS LAST, station_latest.ctid DESC LIMIT 1)`;
        const result = await db.select({ stationId: stations.stationId, stationIdNew: stations.stationIdNew, stationName: stations.stationName, stationType: stations.stationType, province: stations.province, district: stations.district, latitude: stations.latitude, longitude: stations.longitude }).from(stations).where(latestStationRow).orderBy(asc(stations.province), asc(stations.stationName), asc(stations.stationId));
        return NextResponse.json({ stations: result });
    } catch (error) {
        console.error('User Stations Error:', error);
        return NextResponse.json({ error: 'ไม่สามารถโหลดข้อมูลสถานีได้' }, { status: 500 });
    }
}
