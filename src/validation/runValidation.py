import json
from pathlib import Path
from schemaValidation import validate_record
from excelExport import write_records_to_excel


def flatten_record_for_excel(validated_record: dict) -> dict:
    return {
        'taskId': validated_record.get('taskId'),
        'url': validated_record.get('url'),
        'title': validated_record.get('title'),
        'extractedAt': validated_record.get('extractedAt'),
        'headingCount': len(validated_record.get('headings', [])),
        'linkCount': len(validated_record.get('links', [])),
        'metadata': json.dumps(validated_record.get('metadata', {}), ensure_ascii=False),
    }


def validate_extraction_record(path: Path) -> dict:
    with path.open('r', encoding='utf-8') as file:
        payload = json.load(file)

    validated = validate_record(payload)
    return validated


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Validate extraction JSON against the schema model.')
    parser.add_argument('file', type=Path, help='Path to the extraction JSON file')
    parser.add_argument('--excel', type=str, help='Optional Excel output path')
    args = parser.parse_args()

    validated = validate_extraction_record(args.file)
    output = json.dumps(validated, ensure_ascii=True, indent=2, default=str)
    print(output)

    if args.excel:
        write_records_to_excel([flatten_record_for_excel(validated)], args.excel)
        print(f'Wrote Excel: {args.excel}')
