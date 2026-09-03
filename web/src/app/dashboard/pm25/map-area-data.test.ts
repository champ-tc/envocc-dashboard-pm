import assert from 'node:assert/strict';
import { areaKey, summarizeMapAreas, type AreaDay } from './map-area-data';

const rows: AreaDay[] = [
    { province: 'A', district: 'D', subdistrict: 'T', date: '2026-01-01', value: 80, max: 100 },
    { province: 'A', district: 'D', subdistrict: 'T', date: '2026-01-02', value: 90, max: 110 },
    { province: 'A', district: 'D', subdistrict: 'T', date: '2026-01-04', value: 76, max: 76 },
    { province: 'B', district: 'D', subdistrict: 'T', date: '2026-01-01', value: 0, max: 0 },
    { province: 'A', district: 'E', subdistrict: 'T', date: '2026-01-01', value: 37.5, max: 37.5 },
    { province: 'A', district: 'D', subdistrict: 'missing', date: '2026-01-01', value: null, max: null },
];
const { values } = summarizeMapAreas(rows, 'subdistrict');
assert.equal(Object.keys(values).length, 3, 'hide missing, retain zero, separate same-name areas');
assert.equal(values[areaKey(rows[3], 'subdistrict')].max, 0);
assert.equal(values[areaKey(rows[4], 'subdistrict')].streak37.days, 0, 'strictly above threshold');
const area = values[areaKey(rows[0], 'subdistrict')];
assert.equal(area.max, 110);
assert.equal(area.name, 'T, D, A');
assert.deepEqual(area.streak37, { days: 1, start: '2026-01-04', end: '2026-01-04' });
assert.deepEqual(area.streak75, { days: 2, start: '2026-01-01', end: '2026-01-02' });
assert.equal(areaKey({ province: 'จ. A', district: 'อำเภอ D', subdistrict: 'ตำบล T' }, 'subdistrict'), areaKey(rows[0], 'subdistrict'));
assert.notEqual(areaKey({ province: 'A', district: 'เมืองD' }, 'district'), areaKey(rows[0], 'district'));
for (const level of ['province', 'district', 'subdistrict'] as const) {
    assert.equal(Object.keys(summarizeMapAreas([], level).values).length, 0);
    assert.equal(Object.keys(summarizeMapAreas([{ ...rows[0], max: null }], level).values).length, 0);
}
console.log('PASS PM25 map areas: exact geography, missing vs zero, maxima and local streak dates');
