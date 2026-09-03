const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/components/DashboardNavMenu.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
} }).outputText;
assert.doesNotMatch(source, /useState|onMouseEnter|onMouseLeave|backdrop-blur|transitionDelay/);
const navbar = fs.readFileSync(require('node:path').join(__dirname, '../src/app/dashboard/_components/DashboardNavbar.tsx'), 'utf8');
assert.ok(navbar.includes('has-[details[open]]:z-dashboard-nav'), 'Open navigation must stack above dashboard filters');
for (const route of ['hdc', 'dds', 'pm25']) {
    const exports = {};
    vm.runInNewContext(code, { exports, require: name => {
        if (name === 'next/navigation') return { usePathname: () => `/dashboard/${route}` };
        if (name === 'next/link') return { default: props => React.createElement('a', props) };
        if (name === 'next/image') return { default: props => React.createElement('img', props) };
        return require(name);
    } });
    const html = renderToStaticMarkup(React.createElement(exports.default));
    assert.match(html, /<details class="dropdown dropdown-end/);
    assert.doesNotMatch(html, /<details[^>]* open/);
    assert.match(html, /<summary aria-label="เปิดเมนูนำทาง dashboard"/);
    assert.equal((html.match(/<a /g) || []).length, 5);
    assert.match(html, new RegExp(`href="/dashboard/${route}" aria-current="page"`));
    for (const label of ['หน้าแรก', 'Dashboard ฝุ่น PM2.5', 'Dashboard ผู้ป่วย HDC', 'Dashboard ผู้ป่วย DDS', 'เข้าสู่ระบบ']) assert.ok(html.includes(label));
    console.log(`PASS ${route}: native dropdown, five destinations, current page, no hover state or blur`);
}
