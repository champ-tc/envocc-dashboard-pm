import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDDSFilteredDiseasePredicate } from './filter-utils';

test('only selected disease-card predicates are included in the filtered dataset', () => {
    const predicate = buildDDSFilteredDiseasePredicate(
        ['respiratory', 'health_status'],
        {
            respiratory: "AND (normalize(icd) LIKE 'J44%')",
            health_status: "AND (normalize(icd) LIKE 'Z581%')",
            circulatory: 'AND (1=0)',
        },
    );

    assert.equal(
        predicate,
        "((1=1 AND (normalize(icd) LIKE 'J44%')) OR (1=1 AND (normalize(icd) LIKE 'Z581%')))",
    );
    assert.doesNotMatch(predicate, /NOT/);
});

test('returns no rows when every disease-card selection is empty', () => {
    assert.equal(
        buildDDSFilteredDiseasePredicate(
            ['respiratory', 'health_status'],
            { respiratory: 'AND 1=0', health_status: 'AND 1=0' },
        ),
        '((1=1 AND 1=0) OR (1=1 AND 1=0))',
    );
});
