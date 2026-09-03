const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['src/components/shared/ThailandMap.tsx', 'src/app/dashboard/pm25/RegionMap.tsx']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(source, /TileLayer|tileLayer\s*\(|https?:\/\/|api[_-]?key/i);
    assert.match(source, /<GeoJSON/);
    assert.match(source, /<MapContainer/);
    assert.match(source, /\/data\/thailand-provinces\.json/);
    console.log(`PASS ${file}: local map geometry, no external tiles or API-key dependency`);
}
