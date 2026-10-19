import { PROVINCE_MAPPING } from '@/lib/constants';

// Helper to fix broken Thai characters (Mojibake)
export const fixThaiMojibake = (str: string) => {
    if (!str) return '';
    
    // ตรวจสอบว่ามีภาษาไทยอยู่แล้วหรือไม่ (\u0E00-\u0E7F) 
    // ถ้ามีอยู่แล้วไม่ต้อง Decode ซ้ำ (ช่วยป้องกันกรณีมีอักขระพิเศษปนแต่เป็นไทยที่อ่านออกแล้ว)
    const hasThai = /[ก-ฮะ-์]/.test(str);
    if (hasThai && !str.includes('à')) return str;

    try {
        const win1252Map: Record<number, number> = {
            8364: 0x80, 8218: 0x82, 402: 0x83, 8222: 0x84, 8230: 0x85, 8224: 0x86, 8225: 0x87,
            710: 0x88, 8240: 0x89, 352: 0x8A, 8249: 0x8B, 338: 0x8C, 381: 0x8E, 8216: 0x91,
            8217: 0x92, 8220: 0x93, 8221: 0x94, 8226: 0x95, 8211: 0x96, 8212: 0x97, 732: 0x98,
            8482: 0x99, 353: 0x9A, 8250: 0x9B, 339: 0x9C, 382: 0x9E, 376: 0x9F,
            // Add missing common characters that might appear in Thai Mojibake
            129: 0x81, 141: 0x8D, 143: 0x8F, 144: 0x90, 157: 0x9D
        };

        const bytes = new Uint8Array(str.split('').map(c => {
            const code = c.charCodeAt(0);
            return win1252Map[code] || (code < 256 ? code : 63);
        }));
        
        const decoded = new TextDecoder('utf-8').decode(bytes);
        // ถ้าผลลัพธ์มีภาษาไทย ให้ใช้ผลลัพธ์นั้น
        if (/[ก-ฮะ-์]/.test(decoded)) return decoded;
        return str;
    } catch (e) {
        return str;
    }
};

// Helper สำหรับทำความสะอาดชื่อเพื่อการจับคู่
export const cleanThaiName = (name: string) => {
    if (!name) return '';
    return name
        .toString()
        .trim()
        .replace(/^(อำเภอเมือง|อำเภอ|เขต|จังหวัด|ตำบล|แขวง|ต\.|อ\.|จ\.|เมือง)/, '')
        .replace(/\s+/g, '')
        .replace(/เเ/g, 'แ')
        .trim();
};

export const normalizeProvinceName = (pName: string) => {
    if (!pName) return '';
    const fixed = fixThaiMojibake(pName).trim();
    if (fixed === 'กรุงเทพมหานคร' || fixed === 'Bangkok' || fixed === 'Bangkok Metropolis') {
        return 'กรุงเทพมหานคร';
    }
    for (const [en, th] of Object.entries(PROVINCE_MAPPING)) {
        if (fixed.toLowerCase() === en.toLowerCase()) return th;
    }
    return fixed;
};

export function getProvinceFeatureStyle({
    isSelected = true,
    focusSelectedSubdistricts = false,
    rawValue,
    getColor
}: {
    isSelected?: boolean;
    focusSelectedSubdistricts?: boolean;
    rawValue?: any;
    getColor: (val: number) => string;
}) {
    const hasData = rawValue !== undefined && rawValue !== null && (typeof rawValue === 'object' ? rawValue.value !== undefined && rawValue.value !== null : true);
    const value = typeof rawValue === 'object' ? (rawValue.value || 0) : (rawValue || 0);

    const strokeColor = focusSelectedSubdistricts ? '#1e293b' : (isSelected ? '#475569' : '#64748b');
    const strokeWeight = focusSelectedSubdistricts ? 2.2 : (isSelected ? 1.5 : 1.0);

    return {
        fillColor: hasData ? getColor(value) : '#cbd5e1',
        weight: strokeWeight,
        opacity: 1,
        color: strokeColor,
        fillOpacity: hasData ? (isSelected ? 0.7 : 0.2) : (isSelected ? 0.7 : 0.2)
    };
}
