const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1172, height: 968 } });
fs.mkdirSync('png', { recursive: true });
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
for (let f = 0; f < 60; f++) { if (only && !only.includes(f)) continue;
  const svg = fs.readFileSync('svg/f' + String(f).padStart(3, '0') + '.svg', 'utf8');
  await p.setContent('<html><body style="margin:0;background:#fff">' + svg + '</body></html>');
  await p.screenshot({ path: 'png/f' + String(f).padStart(3, '0') + '.png', clip: { x: 0, y: 0, width: 1172, height: 968 } }); }
await b.close(); })();
