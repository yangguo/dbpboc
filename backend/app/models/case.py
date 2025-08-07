from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class CaseBase(BaseModel):
    title: str = Field(..., description="Case title")
    description: Optional[str] = Field(None, description="Case description")
    case_number: str = Field(..., description="Unique case number")
    organization: str = Field(..., description="Organization name")
    province: str = Field(..., description="Province")
    city: str = Field(..., description="City")
    penalty_amount: Optional[float] = Field(None, description="Penalty amount")
    penalty_date: Optional[datetime] = Field(None, description="Penalty date")
    case_type: str = Field(..., description="Type of case")
    status: str = Field(default="active", description="Case status")
    tags: List[str] = Field(default_factory=list, description="Case tags")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    organization: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    penalty_amount: Optional[float] = None
    penalty_date: Optional[datetime] = None
    case_type: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class CaseInDB(CaseBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Case(CaseInDB):
    pass

class CaseSearchParams(BaseModel):
    q: Optional[str] = Field(None, description="Search query")
    organization: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    case_type: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_penalty: Optional[float] = None
    max_penalty: Optional[float] = None
    tags: Optional[List[str]] = None
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)

class CaseResponse(BaseModel):
    cases: List[Case]
    total: int
    page: int
    size: int
    pages: int