from datetime import date as Date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    date: Date
    description: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(income|expense)$")
    amount: float = Field(..., ge=0)
    status: str = Field(default="completed", pattern="^(completed|pending|cancelled)$")
    notes: str = Field(default="", max_length=1000)


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    date: Optional[Date] = None
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    amount: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(completed|pending|cancelled)$")
    notes: Optional[str] = Field(None, max_length=1000)


class TransactionResponse(TransactionBase):
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionBatchImportRequest(BaseModel):
    transactions: List[TransactionCreate]
    skip_duplicates: bool = True


class TransactionBatchImportResponse(BaseModel):
    imported_count: int
    skipped_count: int
    total_count: int
    duplicates: List[str] = []


class CategoriesResponse(BaseModel):
    income: List[str]
    expense: List[str]
