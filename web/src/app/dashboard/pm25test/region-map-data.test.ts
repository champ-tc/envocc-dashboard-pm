import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FeatureCollection } from 'geojson';
import { buildRegionMap } from './region-map-data';

const source: FeatureCollection = {
    type: 'FeatureCollection',
    features: ['A', 'B', 'C'].map((name, i) => ({
        type: 'Feature', properties: { name },
        geometry: { type: 'Polygon', coordinates: [[[i, 0], [i + 1, 0], [i + 1, 1], [i, 0]]] },
    })),
};
const hierarchy = [
    { region: 'เขต 1', province: 'ก' },
    { region: 'เขต 1', province: 'ก' },
    { region: 'เขต 1', province: 'ข' },
    { region: 'เขต 2', province: 'ค' },
];
const names = { A: 'ก', B: 'ข', C: 'ค' };

test('selected region uses one maximum, not the sum or a value from another region', () => {
    const result = buildRegionMap(source, hierarchy, ['เขต 1'], { ก: 40, ข: 50, ค: 99 }, names);
    assert.equal(result.features.length, 1);
    assert.equal(result.features[0].geometry.coordinates.length, 2);
    assert.deepEqual(result.features[0].properties, { region: 'เขต 1', value: 50, provinceCount: 2 });
});

test('multiple regions have separate maxima, including zero streaks and normalized province names', () => {
    const result = buildRegionMap(source, hierarchy, ['เขต 1', 'เขต 2', 'เขต 1'], { 'จังหวัดก': 3 }, names);
    assert.deepEqual(result.features.map(feature => feature.properties.value), [3, 0]);
    assert.deepEqual(buildRegionMap(source, hierarchy, [], {}, names).features, []);
});

test('streak values use the largest province count and ignore non-finite values', () => {
    const result = buildRegionMap(source, hierarchy, ['เขต 1', 'เขต 2'], { ก: 3, ข: 7, ค: NaN }, names);
    assert.deepEqual(result.features.map(feature => feature.properties.value), [7, 0]);
});
