const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const dir = path.join(__dirname, 'concepts');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).filter(f => !process.argv[2] || f.startsWith(process.argv[2]));
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 1440, height: 964 }, deviceScaleFactor: Number(process.env.DPR || 1) });
    await p.goto('file://' + path.join(dir, f));
    await p.waitForTimeout(400);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.screenshot({ path: path.join(dir, f.replace('.html', '.png')) });
    console.log(f, 'scrollHeight', h);
    await p.close();
  }
  await b.close();
})();
