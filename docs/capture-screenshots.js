const puppeteer = require('puppeteer');
const path = require('path');

const pages = [
  { name: '01-dashboard', url: 'http://localhost:3000', waitFor: 3000 },
  { name: '02-hardware', url: 'http://localhost:3000/hardware', waitFor: 2000 },
  { name: '03-tariffs', url: 'http://localhost:3000/tariffs', waitFor: 2000 },
  { name: '04-finance', url: 'http://localhost:3000/finance', waitFor: 2000 },
  { name: '05-grid', url: 'http://localhost:3000/grid', waitFor: 3000 },
  { name: '06-strategy', url: 'http://localhost:3000/strategy', waitFor: 2000 },
  { name: '07-funding', url: 'http://localhost:3000/funding', waitFor: 2000 },
  { name: '08-legal', url: 'http://localhost:3000/legal', waitFor: 2000 },
  { name: '09-customers', url: 'http://localhost:3000/customers', waitFor: 2000 },
  { name: '10-portfolio', url: 'http://localhost:3000/portfolio', waitFor: 2000 },
  { name: '11-risk', url: 'http://localhost:3000/risk', waitFor: 2000 },
  { name: '12-product-design', url: 'http://localhost:3000/product-design', waitFor: 2000 },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const page of pages) {
    console.log(`Capturing ${page.name}...`);
    const tab = await browser.newPage();
    await tab.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    try {
      await tab.goto(page.url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, page.waitFor));

      // Full page screenshot
      await tab.screenshot({
        path: path.join(__dirname, 'screenshots', `${page.name}.png`),
        fullPage: true,
      });

      // Also capture viewport-only (above the fold)
      await tab.screenshot({
        path: path.join(__dirname, 'screenshots', `${page.name}-viewport.png`),
        fullPage: false,
      });

      console.log(`  ✓ ${page.name} captured`);
    } catch (err) {
      console.error(`  ✗ ${page.name} failed: ${err.message}`);
    }

    await tab.close();
  }

  await browser.close();
  console.log('\nAll screenshots saved to docs/screenshots/');
})();
