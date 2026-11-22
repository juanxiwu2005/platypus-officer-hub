const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  for (const f of ['A-table-grouped', 'B-team-board', 'C-chart-zones', 'D-team-detail']) {
    await p.goto('file://' + __dirname + '/' + f + '.html'); await p.waitForTimeout(200)
    await p.screenshot({ path: __dirname + '/../' + f + '.png', fullPage: true })
  }
  await b.close()
})()
