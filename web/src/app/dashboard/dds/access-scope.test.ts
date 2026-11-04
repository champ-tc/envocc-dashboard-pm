import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDDSAccessScope } from './filter-utils';

const filters = { regions: [], provinces: [], districts: [], subdistricts: [] };

test('province scope overrides client-provided geography filters', () => {
    assert.deepEqual(
        applyDDSAccessScope({ ...filters, provinces: ['จังหวัดอื่น'] }, { isProvince: true, province: 'เชียงใหม่' }),
        { ...filters, provinces: ['เชียงใหม่'] },
    );
});

test('region scope overrides client-provided geography filters', () => {
    assert.deepEqual(
        applyDDSAccessScope({ ...filters, provinces: ['เชียงใหม่'] }, { isRegion: true, region: 'สำนักงานป้องกันควบคุมโรคที่ 1' }),
        { ...filters, regions: ['เขตสุขภาพที่ 1'] },
    );
});
