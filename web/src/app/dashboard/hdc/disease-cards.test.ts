import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HDC_DISEASES } from '@/lib/constants';

test('disease stats always contain all 5 disease groups even if dataset is empty', () => {
    const rawDataStats: { id: string; label: string; value: number; color: string }[] = [];

    const allDiseaseStats = HDC_DISEASES.map(d => {
        const found = rawDataStats.find(s => 
            s.id === d.id || 
            s.id === d.dbValue || 
            s.label === d.label || 
            d.dbValues.includes(s.label) || 
            d.dbValues.includes(s.id)
        );
        return {
            id: d.id,
            label: d.label,
            value: found ? (found.value ?? 0) : 0,
            color: d.color
        };
    });

    assert.equal(allDiseaseStats.length, 5);
    for (const stat of allDiseaseStats) {
        assert.equal(stat.value, 0);
    }
});

test('disease stats preserve found values and fill missing diseases with 0', () => {
    const rawDataStats = [
        { id: 'Acute asthma', label: 'Acute asthma', value: 450, color: 'rose' },
        { id: 'Acute ischemic heart diseases', label: 'Acute ischemic heart diseases', value: 120, color: 'orange' }
    ];

    const allDiseaseStats = HDC_DISEASES.map(d => {
        const found = rawDataStats.find(s => 
            s.id === d.id || 
            s.id === d.dbValue || 
            s.label === d.label || 
            d.dbValues.includes(s.label) || 
            d.dbValues.includes(s.id)
        );
        return {
            id: d.id,
            label: d.label,
            value: found ? (found.value ?? 0) : 0,
            color: d.color
        };
    });

    const sorted = [...allDiseaseStats].sort((a, b) => b.value - a.value);

    assert.equal(sorted.length, 5);
    assert.equal(sorted[0].label, 'Acute asthma');
    assert.equal(sorted[0].value, 450);
    assert.equal(sorted[1].label, 'Acute ischemic heart diseases');
    assert.equal(sorted[1].value, 120);
    assert.equal(sorted[2].value, 0);
    assert.equal(sorted[3].value, 0);
    assert.equal(sorted[4].value, 0);
});
