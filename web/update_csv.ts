import { writeFileSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Script to update dashboard_dds.csv and pm25.csv
 * 
 * NOTE: The current source code expects specific formats for these files.
 * If you use a different format, the dashboard might not work correctly.
 * 
 * Current formats expected:
 * 
 * dashboard_dds.csv:
 * person_id,year,week,month,province_name,icd10_code,Disease Type,disease,Diagnosis_z581_envocc,Diagnosis_z581_y97,Diagnosis_z581_all
 * 
 * pm25.csv:
 * date,station_id_new,province,district,subdistrict,pm25,Regional Health,PM2.5>37.5,station_id_new3
 */

// 1. Update dashboard_dds.csv
// Since the new data provided is summarized (province,amphoe,tambon,date,count),
// we need to map it to the expected format or update the code to handle it.
// For now, I will show how to create a file in the format expected by the current code.

const ddsData = [
    { province: 'Bangkok', amphoe: 'Phra Nakhon', tambon: 'Phra Borom Maha Ratchawang', date: '2024-01-01', count: 10 },
    { province: 'Bangkok', amphoe: 'Phra Nakhon', tambon: 'Wang Burapha Phirom', date: '2024-01-01', count: 15 },
    { province: 'Chiang Mai', amphoe: 'Mueang Chiang Mai', tambon: 'Si Phum', date: '2024-01-01', count: 20 },
    { province: 'Chiang Mai', amphoe: 'Mueang Chiang Mai', tambon: 'Phra Sing', date: '2024-01-01', count: 25 },
];

// Reconstructing as individual patients to match current logic (demo)
let ddsCSV = 'person_id,year,week,month,province_name,icd10_code,Disease Type,disease,Diagnosis_z581_envocc,Diagnosis_z581_y97,Diagnosis_z581_all\n';
let pid = 1;
ddsData.forEach(item => {
    const [y, m, d] = item.date.split('-');
    for (let i = 0; i < item.count; i++) {
        // Dummy data for other columns to keep dashboard working
        ddsCSV += `${pid++},${y},1,${parseInt(m)},${item.province},J30.1,โรคระบบทางเดินหายใจ,Allergic rhinitis,0,0,1\n`;
    }
});

writeFileSync(path.join(process.cwd(), 'public', 'duckdb', 'dashboard_dds.csv'), ddsCSV);
console.log('Updated dashboard_dds.csv');

// 2. Update pm25.csv
// User format: "PROVINCE_NAME","AMPHUR_NAME","TAMBON_NAME","date","pm25_value"
// Target format: date,station_id_new,province,district,subdistrict,pm25,Regional Health,PM2.5>37.5,station_id_new3

const pm25NewData = [
    { province: 'Bangkok', amphoe: 'Phra Nakhon', tambon: 'Phra Borom Maha Ratchawang', date: '2024-01-01', pm25: 12.5 },
    { province: 'Bangkok', amphoe: 'Phra Nakhon', tambon: 'Wang Burapha Phirom', date: '2024-01-01', pm25: 14.2 },
    { province: 'Chiang Mai', amphoe: 'Mueang Chiang Mai', tambon: 'Si Phum', date: '2024-01-01', pm25: 45.8 },
    { province: 'Chiang Mai', amphoe: 'Mueang Chiang Mai', tambon: 'Phra Sing', date: '2024-01-01', pm25: 42.3 },
];

let pm25CSV = 'date,station_id_new,province,district,subdistrict,pm25,Regional Health,PM2.5>37.5,station_id_new3\n';
pm25NewData.forEach((item, i) => {
    const region = item.province === 'Bangkok' ? 'เขตสุขภาพที่ 13' : 'เขตสุขภาพที่ 1';
    pm25CSV += `${item.date},stat_${i},${item.province},${item.amphoe},${item.tambon},${item.pm25},${region},${item.pm25 > 37.5 ? 1 : 0},stat_${i}_0_0\n`;
});

writeFileSync(path.join(process.cwd(), 'public', 'duckdb', 'pm25.csv'), pm25CSV);
console.log('Updated pm25.csv');
