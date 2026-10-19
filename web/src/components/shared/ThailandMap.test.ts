import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getProvinceFeatureStyle, cleanThaiName, normalizeProvinceName } from './thailand-map-utils';

const mockColorScale = (val: number) => {
    if (val <= 10) return '#fee2e2';
    if (val <= 50) return '#fecaca';
    return '#991b1b';
};

test('province with no data keeps visible province border and neutral background', () => {
    const styleHdc = getProvinceFeatureStyle({
        isSelected: true,
        focusSelectedSubdistricts: false,
        rawValue: undefined,
        getColor: mockColorScale
    });

    assert.equal(styleHdc.color, '#475569', 'border line color must be visible dark slate');
    assert.equal(styleHdc.weight, 1.5, 'border weight must be 1.5');
    assert.equal(styleHdc.opacity, 1, 'border opacity must be 1');
    assert.equal(styleHdc.fillColor, '#cbd5e1', 'provinces without data must not be colored with data scale');

    const stylePm25 = getProvinceFeatureStyle({
        isSelected: true,
        focusSelectedSubdistricts: true,
        rawValue: undefined,
        getColor: mockColorScale
    });

    assert.equal(stylePm25.color, '#1e293b', 'border line color for PM25 must be dark slate navy');
    assert.equal(stylePm25.weight, 2.2, 'border weight for PM25 must be 2.2');
    assert.equal(stylePm25.fillColor, '#cbd5e1');
});

test('province with zero data gets colored with lowest scale value and preserves border', () => {
    const style = getProvinceFeatureStyle({
        isSelected: true,
        focusSelectedSubdistricts: false,
        rawValue: { value: 0, rate: 0 },
        getColor: mockColorScale
    });

    assert.equal(style.fillColor, '#fee2e2', 'zero value should use lowest scale color');
    assert.equal(style.color, '#475569');
    assert.equal(style.weight, 1.5);
});

test('province with positive data gets colored properly and preserves border', () => {
    const style = getProvinceFeatureStyle({
        isSelected: true,
        focusSelectedSubdistricts: false,
        rawValue: { value: 100, rate: 5.5 },
        getColor: mockColorScale
    });

    assert.equal(style.fillColor, '#991b1b');
    assert.equal(style.color, '#475569');
    assert.equal(style.weight, 1.5);
});

test('unselected province retains visible border line rather than disappearing', () => {
    const style = getProvinceFeatureStyle({
        isSelected: false,
        focusSelectedSubdistricts: false,
        rawValue: undefined,
        getColor: mockColorScale
    });

    assert.equal(style.color, '#64748b', 'unselected province stroke must remain visible');
    assert.equal(style.weight, 1.0);
});

test('name normalization cleans prefixes and maps English names', () => {
    assert.equal(cleanThaiName('จังหวัดเชียงใหม่'), 'เชียงใหม่');
    assert.equal(cleanThaiName('จ.เชียงใหม่'), 'เชียงใหม่');
    assert.equal(cleanThaiName('อำเภอเมืองเชียงใหม่'), 'เชียงใหม่');
    assert.equal(normalizeProvinceName('Bangkok'), 'กรุงเทพมหานคร');
    assert.equal(normalizeProvinceName('Chiang Mai'), 'เชียงใหม่');
});
