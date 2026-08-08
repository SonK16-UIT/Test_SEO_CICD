const { chromium } = require('playwright');
const { anonymizeProxy } = require('proxy-chain');

const HEADLESS = process.env.HEADLESS !== 'false';
const USER_AGENT = process.env.USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DEFAULT_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
];

async function getProxyConfig() {
  if (!process.env.PROXY) {
    return undefined;
  }

  try {
    const anonymizedProxy = await anonymizeProxy(process.env.PROXY);
    console.log(`[PROXY] Using anonymized residential proxy`);
    return { server: anonymizedProxy };
  } catch (error) {
    console.warn(`[PROXY] Failed to anonymize proxy: ${error.message}`);
    return { server: process.env.PROXY };
  }
}

async function launchStealthBrowser() {
  const proxyConfig = await getProxyConfig();
  const launchOptions = {
    headless: HEADLESS,
    args: [...DEFAULT_ARGS],
    proxy: proxyConfig,
  };

  console.log(`[STEALTH] Launching browser(headless=${HEADLESS})`);
  return await chromium.launch(launchOptions);
}

async function createStealthContext(browser, extraOptions = {}) {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'Asia/Ho_Chi_Minh',
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    ...extraOptions,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5], configurable: true });
    window.chrome = window.chrome || { runtime: {} };
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);
  });

  return context;
}

module.exports = {
  launchStealthBrowser,
  createStealthContext,
};

if (require.main === module) {
  (async () => {
    const browser = await launchStealthBrowser();
    const context = await createStealthContext(browser);
    const page = await context.newPage();
    const startUrl = process.env.BASE_URL || 'https://mogi.vn';
    await page.goto(startUrl, { waitUntil: 'networkidle' });
    console.log(`[STEALTH] Page loaded: ${page.url()}`);
    await browser.close();
  })().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
