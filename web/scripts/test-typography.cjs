// Run: node scripts/test-typography.cjs
// Prevent screen-local typography from bypassing the shared roles, including
// HTML strings used by Leaflet popups and dynamically composed class names.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../src');
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
const localTypography = /\b(?:text-(?:xs|sm|base(?!-)|lg|xl|[2-9]xl|micro|2xs(?:-plus)?|compact(?:-plus)?|body-compact|\[[\d.]+(?:px|rem|em)\])|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|leading-[\w[.-]+|tracking-[\w[.-]+)(?=[\s"'`}/])/;
const roles = new Set();
let files = 0;
function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(file); continue; }
        if (!file.endsWith('.tsx')) continue;
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, localTypography, `${file}: use a typo-* role instead of a local typography utility`);
        assert.doesNotMatch(source, /\b(?:fontSize|fontWeight|lineHeight|letterSpacing)\s*[:=]/, `${file}: inline typography bypasses the shared roles`);
        for (const match of source.matchAll(/\btypo-([a-z]+(?:-[a-z]+)*)/g)) roles.add(match[1]);
        files++;
    }
}
walk(root);
for (const role of roles) {
    const block = css.match(new RegExp(`\\.typo-${role} \\{([^}]+)\\}`));
    assert.ok(block, `Missing CSS role: typo-${role}`);
    for (const [property, token] of Object.entries({ 'font-size': 'size', 'font-weight': 'weight', 'line-height': 'leading', 'letter-spacing': 'tracking' })) {
        assert.ok(block[1].includes(`${property}: var(--type-${role}-${token})`), `typo-${role} must get ${property} from the central token`);
        assert.ok(css.includes(`--type-${role}-${token}:`), `Missing token for typo-${role}`);
    }
}
console.log(`PASS ${files} TSX files: no local typography overrides; ${roles.size} shared roles own all four text properties`);
