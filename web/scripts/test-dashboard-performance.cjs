// Run: node scripts/test-dashboard-performance.cjs (no external services required).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const duckdb = require('duckdb');
const root = path.resolve(__dirname, '..');

function load(file, dependencies = {}, globals = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(code, { exports, console, ...globals, require: name => {
        if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
        return dependencies[name];
    } });
    return exports;
}

async function main() {
    const { prepareChartSeries, nearestChartPoint } = load('src/lib/dashboard-chart.ts');
    const dates = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10));
    const labels = Array.from({ length: 77 }, (_, i) => `Province ${i}`);
    const data = Object.fromEntries(labels.map(label => [label, dates.map((date, i) => ({ date, value: i % 100 }))]));
    const original = JSON.stringify(data);
    const series = prepareChartSeries(data, labels, dates, 110);
    assert.equal(JSON.stringify(data), original, 'input must not be mutated');
    assert.equal(series.length, 77);
    assert.equal(series.flatMap(s => s.points).length, 28105, 'all daily points retained');
    for (const s of series) {
        const legacyPath = data[s.label].map(p => `${dates.indexOf(p.date) / 364 * 100},${100 - p.value / 110 * 100}`).join(' ');
        assert.equal(s.path, legacyPath, 'geometry must match previous chart exactly');
    }
    for (let x = -5; x <= 105; x += 0.13) {
        const points = series[0].points;
        const expected = points.reduce((best, p) => Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best);
        assert.equal(nearestChartPoint(points, x), expected);
    }
    assert.equal(nearestChartPoint([], 50), undefined);
    const single = prepareChartSeries({ a: [{ date: '2026-01-01', value: 0 }] }, ['a'], ['2026-01-01'], 100)[0];
    assert.equal(single.points[0].x, 50);
    assert.equal(nearestChartPoint(single.points, 100), single.points[0]);
    console.log('PASS chart: 28,105 points unchanged; nearest-point lookup including empty/single/boundary cases');

    let requests = 0;
    let fail = true;
    const geometry = { type: 'FeatureCollection', features: [] };
    const maps = load('src/lib/dashboard-map-data.ts', {}, { fetch: async () => {
        requests++;
        return { ok: !fail, status: 503, json: async () => geometry };
    } });
    assert.equal(maps.needsTambonBoundaries({}, 0), false);
    assert.equal(maps.needsTambonBoundaries({ provinces: ['A'] }, 0), true);
    assert.equal(maps.needsTambonBoundaries({ districts: ['B'] }, 0), true);
    assert.equal(maps.needsTambonBoundaries({}, 1), true, 'retain DDS national station overlay');
    assert.equal(maps.needsTambonBoundaries({}, 0, true), false, 'PM25 national view hides tambons');
    assert.equal(maps.needsTambonBoundaries({ provinces: ['A'] }, 0, true), false, 'PM25 province alone must not load tambons');
    assert.equal(maps.needsTambonBoundaries({ provinces: ['A'], districts: ['B'] }, 0, true), true, 'PM25 selected district shows tambons');
    assert.equal(maps.needsTambonBoundaries({ provinces: ['A'], districts: [] }, 0, true), false, 'clearing districts hides cached tambons');
    assert.equal(requests, 0, 'national view must not initiate geometry request');
    await assert.rejects(maps.loadTambonBoundaries(), /503/);
    fail = false;
    const first = maps.loadTambonBoundaries();
    assert.equal(first, maps.loadTambonBoundaries(), 'deduplicate concurrent requests');
    assert.equal(await first, geometry);
    assert.equal(await maps.loadTambonBoundaries(), geometry);
    assert.equal(requests, 2, 'retry failed load once then reuse parsed geometry');
    console.log('PASS map: conditional loading, DDS stations, shared request/cache, failure retry');

    const db = new duckdb.Database(':memory:');
    const run = sql => new Promise((resolve, reject) => db.run(sql, error => error ? reject(error) : resolve()));
    try {
        await run(`CREATE TABLE pm25_raw AS SELECT * FROM (VALUES
            (DATE '2026-01-01', 'A', 'D1', 'เขตสุขภาพที่ 1', 40.0),
            (DATE '2026-01-02', 'A', 'D1', 'เขตสุขภาพที่ 1', 80.0),
            (DATE '2026-01-03', 'A', 'D1', 'เขตสุขภาพที่ 1', 90.0),
            (DATE '2026-01-01', 'B', 'D2', 'เขตสุขภาพที่ 2', 10.0)
        ) t(date, province, district, "Regional Health", pm25)`);
        await run(`ALTER TABLE pm25_raw ADD COLUMN subdistrict VARCHAR DEFAULT 'T1'`);
        let queries = 0;
        const actions = load('src/app/dashboard/pm25/actions.ts', {
            '@/lib/dashboard-data-engine': {
                getDashboardDataVersion: () => 'fixture',
                withDashboardDatabase: fn => fn({ all: (sql, callback) => { queries++; db.all(sql, callback); } }),
            },
            '@/lib/dashboard-runtime': {
                cachedDashboardQuery: (_key, fn) => fn(), stableCacheKey: JSON.stringify,
                isDashboardOverloadError: () => false,
            },
            './map-area-data': load('src/app/dashboard/pm25/map-area-data.ts'),
        });
        const result = await actions.getDashboardData({ startDate: '2026-01-01', endDate: '2026-01-03' });
        assert.equal(queries, 6, 'unused seventh query removed');
        assert.equal(result.avgPM25, '55.0');
        assert.equal(result.maxPM25, '90.0');
        assert.equal(result.totalMeasurements, 4);
        assert.equal(result.exceedCount, 3);
        assert.equal(result.provinceMaxes.A, 90);
        assert.equal(result.provinceStreak37.A, 3);
        assert.equal(result.provinceStreak75.A, 2);
        assert.equal(result.top10Exceed[0].exceed_days, 3);
        assert.equal(result.provinceTrend.A.length, 3);
        const filtered = await actions.getDashboardData({ provinces: ['B'] });
        assert.equal(filtered.totalMeasurements, 1);
        assert.equal(filtered.avgPM25, '10.0');
        assert.equal(filtered.mapAreas.level, 'district');
        assert.equal(filtered.mapAreas.values['["B","D2"]'].max, 10);
        const tambons = await actions.getDashboardData({ provinces: ['A'], districts: ['D1'] });
        assert.equal(tambons.mapAreas.level, 'subdistrict');
        assert.equal(tambons.mapAreas.values['["A","D1","T1"]'].max, 90);
        assert.equal(tambons.mapAreas.values['["A","D1","T1"]'].streak75.start, '2026-01-02');
        const empty = await actions.getDashboardData({ provinces: ['missing'] });
        assert.equal(empty.totalMeasurements, 0);
        assert.equal(Object.keys(empty.mapAreas.values).length, 0);
        console.log('PASS DuckDB: six queries; summary, trends, maxima, streaks, filters, empty results');
    } finally {
        await new Promise(resolve => db.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
