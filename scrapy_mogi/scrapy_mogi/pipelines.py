import os
from typing import Dict, Any
import pandas as pd
from openpyxl.utils import get_column_letter
from scrapy.exceptions import DropItem
from scrapy_mogi.posthog_client import posthog_client


class ExcelExportPipeline:
    async def open_spider(self, spider):
        self.records = []
        self.output_dir = os.path.join(os.getcwd(), 'pages-exploration', 'excel')
        os.makedirs(self.output_dir, exist_ok=True)
        self.output_path = os.path.join(self.output_dir, 'mogi_10_pages_mined.xlsx')

    def process_item(self, item: Dict[str, Any], spider):
        record = {
            'Title': item.get('title', ''),
            'Location': item.get('location', ''),
            'Square': item.get('square', ''),
            'Rooms': item.get('rooms', ''),
            'WC': item.get('wc', ''),
            'Money': item.get('money', ''),
            'When posted': item.get('when_posted', ''),
            'Page Number': item.get('page_number', ''),
            'Page Detail': item.get('page_detail', '') or item.get('url', ''),
        }
        self.records.append(record)
        return item

    async def close_spider(self, spider):
        if not self.records:
            raise DropItem('No records to export')

        df = pd.DataFrame(self.records)
        with pd.ExcelWriter(self.output_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='mogi_listings', index=False)
            worksheet = writer.sheets['mogi_listings']
            for idx, col in enumerate(df.columns, 1):
                column_length = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.column_dimensions[get_column_letter(idx)].width = min(column_length, 60)

        spider.logger.info('Wrote %d listings to Excel: %s', len(self.records), self.output_path)
        if posthog_client:
            posthog_client.capture(
                event='listing_export_completed',
                properties={'listing_count': len(self.records)},
            )
