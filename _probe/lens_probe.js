const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const url = process.argv[2];
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);
  console.log('URL=' + page.url());
  console.log('TITLE=' + await page.title());
  console.log((await page.locator('body').innerText()).slice(0, 20000));
  await page.screenshot({ path: 'F:/Desktop/Blog/_probe/lens-render.png', fullPage: true });
  await browser.close();
})().catch(err => { console.error(err.stack || err); process.exit(1); });
