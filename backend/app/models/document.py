from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from .case import PyObjectId

class DocumentBase(BaseModel):
    filename: str = Field(..., description="Original filename")
    file_path: str = Field(..., description="File storage path")
    file_size: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME type")
    case_id: Optional[PyObjectId] = Field(None, description="Associated case ID")
    document_type: str = Field(..., description="Type of document")
    extracted_text: Optional[str] = Field(None, description="Extracted text content")
    ocr_confidence: Optional[float] = Field(None, description="OCR confidence score")
    processing_status: str = Field(default="pending", description="Processing status")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    filename: Optional[str] = None
    case_id: Optional[PyObjectId] = None
    document_type: Optional[str] = None
    extracted_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    processing_status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class DocumentInDB(DocumentBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: Optional[str] = None
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Document(DocumentInDB):
    pass

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    mime_type: str
    case_id: Optional[str] = None
    document_type: str
    extracted_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    processing_status: str
    created_at: datetime
    updated_at: datetime
    uploaded_by: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class DocumentUploadResponse(BaseModel):
    message: str
    document_id: str
    filename: str
    processing_status: str