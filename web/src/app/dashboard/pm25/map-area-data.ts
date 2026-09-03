export type AreaLevel = 'province' | 'district' | 'subdistrict';
export interface AreaIdentity { province: string; district?: string; subdistrict?: string }
export interface Streak { days: number; start: string | null; end: string | null }
export interface AreaSummary { name: string; max: number; streak37: Streak; streak75: Streak }
export interface MapAreas { level: AreaLevel; values: Record<string, AreaSummary> }
export interface AreaDay extends AreaIdentity { date: string; value: number | null; max: number | null }

export function areaKey(area: AreaIdentity, level: AreaLevel) {
    const normalize = (name: string = '', prefix: RegExp) => name.trim().replace(prefix, '').replace(/\s+/g, '').replace(/เเ/g, 'แ');
    const parts = [normalize(area.province, /^(จังหวัด|จ\.)\s*/)];
    if (level !== 'province') parts.push(normalize(area.district, /^(อำเภอ|อ\.|เขต)\s*/));
    if (level === 'subdistrict') parts.push(normalize(area.subdistrict, /^(ตำบล|ต\.|แขวง)\s*/));
    return JSON.stringify(parts);
}

function latestStreak(points: AreaDay[], threshold: number, minimum: number): Streak {
    let current: string[] = [];
    let latest: string[] = [];
    for (const point of points) {
        const previous = current.at(-1);
        const consecutive = !previous || Date.parse(point.date) - Date.parse(previous) === 86400000;
        if (!(typeof point.value === 'number' && point.value > threshold) || !consecutive) {
            if (current.length >= minimum) latest = current;
            current = [];
        }
        if (typeof point.value === 'number' && point.value > threshold) current.push(point.date);
    }
    if (current.length >= minimum) latest = current;
    return { days: latest.length, start: latest[0] || null, end: latest.at(-1) || null };
}

export function summarizeMapAreas(rows: AreaDay[], level: AreaLevel): MapAreas {
    const groups = new Map<string, AreaDay[]>();
    for (const row of rows) {
        if (!row.province?.trim() || (level !== 'province' && !row.district?.trim()) || (level === 'subdistrict' && !row.subdistrict?.trim())) continue;
        if (typeof row.max !== 'number' || !Number.isFinite(row.max)) continue;
        const key = areaKey(row, level);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
    }
    const values: MapAreas['values'] = {};
    for (const [key, points] of groups) {
        points.sort((a, b) => a.date.localeCompare(b.date));
        const first = points[0];
        const names = level === 'province' ? [first.province] : level === 'district'
            ? [first.district, first.province] : [first.subdistrict, first.district, first.province];
        values[key] = {
            name: names.join(', '),
            max: points.reduce((maximum, point) => Math.max(maximum, point.max!), -Infinity),
            streak37: latestStreak(points, 37.5, 1),
            streak75: latestStreak(points, 75, 2),
        };
    }
    return { level, values };
}
