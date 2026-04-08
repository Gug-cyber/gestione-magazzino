from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FeatureFlagResponse(BaseModel):
    key: str
    enabled: bool
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeatureFlagUpdate(BaseModel):
    enabled: bool
    description: Optional[str] = None


class FeatureFlagBulkItem(BaseModel):
    key: str
    enabled: bool
    description: Optional[str] = None


class FeatureFlagBulkUpdate(BaseModel):
    flags: List[FeatureFlagBulkItem]
