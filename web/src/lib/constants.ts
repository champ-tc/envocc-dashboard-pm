export const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const WORKPLACE_TYPES = [
    { label: 'สำนักงานสาธารณสุขจังหวัด', requireName: false, requireProvince: true },
    { label: 'สำนักงานป้องกันควบคุมโรค', requireName: false, requireDdcRegion: true },
    { label: 'โรงพยาบาล', requireName: true },
    { label: 'มหาวิทยาลัย/สถาบันการศึกษา', requireName: true },
    { label: 'องค์กรอิสระ', requireName: true },
    { label: 'เจ้าหน้าที่ภาครัฐ/รัฐวิสาหกิจ', requireName: true },
    { label: 'เจ้าหน้าที่ EnvOcc', requireName: false },
    { label: 'นักเรียน/นักศึกษา', requireName: true },
    { label: 'ประชาชนทั่วไป', requireName: false }
];

export const DDC_REGIONS = [
    'สำนักงานป้องกันควบคุมโรคที่ 1 เชียงใหม่',
    'สำนักงานป้องกันควบคุมโรคที่ 2 พิษณุโลก',
    'สำนักงานป้องกันควบคุมโรคที่ 3 นครสวรรค์',
    'สำนักงานป้องกันควบคุมโรคที่ 4 สระบุรี',
    'สำนักงานป้องกันควบคุมโรคที่ 5 ราชบุรี',
    'สำนักงานป้องกันควบคุมโรคที่ 6 ชลบุรี',
    'สำนักงานป้องกันควบคุมโรคที่ 7 ขอนแก่น',
    'สำนักงานป้องกันควบคุมโรคที่ 8 อุดรธานี',
    'สำนักงานป้องกันควบคุมโรคที่ 9 นครราชสีมา',
    'สำนักงานป้องกันควบคุมโรคที่ 10 อุบลราชธานี',
    'สำนักงานป้องกันควบคุมโรคที่ 11 นครศรีธรรมราช',
    'สำนักงานป้องกันควบคุมโรคที่ 12 สงขลา',
    'สถาบันป้องกันควบคุมโรคเขตเมือง'
];

export const PERSONNEL_TYPES = [
    'ข้าราชการ',
    'พนักงานราชการ',
    'พนักงานกระทรวงสาธารณสุข',
    'ลูกจ้าง',
    'เอกชน'
];

export const PROVINCE_MAPPING: Record<string, string> = {
    "Mae Hong Son": "แม่ฮ่องสอน",
    "Chumphon": "ชุมพร",
    "Nakhon Si Thammarat": "นครศรีธรรมราช",
    "Phuket": "ภูเก็ต",
    "Phangnga": "พังงา",
    "Ranong": "ระนอง",
    "Surat Thani": "สุราษฎร์ธานี",
    "Krabi": "กระบี่",
    "Phatthalung": "พัทลุง",
    "Satun": "สตูล",
    "Songkhla": "สงขลา",
    "Trang": "ตรัง",
    "Yala": "ยะลา",
    "Chiang Rai": "เชียงราย",
    "Chiang Mai": "เชียงใหม่",
    "Lampang": "ลำปาง",
    "Lamphun": "ลำพูน",
    "Nan": "น่าน",
    "Phayao": "พะเยา",
    "Phrae": "แพร่",
    "Phitsanulok": "พิษณุโลก",
    "Sukhothai": "สุโขทัย",
    "Uttaradit": "อุตรดิตถ์",
    "Kanchanaburi": "กาญจนบุรี",
    "Kamphaeng Phet": "กำแพงเพชร",
    "Phichit": "พิจิตร",
    "Phetchabun": "เพชรบูรณ์",
    "Suphan Buri": "สุพรรณบุรี",
    "Tak": "ตาก",
    "Uthai Thani": "อุทัยธานี",
    "Ang Thong": "อ่างทอง",
    "Chai Nat": "ชัยนาท",
    "Lop Buri": "ลพบุรี",
    "Nakhon Nayok": "นครนายก",
    "Prachin Buri": "ปราจีนบุรี",
    "Nakhon Sawan": "นครสวรรค์",
    "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
    "Pathum Thani": "ปทุมธานี",
    "Sing Buri": "สิงห์บุรี",
    "Saraburi": "สระบุรี",
    "Bangkok Metropolis": "กรุงเทพมหานคร",
    "Bangkok": "กรุงเทพมหานคร",
    "Nonthaburi": "นนทบุรี",
    "Nakhon Pathom": "นครปฐม",
    "Phetchaburi": "เพชรบุรี",
    "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
    "Ratchaburi": "ราชบุรี",
    "Samut Prakan": "สมุทรปราการ",
    "Samut Sakhon": "สมุทรสาคร",
    "Samut Songkhram": "สมุทรสงคราม",
    "Si Sa Ket": "ศรีสะเกษ",
    "Buri Ram": "บุรีรัมย์",
    "Chaiyaphum": "ชัยภูมิ",
    "Chon Buri": "ชลบุรี",
    "Rayong": "ระยอง",
    "Chanthaburi": "จันทบุรี",
    "Trat": "ตราด",
    "Sa Kaeo": "สระแก้ว",
    "Chachoengsao": "ฉะเชิงเทรา",
    "Maha Sarakham": "มหาสารคาม",
    "Nong Khai": "หนองคาย",
    "Amnat Charoen": "อำนาจเจริญ",
    "Bung Kan": "บึงกาฬ",
    "Bueng Kan": "บึงกาฬ",
    "Kalasin": "กาฬสินธุ์",
    "Khon Kaen": "ขอนแก่น",
    "Loei": "เลย",
    "Mukdahan": "มุกดาหาร",
    "Nakhon Phanom": "นครพนม",
    "Nakhon Ratchasima": "นครราชสีมา",
    "Nong Bua Lam Phu": "หนองบัวลำภู",
    "Roi Et": "ร้อยเอ็ด",
    "Sakon Nakhon": "สกลนคร",
    "Surin": "สุรินทร์",
    "Ubon Ratchathani": "อุบลราชธานี",
    "Udon Thani": "อุดรธานี",
    "Yasothon": "ยโสธร",
    "Narathiwat": "นราธิวาส",
    "Pattani": "ปัตตานี"
};

export const DDS_DISEASES = [
    { id: 'respiratory', dbValue: 'โรคระบบทางเดินหายใจ', codes: ['J44', 'J45', 'J442'], label: 'โรคระบบทางเดินหายใจ', shortLabel: 'ระบบทางเดินหายใจ', color: 'rose', hex: '#f43f5e' },
    { id: 'circulatory', dbValue: 'โรคระบบไหลเวียนเลือด', codes: ['I21', 'I22', 'I24'], label: 'โรคระบบไหลเวียนเลือด', shortLabel: 'ระบบไหลเวียนเลือด', color: 'orange', hex: '#f97316' },
    { id: 'skin', dbValue: 'โรคผิวหนังและเนื้อเยื่อใต้ผิวหนัง', codes: ['L30.9', 'L50'], label: 'โรคผิวหนังและเนื้อเยื่อใต้ผิวหนัง', shortLabel: 'โรคผิวหนัง', color: 'emerald', hex: '#10b981' },
    { id: 'eye', dbValue: 'โรคตารวมส่วนประกอบของตา', codes: ['H10'], label: 'โรคตารวมส่วนประกอบของตา', shortLabel: 'โรคตา', color: 'blue', hex: '#3b82f6' },
    { id: 'health_status', dbValue: 'ปัจจัยที่มีผลต่อสถานะสุขภาพ และการรับบริการสุขภาพ', codes: ['Z58', 'Z581', 'Y97'], label: 'กลุ่มโรคอื่นๆ', shortLabel: 'กลุ่มโรคอื่นๆ', color: 'purple', hex: '#a855f7' },
];

export const HDC_DISEASES = [
    { id: 'respiratory', dbValue: 'respiratory', dbValues: ['Acute asthma', 'Chronic obstructive pulmonary disease'], codes: ['J44', 'J45', 'J442'], label: 'โรคระบบทางเดินหายใจ', shortLabel: 'ระบบทางเดินหายใจ', color: 'rose', hex: '#f43f5e' },
    { id: 'circulatory', dbValue: 'circulatory', dbValues: ['Acute ischemic heart diseases'], codes: ['I21', 'I22', 'I24'], label: 'โรคระบบไหลเวียนเลือด', shortLabel: 'ระบบไหลเวียนเลือด', color: 'orange', hex: '#f97316' },
    { id: 'eye', dbValue: 'eye', dbValues: ['กลุ่มโรคตาอักเสบ'], codes: ['H10'], label: 'โรคตารวมส่วนประกอบของตา', shortLabel: 'โรคตา', color: 'emerald', hex: '#10b981' },
    { id: 'skin', dbValue: 'skin', dbValues: ['กลุ่มโรคผิวหนังอักเสบ'], codes: ['L30.9', 'L50'], label: 'โรคผิวหนังและเนื้อเยื่อใต้ผิวหนัง', shortLabel: 'โรคผิวหนัง', color: 'blue', hex: '#3b82f6' },
];
