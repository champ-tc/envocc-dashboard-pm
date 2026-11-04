import assert from 'node:assert/strict';
import { test } from 'node:test';
import { restrictDDSOptionsToScope } from './filter-utils';

const options = {
    regions: ['เขตสุขภาพที่ 1', 'เขตสุขภาพที่ 2'],
    provinces: ['เชียงใหม่', 'พิษณุโลก'],
    hierarchy: [
        { region: 'เขตสุขภาพที่ 1', province: 'เชียงใหม่' },
        { region: 'เขตสุขภาพที่ 2', province: 'พิษณุโลก' },
    ],
};

test('restricts DDS options to the province scope', () => {
    assert.deepEqual(restrictDDSOptionsToScope(options, { isProvince: true, province: 'เชียงใหม่' }), {
        ...options,
        regions: ['เขตสุขภาพที่ 1'],
        provinces: ['เชียงใหม่'],
        hierarchy: [options.hierarchy[0]],
    });
});
