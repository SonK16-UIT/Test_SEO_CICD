from openpyxl import Workbook
from typing import List, Dict, Any


def write_records_to_excel(records: List[Dict[str, Any]], file_path: str) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Listings'

    if not records:
        workbook.save(file_path)
        return

    headers = list(records[0].keys())
    sheet.append(headers)

    for record in records:
        sheet.append([record.get(header, '') for header in headers])

    for column_cells in sheet.columns:
        length = max(len(str(cell.value or '')) for cell in column_cells)
        sheet.column_dimensions[column_cells[0].column_letter].width = min(50, length + 4)

    workbook.save(file_path)
