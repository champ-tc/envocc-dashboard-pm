'use server';

import path from 'path';
import type * as duckdbTypes from 'duckdb';

// ซ่อนการโหลด duckdb ไว้ไม่ให้ Turbopack พยายามทำ Static Trace ตอน Build
const duckdb = typeof window === 'undefined' ? eval('require("duckdb")') : null;

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
        const db: duckdbTypes.Database = new duckdb.Database(':memory:');
        const csvPath = path.join(process.cwd(), 'public', 'duckdb', 'pm25.csv');
        
        const query = `
            SELECT 
                list(DISTINCT strftime(date, '%Y-%m-%d') ORDER BY strftime(date, '%Y-%m-%d') DESC) as dates,
                list(DISTINCT TRIM("Regional Health")) as regions,
                list(DISTINCT TRIM(province) ORDER BY TRIM(province) ASC) as provinces
            FROM read_csv_auto('${csvPath}', ignore_errors=true);
        `;

        const res1 = await runQuery(db, query);
        const hierarchyQuery = `SELECT DISTINCT TRIM("Regional Health") as region, TRIM(province) as province, TRIM(district) as district FROM read_csv_auto('${csvPath}', ignore_errors=true) ORDER BY region, province, district`;
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
    } catch (error) {
        console.error('getFilterOptions error:', error);
        return { dates: [], regions: [], provinces: [], hierarchy: [] };
    }
}

export async function getDashboardData(filters: { startDate?: string, endDate?: string, regions?: string[], provinces?: string[], districts?: string[] } = {}) {
    try {
        const db: duckdbTypes.Database = new duckdb.Database(':memory:');
        const csvPath = path.join(process.cwd(), 'public', 'duckdb', 'pm25.csv');
        
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
            dateFilter = `AND date = (SELECT MAX(date) FROM read_csv_auto('${csvPath}', ignore_errors=true))`;
        } else if (filters.startDate && filters.endDate) {
            dateFilter = `AND date BETWEEN CAST('${filters.startDate}' AS DATE) AND CAST('${filters.endDate}' AS DATE)`;
        }

        const sqlBase = `FROM read_csv_auto('${csvPath}', ignore_errors=true) WHERE 1=1 ${dateFilter} ${locFilters}`;

        const [resStats, resRegion, resProvTrend, resDistTrend, resTop10, resProvAvg, resRaw] = await Promise.all([
            runQuery(db, `SELECT AVG(pm25) as avg_pm25, MAX(pm25) as max_pm25, COUNT(*) as total_measurements, COUNT(CASE WHEN pm25 > 37.5 THEN 1 END) as exceed_count, MAX(date) as report_date ${sqlBase}`),
            runQuery(db, `SELECT strftime(date, '%Y-%m-%d') as date, TRIM("Regional Health") as label, AVG(pm25) as value ${sqlBase} GROUP BY date, label ORDER BY label, date ASC`),
            runQuery(db, `SELECT strftime(date, '%Y-%m-%d') as date, TRIM(province) as label, AVG(pm25) as value ${sqlBase} GROUP BY date, label ORDER BY label, date ASC`),
            runQuery(db, `SELECT strftime(date, '%Y-%m-%d') as date, TRIM(district) as label, AVG(pm25) as value ${sqlBase} GROUP BY date, label ORDER BY label, date ASC`),
            runQuery(db, `SELECT TRIM(province) as province, COUNT(*) as exceed_days FROM read_csv_auto('${csvPath}', ignore_errors=true) WHERE pm25 > 37.5 ${dateFilter} ${locFilters} GROUP BY province ORDER BY exceed_days DESC LIMIT 10`),
            runQuery(db, `SELECT TRIM(province) as province, MAX(pm25) as value ${sqlBase} GROUP BY province`),
            runQuery(db, `SELECT TRIM(province) as province, strftime(date, '%Y-%m-%d') as date, pm25 FROM read_csv_auto('${csvPath}', ignore_errors=true) WHERE 1=1 ${dateFilter} ${locFilters} ORDER BY province, date ASC`)
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
            const trendMap = new Map(trend.map(p => [p.date.split('T')[0], p.value]));
            
            let endDateStr = filters.endDate;
            if (!endDateStr) {
                const dates = trend.map(p => p.date);
                endDateStr = dates.sort()[dates.length - 1].split('T')[0];
            }
            
            let current37 = 0;
            let current75 = 0;
            
            let d37 = new Date(endDateStr);
            while (true) {
                const dateStr = d37.toISOString().split('T')[0];
                const val = trendMap.get(dateStr);
                if (val !== undefined && val > 37.5) {
                    current37++;
                    d37.setDate(d37.getDate() - 1);
                } else {
                    break;
                }
            }

            const sorted = [...trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            current75 = 0;
            let latest75 = 0;

            for (let i = 0; i < sorted.length; i++) {
                const p = sorted[i];
                if (p.value > 75) {
                    if (current75 === 0) {
                        current75 = 1;
                    } else {
                        const lastD = new Date(sorted[i-1].date);
                        const d = new Date(p.date);
                        const diffDays = Math.round((d.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays === 1) {
                            current75++;
                        } else {
                            if (current75 >= 2) latest75 = current75;
                            current75 = 1;
                        }
                    }
                } else {
                    if (current75 >= 2) latest75 = current75;
                    current75 = 0;
                }
            }
            if (current75 >= 2) latest75 = current75;
            
            if (current37 > 0) streak37[prov] = current37;
            if (latest75 >= 2) streak75[prov] = latest75;
        });

        const provinceMaxes: Record<string, number> = {};
        resProvAvg.forEach(p => { provinceMaxes[p.province] = p.value; });

        return {
            avgPM25: Number(resStats[0]?.avg_pm25 || 0).toFixed(1),
            maxPM25: Number(resStats[0]?.max_pm25 || 0).toFixed(1),
            totalMeasurements: Number(resStats[0]?.total_measurements || 0),
            exceedCount: Number(resStats[0]?.exceed_count || 0),
            reportDate: resStats[0]?.report_date ? new Date(resStats[0].report_date).toISOString().split('T')[0] : null,
            regionTrend: groupByLabel(resRegion),
            provinceTrend: provinceTrendData,
            districtTrend: groupByLabel(resDistTrend),
            top10Exceed: resTop10,
            provinceMaxes,
            provinceStreak37: streak37,
            provinceStreak75: streak75
        };
    } catch (error) {
        console.error('getDashboardData error:', error);
        return null;
    }
}

export async function getTopDustProvinces() {
    try {
        const db: duckdbTypes.Database = new duckdb.Database(':memory:');
        const csvPath = path.join(process.cwd(), 'public', 'duckdb', 'pm25.csv');
        
        const query = `
            SELECT 
                TRIM(province) as name, 
                MAX(pm25) as count,
                MAX(date) as dt
            FROM read_csv_auto('${csvPath}', ignore_errors=true)
            WHERE date = (SELECT MAX(date) FROM read_csv_auto('${csvPath}', ignore_errors=true))
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
    } catch (error) {
        console.error('getTopDustProvinces error:', error);
        return null;
    }
}
