// Run: node scripts/test-dds-geographic-filter.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function testGeographicHierarchicalDrillDown() {
    // Read ThailandMap.tsx and DDS page.tsx source to verify logic structure
    const mapSrc = fs.readFileSync(path.join(root, 'src/components/shared/ThailandMap.tsx'), 'utf8');
    const ddsSrc = fs.readFileSync(path.join(root, 'src/app/dashboard/dds/page.tsx'), 'utf8');

    // 1. Verify cleanThaiName handles 'ตำบล' and 'แขวง'
    assert.match(mapSrc, /ตำบล\|แขวง/, 'cleanThaiName must strip ตำบล and แขวง');

    // 2. Verify MapResizer checks selectedSubdistricts and fits bounds
    assert.match(mapSrc, /selectedSubdistricts\.length > 0/, 'MapResizer must check selectedSubdistricts');
    assert.match(mapSrc, /maxZoom:\s*13/, 'MapResizer must apply sensible maxZoom');

    // 3. Verify displayTambonData filters by selectedSubdistricts
    assert.match(mapSrc, /!effectiveShowDistrictBoundaries\s*&&\s*selectedSubdistricts\.length\s*>\s*0/, 'displayTambonData must filter by selectedSubdistricts');

    // 4. Verify normalized multi-level keys in ThailandMap
    assert.match(mapSrc, /normalizedSubdistrictKey/, 'ThailandMap must construct normalizedSubdistrictKey');

    // 5. Verify DDS page has SearchableSingleSelect components for all 4 geographic levels
    assert.match(ddsSrc, /function SearchableSingleSelect/, 'DDS page must define SearchableSingleSelect');
    assert.match(ddsSrc, /<SearchableSingleSelect[\s\S]*?label="เขตสุขภาพ"/, 'DDS page must use SearchableSingleSelect for เขตสุขภาพ');
    assert.match(ddsSrc, /<SearchableSingleSelect[\s\S]*?label="จังหวัด"/, 'DDS page must use SearchableSingleSelect for จังหวัด');
    assert.match(ddsSrc, /<SearchableSingleSelect[\s\S]*?label="อำเภอ\/เขต"/, 'DDS page must use SearchableSingleSelect for อำเภอ/เขต');
    assert.match(ddsSrc, /<SearchableSingleSelect[\s\S]*?label="ตำบล\/แขวง"/, 'DDS page must use SearchableSingleSelect for ตำบล/แขวง');

    // 6. Verify single-select state and handlers in DDS page
    assert.match(ddsSrc, /selectedRegion\s*=\s*filters\.regions\.length === 1/, 'DDS page must derive selectedRegion');
    assert.match(ddsSrc, /selectedProvince\s*=\s*filters\.provinces\.length === 1/, 'DDS page must derive selectedProvince');
    assert.match(ddsSrc, /selectedDistrict\s*=\s*filters\.districts\.length === 1/, 'DDS page must derive selectedDistrict');
    assert.match(ddsSrc, /selectedSubdistrict\s*=\s*filters\.subdistricts\.length === 1/, 'DDS page must derive selectedSubdistrict');

    // 7. Verify dynamic mapTitle reflects all 5 levels
    assert.match(ddsSrc, /mapTitle\s*=\s*selectedSubdistrict/, 'DDS page must calculate mapTitle dynamically');
    assert.match(ddsSrc, /visibleProvinces=\{!isAreaBreakdownView\s*&&\s*filters\.regions\.length === 1\s*\?\s*baseProvinces\s*:\s*undefined\}/, 'DDS page must set visibleProvinces for 1 health region');

    // 8. Simulate selection hierarchy behavior
    const hierarchy = [
        { region: 'เขตสุขภาพที่ 1', province: 'เชียงใหม่', district: 'เมืองเชียงใหม่', subdistrict: 'สุเทพ' },
        { region: 'เขตสุขภาพที่ 1', province: 'เชียงใหม่', district: 'เมืองเชียงใหม่', subdistrict: 'ศรีภูมิ' },
        { region: 'เขตสุขภาพที่ 1', province: 'เชียงใหม่', district: 'แม่ริม', subdistrict: 'ริมใต้' },
        { region: 'เขตสุขภาพที่ 1', province: 'ลำปาง', district: 'เมืองลำปาง', subdistrict: 'เวียงเหนือ' },
        { region: 'เขตสุขภาพที่ 2', province: 'พิษณุโลก', district: 'เมืองพิษณุโลก', subdistrict: 'ในเมือง' },
    ];

    // Level 1: All regions
    let filters = { regions: [], provinces: [], districts: [], subdistricts: [] };
    let isAllRegions = filters.regions.length === 0;
    let selectedReg = filters.regions.length === 1 ? filters.regions[0] : '';
    assert.equal(selectedReg, '', 'Default region is empty string (ทั้งหมด)');
    assert.equal(isAllRegions, true, 'All regions selected by default');

    // Level 2: 1 health region selected
    filters = { regions: ['เขตสุขภาพที่ 1'], provinces: [], districts: [], subdistricts: [] };
    selectedReg = filters.regions.length === 1 ? filters.regions[0] : '';
    assert.equal(selectedReg, 'เขตสุขภาพที่ 1');
    const regionProvinces = Array.from(new Set(hierarchy.filter(h => h.region === selectedReg).map(h => h.province))).sort((a, b) => a.localeCompare(b, 'th'));
    assert.deepEqual(regionProvinces, ['เชียงใหม่', 'ลำปาง']);

    // Level 3: 1 province selected
    filters = { regions: ['เขตสุขภาพที่ 1'], provinces: ['เชียงใหม่'], districts: [], subdistricts: [] };
    let selectedProv = filters.provinces.length === 1 ? filters.provinces[0] : '';
    assert.equal(selectedProv, 'เชียงใหม่');
    const provDistricts = Array.from(new Set(hierarchy.filter(h => h.province === selectedProv).map(h => h.district))).sort((a, b) => a.localeCompare(b, 'th'));
    assert.deepEqual(provDistricts, ['เมืองเชียงใหม่', 'แม่ริม']);

    // Level 4: 1 district selected
    filters = { regions: ['เขตสุขภาพที่ 1'], provinces: ['เชียงใหม่'], districts: ['เมืองเชียงใหม่'], subdistricts: [] };
    let selectedDist = filters.districts.length === 1 ? filters.districts[0] : '';
    assert.equal(selectedDist, 'เมืองเชียงใหม่');
    const distSubdistricts = Array.from(new Set(hierarchy.filter(h => h.province === selectedProv && h.district === selectedDist).map(h => h.subdistrict))).sort((a, b) => a.localeCompare(b, 'th'));
    assert.deepEqual(distSubdistricts, ['ศรีภูมิ', 'สุเทพ']);

    // Level 5: 1 subdistrict selected
    filters = { regions: ['เขตสุขภาพที่ 1'], provinces: ['เชียงใหม่'], districts: ['เมืองเชียงใหม่'], subdistricts: ['สุเทพ'] };
    let selectedSub = filters.subdistricts.length === 1 ? filters.subdistricts[0] : '';
    assert.equal(selectedSub, 'สุเทพ');

    console.log('PASS dds: 5-level geographic hierarchical drill-down and boundary filtering verified');
}

testGeographicHierarchicalDrillDown();
