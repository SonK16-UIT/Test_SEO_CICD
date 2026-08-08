// Pre-load csp_evaluator/dist/csp to resolve circular dependency in lighthouse's internal csp_evaluator audit module
import 'csp_evaluator/dist/csp';

import { test } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

test.describe('Lighthouse SEO & Performance Audit', () => {
  test('Audit Page Performance, LCP, and SEO Score', async () => {
    // 1. Ensure reports directory exists
    const reportsDir = path.resolve(process.cwd(), 'lighthouse-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // 2. Launch Chromium with Chrome Remote Debugging Port enabled for Lighthouse (CDP)
    const port = 9222;
    const browser = await chromium.launch({
      args: [`--remote-debugging-port=${port}`],
      headless: true,
    });

    const page = await browser.newPage();
    const targetUrl = process.env.BASE_URL || 'https://mogi.vn';

    console.log(`Navigating to ${targetUrl} for Lighthouse audit...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // 3. Run Lighthouse Audit via Chrome Remote Debugging Port
    await playAudit({
      page,
      port,
      thresholds: {
        performance: 20, // Threshold set according to SLA / target page profile
        seo: 60,
        accessibility: 60,
        'best-practices': 60,
      },
      reports: {
        formats: {
          html: true,
          json: true,
        },
        name: `lighthouse-audit-${Date.now()}`,
        directory: reportsDir,
      },
    });

    console.log(`Lighthouse audit completed successfully. Reports saved in: ${reportsDir}`);
    await browser.close();
  });
});
