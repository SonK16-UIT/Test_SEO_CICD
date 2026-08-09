import scrapy
from urllib.parse import urljoin, urlparse, parse_qs
from scrapy_playwright.page import PageMethod
from scrapy_mogi.items import MogiListingItem
from scrapy_mogi.page_objects.mogi_listing import MogiListingPage
from scrapy_mogi.posthog_client import posthog_client


class MogiSpider(scrapy.Spider):
    name = 'mogi_listings'
    # allowed_domains = ['mogi.vn']
    # default max pages to crawl; can be overridden with -a max_pages=NUMBER
    max_pages = 10

    def start_requests(self):
        print("--- DEBUG: start_requests CALLED ---")
        self.logger.info("--- DEBUG: start_requests CALLED ---")
        max_pages = int(getattr(self, 'max_pages', self.max_pages))
        if posthog_client:
            posthog_client.capture(
                event='listing_crawl_started',
                properties={'max_pages': max_pages},
            )
        for page in range(1, max_pages + 1):
            url = f'https://mogi.vn/mua-nha-dat?cp={page}'
            self.logger.info(f"--- DEBUG: start_requests yielding: {url} ---")
            yield self._build_playwright_request(url, page)

    def _build_playwright_request(self, url: str, page_num: int | None = None) -> scrapy.Request:
        """Standardize Playwright-backed request creation."""
        self.logger.info(f"--- DEBUG: _build_playwright_request building for: {url} ---")
        return scrapy.Request(
            url=url,
            meta={
                'playwright': True,
                'playwright_page_methods': [
                    PageMethod('wait_for_selector', 'div.property-listing ul > li'),
                ],
                'playwright_context': 'default',
                'mogi_page_number': page_num,
            },
            callback=self.parse_listing_page,
        )

    def parse_listing_page(self, response):
        print(f"--- DEBUG: parse_listing_page CALLED with URL: {response.url} ---")
        self.logger.info('Parsing page: %s', response.url)
        # determine current page number: prefer meta, fallback to cp query param
        page_num = response.meta.get('mogi_page_number')
        if not page_num:
            qs = parse_qs(urlparse(response.url).query)
            try:
                page_num = int(qs.get('cp', [None])[0]) if qs.get('cp') else None
            except Exception:
                page_num = None

        listing_selectors = response.css('div.property-listing ul > li')
        if posthog_client:
            posthog_client.capture(
                event='listing_page_parsed',
                properties={
                    'page_number': page_num,
                    'listing_count': len(listing_selectors),
                },
            )
        for selector in listing_selectors:
            page = MogiListingPage(selector)
            item = MogiListingItem()
            item['title'] = page.get_title()
            item['location'] = page.get_location()
            item['square'] = page.get_square()
            item['rooms'] = page.get_rooms()
            item['wc'] = page.get_wc()
            item['money'] = page.get_money()
            item['when_posted'] = page.get_when_posted()
            detail_url = urljoin(response.url, page.get_url())
            item['url'] = detail_url
            item['page_number'] = page_num
            item['page_detail'] = detail_url
            yield item

    def parse(self, response):
        return self.parse_listing_page(response)
