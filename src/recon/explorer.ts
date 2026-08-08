import { chromium, Page, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface NetworkCall {
  url: string;
  method: string;
  status: number;
  contentType: string;
}

interface PageReport {
  title: string;
  url: string;
  routePattern: string;
  interactiveElements: string[];
  scrapeableSelectors: { description: string; selector: string }[];
  networkCalls: NetworkCall[];
}

class ReconAgent {
  private visitedRoutes = new Set<string>();
  private outputDir: string;
  private baseUrl: string;

  constructor(baseUrl: string, outputDir?: string) {
    this.baseUrl = baseUrl;
    this.outputDir = outputDir || path.join(process.cwd(), 'pages-exploration');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private normalizeUrl(urlStr: string): string {
    try {
      const url = new URL(urlStr, this.baseUrl);
      let pathname = url.pathname.replace(/\/\/$/, '');
      pathname = pathname.replace(/\/\d+/g, '/[id]');
      pathname = pathname.replace(/\/[0-9a-fA-F-]{8,}/g, '/[id]');
      return pathname || '/';
    } catch {
      return urlStr;
    }
  }

  async explorePage(page: Page, currentUrl: string) {
    const routePattern = this.normalizeUrl(currentUrl);
    if (this.visitedRoutes.has(routePattern)) {
      console.log(`[SKIP] Already explored route pattern: ${routePattern}`);
      return;
    }
    this.visitedRoutes.add(routePattern);
    console.log(`[EXPLORING] ${currentUrl} (Pattern: ${routePattern})`);

    const networkCalls: NetworkCall[] = [];
    const responseHandler = (response: Response) => {
      const request = response.request();
      if (['fetch', 'xhr'].includes(request.resourceType())) {
        networkCalls.push({
          url: request.url(),
          method: request.method(),
          status: response.status(),
          contentType: response.headers()['content-type'] || 'N/A',
        });
      }
    };

    page.on('response', responseHandler);
    await page.goto(currentUrl, { waitUntil: 'networkidle' });

    const title = await page.title();
    const buttons = await page.locator('button, a[href], input[type="submit"]').allInnerTexts();
    const cleanButtons = [...new Set(buttons.map((text) => text.trim()).filter((text) => text.length > 0))].slice(0, 20);

    const pageReport: PageReport = {
      title,
      url: currentUrl,
      routePattern,
      interactiveElements: cleanButtons,
      scrapeableSelectors: [
        { description: 'Page Headings', selector: 'h1, h2, h3' },
        { description: 'Price Elements', selector: '.price, [class*=\"price\"]' },
        { description: 'Main Content Container', selector: 'main, #content, .container' },
      ],
      networkCalls,
    };

    this.writeMarkdownReport(pageReport);
    page.off('response', responseHandler);
  }

  private writeMarkdownReport(report: PageReport) {
    const safeFileName = report.routePattern.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'home';
    const filePath = path.join(this.outputDir, `${safeFileName}.md`);
    const mdContent = `# Page Exploration Summary: ${report.title}

- **Target URL:** \\`${report.url}\\`
- **Route Pattern:** \\`${report.routePattern}\\`
- **Timestamp:** ${new Date().toISOString()}

---

## 1. Interactive Capabilities (UI Actions)

The following primary interactive elements were identified on this page:

${report.interactiveElements.map((elem) => `- \\`${elem}\\``).join('\n') || '- No primary button elements detected.'}

---

## 2. Scrapeable UI Data & Recommended Selectors

| Data Description | Suggested Playwright Selector | Sample Value / Purpose |
| :--- | :--- | :--- |
${report.scrapeableSelectors.map((s) => `| ${s.description} | \\`${s.selector}\\` | Data extraction target |`).join('\n')}

---

## 3. Network & API Interception Log

Captured Fetch/XHR background requests triggered during load:

| Method | HTTP Status | Endpoint URL | Content-Type |
| :--- | :--- | :--- | :--- |
${report.networkCalls.map((n) => `| **${n.method}** | \\`${n.status}\\` | \\`${n.url}\\` | \\`${n.contentType}\\` |`).join('\n') || '| N/A | N/A | No background XHR/Fetch requests captured | N/A |'}

---

## 4. Recommended Automation Strategy

- **Phase 1 (UI Automation):** Create a Page Object Model (\\`src/pages/${safeFileName}.ts\\`) encapsulating key actions.
- **Phase 2 (Data Mining):** Target selectors listed in Section 2, or bypass the UI by hitting API endpoints logged in Section 3 directly.
`;
    fs.writeFileSync(filePath, mdContent, 'utf-8');
    console.log(`[REPORT GENERATED] Saved to ${filePath}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const explorer = new ReconAgent('https://mogi.vn');
  const seedPages = ['https://mogi.vn', 'https://mogi.vn/mua-nha', 'https://mogi.vn/thue-nha-dat'];
  for (const url of seedPages) {
    await explorer.explorePage(page, url);
  }
  await browser.close();
})();
