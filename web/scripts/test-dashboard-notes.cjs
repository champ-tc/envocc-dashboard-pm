const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const file = path.join(__dirname, '../src/app/dashboard/_components/DashboardNotes.tsx');
const source = fs.readFileSync(file, 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
} }).outputText;

function render(route) {
    const exports = {};
    vm.runInNewContext(code, { exports, require: name => name === 'next/navigation'
        ? { usePathname: () => route } : require(name) });
    return renderToStaticMarkup(React.createElement(exports.default));
}

for (const name of ['hdc', 'dds', 'pm25']) {
    const html = render(`/dashboard/${name}`);
    assert.match(html, /^<div class="fab /);
    assert.match(html, /border-black bg-black text-white/);
    assert.match(html, /px-4 py-3 text-sm leading-5/);
    assert.match(html, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
    assert.match(html, /<\/button><\/div><dialog /); // Keep modal outside FAB's child visibility rules.
    assert.doesNotMatch(html, /shrink-0 border-t border-base-300 bg-base-100/);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.match(html, /aria-labelledby=/);
    assert.match(html, /ปิดหมายเหตุ/);
    assert.doesNotMatch(html, /dangerouslySetInnerHTML/);
    if (name !== 'pm25') {
        for (const code of ['J44.2', 'J45', 'I21', 'I24', 'I22', 'H10', 'L30.9', 'L50']) assert.ok(html.includes(code));
        assert.match(html, /คำนวณเป็นปีปฏิทิน/);
        assert.match(html, /วันอาทิตย์ถึงเสาร์/);
        assert.equal(html.includes('ผู้ป่วยเฉพาะคนไทย'), name === 'hdc');
    } else {
        assert.equal((html.match(/scope="row"/g) || []).length, 5);
        assert.equal((html.match(/<section /g) || []).length, 5);
        assert.match(html, /75.1 ขึ้นไป/);
        assert.match(html, /เตรียมยาและอุปกรณ์ที่จำเป็น/);
        assert.match(html, /37.5 – 75.0/); // Keep supplied wording pending clarification.
    }
    console.log(`PASS ${name}: notes content, route selection, semantic modal/table`);
}
assert.equal(render('/dashboard/other'), '');
console.log('PASS unrelated route: no notes trigger');
