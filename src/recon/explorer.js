require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const BASE_URL = process.env.BASE_URL || 'https://mogi.vn';
const DOMAIN = new URL(BASE_URL).hostname;

const CONFIG = {
  maxPages: Number.parseInt(process.env.CRAWL_MAX_PAGES, 10) || 200,
  maxDetailPagesPerCategory: Number.parseInt(process.env.MAX_DETAIL_PAGES_PER_CATEGORY, 10) || 20,
  maxDetailLinkCandidates: Number.parseInt(process.env.MAX_DETAIL_LINK_CANDIDATES, 10) || 100,
  loginPath: process.env.LOGIN_PATH || '/dang-nhap',
  storageStateFile: process.env.STORAGE_STATE_FILE || 'storageState.json',
  outputDir: process.env.OUTPUT_DIR || 'pages-exploration',
  excelDir: process.env.EXCEL_DIR || 'excel',
  jsonDir: process.env.JSON_DIR || 'json',
};

const OUTPUT_DIR = path.join(process.cwd(), CONFIG.outputDir);
const EXCEL_DIR = path.join(OUTPUT_DIR, CONFIG.excelDir);
const OUTPUT_JSON_DIR = path.join(OUTPUT_DIR, CONFIG.jsonDir);
const STORAGE_STATE_PATH = path.join(process.cwd(), CONFIG.storageStateFile);
const MAX_PAGES = CONFIG.maxPages;
const MAX_DETAIL_PAGES_PER_CATEGORY = CONFIG.maxDetailPagesPerCategory;
const MAX_DETAIL_LINK_CANDIDATES = CONFIG.maxDetailLinkCandidates;
const HEADLESS = process.env.HEADLESS !== 'false';
const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function normalizeRoute(urlStr) {
  try {
    const url = new URL(urlStr, BASE_URL);
    let pathname = url.pathname.replace(/\/$/, '');
    pathname = pathname.replace(/\/\d+/g, '/[id]');
    pathname = pathname.replace(/\/[0-9a-fA-F-]{8,}/g, '/[id]');
    pathname = pathname.replace(/\/[0-9a-fA-F]{24,}/g, '/[id]');
    return pathname || '/';
  } catch {
    return urlStr;
  }
}

function normalizeUrl(href) {
  try {
    const url = new URL(href, BASE_URL);
    url.hash = '';
    url.search = url.search.replace(/([?&])utm_[^=]+=[^&]*|([?&])fbclid=[^&]*/g, '');
    return url.toString().replace(/\?$/, '');
  } catch {
    return null;
  }
}

function isInternalLink(href) {
  try {
    const url = new URL(href, BASE_URL);
    return url.hostname === DOMAIN;
  } catch {
    return false;
  }
}

async function ensureOutputDir() {
  [OUTPUT_DIR, EXCEL_DIR, OUTPUT_JSON_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function getStealthContextOptions() {
  return {
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'Asia/Ho_Chi_Minh',
    bypassCSP: true,
    javaScriptEnabled: true,
  };
}

async function createAuthenticatedContext(browser) {
  const contextOptions = {
    ...getStealthContextOptions(),
    storageState: fs.existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined,
    ignoreHTTPSErrors: true,
  };

  if (process.env.PROXY) {
    contextOptions.proxy = { server: process.env.PROXY };
    console.log(`[PROXY] Using proxy server ${process.env.PROXY}`);
  }

  if (fs.existsSync(STORAGE_STATE_PATH)) {
    console.log(`[AUTH] Loading storage state from ${STORAGE_STATE_PATH}`);
  }

  const context = await browser.newContext(contextOptions);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5], configurable: true });
    window.chrome = window.chrome || { runtime: {} };
  });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}${CONFIG.loginPath}`, { waitUntil: 'networkidle' });

  if (process.env.MOGI_EMAIL && process.env.MOGI_PASSWORD) {
    console.log('[AUTH] Performing login with environment credentials');
    const emailLocator = page.locator('input[type="email"], input[name*="email"], input[name*="Email"]');
    const passwordLocator = page.locator('input[type="password"], input[name*="password"], input[name*="Password"]');
    const submitLocator = page.locator('button:has-text("�ang nh?p"), button:has-text("Login"), input[type="submit"]');

    if ((await emailLocator.count()) && (await passwordLocator.count()) && (await submitLocator.count())) {
      await emailLocator.fill(process.env.MOGI_EMAIL);
      await passwordLocator.fill(process.env.MOGI_PASSWORD);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => null),
        submitLocator.first().click(),
      ]);
    }
  } else {
    console.log('[AUTH] No credentials found in environment. Please create storageState.json manually if crawling protected pages.');
  }

  if (!page.url().includes('/dang-nhap')) {
    console.log('[AUTH] Login appears successful, saving storage state');
    await context.storageState({ path: STORAGE_STATE_PATH });
  } else {
    console.warn('[AUTH] Still on login page after login attempt; protected routes may remain gated');
  }

  return context;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let previousHeight = 0;
    const maxTime = 25000;
    const start = Date.now();
    while (Date.now() - start < maxTime) {
      window.scrollBy(0, 500);
      await sleep(300);
      const currentHeight = document.body.scrollHeight;
      if (currentHeight === previousHeight) {
        break;
      }
      previousHeight = currentHeight;
    }
    window.scrollTo(0, 0);
  });
}

function inferJsonSchema(value) {
  if (value === null || value === undefined) {
    return { type: 'null' };
  }
  if (Array.isArray(value)) {
    const itemSchemas = value.map(inferJsonSchema);
    const uniqueSchemas = [];
    itemSchemas.forEach((schema) => {
      const key = JSON.stringify(schema);
      if (!uniqueSchemas.some((item) => JSON.stringify(item) === key)) {
        uniqueSchemas.push(schema);
      }
    });
    return {
      type: 'array',
      items: uniqueSchemas.length === 1 ? uniqueSchemas[0] : { anyOf: uniqueSchemas },
    };
  }
  if (typeof value === 'object') {
    return {
      type: 'object',
      properties: Object.entries(value).reduce((props, [key, item]) => {
        props[key] = inferJsonSchema(item);
        return props;
      }, {}),
      required: Object.keys(value),
    };
  }
  return { type: typeof value };
}

function summarizeApiPayloads(networkCalls) {
  return networkCalls
    .filter((call) => call.responseJson || call.requestBody)
    .map((call) => ({
      url: call.url,
      method: call.method,
      status: call.status,
      contentType: call.responseHeaders['content-type'] || call.responseHeaders['Content-Type'] || 'unknown',
      requestSchema: call.requestBody ? inferJsonSchema(call.requestBody) : null,
      responseSchema: call.responseJson ? inferJsonSchema(call.responseJson) : null,
    }));
}

async function extractPageData(page, url) {
  const routePattern = normalizeRoute(url);
  const title = await page.title();
  const metadata = await page.evaluate(() => {
    const data = {};
    document.querySelectorAll('meta[name], meta[property]').forEach((node) => {
      const key = node.getAttribute('name') || node.getAttribute('property');
      const content = node.getAttribute('content');
      if (key && content) data[key] = content;
    });
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (canonical) data.canonical = canonical;
    return data;
  });

  const jsonLd = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((node) => node.textContent.trim()).filter(Boolean)
  );

  const interactiveElements = await page.$$eval('button, a[href], input[type="submit"], [role*="button"]', (elements) =>
    Array.from(elements)
      .map((node) => node.innerText.trim().replace(/\s+/g, ' '))
      .filter((text) => text.length > 0)
      .slice(0, 50)
  );

  const scrapeableSelectors = [
    { description: 'Page Headings', selector: 'h1, h2, h3' },
    { description: 'JSON-LD Schema', selector: 'script[type="application/ld+json"]' },
    { description: 'Meta Description', selector: 'meta[name="description"]' },
    { description: 'Price Elements', selector: '.price, [class*="price"], [data-price]' },
    { description: 'Main Content Container', selector: 'main, #content, .container, .wrapper' },
  ];

  return { title, currentUrl: url, routePattern, metadata, jsonLd, interactiveElements, scrapeableSelectors };
}

async function extractNetworkCalls(page) {
  const networkCalls = [];
  const requestMap = new Map();

  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (!['xhr', 'fetch'].includes(resourceType)) return;
    requestMap.set(request.url() + request.timing().requestTime, {
      method: request.method(),
      url: request.url(),
      resourceType,
      headers: request.headers(),
      postData: request.postData() || null,
      timestamp: new Date().toISOString(),
    });
  });

  page.on('response', async (response) => {
    const request = response.request();
    if (!['xhr', 'fetch'].includes(request.resourceType())) return;
    const key = request.url() + request.timing().requestTime;
    const requestEntry = requestMap.get(key) || {};

    const responseBody = await response.body().catch(() => null);
    const responseText = responseBody ? responseBody.toString('utf8') : null;
    let responseJson = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = null;
    }

    networkCalls.push({
      method: request.method(),
      url: request.url(),
      status: response.status(),
      resourceType: request.resourceType(),
      requestHeaders: request.headers(),
      requestBody: requestEntry.postData,
      responseHeaders: response.headers(),
      responseBody: responseText,
      responseJson,
      timestamp: new Date().toISOString(),
    });
  });

  await page.waitForTimeout(1500);
  page.removeAllListeners('request');
  page.removeAllListeners('response');
  return networkCalls;
}

async function extractDeepDetailLinks(page, categoryUrl) {
  const rawLinks = await page.evaluate((base) => {
    const allowHref = (href) => {
      if (!href) return false;
      const normalized = href.trim();
      if (!normalized || normalized.startsWith('mailto:') || normalized.startsWith('tel:') || normalized.startsWith('javascript:') || normalized.startsWith('#')) {
        return false;
      }
      return true;
    };

    const invalidContainers = [
      'header',
      'footer',
      'nav',
      '.breadcrumb',
      '.pagination',
      '.pager',
      '.menu',
      '.footer',
      '.header',
      '.cookie',
      '.ads',
      '[class*="ad-"]',
      '.adsbygoogle',
      '.banner',
      '.sidebar',
      '.related',
      '.recommended',
      '.promo',
    ];

    const isInInvalidContainer = (element) => {
      let parent = element.parentElement;
      while (parent) {
        if (invalidContainers.some((selector) => parent.matches && parent.matches(selector))) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };

    const isPropertyDetailUrl = (href) => {
      if (!href) return false;
      const normalized = href.toString().toLowerCase();
      const hasDetailMarker = /-id\d+(?=$|[?/#])/i.test(normalized);
      const isProjectLanding = /(?:\/|-)(?:prj|project|du-an)[0-9a-z-]*/i.test(normalized);
      const isNewsOrTopic = /(?:\/|-)(?:news|tin-tuc|hoi-dap|category|blog|article)/i.test(normalized);
      return hasDetailMarker && !isProjectLanding && !isNewsOrTopic;
    };

    return Array.from(document.querySelectorAll('a[href]'))
      .filter((link) => allowHref(link.getAttribute('href')))
      .filter((link) => !isInInvalidContainer(link))
      .map((link) => {
        try {
          const href = new URL(link.getAttribute('href'), base).toString();
          return { href, text: link.innerText.trim().replace(/\s+/g, ' ') };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((item) => isPropertyDetailUrl(item.href));
  }, BASE_URL);

  const filtered = rawLinks
    .map((link) => ({ href: normalizeUrl(link.href), text: link.text }))
    .filter((link) => link.href && isInternalLink(link.href))
    .filter((link) => !link.href.includes('/dang-nhap'))
    .filter((link) => !link.href.includes('/dang-tin'))
    .filter((link) => link.href !== categoryUrl)
    .filter((link) => !/\b(page|sort|filter|utm_source|utm_medium|utm_campaign|share|login|signup|dang_nhap)\b/i.test(link.href))
    .filter((link, index, array) => array.findIndex((item) => item.href === link.href) === index)
    .slice(0, MAX_DETAIL_LINK_CANDIDATES);

  return filtered.map((link) => link.href);
}

async function extractDetailSpecs(page) {
  return await page.evaluate(() => {
    const normalizeText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizationMap = {
      'mức giá': 'Price',
      'giá bán': 'Price',
      'giá': 'Price',
      'giá cho thuê': 'Price',
      'giá thuê': 'Price',
      'giá dự kiến': 'Price',
      'diện tích sử dụng': 'Area',
      'diện tích': 'Area',
      'dt': 'Area',
      'diện tích sàn': 'Area',
      'pháp lý': 'Legal Status',
      'tình trạng pháp lý': 'Legal Status',
      'hướng': 'Direction',
      'hướng nhà': 'Direction',
      'hướng ban công': 'Direction',
      'phòng ngủ': 'Bedrooms',
      'số phòng ngủ': 'Bedrooms',
      'phòng tắm': 'Bathrooms',
      'số toilet': 'Bathrooms',
      'số phòng tắm': 'Bathrooms',
      'địa chỉ': 'Address',
      'vị trí': 'Address',
      'ngày đăng': 'Posted Date',
      'ngày đăng tin': 'Posted Date',
      'ngày rao': 'Posted Date',
      'ngày đăng bài': 'Posted Date',
    };

    const invalidKeyPatterns = [/</, />/, /\{/, /\}/, /\$/, /\bng-/i, /\bfunction\b/i, /\bhttp\b/i, /\bhttps\b/i, /\badsbygoogle\b/i, /\bjavascript\b/i, /\bonclick\b/i, /\bhref=/i, /\bscript\b/i, /\biframe\b/i, /\bposition\(\)\b/i, /\bng-show\b/i, /\baria-hidden\b/i, /\buib-typeahead\b/i, /\bnew Image\(\)\b/i];
    const likelyKeyPattern = /^\s*(giá bán|giá thuê|giá dự kiến|giá|mức giá|diện tích sử dụng|diện tích sàn|diện tích|dt|pháp lý|tình trạng pháp lý|hướng ban công|hướng nhà|hướng|phòng ngủ|số phòng ngủ|phòng tắm|số phòng tắm|số toilet|địa chỉ|vị trí|ngày đăng tin|ngày đăng bài|ngày đăng|ngày rao|tầng|view|quận|dự án|số phòng|mã tin|sổ|nội thất|hình thức|loại)\b/i;
    const isLikelyPropertyKey = (key) => {
      if (!key) return false;
      const normalized = normalizeText(key).toLowerCase();
      if (normalizationMap[normalized]) return true;
      return likelyKeyPattern.test(normalized);
    };
    const isValidKey = (key) => {
      if (!key) return false;
      const normalized = normalizeText(key);
      if (!normalized || normalized.length > 30) return false;
      if (/[.!?]/.test(normalized)) return false;
      const words = normalized.split(/\s+/);
      if (words.length > 6) return false;
      if (invalidKeyPatterns.some((pattern) => pattern.test(normalized))) return false;
      if (/\b(ads|auto|script|img|ga|pix|token|nonce|class|style|href|src|ng-)\b/i.test(normalized)) return false;
      if (!/[a-zA-Z\u00C0-\u017F]/.test(normalized)) return false;
      if (/[^0-9a-zA-Z\u00C0-\u017F\s:/\-,()+]+/.test(normalized)) return false;
      if (!isLikelyPropertyKey(normalized)) return false;
      return true;
    };

    const normalizeKey = (rawKey) => {
      let key = normalizeText(rawKey).replace(/[:\u2022�]+$/, '');
      const lower = key.toLowerCase();
      if (normalizationMap[lower]) {
        return normalizationMap[lower];
      }
      return key;
    };

    const cleanValue = (value) => normalizeText(value).replace(/\s*[:\uff1a]\s*$/, '');
    const specs = {};

    const addSpec = (rawKey, rawValue) => {
      const key = normalizeKey(rawKey);
      if (!isValidKey(key)) return;
      const value = cleanValue(rawValue);
      if (!value) return;
      if (specs[key]) {
        specs[key] = `${specs[key]} | ${value}`;
      } else {
        specs[key] = value;
      }
    };

    const removeNoise = (container) => {
      container.querySelectorAll('header, footer, nav, script, style, iframe, .ads, [class*="ad-"], .adsbygoogle, .banner, .sidebar, .related, .recommended, .promo, .cookie, .meta, .footer, .header, .breadcrumb, .pagination, .pager, .menu, .search, .suggest, .typeahead').forEach((node) => node.remove());
    };

    const scopeSelectors = ['.prop-info', '.overview', '.property-info', '.detail-info', '.property-detail', '.listing-info', '.content', '.content-main', '.detail-page', '.project-detail', '.listing-detail', 'main', 'article'];
    const scopeElements = Array.from(document.querySelectorAll(scopeSelectors.join(',')));
    const fallbackElement = document.querySelector('main, article, #main, .main, .app');
    const chooseBestScope = (elements) => {
      let best = null;
      let bestScore = 0;
      elements.forEach((element) => {
        const text = normalizeText(element.textContent);
        if (!text || text.length < 50 || text.length > 30000) return;
        const score = (text.match(/giá|diện tích|pháp lý|hướng|phòng ngủ|phòng tắm|địa chỉ|vị trí|tầng|view|quận|dự án|số phòng|toilet|m2/gi) || []).length * 10 + Math.min(50, text.length / 200);
        if (score > bestScore) {
          bestScore = score;
          best = element;
        }
      });
      return best;
    };

    const chosenScope = chooseBestScope(scopeElements) || fallbackElement || document.body;
    const scopes = [chosenScope];

    const parseTable = (table) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      rows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) => normalizeText(cell.textContent));
        if (cells.length >= 2 && isValidKey(cells[0])) {
          addSpec(cells[0], cells.slice(1).join(' | '));
        }
      });
    };

    const parseDl = (dl) => {
      const terms = Array.from(dl.querySelectorAll('dt')).map((dt) => normalizeText(dt.textContent));
      const defs = Array.from(dl.querySelectorAll('dd')).map((dd) => normalizeText(dd.textContent));
      terms.forEach((term, index) => {
        if (isValidKey(term)) {
          addSpec(term, defs[index] || '');
        }
      });
    };

    const parseLines = (text) => {
      if (!text) return;
      text.split(/\n|\r/).forEach((line) => {
        const trimmed = normalizeText(line);
        if (!trimmed || trimmed.length > 180 || !trimmed.includes(':')) return;
        if (/\b(position\(\)|ng-show|aria-hidden|uib-typeahead|href=|new Image\(|adsbygoogle|http|https)\b/i.test(trimmed)) return;
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex <= 0) return;
        const key = trimmed.slice(0, colonIndex);
        const value = trimmed.slice(colonIndex + 1);
        addSpec(key, value);
      });
    };

    scopes.forEach((scopeElement) => {
      const scope = scopeElement.cloneNode(true);
      removeNoise(scope);
      scope.querySelectorAll('table').forEach(parseTable);
      scope.querySelectorAll('dl').forEach(parseDl);
      ['.prop-info', '.overview', '.property-info', '.detail-info', '.property-detail', '.attributes', '.specs', '.description', '.listing-info'].forEach((selector) => {
        scope.querySelectorAll(selector).forEach((element) => parseLines(normalizeText(element.textContent)));
      });
      scope.querySelectorAll('p, li').forEach((element) => {
        if (element.children.length === 0) {
          const text = normalizeText(element.textContent);
          if (text.includes(':') && text.length < 120 && /\b(giá|diện tích|pháp lý|hướng|phòng|toilet|địa chỉ|vị trí|ngày đăng|view|quận|dự án|số phòng|sổ|nội thất)\b/i.test(text)) {
            parseLines(text);
          }
        }
      });
    });

    const title = normalizeText(document.querySelector('h1')?.textContent || document.title || '');
    return { title, specs };
  });
}

function safeSheetName(name) {
  const safeName = name.replace(/[^a-z0-9 ]+/gi, '').trim();
  return safeName.substring(0, 31) || 'Sheet';
}

async function writeDeepExcelReport(categoryRoute, details) {
  if (!details.length) return;
  const safeFileName = `deep_${categoryRoute.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}` || 'deep_report';
  const filePath = path.join(EXCEL_DIR, `${safeFileName}.xlsx`);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ReconAgent';
  workbook.created = new Date();

  const primaryColumns = ['URL', 'Title', 'Price', 'Address', 'Area', 'Bedrooms', 'Bathrooms', 'Legal Status', 'Direction', 'Posted Date'];
  const uniqueKeys = Array.from(
    details.reduce((set, detail) => {
      Object.keys(detail.specs).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );
  const extraKeys = uniqueKeys.filter((key) => !primaryColumns.includes(key)).sort();
  const columns = [...primaryColumns, ...extraKeys];

  const detailSheet = workbook.addWorksheet(safeSheetName('Details'));
  detailSheet.addRow(columns);
  detailSheet.views = [{ state: 'frozen', ySplit: 1 }];
  detailSheet.properties.defaultRowHeight = 20;

  detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  detailSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003366' },
  };
  detailSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  detailSheet.getRow(1).height = 26;

  details.forEach((detail) => {
    const row = [
      detail.url,
      detail.title,
      ...columns.slice(2).map((key) => detail.specs[key] || ''),
    ];
    const inserted = detailSheet.addRow(row);
    inserted.height = 20;
  });

  const columnWidths = columns.map((key, index) => {
    const headerWidth = key.length;
    const values = detailSheet.getColumn(index + 1).values.slice(2).map((value) => String(value || ''));
    const maxValueWidth = values.reduce((max, value) => Math.max(max, value.length), 0);
    return Math.min(50, Math.max(15, Math.ceil(Math.max(headerWidth, maxValueWidth) * 1.1)));
  });

  columnWidths.forEach((width, index) => {
    detailSheet.getColumn(index + 1).width = width;
    detailSheet.getColumn(index + 1).alignment = { vertical: 'top', wrapText: true };
  });

  await workbook.xlsx.writeFile(filePath);
  console.log(`[DEEP EXCEL GENERATED] Saved to ${filePath}`);
}

async function writeJsonArtifact(report) {
  const safeFileName = report.routePattern.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'home';
  const filePath = path.join(OUTPUT_JSON_DIR, `${safeFileName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[JSON GENERATED] Saved to ${filePath}`);
  return filePath;
}

async function writeMarkdownReport(report) {
  const safeFileName = report.routePattern.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'home';
  const filePath = path.join(OUTPUT_DIR, `${safeFileName}.md`);

  const mdContent = `# Page Exploration Summary: ${report.title}

- **Target URL:** \`${report.currentUrl}\`
- **Route Pattern:** \`${report.routePattern}\`
- **Timestamp:** ${new Date().toISOString()}

## Metadata

${Object.entries(report.metadata)
    .map(([key, value]) => `- **${key}:** ${value}`)
    .join('\n') || '- No metadata captured.'}

## 1. Interactive Capabilities (UI Actions)

${report.interactiveElements.map((elem) => `- \`${elem}\``).join('\n') || '- No interactive elements captured.'}

## 2. JSON-LD / Structured Data

${report.jsonLd.length ? report.jsonLd.map((entry, index) => `### JSON-LD block ${index + 1}\n\n\`${entry.replace(/`/g, '`')}\``).join('\n\n') : '- No JSON-LD schema found.'}

## 3. Scrapeable UI Data & Recommended Selectors

| Data Description | Suggested Playwright Selector | Sample Value / Purpose |
| :--- | :--- | :--- |
${report.scrapeableSelectors.map((s) => `| ${s.description} | \`${s.selector}\` | Data extraction target |`).join('\n')}

## 4. Network API Discovery

- **Detected API calls:** ${report.networkCalls?.length || 0}

${report.networkCalls && report.networkCalls.length
    ? report.networkCalls
        .slice(0, 20)
        .map((call) => `- ${call.method} ${call.url} -> ${call.status} (${call.resourceType})`)
        .join('\n')
    : '- No XHR/fetch calls captured.'}

## 5. Inferred API Schema Candidates

${report.apiSchema && report.apiSchema.length
    ? report.apiSchema.map((schema, index) => {
        const schemaText = JSON.stringify(schema.responseSchema || {}, null, 2).replace(/`/g, "'");
        return `### API candidate ${index + 1}
- **URL:** ${schema.url}
- **Method:** ${schema.method}
- **Status:** ${schema.status}
- **Response schema:**
\`${schemaText}\``;
      }).join('\n')
    : '- No inferred API schemas generated.'}

## 6. Extraction Review Artifact

- **JSON artifact:** \`${report.jsonArtifactPath || 'N/A'}\`
- **Excel workbook:** \`${report.deepExcelFile || 'N/A'}\`
`;

  fs.writeFileSync(filePath, mdContent, 'utf-8');
  console.log(`[REPORT GENERATED] Saved to ${filePath}`);
}

class ReconAgent {
  constructor() {
    this.visited = new Set();
    this.queued = new Set();
  }

  async crawl(page, seedUrls) {
    await ensureOutputDir();
    const queue = seedUrls.map(normalizeUrl).filter(Boolean).slice(0, MAX_PAGES);
    queue.forEach((url) => this.queued.add(url));

    while (queue.length && this.visited.size < MAX_PAGES) {
      const currentUrl = queue.shift();
      if (!currentUrl || this.visited.has(currentUrl)) continue;

      console.log(`\n[Crawl] Visiting ${currentUrl} (${this.visited.size + 1}/${MAX_PAGES})`);
      await this.explorePage(page, currentUrl, queue);
      this.visited.add(currentUrl);
    }
  }

  async explorePage(page, currentUrl, queue) {
    const canonicalUrl = normalizeUrl(currentUrl);
    if (!canonicalUrl) return;

    await page.goto(canonicalUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await autoScroll(page);
    await page.waitForTimeout(800);

    const report = await extractPageData(page, canonicalUrl);
    report.networkCalls = await extractNetworkCalls(page);
    report.apiSchema = summarizeApiPayloads(report.networkCalls);

    const detailLinks = await extractDeepDetailLinks(page, canonicalUrl);
    const uniqueDetailLinks = Array.from(new Set(detailLinks));
    report.detailLinkCount = uniqueDetailLinks.length;

    const details = [];
    for (let i = 0; i < Math.min(uniqueDetailLinks.length, MAX_DETAIL_PAGES_PER_CATEGORY); i += 1) {
      const detailUrl = uniqueDetailLinks[i];
      try {
        console.log(`[DETAIL] Scraping ${detailUrl} (${i + 1}/${Math.min(uniqueDetailLinks.length, MAX_DETAIL_PAGES_PER_CATEGORY)})`);
        await page.goto(detailUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);
        await autoScroll(page);
        await page.waitForTimeout(500);
        const detailResult = await extractDetailSpecs(page);
        details.push({ url: detailUrl, title: detailResult.title || '', specs: detailResult.specs });
      } catch (error) {
        console.warn(`[DETAIL ERROR] ${detailUrl} => ${error.message}`);
      }
    }

    const deepExcelFile = uniqueDetailLinks.length ? `deep_${report.routePattern.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.xlsx` : null;
    if (details.length) {
      await writeDeepExcelReport(report.routePattern, details);
    }
    report.deepPageCount = details.length;
    report.deepExcelFile = deepExcelFile;
    report.jsonArtifactPath = await writeJsonArtifact(report);

    await writeMarkdownReport(report);

    const links = await extractPageData(page, canonicalUrl).then(() => extractDeepDetailLinks(page, canonicalUrl));
    const discovered = new Set();
    for (const link of links) {
      const cleaned = normalizeUrl(link);
      if (!cleaned || !isInternalLink(cleaned)) continue;
      if (cleaned.includes('/dang-nhap')) continue;
      if (cleaned.includes('/dang-tin') && !fs.existsSync(STORAGE_STATE_PATH)) continue;
      discovered.add(cleaned);
    }

    for (const href of discovered) {
      if (!this.visited.has(href) && !this.queued.has(href) && this.queued.size < MAX_PAGES) {
        this.queued.add(href);
        queue.push(href);
      }
    }
  }
}

(async () => {
  const launchOptions = {
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  };
  const browser = await chromium.launch(launchOptions);
  const context = await createAuthenticatedContext(browser);
  const page = await context.newPage();

  const seeds = [
    `${BASE_URL}`,
    `${BASE_URL}/mua-nha-dat`,
    `${BASE_URL}/thue-nha-dat`,
    `${BASE_URL}/gia-nha-dat`,
    `${BASE_URL}/tim-moi-gioi`,
    `${BASE_URL}/du-an`,
  ];

  const agent = new ReconAgent();
  await agent.crawl(page, seeds);
  await browser.close();
})();
