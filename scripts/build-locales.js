#!/usr/bin/env node
// Regenerates src/localization/locales.js from en.json and tr.json
// Usage: npm run build-locales

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'localization');
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const tr = JSON.parse(fs.readFileSync(path.join(localesDir, 'tr.json'), 'utf8'));

const out = `// Auto-generated — edit en.json / tr.json then run: npm run build-locales
window.__PDKS_LOCALES__ = ${JSON.stringify({ en, tr }, null, 2)};
`;

fs.writeFileSync(path.join(localesDir, 'locales.js'), out, 'utf8');
console.log('✅ src/localization/locales.js regenerated');
