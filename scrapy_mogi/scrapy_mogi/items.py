import scrapy

class MogiListingItem(scrapy.Item):
    title = scrapy.Field()
    location = scrapy.Field()
    square = scrapy.Field()
    rooms = scrapy.Field()
    wc = scrapy.Field()
    money = scrapy.Field()
    when_posted = scrapy.Field()
    url = scrapy.Field()
    page_number = scrapy.Field()
    page_detail = scrapy.Field()
