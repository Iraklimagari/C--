const { chromium } = require('playwright'); const fs = require('fs');
const [dir, out] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1172, height: 968 } });
fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).sort();
for (const f of files) {
  await p.setContent('<html><body style="margin:0;background:transparent">' + fs.readFileSync(dir + '/' + f, 'utf8') + '</body></html>');
  await p.screenshot({ path: out + '/' + f.replace('.svg', '.png'), clip: { x: 0, y: 0, width: 1172, height: 968 }, omitBackground: true }); }
await b.close(); })();
