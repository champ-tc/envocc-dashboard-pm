'use server';

import type duckdbTypes from 'duckdb';
const duckdb = typeof window === 'undefined' ? eval('require("duckdb")') : null;
import path from 'path';
import { HDC_DISEASES, PROVINCE_MAPPING } from '@/lib/constants';
import { getOptionalUser } from '@/lib/auth';

export interface HDCFilters {
    startDate: string;
    endDate: string;
    regions: string[];
    provinces: string[];
    districts: string[];
    subdistricts: string[];
    diseases: string[];
    diagnosisTypes: string[];
}

export interface HierarchyItem {
    region: string;
    province: string;
    district: string;
    subdistrict: string;
}

export interface HDCOptions {
    dates: string[];
    regions: string[];
    provinces: string[];
    districts: string[];
    subdistricts: string[];
    diseases: string[];
    diagnosisTypes: string[];
    hierarchy: HierarchyItem[];
}

export interface DiseaseStat {
    id: string;
    label: string;
    value: number;
    color: string;
}

export interface MonthlyTrendData {
    month: string;
    total: number;
    avg_pm25: number;
    [key: string]: number | string;
}

export interface ProvinceStats {
    value: number;
    rate: number;
}

export interface DashboardData {
    totalPatients: number;
    totalDiagnoses: number;
    avgPM25: string;
    provinceCount: number;
    reportDate: string | null;
    top5DiseaseStats: DiseaseStat[];
    monthlyTrend: MonthlyTrendData[];
    provinceAverages: Record<string, ProvinceStats>;
}

interface DuckDBRow {
    [key: string]: string | number | boolean | null | undefined;
}

export async function getUserAction() {
    return await getOptionalUser();
}

export async function getFilterOptions(): Promise<HDCOptions> {
    return new Promise((resolve, reject) => {
        try {
            const db: duckdbTypes.Database = new duckdb.Database(':memory:');
            const dataDir = process.env.DUCKDB_DATA_DIR || path.join(process.cwd(), 'public', 'duckdb');
            const parquetPath = path.join(dataDir, 'hdc.parquet');
            const pm25Path = path.join(dataDir, 'pm25.csv');
            
            const query = `
                WITH distinct_vals AS (
                    SELECT DISTINCT 
                        make_date(CAST(year AS INT), CAST(month AS INT), 1) as dt,
                        'เขตสุขภาพที่ ' || CAST(county AS VARCHAR) as rg,
                        TRIM(province_name) as pv
                    FROM '${parquetPath}'
                ),
                diag_vals AS (
                    SELECT DISTINCT TRIM(diagnosis) as diag FROM '${parquetPath}'
                ),
                typediag_vals AS (
                    SELECT DISTINCT TRIM(Typediag_name) as typediag FROM '${parquetPath}' WHERE TRIM(Typediag_name) IN ('Acute ischemic heart diseases', 'Acute asthma', 'Chronic obstructive pulmonary disease', 'กลุ่มโรคผิวหนังอักเสบ', 'กลุ่มโรคตาอักเสบ')
                )
                SELECT 
                    list(DISTINCT dt::VARCHAR ORDER BY 1 DESC) as dates,
                    list(DISTINCT rg ORDER BY 1 ASC) as regions,
                    list(DISTINCT pv ORDER BY 1 ASC) as provinces,
                    (SELECT list(diag ORDER BY 1 ASC) FROM diag_vals) as diags,
                    (SELECT list(typediag ORDER BY 1 ASC) FROM typediag_vals) as typediags
                FROM distinct_vals;
            `;

            db.all(query, (err: Error | null, res1: DuckDBRow[]) => {
                if (err) return reject(err);
                
                const hierarchyQuery = `
                    SELECT DISTINCT 
                        TRIM("Regional Health") as region,
                        TRIM(province) as province,
                        TRIM(district) as district,
                        TRIM(subdistrict) as subdistrict
                    FROM read_csv_auto('${pm25Path}', ignore_errors=true)
                    WHERE district IS NOT NULL AND subdistrict IS NOT NULL
                    ORDER BY 1, 2, 3, 4
                `;
                
                db.all(hierarchyQuery, (err2: Error | null, res2: DuckDBRow[]) => {
                    if (err2) return reject(err2);

                    const row1 = (res1 && res1.length > 0) ? res1[0] : {};
                    const rawRegions = (row1.regions as unknown as string[]) || [];
                    const regions = rawRegions
                        .map((r: string) => r === 'เขตสุขภาพที่ 13' ? 'กรุงเทพมหานคร' : r)
                        .sort((a: string, b: string) => {
                            const numA = a === 'กรุงเทพมหานคร' ? 13 : (parseInt(a.replace(/[^0-9]/g, '')) || 0);
                            const numB = b === 'กรุงเทพมหานคร' ? 13 : (parseInt(b.replace(/[^0-9]/g, '')) || 0);
                            return numA - numB;
                        });

                    const hierarchy: HierarchyItem[] = (res2 || []).map((h) => {
                        const provinceEn = h.province as string;
                        const provinceTh = PROVINCE_MAPPING[provinceEn] || provinceEn;
                        return {
                            region: (h.region as string) === 'เขตสุขภาพที่ 13' ? 'กรุงเทพมหานคร' : (h.region as string),
                            province: provinceTh,
                            district: h.district as string,
                            subdistrict: h.subdistrict as string
                        };
                    });

                    const districts = Array.from(new Set(hierarchy.map(h => h.district))).sort();
                    const subdistricts = Array.from(new Set(hierarchy.map(h => h.subdistrict))).sort();

                    resolve({
                        dates: (row1.dates as unknown as string[]) || [],
                        regions,
                        provinces: (row1.provinces as unknown as string[]) || [],
                        districts,
                        subdistricts,
                        diseases: (row1.typediags as unknown as string[]) || [],
                        diagnosisTypes: (row1.diags as unknown as string[]) || [],
                        hierarchy
                    });
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

export async function getDashboardData(filters: Partial<HDCFilters> = {}, scope?: any): Promise<DashboardData> {
    return new Promise((resolve, reject) => {
        try {
            const db: duckdbTypes.Database = new duckdb.Database(':memory:');
            const dataDir = process.env.DUCKDB_DATA_DIR || path.join(process.cwd(), 'public', 'duckdb');
            const parquetPath = path.join(dataDir, 'hdc.parquet');
            const pm25Path = path.join(dataDir, 'pm25.csv');
            
            let scopeHdcFilter = '';
            let scopePm25Filter = '';

            if (scope) {
                if (scope.isProvince && scope.province) {
                    scopeHdcFilter = `AND TRIM(province_name) = '${scope.province.replace(/'/g, "''")}'`;
                    scopePm25Filter = `AND TRIM(province) = '${scope.province.replace(/'/g, "''")}'`;
                } else if (scope.isRegion && scope.region) {
                    const regionNum = scope.region.replace(/[^0-9]/g, '');
                    if (regionNum) {
                        scopeHdcFilter = `AND county = ${regionNum}`;
                        scopePm25Filter = `AND "Regional Health" = 'เขตสุขภาพที่ ${regionNum}'`;
                    }
                }
            }

            const mappedRegions = filters.regions?.map(r => r === 'กรุงเทพมหานคร' ? 'เขตสุขภาพที่ 13' : r);

            const diagnosisFilter = filters.diagnosisTypes?.length 
                ? `AND diagnosis IN (${filters.diagnosisTypes.map(d => `'${d.replace(/'/g, "''").trim()}'`).join(',')})`
                : `AND diagnosis = 'การวินิจฉัยโรคทั้งหมด'`;

            const mappedDiseases = (filters.diseases || []).flatMap(label => {
                const found = HDC_DISEASES.find(d => d.label === label || d.shortLabel === label);
                return found ? found.dbValues : [label];
            });

            const hdcLocFilters = [
                mappedRegions?.length ? `AND 'เขตสุขภาพที่ ' || CAST(county AS VARCHAR) IN (${mappedRegions.map(r => `'${r.replace(/'/g, "''").trim()}'`).join(',')})` : '',
                filters.provinces?.length ? `AND TRIM(province_name) IN (${filters.provinces.map(p => `'${p.replace(/'/g, "''").trim()}'`).join(',')})` : '',
                mappedDiseases.length ? `AND TRIM(Typediag_name) IN (${mappedDiseases.map(d => `'${d.replace(/'/g, "''").trim()}'`).join(',')})` : ''
            ].join(' ');

            const pm25LocFilters = [
                mappedRegions?.length ? `AND TRIM("Regional Health") IN (${mappedRegions.map(r => `'${r.replace(/'/g, "''").trim()}'`).join(',')})` : '',
                filters.provinces?.length ? `AND TRIM(province) IN (${filters.provinces.flatMap(p => {
                    const enNames = Object.keys(PROVINCE_MAPPING).filter(key => PROVINCE_MAPPING[key] === p);
                    return enNames.length > 0 ? enNames : [p];
                }).map(en => `'${en.replace(/'/g, "''").trim()}'`).join(',')})` : '',
                filters.districts?.length ? `AND TRIM(district) IN (${filters.districts.map(d => `'${d.replace(/'/g, "''").trim()}'`).join(',')})` : '',
                filters.subdistricts?.length ? `AND TRIM(subdistrict) IN (${filters.subdistricts.map(s => `'${s.replace(/'/g, "''").trim()}'`).join(',')})` : ''
            ].join(' ');
            
            let hdcDateFilter = '';
            let pm25DateFilter = '';
            if (filters.startDate === 'ทั้งหมด' || !filters.startDate) {
                hdcDateFilter = 'AND 1=1';
                pm25DateFilter = 'AND 1=1';
            } else if (filters.startDate === 'ล่าสุด') {
                const latestSql = `(SELECT MAX(make_date(CAST(year AS INT), CAST(month AS INT), 1)) FROM '${parquetPath}' WHERE diagnosis = 'การวินิจฉัยโรคทั้งหมด')`;
                hdcDateFilter = `AND make_date(CAST(year AS INT), CAST(month AS INT), 1) = ${latestSql}`;
                pm25DateFilter = `AND date = ${latestSql}`;
            } else if (filters.startDate && filters.endDate) {
                hdcDateFilter = `AND make_date(CAST(year AS INT), CAST(month AS INT), 1) BETWEEN CAST('${filters.startDate}' AS DATE) AND CAST('${filters.endDate}' AS DATE)`;
                pm25DateFilter = `AND date BETWEEN CAST('${filters.startDate}' AS DATE) AND CAST('${filters.endDate}' AS DATE)`;
            }

            const sqlStats = `
                WITH pm25_data AS (
                    SELECT AVG(pm25) as avg_val 
                    FROM read_csv_auto('${pm25Path}', ignore_errors=true)
                    WHERE 1=1 ${pm25DateFilter} ${pm25LocFilters} ${scopePm25Filter}
                )
                SELECT 
                    SUM(CASE WHEN diagnosis = 'การวินิจฉัยโรคทั้งหมด' THEN CAST("case" AS DOUBLE) ELSE 0 END) as total_patients,
                    SUM(CASE WHEN 1=1 ${diagnosisFilter} THEN CAST("case" AS DOUBLE) ELSE 0 END) as total_diagnoses,
                    (SELECT avg_val FROM pm25_data) as avg_pm25,
                    COUNT(DISTINCT province_name) as province_count,
                    MAX(make_date(CAST(year AS INT), CAST(month AS INT), 1))::VARCHAR as latest_date
                FROM '${parquetPath}'
                WHERE 1=1 
                AND TRIM(Typediag_name) IN ('Acute ischemic heart diseases', 'Acute asthma', 'Chronic obstructive pulmonary disease', 'กลุ่มโรคผิวหนังอักเสบ', 'กลุ่มโรคตาอักเสบ')
                ${hdcDateFilter} ${hdcLocFilters} ${scopeHdcFilter};
            `;

            db.all(sqlStats, (err: Error | null, res1: DuckDBRow[]) => {
                if (err) return reject(err);
                
                const diseaseSqlParts = HDC_DISEASES.map(d => 
                    `SUM(CASE WHEN TRIM(Typediag_name) IN (${d.dbValues.map((v: string) => `'${v.replace(/'/g, "''")}'`).join(',')}) THEN CAST("case" AS DOUBLE) ELSE 0 END) as ${d.id}`
                ).join(',\n                    ');
                
                const sqlTop5Cards = `
                    SELECT 
                        TRIM(Typediag_name) as name,
                        SUM(CAST("case" AS DOUBLE)) as value
                    FROM '${parquetPath}'
                    WHERE 1=1 ${diagnosisFilter} 
                    AND TRIM(Typediag_name) IN ('Acute ischemic heart diseases', 'Acute asthma', 'Chronic obstructive pulmonary disease', 'กลุ่มโรคผิวหนังอักเสบ', 'กลุ่มโรคตาอักเสบ')
                    ${hdcDateFilter} ${hdcLocFilters} ${scopeHdcFilter}
                    GROUP BY 1
                    ORDER BY 2 DESC;
                `;

                db.all(sqlTop5Cards, (err2: Error | null, res2: DuckDBRow[]) => {
                    if (err2) return reject(err2);

                    const sqlMonthly = `
                        WITH monthly_pm25 AS (
                            SELECT 
                                strftime(date, '%Y-%m') as ym,
                                AVG(pm25) as avg_pm25
                            FROM read_csv_auto('${pm25Path}', ignore_errors=true)
                            WHERE 1=1 ${pm25DateFilter} ${pm25LocFilters} ${scopePm25Filter}
                            GROUP BY 1
                        )
                        SELECT 
                            year || '-' || lpad(month::VARCHAR, 2, '0') as month_year, 
                            SUM(CAST("case" AS DOUBLE)) as total,
                            ANY_VALUE(mp.avg_pm25) as avg_pm25,
                            ${diseaseSqlParts}
                        FROM '${parquetPath}' h
                        LEFT JOIN monthly_pm25 mp ON (h.year || '-' || lpad(h.month::VARCHAR, 2, '0')) = mp.ym
                        WHERE 1=1 ${diagnosisFilter} 
                        AND TRIM(h.Typediag_name) IN ('Acute ischemic heart diseases', 'Acute asthma', 'Chronic obstructive pulmonary disease', 'กลุ่มโรคผิวหนังอักเสบ', 'กลุ่มโรคตาอักเสบ')
                        ${hdcDateFilter} ${hdcLocFilters} ${scopeHdcFilter}
                        GROUP BY month_year
                        ORDER BY month_year ASC;
                    `;

                    db.all(sqlMonthly, (err3: Error | null, res3: DuckDBRow[]) => {
                        if (err3) return reject(err3);

                        const sqlProvinceData = `
                            SELECT TRIM(province_name) as province, SUM(CAST("case" AS DOUBLE)) as patients
                            FROM '${parquetPath}'
                            WHERE 1=1 ${diagnosisFilter} 
                            AND TRIM(Typediag_name) IN ('Acute ischemic heart diseases', 'Acute asthma', 'Chronic obstructive pulmonary disease', 'กลุ่มโรคผิวหนังอักเสบ', 'กลุ่มโรคตาอักเสบ')
                            ${hdcDateFilter} ${hdcLocFilters} ${scopeHdcFilter}
                            GROUP BY 1;
                        `;

                        db.all(sqlProvinceData, (err4: Error | null, res4: DuckDBRow[]) => {
                            if (err4) return reject(err4);

                            const midYearPath = path.join(process.cwd(), 'public', 'duckdb', 'mid_year.csv');
                            const sqlPop = `SELECT TRIM(province_name) as province, CAST(population AS DOUBLE) as pop FROM read_csv_auto('${midYearPath}', ignore_errors=true)`;

                            db.all(sqlPop, (errPop: Error | null, resPop: DuckDBRow[]) => {
                                if (errPop) return reject(errPop);

                                const popMap: Record<string, number> = {};
                                resPop.forEach((p) => {
                                    popMap[p.province as string] = Number(p.pop);
                                });

                                const dataRow = (res1 && res1.length > 0) ? res1[0] : {};
                                resolve({
                                    totalPatients: Math.round(Number(dataRow.total_patients || 0)),
                                    totalDiagnoses: Math.round(Number(dataRow.total_diagnoses || 0)),
                                    avgPM25: dataRow.avg_pm25 ? Number(dataRow.avg_pm25).toFixed(1) : '0.0',
                                    provinceCount: Number(dataRow.province_count || 0),
                                    reportDate: dataRow.latest_date ? new Date(dataRow.latest_date as string).toISOString().split('T')[0] : null,
                                    top5DiseaseStats: (res2 || []).map(r => {
                                        const diseaseName = r.name as string;
                                        const found = HDC_DISEASES.find(d => d.dbValues.includes(diseaseName));
                                        return {
                                            id: diseaseName,
                                            label: diseaseName,
                                            value: Math.round(Number(r.value || 0)),
                                            color: found ? found.color : 'blue'
                                        };
                                    }),
                                    monthlyTrend: (res3 || []).map((m) => {
                                        const trends: MonthlyTrendData = { 
                                            month: m.month_year as string, 
                                            total: Math.round(Number(m.total || 0)), 
                                            avg_pm25: m.avg_pm25 ? Number(Number(m.avg_pm25).toFixed(1)) : 0 
                                        };
                                        HDC_DISEASES.forEach(d => {
                                            trends[d.id] = Math.round(Number(m[d.id] || 0));
                                        });
                                        return trends;
                                    }),
                                    provinceAverages: (res4 || []).reduce((acc: Record<string, {value: number, rate: number}>, p) => {
                                        const patients = Number(p.patients) || 0;
                                        const provinceName = p.province as string;
                                        const pop = popMap[provinceName] || 0;
                                        acc[provinceName] = {
                                            value: patients,
                                            rate: pop > 0 ? (patients / pop) * 100000 : 0
                                        };
                                        return acc;
                                    }, {})
                                });
                            });
                        });
                    });
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}
