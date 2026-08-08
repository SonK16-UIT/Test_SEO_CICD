from pydantic import BaseModel, Field, HttpUrl
from typing import List, Dict, Any

class ExtractionRecord(BaseModel):
    taskId: str
    url: HttpUrl
    title: str
    extractedAt: str
    headings: List[Dict[str, Any]] = Field(default_factory=list)
    links: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    raw: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        extra = 'allow'


def validate_record(data: Dict[str, Any]) -> Dict[str, Any]:
    record = ExtractionRecord(**data)
    return record.model_dump(mode='json')
