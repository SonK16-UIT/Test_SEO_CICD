/**
 * LHCI Puppeteer Authentication Flow Script
 * Executes automated login prior to running Lighthouse audits on authenticated routes.
 *
 * @param {import('puppeteer').Browser} browser
 * @param {{url: string}} context
 */
module.exports = async (browser, context) => {
  const page = await browser.newPage();
  const baseUrl = process.env.LHCI_TARGET_URL || 'https://mogi.vn';
  const loginUrl = `${baseUrl}/dang-nhap`;

  console.log(`[LHCI Puppeteer] Executing authentication pre-script at: ${loginUrl}`);

  try {
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const username = process.env.AUTH_USERNAME;
    const password = process.env.AUTH_PASSWORD;

    if (username && password) {
      console.log('[LHCI Puppeteer] Injecting credentials from environment/secrets...');
      
      const emailSelector = '#EmailOrPhone, input[name="EmailOrPhone"], input[type="email"]';
      const passwordSelector = '#Password, input[name="Password"], input[type="password"]';
      const submitSelector = 'button[type="submit"], #btn-login';

      if (await page.$(emailSelector)) {
        await page.type(emailSelector, username);
        await page.type(passwordSelector, password);
        await Promise.all([
          page.click(submitSelector),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
        ]);
        console.log('[LHCI Puppeteer] Authentication form submitted successfully.');
      }
    } else {
      console.log('[LHCI Puppeteer] Credentials not set. Proceeding as unauthenticated session.');
    }
  } catch (err) {
    console.warn(`[LHCI Puppeteer] Auth warning: ${err.message}`);
  } finally {
    await page.close();
  }
};
