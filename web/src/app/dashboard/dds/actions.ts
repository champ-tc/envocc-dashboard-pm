'use server';

import type duckdbTypes from 'duckdb';
const duckdb = typeof window === 'undefined' ? eval('require("duckdb")') : null;
import path from 'path';
import { DDS_DISEASES, PROVINCE_MAPPING } from '@/lib/constants';
import { getOptionalUser } from '@/lib/auth';

export interface HierarchyItem {
    region: string;
    province: string;
    district: string;
    subdistrict: string;
}

export interface DDSOptions {
    dates: string[];
    regions: string[];
    provinces: string[];
    diseases: string[];
    icd10_codes: string[];
    icd10_by_disease: Record<string, string[]>;
    diagnosisTypes: string[];
    hierarchy: HierarchyItem[];
}

export interface DDSFilters {
    startDate: string;
    endDate: string;
    regions: string[];
    provinces: string[];
    districts: string[];
    subdistricts: string[];
    diseases: string[];
    icd10_codes: string[];
    diagnosisType: string;
    groupedIcd10?: Record<string, string[]>;
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

export interface SubdistrictStats {
    value: number;
    rate: number;
    pm25?: number;
}

export interface StationData {
    province: string;
    district: string;
    subdistrict: string;
    lat: number;
    lon: number;
    pm25: number;
}

export interface DDSDashboardData {
    totalPatients: number;
    totalVisits: number;
    otherPatients: number;
    avgPM25: string;
    provinceCount: number;
    reportDate: string | null;
    top5DiseaseStats: DiseaseStat[];
    monthlyTrend: MonthlyTrendData[];
    provinceAverages: Record<string, { value: number; rate: number; pm25: number }>;
    subdistrictAverages: Record<string, SubdistrictStats>;
    stations: StationData[];
}

export async function getCurrentUser() {
    const user = await getOptionalUser();
    return user ? JSON.parse(JSON.stringify(user)) : null;
}

interface DuckDBRow {
    [key: string]: string | number | boolean | null | undefined | (string | number | boolean | null | undefined)[];
}

let dbPromise: Promise<duckdbTypes.Database> | null = null;

const getDB = (): Promise<duckdbTypes.Database> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        try {
            const db: duckdbTypes.Database = new duckdb.Database(':memory:');
            const ddsPath = path.join(process.cwd(), 'public', 'duckdb', 'dashboard_dds.csv');
            const pm25Path = path.join(process.cwd(), 'public', 'duckdb', 'pm25.csv');
            const midYearPath = path.join(process.cwd(), 'public', 'duckdb', 'mid_year.csv');

            // Create mapping table from constants
            const mappingValues = Object.entries(PROVINCE_MAPPING)
                .map(([en, th]) => `('${en.replace(/'/g, "''")}', '${th.replace(/'/g, "''")}')`)
                .join(', ');

            // Define province to health region mapping (Simplified for logic)
            const regionMapping = [
                ['เชียงราย', 'เขตสุขภาพที่ 1'], ['เชียงใหม่', 'เขตสุขภาพที่ 1'], ['น่าน', 'เขตสุขภาพที่ 1'], ['พะเยา', 'เขตสุขภาพที่ 1'], ['แพร่', 'เขตสุขภาพที่ 1'], ['แม่ฮ่องสอน', 'เขตสุขภาพที่ 1'], ['ลำปาง', 'เขตสุขภาพที่ 1'], ['ลำพูน', 'เขตสุขภาพที่ 1'],
                ['ตาก', 'เขตสุขภาพที่ 2'], ['พิษณุโลก', 'เขตสุขภาพที่ 2'], ['เพชรบูรณ์', 'เขตสุขภาพที่ 2'], ['สุโขทัย', 'เขตสุขภาพที่ 2'], ['อุตรดิตถ์', 'เขตสุขภาพที่ 2'],
                ['กำแพงเพชร', 'เขตสุขภาพที่ 3'], ['ชัยนาท', 'เขตสุขภาพที่ 3'], ['นครสวรรค์', 'เขตสุขภาพที่ 3'], ['พิจิตร', 'เขตสุขภาพที่ 3'], ['อุทัยธานี', 'เขตสุขภาพที่ 3'],
                ['นนทบุรี', 'เขตสุขภาพที่ 4'], ['นครนายก', 'เขตสุขภาพที่ 4'], ['ปทุมธานี', 'เขตสุขภาพที่ 4'], ['พระนครศรีอยุธยา', 'เขตสุขภาพที่ 4'], ['ลพบุรี', 'เขตสุขภาพที่ 4'], ['สระบุรี', 'เขตสุขภาพที่ 4'], ['สิงห์บุรี', 'เขตสุขภาพที่ 4'], ['อ่างทอง', 'เขตสุขภาพที่ 4'],
                ['กาญจนบุรี', 'เขตสุขภาพที่ 5'], ['นครปฐม', 'เขตสุขภาพที่ 5'], ['ราชบุรี', 'เขตสุขภาพที่ 5'], ['สุพรรณบุรี', 'เขตสุขภาพที่ 5'], ['ประจวบคีรีขันธ์', 'เขตสุขภาพที่ 5'], ['เพชรบุรี', 'เขตสุขภาพที่ 5'], ['สมุทรสงคราม', 'เขตสุขภาพที่ 5'], ['สมุทรสาคร', 'เขตสุขภาพที่ 5'],
                ['จันทบุรี', 'เขตสุขภาพที่ 6'], ['ฉะเชิงเทรา', 'เขตสุขภาพที่ 6'], ['ชลบุรี', 'เขตสุขภาพที่ 6'], ['ตราด', 'เขตสุขภาพที่ 6'], ['ปราจีนบุรี', 'เขตสุขภาพที่ 6'], ['ระยอง', 'เขตสุขภาพที่ 6'], ['สระแก้ว', 'เขตสุขภาพที่ 6'], ['สมุทรปราการ', 'เขตสุขภาพที่ 6'],
                ['กาฬสินธุ์', 'เขตสุขภาพที่ 7'], ['ขอนแก่น', 'เขตสุขภาพที่ 7'], ['มหาสารคาม', 'เขตสุขภาพที่ 7'], ['ร้อยเอ็ด', 'เขตสุขภาพที่ 7'],
                ['นครพนม', 'เขตสุขภาพที่ 8'], ['บึงกาฬ', 'เขตสุขภาพที่ 8'], ['เลย', 'เขตสุขภาพที่ 8'], ['สกลนคร', 'เขตสุขภาพที่ 8'], ['หนองคาย', 'เขตสุขภาพที่ 8'], ['หนองบัวลำภู', 'เขตสุขภาพที่ 8'], ['อุดรธานี', 'เขตสุขภาพที่ 8'],
                ['ชัยภูมิ', 'เขตสุขภาพที่ 9'], ['นครราชสีมา', 'เขตสุขภาพที่ 9'], ['บุรีรัมย์', 'เขตสุขภาพที่ 9'], ['สุรินทร์', 'เขตสุขภาพที่ 9'],
                ['มุกดาหาร', 'เขตสุขภาพที่ 10'], ['ยโสธร', 'เขตสุขภาพที่ 10'], ['ศรีสะเกษ', 'เขตสุขภาพที่ 10'], ['อำนาจเจริญ', 'เขตสุขภาพที่ 10'], ['อุบลราชธานี', 'เขตสุขภาพที่ 10'],
                ['กระบี่', 'เขตสุขภาพที่ 11'], ['ชุมพร', 'เขตสุขภาพที่ 11'], ['นครศรีธรรมราช', 'เขตสุขภาพที่ 11'], ['พังงา', 'เขตสุขภาพที่ 11'], ['ภูเก็ต', 'เขตสุขภาพที่ 11'], ['ระนอง', 'เขตสุขภาพที่ 11'], ['สุราษฎร์ธานี', 'เขตสุขภาพที่ 11'],
                ['ตรัง', 'เขตสุขภาพที่ 12'], ['นราธิวาส', 'เขตสุขภาพที่ 12'], ['ปัตตานี', 'เขตสุขภาพที่ 12'], ['พัทลุง', 'เขตสุขภาพที่ 12'], ['ยะลา', 'เขตสุขภาพที่ 12'], ['สงขลา', 'เขตสุขภาพที่ 12'], ['สตูล', 'เขตสุขภาพที่ 12'],
                ['กรุงเทพมหานคร', 'เขตสุขภาพที่ 13']
            ].map(([p, r]) => `('${p}', '${r}')`).join(', ');

            console.log('Initializing DuckDB for DDS Dashboard...');
            db.exec(`
                CREATE TABLE province_map(en VARCHAR, th VARCHAR);
                INSERT INTO province_map VALUES ${mappingValues};
                
                CREATE TABLE region_map(province VARCHAR, region VARCHAR);
                INSERT INTO region_map VALUES ${regionMapping};

                CREATE TABLE dds_raw_en AS SELECT * FROM read_csv_auto('${ddsPath}', ignore_errors=true);
                CREATE TABLE pm25_raw_en AS SELECT * FROM read_csv_auto('${pm25Path}', ignore_errors=true);
                
                -- Create Thai-version views
                CREATE TABLE dds_raw AS 
                SELECT d.* EXCLUDE (province_name), COALESCE(m.th, d.province_name) as province_name, 'เขตสุขภาพที่ ' || CAST(county AS VARCHAR) as region
                FROM dds_raw_en d
                LEFT JOIN province_map m ON d.province_name = m.en;

                CREATE TABLE pm25_raw AS 
                SELECT p.* EXCLUDE (province, "Regional Health"), COALESCE(m.th, p.province) as province, COALESCE(r.region, p."Regional Health") as "Regional Health"
                FROM pm25_raw_en p
                LEFT JOIN province_map m ON p.province = m.en
                LEFT JOIN region_map r ON COALESCE(m.th, p.province) = r.province;

                CREATE TABLE mid_year AS SELECT TRIM(province_name) as province, AVG(TRY_CAST(REPLACE(CAST(population AS VARCHAR), ',', '') AS DOUBLE)) as pop FROM read_csv_auto('${midYearPath}', ignore_errors=true) GROUP BY province_name;
                
                CREATE INDEX idx_dds_prov ON dds_raw (province_name);
                CREATE INDEX idx_dds_diag ON dds_raw ("Disease Type");
                CREATE INDEX idx_dds_dist ON dds_raw (district_name);
                CREATE INDEX idx_dds_sub ON dds_raw (subdistrict_name);
            `, (err: Error | null) => {
                if (err) {
                    console.error('Error initializing DuckDB tables:', err);
                    dbPromise = null;
                    return reject(err);
                }
                console.log('DuckDB tables initialized successfully');
                resolve(db);
            });
        } catch (error) {
            console.error('Unexpected error in getDB:', error);
            dbPromise = null;
            reject(error);
        }
    });
    return dbPromise;
};

export async function getFilterOptions(): Promise<DDSOptions> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        // 1. ดึงข้อมูลวันที่ และรหัสโรคจาก dds_raw
        db.all(`
            SELECT 
                list(DISTINCT CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0') ORDER BY CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0') DESC) as dates,
                list(DISTINCT TRIM("Disease Type") ORDER BY 1 ASC) as diseases,
                list(DISTINCT TRIM(icd10_code) ORDER BY 1 ASC) as icd10_codes
            FROM dds_raw
            WHERE year IS NOT NULL AND month IS NOT NULL;
        `, (err: Error | null, res1: DuckDBRow[]) => {
            if (err) return reject(err);

            // 2. ดึงข้อมูล Hierarchy (Region -> Province -> District -> Subdistrict) จาก dds_raw
            db.all(`
                SELECT DISTINCT 
                    region,
                    province_name as province,
                    TRIM(district_name) as district,
                    TRIM(subdistrict_name) as subdistrict
                FROM dds_raw
                WHERE province_name IS NOT NULL AND district_name IS NOT NULL AND subdistrict_name IS NOT NULL
                ORDER BY region, province, district, subdistrict
            `, (err2: Error | null, res2: DuckDBRow[]) => {
                if (err2) return reject(err2);

                // 3. ดึง Mapping ICD10
                db.all(`
                    SELECT DISTINCT TRIM("Disease Type") as disease, TRIM(icd10_code) as code 
                    FROM dds_raw 
                    WHERE "Disease Type" IS NOT NULL AND icd10_code IS NOT NULL
                `, (err3: Error | null, res3: DuckDBRow[]) => {
                    if (err3) return reject(err3);

                    const icd10_by_disease: Record<string, string[]> = {};
                    (res3 || []).forEach((row) => {
                        const disease = row.disease as string;
                        const code = row.code as string;
                        if (!icd10_by_disease[disease]) icd10_by_disease[disease] = [];
                        icd10_by_disease[disease].push(code);
                    });

                    const row1 = res1[0];
                    const regions = Array.from(new Set(res2.map(r => r.region as string))).sort((a, b) => {
                        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                        return numA - numB;
                    });

                    const provinces = Array.from(new Set(res2.map(r => r.province as string))).sort((a, b) => a.localeCompare(b, 'th'));

                    const hierarchy: HierarchyItem[] = (res2 || []).map(h => ({
                        region: h.region as string,
                        province: h.province as string,
                        district: h.district as string,
                        subdistrict: h.subdistrict as string
                    }));

                    resolve({
                        dates: (row1.dates as string[]) || [],
                        regions,
                        provinces,
                        diseases: (row1.diseases as string[]) || [],
                        icd10_codes: (row1.icd10_codes as string[]) || [],
                        icd10_by_disease,
                        diagnosisTypes: [
                            'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1',
                            'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1+Y97',
                            'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ'
                        ],
                        hierarchy
                    });
                });
            });
        });
    });
}

export async function getDashboardData(filters: Partial<DDSFilters> = {}): Promise<DDSDashboardData> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        let ddsDateFilter = 'AND 1=1';
        let pm25DateFilter = 'AND 1=1';

        console.log('Fetching DDS Dashboard data with filters:', JSON.stringify(filters));

        if (filters.startDate === 'ล่าสุด') {
            ddsDateFilter = `AND (CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0')) = (SELECT MAX(CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0')) FROM dds_raw)`;
            pm25DateFilter = `AND strftime(date, '%Y-%m') = (SELECT MAX(CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0')) FROM dds_raw)`;
        } else if (filters.startDate !== 'ทั้งหมด' && filters.startDate && filters.endDate) {
            ddsDateFilter = `AND (CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0')) BETWEEN '${filters.startDate}' AND '${filters.endDate}'`;
            pm25DateFilter = `AND strftime(date, '%Y-%m') BETWEEN '${filters.startDate}' AND '${filters.endDate}'`;
        }

        const mappedRegions = filters.regions?.map((r: string) => r.replace('เขตสุขภาพที่ ', '').trim());
        const regionsStr = mappedRegions?.length ? mappedRegions.join(',') : null;
        const provincesStr = filters.provinces?.length ? filters.provinces.map((p: string) => `'${p.trim()}'`).join(',') : null;
        const districtsStr = filters.districts?.length ? filters.districts.map((d: string) => `'${d.trim()}'`).join(',') : null;
        const subdistrictsStr = filters.subdistricts?.length ? filters.subdistricts.map((s: string) => `'${s.trim()}'`).join(',') : null;
        const diseasesStr = filters.diseases?.length ? filters.diseases.map((d: string) => `'${d.trim()}'`).join(',') : null;
        const icd10CodesStr = filters.icd10_codes?.length ? filters.icd10_codes.map((c: string) => `'${c.trim()}'`).join(',') : null;

        const ddsLocFilters = [
            regionsStr ? `AND county IN (${regionsStr})` : '',
            provincesStr ? `AND TRIM(province_name) IN (${provincesStr})` : '',
            districtsStr ? `AND TRIM(district_name) IN (${districtsStr})` : '',
            subdistrictsStr ? `AND TRIM(subdistrict_name) IN (${subdistrictsStr})` : ''
        ].join(' ');

        const pm25LocFilters = [
            provincesStr ? `AND TRIM(province) IN (${provincesStr})` : '',
            districtsStr ? `AND TRIM(district) IN (${districtsStr})` : '',
            subdistrictsStr ? `AND TRIM(subdistrict) IN (${subdistrictsStr})` : ''
        ].join(' ');

        const ddsDiseaseFilter = diseasesStr ? `AND TRIM("Disease Type") IN (${diseasesStr})` : '';
        const ddsIcd10Filter = icd10CodesStr ? `AND TRIM(icd10_code) IN (${icd10CodesStr})` : '';

        // --- Diagnosis Type Filter mapping ---
        let ddsDiagnosisFilter = 'AND 1=0'; // Default to nothing if no match found
        const diagType = filters.diagnosisType?.trim();

        const diagType1Codes = ["Z58", "Z581", "J44", "J45", "J442", "I21", "I22", "I24", "H10", "L30.9", "L50"];
        const diagType2Codes = ["Z58", "Z581", "J44", "J45", "J442", "I21", "I22", "I24", "H10", "L30.9", "L50", "Y97"];

        if (diagType === 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1') {
            const codesStr = diagType1Codes.map(c => `'${c}'`).join(',');
            ddsDiagnosisFilter = `AND TRIM(icd10_code) IN (${codesStr})`;
        } else if (diagType === 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1+Y97') {
            const codesStr = diagType2Codes.map(c => `'${c}'`).join(',');
            ddsDiagnosisFilter = `AND TRIM(icd10_code) IN (${codesStr})`;
        } else if (diagType === 'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ') {
            const allowedCodes = ["Z58", "Z581"];
            if (filters.icd10_codes && filters.icd10_codes.length > 0) {
                allowedCodes.push(...filters.icd10_codes);
            }
            const codesStr = allowedCodes.map(c => `'${c}'`).join(',');
            ddsDiagnosisFilter = `AND TRIM(icd10_code) IN (${codesStr})`;
        }

        console.log(`[DDS] Filtering for Type: "${diagType}" | SQL: ${ddsDiagnosisFilter}`);

        // --- Build individual ICD10 filters for each disease group ---
        const icdFilters: Record<string, string> = {};
        DDS_DISEASES.forEach(d => {
            const groupCodes = d.codes || [];
            if (diagType === 'การวินิจฉัย Z58.1 ร่วมกับกลุ่มโรคที่ต้องการ') {
                const selectedCodes = filters.groupedIcd10?.[d.id] || [];
                if (selectedCodes.length > 0) {
                    icdFilters[d.id] = `AND TRIM(icd) IN (${selectedCodes.map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',')})`;
                } else {
                    // "แสดงทุกรหัส" (Show all codes, no default filter)
                    // If health_status, still limit to its group codes if we want to distinguish from 'other'
                    if (d.id === 'health_status') {
                         icdFilters[d.id] = `AND (diag = '${d.dbValue}' OR TRIM(icd) IN (${groupCodes.map(c => `'${c}'`).join(',')}))`;
                    } else {
                         icdFilters[d.id] = `AND diag = '${d.dbValue}'`;
                    }
                }
            } else {
                // For the other two diagnosis types, only count if it matches the group's codes
                const allowed = groupCodes.filter(c => {
                    if (diagType === 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1') return diagType1Codes.includes(c);
                    if (diagType === 'การวินิจฉัยโรคตาม พ.ร.บ.EnvOcc ร่วมกับ Z58.1+Y97') return diagType2Codes.includes(c);
                    return true;
                });
                icdFilters[d.id] = allowed.length > 0 ? `AND TRIM(icd) IN (${allowed.map(c => `'${c}'`).join(',')})` : `AND 1=0`;
            }
        });

        const sqlMain = `
            WITH 
            dds_base AS (
                SELECT 
                    person_id,
                    TRIM(province_name) as prov, 
                    CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0') as dt,
                    TRIM("Disease Type") as diag,
                    TRIM(icd10_code) as icd
                FROM dds_raw
                WHERE 1=1 ${ddsDateFilter} ${ddsLocFilters} ${ddsDiagnosisFilter} ${ddsDiseaseFilter}
            ),
            pm25_monthly AS (
                SELECT 
                    TRIM(province) as prov, 
                    strftime(date, '%Y-%m') as dt, 
                    AVG(pm25) as pm25_avg
                FROM pm25_raw
                WHERE 1=1 ${pm25DateFilter} ${pm25LocFilters}
                GROUP BY 1, 2
            ),
            disease_stats_calc AS (
                SELECT
                    ${DDS_DISEASES.map(d => `SUM(CASE WHEN 1=1 ${icdFilters[d.id]} THEN 1 ELSE 0 END)::DOUBLE as ${d.id}`).join(', ')},
                    SUM(CASE WHEN ${DDS_DISEASES.map(d => `NOT (1=1 ${icdFilters[d.id]})`).join(' AND ')} THEN 1 ELSE 0 END)::DOUBLE as other
                FROM dds_base
            ),
            dds_filtered AS (
                -- กรองเฉพาะแถวที่ตรงกับเงื่อนไข ICD10 ของแต่ละกลุ่มโรคเท่านั้น
                SELECT d.*
                FROM dds_base d
                WHERE (
                    ${DDS_DISEASES.map(d => `(1=1 ${icdFilters[d.id]})`).join(' OR \n                    ')}
                )
            )
            SELECT 
                COUNT(DISTINCT person_id)::DOUBLE as total_patients,
                COUNT(*)::DOUBLE as total_visits,
                (SELECT other FROM disease_stats_calc) as other_patients,
                AVG(p.pm25_avg)::DOUBLE as avg_pm25,
                COUNT(DISTINCT d.prov)::DOUBLE as province_count,
                MAX(d.dt) as latest_date,
                ${DDS_DISEASES.map(d => `(SELECT ${d.id} FROM disease_stats_calc) as ${d.id}`).join(', ')}
            FROM dds_filtered d
            LEFT JOIN pm25_monthly p ON d.prov = p.prov AND d.dt = p.dt
        `;

        db.all(sqlMain, (err: Error | null, resMain: DuckDBRow[]) => {
            if (err) {
                console.error('Error in sqlMain:', err);
                return reject(err);
            }
            const stats = resMain[0] || {};

            const sqlProvinceList = `
                WITH dds_base AS (
                    SELECT TRIM(province_name) as prov, TRIM("Disease Type") as diag, TRIM(icd10_code) as icd,
                    CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0') as dt
                    FROM dds_raw WHERE 1=1 ${ddsDateFilter} ${ddsLocFilters} ${ddsDiagnosisFilter} ${ddsDiseaseFilter}
                ),
                dds_filtered AS (
                    SELECT * FROM dds_base
                    WHERE (
                        ${DDS_DISEASES.map(d => `(1=1 ${icdFilters[d.id]})`).join(' OR ')}
                    )
                ),
                pm25_monthly AS (
                    SELECT TRIM(province) as prov, AVG(pm25) as pm25_avg
                    FROM pm25_raw WHERE 1=1 ${pm25DateFilter} ${pm25LocFilters}
                    GROUP BY 1
                ),
                prov_pop AS (
                    SELECT province, pop FROM mid_year
                )
                SELECT 
                    d.prov as p, 
                    COUNT(d.prov)::DOUBLE as patients,
                    MAX(m.pop)::DOUBLE as prov_pop,
                    MAX(p.pm25_avg)::DOUBLE as pm
                FROM dds_filtered d
                LEFT JOIN pm25_monthly p ON d.prov = p.prov
                LEFT JOIN prov_pop m ON d.prov = m.province
                GROUP BY 1
            `;

            db.all(sqlProvinceList, (errList: Error | null, resList: DuckDBRow[]) => {
                if (errList) {
                    console.error('Error in sqlProvinceList:', errList);
                    return reject(errList);
                }

                const sqlTrend = `
                    WITH dds_base AS (
                        SELECT 
                            TRIM(province_name) as prov, 
                            CAST(year AS VARCHAR) || '-' || LPAD(CAST(month AS VARCHAR), 2, '0') as dt,
                            TRIM("Disease Type") as diag,
                            TRIM(icd10_code) as icd
                        FROM dds_raw 
                        WHERE 1=1 ${ddsDateFilter} ${ddsLocFilters} ${ddsDiagnosisFilter} ${ddsDiseaseFilter}
                    ),
                    dds_filtered AS (
                        SELECT * FROM dds_base
                        WHERE (
                            ${DDS_DISEASES.map(d => `(1=1 ${icdFilters[d.id]})`).join(' OR ')}
                        )
                    ),
                    pm25_monthly AS (
                        SELECT TRIM(province) as prov, strftime(date, '%Y-%m') as dt, AVG(pm25) as pm25_avg
                        FROM pm25_raw 
                        WHERE 1=1 ${pm25DateFilter} ${pm25LocFilters}
                        GROUP BY 1, 2
                    )
                    SELECT 
                        d.dt as month,
                        COUNT(*)::DOUBLE as total,
                        AVG(p.pm25_avg)::DOUBLE as avg_pm25,
                        ${DDS_DISEASES.map(dis => `SUM(CASE WHEN 1=1 ${icdFilters[dis.id]} THEN 1 ELSE 0 END)::DOUBLE as ${dis.id}`).join(', ')}
                    FROM dds_filtered d
                    LEFT JOIN pm25_monthly p ON d.prov = p.prov AND d.dt = p.dt
                    GROUP BY 1 ORDER BY 1 DESC LIMIT 12
                `;

                db.all(sqlTrend, (errTrend: Error | null, resTrend: DuckDBRow[]) => {
                    if (errTrend) {
                        console.error('Error in sqlTrend:', errTrend);
                        return reject(errTrend);
                    }

                    const provinceAverages: Record<string, { value: number; rate: number; pm25: number }> = {};

                    resList.forEach((r) => {
                        const provinceName = r.p as string;
                        if (!provinceName) return;
                        const patients = Number(r.patients) || 0;
                        const pop = Number(r.prov_pop) || 100000;
                        const pm = Number(r.pm) || 0;

                        provinceAverages[provinceName] = {
                            value: patients,
                            rate: (patients / pop) * 100000,
                            pm25: pm
                        };
                    });

                    resolve({
                        totalPatients: Number(stats.total_patients) || 0,
                        totalVisits: Number(stats.total_visits) || 0,
                        otherPatients: Number(stats.other_patients) || 0,
                        avgPM25: stats.avg_pm25 ? Number(stats.avg_pm25).toFixed(1) : '0.0',
                        provinceCount: Number(stats.province_count) || 0,
                        reportDate: stats.latest_date ? new Date(stats.latest_date as string).toISOString().split('T')[0] : null,
                        top5DiseaseStats: DDS_DISEASES.map(d => ({
                            id: d.id,
                            label: d.shortLabel || d.label,
                            value: Number(stats[d.id]) || 0,
                            color: d.color
                        })),
                        monthlyTrend: (resTrend || []).map((m) => {
                            const mapped: MonthlyTrendData = {
                                month: m.month as string,
                                total: Number(m.total) || 0,
                                avg_pm25: m.avg_pm25 ? Number(Number(m.avg_pm25).toFixed(1)) : 0
                            };
                            DDS_DISEASES.forEach(d => { mapped[d.id] = Number(m[d.id]) || 0; });
                            return mapped;
                        }).reverse(),
                        provinceAverages,
                        subdistrictAverages: {},
                        stations: []
                    });
                });
            });
        });
    });
}
