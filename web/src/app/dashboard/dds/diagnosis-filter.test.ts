import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildDiagnosisHaving,
    DDS_DIAGNOSIS_TYPES,
    getCountedDiagnosisCodes,
    getRequiredDiagnosisCodes,
} from './diagnosis-filter';

const lawCodes = ['Z58.1', 'J44', 'J45', 'Y97'];

test('law with Z58.1 requires Z581 and at least one law code', () => {
    assert.deepEqual(
        getRequiredDiagnosisCodes(DDS_DIAGNOSIS_TYPES.lawWithZ581, lawCodes),
        ['Z581', 'J44', 'J45'],
    );
    assert.match(buildDiagnosisHaving(['Z581'], ['J44', 'J45']), /Z581[\s\S]*AND[\s\S]*J44[\s\S]*OR[\s\S]*J45/);
});

test('law with Z58.1+Y97 requires all three diagnosis parts', () => {
    assert.deepEqual(
        getRequiredDiagnosisCodes(DDS_DIAGNOSIS_TYPES.lawWithZ581AndY97, lawCodes),
        ['Z581', 'Y97', 'J44', 'J45'],
    );
});

test('custom mode requires Z58.1 only', () => {
    assert.deepEqual(
        getRequiredDiagnosisCodes(DDS_DIAGNOSIS_TYPES.customWithZ581, lawCodes),
        ['Z581'],
    );
});

test('legal modes do not count Z581 or Y97 as diagnoses', () => {
    assert.deepEqual(
        getCountedDiagnosisCodes(DDS_DIAGNOSIS_TYPES.lawWithZ581, ['Z58.1', 'J44', 'Y97']),
        ['J44'],
    );
    assert.deepEqual(
        getCountedDiagnosisCodes(DDS_DIAGNOSIS_TYPES.lawWithZ581AndY97, ['Z581', 'Y97', 'J44']),
        ['J44'],
    );
});
