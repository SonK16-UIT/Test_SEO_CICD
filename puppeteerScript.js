/**
 * LHCI Puppeteer Authentication Flow Script
 * Executes automated login prior to running Lighthouse audits on authenticated routes.
 *
 * @param {import('puppeteer').Browser} browser
 * @param {{url: string}} context
 */
module.exports = async (browser, context) => {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;

  // Skip auth pre-script immediately if no credentials are provided
  if (!username || !password) {
    console.log('[LHCI Puppeteer] Credentials not set. Proceeding as unauthenticated session.');
    return;
  }

  const rawBaseUrl = process.env.LHCI_TARGET_URL || 'https://mogi.vn';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const loginUrl = `${baseUrl}/dang-nhap`;

  console.log(`[LHCI Puppeteer] Executing authentication pre-script at: ${loginUrl}`);

  const page = await browser.newPage();
  try {
    const response = await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    if (!response || response.status() >= 400) {
      console.warn(`[LHCI Puppeteer] Auth route returned HTTP status ${response ? response.status() : 'N/A'}. Skipping auth form injection.`);
      return;
    }

    console.log('[LHCI Puppeteer] Injecting credentials from environment/secrets...');
    
    const emailSelector = '#EmailOrPhone, input[name="EmailOrPhone"], input[type="email"]';
    const passwordSelector = '#Password, input[name="Password"], input[type="password"]';
    const submitSelector = 'button[type="submit"], #btn-login';

    if (await page.$(emailSelector)) {
      await page.type(emailSelector, username);
      await page.type(passwordSelector, password);
      await Promise.all([
        page.click(submitSelector),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
      ]);
      console.log('[LHCI Puppeteer] Authentication form submitted successfully.');
    }
  } catch (err) {
    console.warn(`[LHCI Puppeteer] Auth warning: ${err.message}`);
  } finally {
    await page.close();
  }
};
