const fs = require('fs');
const path = require('path');
const { launchStealthBrowser, createStealthContext } = require('./stealthBrowser');
const { v4: uuidv4 } = require('uuid');

async function captureReconTask(targetUrl) {
  const browser = await launchStealthBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();
  await page.goto(targetUrl, { waitUntil: 'networkidle' });

  const report = {
    taskId: uuidv4(),
    url: targetUrl,
    routePattern: targetUrl,
    title: await page.title(),
    extractedAt: new Date().toISOString(),
    networkCalls: [],
    interactiveSelectors: [],
    metadata: {},
  };

  page.on('response', async (response) => {
    const request = response.request();
    if (['xhr', 'fetch'].includes(request.resourceType())) {
      report.networkCalls.push({
        method: request.method(),
        url: request.url(),
        status: response.status(),
        headers: response.headers(),
      });
    }
  });

  report.interactiveSelectors = await page.$$eval('button, a[href], input[type="submit"], [role*="button"]', (elements) =>
    Array.from(elements)
      .map((element) => ({ selector: element.outerHTML.slice(0, 160), text: element.innerText.trim() }))
      .slice(0, 40)
  );

  const outputDir = path.join(process.cwd(), 'pages-exploration', 'recon');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filePath = path.join(outputDir, `${report.taskId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[RECON] Saved artifact to ${filePath}`);

  await browser.close();
  return report;
}

module.exports = { captureReconTask };

if (require.main === module) {
  const targetUrl = process.env.TARGET_URL || 'https://mogi.vn';
  captureReconTask(targetUrl).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
