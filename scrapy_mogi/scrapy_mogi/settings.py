from scrapy_mogi.posthog_client import posthog_client


BOT_NAME = 'scrapy_mogi'

SPIDER_MODULES = ['scrapy_mogi.spiders']
NEWSPIDER_MODULE = 'scrapy_mogi.spiders'

ROBOTSTXT_OBEY = False
DOWNLOAD_DELAY = 1.5
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 2
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1.5
AUTOTHROTTLE_MAX_DELAY = 10.0
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.5

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

DOWNLOAD_HANDLERS = {
    'http': 'scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler',
    'https': 'scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler',
}

TWISTED_REACTOR = 'twisted.internet.asyncioreactor.AsyncioSelectorReactor'

PLAYWRIGHT_BROWSER_TYPE = 'chromium'
PLAYWRIGHT_LAUNCH_OPTIONS = {
    'headless': True,
    'args': [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
    ],
}

ITEM_PIPELINES = {
    'scrapy_mogi.pipelines.ExcelExportPipeline': 300,
}

FEED_EXPORT_ENCODING = 'utf-8'
