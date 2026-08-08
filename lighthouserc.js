/**
 * Lighthouse CI Configuration (lighthouserc.js)
 * Production-ready LHCI configuration for auditing performance, SEO, and accessibility.
 */
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.LHCI_TARGET_URL || 'https://mogi.vn',
        `${process.env.LHCI_TARGET_URL || 'https://mogi.vn'}/mua-nha`,
      ],
      numberOfRuns: parseInt(process.env.LHCI_RUNS || '3', 10),
      puppeteerScript: './puppeteerScript.js',
      puppeteerLaunchOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: process.env.LHCI_SERVER_BASE_URL || 'https://test-seo-lhci-server.onrender.com',
      token: process.env.LHCI_TOKEN || '5bb66e05-ac79-48cc-821e-3386cadf4e1c',
      outputDir: './.lighthouseci',
    },
  },
};
