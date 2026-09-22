import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPM25ProvinceAliases, getPM25RegionAliases } from './province-filter';

test('keeps the selected Thai province name and includes its English alias', () => {
    assert.deepEqual(getPM25ProvinceAliases(' เชียงใหม่ '), ['เชียงใหม่', 'Chiang Mai']);
});

test('includes every supported English alias without dropping the Thai name', () => {
    assert.deepEqual(
        getPM25ProvinceAliases('กรุงเทพมหานคร'),
        ['กรุงเทพมหานคร', 'Bangkok Metropolis', 'Bangkok'],
    );
});

test('keeps an unmapped province name so Thai PM2.5 rows remain filterable', () => {
    assert.deepEqual(getPM25ProvinceAliases('จังหวัดทดสอบ'), ['จังหวัดทดสอบ']);
});

test('supports both labeled and numeric PM2.5 health-region values', () => {
    assert.deepEqual(getPM25RegionAliases('เขตสุขภาพที่ 1'), ['เขตสุขภาพที่ 1', '1']);
    assert.deepEqual(getPM25RegionAliases('เขตสุขภาพที่ 13'), ['เขตสุขภาพที่ 13', '13']);
});
