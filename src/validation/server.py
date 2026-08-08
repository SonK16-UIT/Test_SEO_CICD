from fastapi import FastAPI, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from schemaValidation import validate_record
from excelExport import write_records_to_excel

app = FastAPI()

class RecordsPayload(BaseModel):
    records: List[Dict[str, Any]]
    output_file: str

@app.post('/validate')
async def validate_payload(payload: RecordsPayload):
    validated = []
    errors = []
    for i, record in enumerate(payload.records):
        try:
            validated_record = validate_record(record)
            validated.append(validated_record)
        except Exception as exc:
            errors.append({'index': i, 'error': str(exc), 'record': record})
    if errors:
        raise HTTPException(status_code=400, detail=errors)
    write_records_to_excel(validated, payload.output_file)
    return {'status': 'ok', 'record_count': len(validated), 'output_file': payload.output_file}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
