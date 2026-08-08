from typing import List, Optional
from scrapy import Selector


class MogiListingPage:
    LISTING_SELECTOR = 'div.property-listing ul > li'
    TITLE_SELECTOR = '.prop-title'
    LOCATION_SELECTOR = '.prop-addr'
    ATTR_SELECTOR = '.prop-attr > li'
    PRICE_SELECTOR = '.price'
    POSTED_SELECTOR = 'div:has(.price) + div, .prop-info > div:nth-last-child(1)'

    def __init__(self, selector: Selector):
        self.selector = selector

    def get_title(self) -> Optional[str]:
        return self.selector.css(self.TITLE_SELECTOR + '::text').get(default='').strip()

    def get_location(self) -> Optional[str]:
        return self.selector.css(self.LOCATION_SELECTOR + '::text').get(default='').strip()

    def get_attributes(self) -> List[str]:
        return [attr.strip() for attr in self.selector.css(self.ATTR_SELECTOR + '::text').getall() if attr.strip()]

    def get_square(self) -> Optional[str]:
        attrs = self.get_attributes()
        for attr in attrs:
            if 'm' in attr.lower() or 'm²' in attr.lower() or 'm2' in attr.lower():
                return attr.replace('\n', ' ').strip()
        return ''

    def get_rooms(self) -> Optional[str]:
        attrs = self.get_attributes()
        for attr in attrs:
            if 'pn' in attr.lower() or 'phòng' in attr.lower():
                return attr.replace('\n', ' ').strip()
        return ''

    def get_wc(self) -> Optional[str]:
        attrs = self.get_attributes()
        for attr in attrs:
            if 'wc' in attr.lower() or 'toilet' in attr.lower():
                return attr.replace('\n', ' ').strip()
        return ''

    def get_money(self) -> Optional[str]:
        return self.selector.css(self.PRICE_SELECTOR + '::text').get(default='').strip()

    def get_when_posted(self) -> Optional[str]:
        posted = self.selector.xpath('.//div[normalize-space(text()) and (contains(translate(text(), "HÔMHN", "hômhn"), "hôm") or contains(translate(text(), "NGÀY", "ngày"), "ngày") or contains(translate(text(), "TUẦN", "tuần"), "tuần"))]/text()').get()
        return posted.strip() if posted else ''

    def get_url(self) -> Optional[str]:
        return self.selector.css('a.link-overlay::attr(href)').get(default='').strip()
