'use server';

import type * as duckdbTypes from 'duckdb';
import { withDashboardDatabase, getDashboardDataVersion } from '@/lib/dashboard-data-engine';
import { cachedDashboardQuery, isDashboardOverloadError, stableCacheKey } from '@/lib/dashboard-runtime';
import { summarizeMapAreas, type AreaLevel, type AreaDay } from './map-area-data';

async function runQuery(db: duckdbTypes.Database, sql: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, (err, res) => {
            if (err) reject(err);
            else resolve(res);
        });
    });
}

export async function getFilterOptions() {
    try {
        const version = getDashboardDataVersion();
        return await cachedDashboardQuery(`pm25:options:${version}`, () =>
            withDashboardDatabase(async (db) => {
        const query = `
            SELECT 
                list(DISTINCT strftime(date, '%Y-%m-%d') ORDER BY strftime(date, '%Y-%m-%d') DESC) as dates,
                list(DISTINCT TRIM("Regional Health")) as regions,
                list(DISTINCT TRIM(province) ORDER BY TRIM(province) ASC) as provinces
            FROM pm25_raw;
        `;

        const res1 = await runQuery(db, query);
        const hierarchyQuery = `SELECT DISTINCT TRIM("Regional Health") as region, TRIM(province) as province, TRIM(district) as district FROM pm25_raw ORDER BY region, province, district`;
        const res2 = await runQuery(db, hierarchyQuery);

        const rawRegions = res1[0]?.regions || [];
        const regions = rawRegions
            .map((r: string) => r === 'เขตสุขภาพที่ 13' ? 'กรุงเทพมหานคร' : r)
            .sort((a: string, b: string) => {
                const numA = a === 'กรุงเทพมหานคร' ? 13 : (parseInt(a.replace(/[^0-9]/g, '')) || 0);
                const numB = b === 'กรุงเทพมหานคร' ? 13 : (parseInt(b.replace(/[^0-9]/g, '')) || 0);
                return numA - numB;
            });

        const hierarchy = (res2 || []).map((h: any) => ({
            ...h,
            region: h.region === 'เขตสุขภาพที่ 13' ? 'กรุงเทพมหานคร' : h.region
        }));

        return {
            dates: res1[0]?.dates || [],
            regions,
            provinces: res1[0]?.provinces || [],
            hierarchy
        };
            }),
        );
    } catch (error) {
        if (isDashboardOverloadError(error)) throw error;
        console.error('getFilterOptions error:', error);
        throw error;
    }
}

export async function getDashboardData(filters: { startDate?: string, endDate?: string, regions?: string[], provinces?: string[], districts?: string[] } = {}) {
    try {
        const version = getDashboardDataVersion();
        const cacheKey = `pm25:data:avg-2dp-v4:${version}:${stableCacheKey(filters)}`;
        return await cachedDashboardQuery(cacheKey, () =>
            withDashboardDatabase(async (db) => {
        const mappedRegions = filters.regions?.map(r => r === 'กรุงเทพมหานคร' ? 'เขตสุขภาพที่ 13' : r);

        const locFilters = [
            mappedRegions?.length ? `AND TRIM("Regional Health") IN (${mappedRegions.map(r => `'${r.replace(/'/g, "''").trim()}'`).join(',')})` : '',
            filters.provinces?.length ? `AND TRIM(province) IN (${filters.provinces.map(p => `'${p.replace(/'/g, "''").trim()}'`).join(',')})` : '',
            filters.districts?.length ? `AND TRIM(district) IN (${filters.districts.map(d => `'${d.replace(/'/g, "''").trim()}'`).join(',')})` : ''
        ].join(' ');
        
        let dateFilter = '';
        if (filters.startDate === 'ทั้งหมด' || !filters.startDate) {
            dateFilter = 'AND 1=1';
        } else if (filters.startDate === 'ล่าสุด') {
            dateFilter = `AND date = (SELECT MAX(date) FROM pm25_raw)`;
        } else if (filters.startDate && filters.endDate) {
            dateFilter = `AND date BETWEEN CAST('${filters.startDate}' AS DATE) AND CAST('${filters.endDate}' AS DATE)`;
        }

        const sqlBase = `FROM pm25_raw WHERE 1=1 ${dateFilter} ${locFilters}`;
        const mapLevel: AreaLevel = filters.districts?.length ? 'subdistrict' : filters.provinces?.length ? 'district' : 'province';

        const [resStats, resRegion, resProvTrend, resDistTrend, resTop10, resProvAvg] = await Promise.all([
            runQuery(db, `SELECT AVG(pm25) as avg_pm25, MAX(pm25) as max_pm25, COUNT(*) as total_measurements, COUNT(CASE WHEN pm25 > 37.5 THEN 1 END) as exceed_count, MAX(date) as report_date ${sqlBase}`),
            runQuery(db, `SELECT strftime(date, '%Y-%m-%d') as date, TRIM("Regional Health") as label, AVG(pm25) as value ${sqlBase} GROUP BY date, label ORDER BY label, date ASC`),
            runQuery(db, `SELECT strftime(date, '%Y-%m-%d') as date, TRIM(province) as label, AVG(pm25) as value ${sqlBase} GROUP BY date, label ORDER BY label, date ASC`),
            // District names can repeat across provinces; preserve both parts of the identity.
            runQuery(db, `SELECT strftime(date, '%Y-%m-%d') as date,
                CONCAT(TRIM(district), ' (', TRIM(province), ')') as label,
                AVG(pm25) as value ${sqlBase}
                GROUP BY date, TRIM(province), TRIM(district) ORDER BY label, date ASC`),
            runQuery(db, `
                WITH province_daily AS (
                    SELECT
                        TRIM(province) as province,
                        CAST(date AS DATE) as report_date,
                        AVG(pm25) as avg_pm25
                    ${sqlBase}
                    GROUP BY 1, 2
                )
                SELECT province, COUNT(*) as exceed_days
                FROM province_daily
                WHERE avg_pm25 > 37.5
                GROUP BY province
                ORDER BY exceed_days DESC, province ASC
                LIMIT 10
            `),
            runQuery(db, `SELECT TRIM(province) as province, MAX(pm25) as value ${sqlBase} GROUP BY province`)
        ]);

        const groupByLabel = (data: any[]) => {
            const groups: Record<string, {date: string, value: number}[]> = {};
            data.forEach(d => {
                const label = d.label === 'เขตสุขภาพที่ 13' ? 'กรุงเทพมหานคร' : d.label;
                if (!groups[label]) groups[label] = [];
                groups[label].push({ date: d.date, value: d.value });
            });
            return groups;
        };

        const provinceTrendData = groupByLabel(resProvTrend);

        // คำนวณวันต่อเนื่องรายจังหวัด โดยใช้ค่าเฉลี่ยรายวันของจังหวัด (provinceTrendData)
        const streak37: Record<string, number> = {};
        const streak75: Record<string, number> = {};

        Object.entries(provinceTrendData).forEach(([prov, trend]) => {
            let current37 = 0;
            let latest37 = 0;
            let current75 = 0;

            const sorted = [...trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let latest75 = 0;

            for (let i = 0; i < sorted.length; i++) {
                const p = sorted[i];
                const isConsecutive = i > 0 && Math.round(
                    (new Date(p.date).getTime() - new Date(sorted[i - 1].date).getTime()) / (1000 * 60 * 60 * 24)
                ) === 1;

                if (p.value > 37.5) {
                    if (current37 > 0 && !isConsecutive) latest37 = current37;
                    current37 = current37 > 0 && isConsecutive ? current37 + 1 : 1;
                } else {
                    if (current37 > 0) latest37 = current37;
                    current37 = 0;
                }

                if (p.value > 75) {
                    if (current75 >= 2 && !isConsecutive) latest75 = current75;
                    current75 = current75 > 0 && isConsecutive ? current75 + 1 : 1;
                } else {
                    if (current75 >= 2) latest75 = current75;
                    current75 = 0;
                }
            }
            if (current37 > 0) latest37 = current37;
            if (current75 >= 2) latest75 = current75;
            
            if (latest37 > 0) streak37[prov] = latest37;
            if (latest75 >= 2) streak75[prov] = latest75;
        });

        const provinceMaxes: Record<string, number> = {};
        resProvAvg.forEach(p => { provinceMaxes[p.province] = p.value; });

        // Load only the geographic detail currently displayed on the map.
        const areaRows: AreaDay[] = mapLevel === 'province'
            ? resProvTrend.map(row => ({ province: row.label, date: row.date, value: row.value, max: provinceMaxes[row.label] }))
            : await runQuery(db, `SELECT TRIM(province) AS province, TRIM(district) AS district,
                ${mapLevel === 'subdistrict' ? 'TRIM(subdistrict)' : 'NULL'} AS subdistrict,
                strftime(date, '%Y-%m-%d') AS date, AVG(pm25) AS value, MAX(pm25) AS max
                ${sqlBase} AND pm25 IS NOT NULL
                GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3, 4`);
        const mapAreas = summarizeMapAreas(areaRows, mapLevel);

        const top10Exceed = resTop10.map(row => ({
            province: row.province as string,
            exceed_days: Number(row.exceed_days) || 0
        }));

        return {
            avgPM25: Number(resStats[0]?.avg_pm25 ?? 0).toFixed(2),
            maxPM25: String(resStats[0]?.max_pm25 ?? 0),
            totalMeasurements: Number(resStats[0]?.total_measurements || 0),
            exceedCount: Number(resStats[0]?.exceed_count || 0),
            reportDate: resStats[0]?.report_date ? new Date(resStats[0].report_date).toISOString().split('T')[0] : null,
            regionTrend: groupByLabel(resRegion),
            provinceTrend: provinceTrendData,
            districtTrend: groupByLabel(resDistTrend),
            top10Exceed,
            provinceMaxes,
            mapAreas,
            provinceStreak37: streak37,
            provinceStreak75: streak75
        };
            }),
        );
    } catch (error) {
        if (isDashboardOverloadError(error)) throw error;
        console.error('getDashboardData error:', error);
        throw error;
    }
}

export async function getTopDustProvinces() {
    try {
        const version = getDashboardDataVersion();
        return await cachedDashboardQuery(`pm25:top:${version}`, () =>
            withDashboardDatabase(async (db) => {
        const query = `
            SELECT 
                TRIM(province) as name, 
                MAX(pm25) as count,
                MAX(date) as dt
            FROM pm25_raw
            WHERE date = (SELECT MAX(date) FROM pm25_raw)
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 5
        `;

        const results = await runQuery(db, query);
        if (!results || results.length === 0) return null;

        const topProvinces = results.map((r, i) => ({
            rank: i + 1,
            name: r.name,
            count: Math.round(r.count)
        }));

        const d = new Date(results[0].dt);
        const latestUpdateDate = `${d.getDate()} / ${d.getMonth() + 1} / ${d.getFullYear() + 543}`;

        return { topProvinces, latestUpdateDate };
            }),
        );
    } catch (error) {
        if (isDashboardOverloadError(error)) throw error;
        console.error('getTopDustProvinces error:', error);
        return null;
    }
}
