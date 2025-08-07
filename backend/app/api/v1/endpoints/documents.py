from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.models.document import Document, DocumentUpdate, DocumentResponse, DocumentUploadResponse
from app.models.user import User
from app.services.document_service import DocumentService
from app.core.database import get_database
from .auth import get_current_active_user
from bson import ObjectId
import os

router = APIRouter()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    case_id: str = Form(None),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a document"""
    if case_id and not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    document_service = DocumentService(db)
    
    try:
        document = await document_service.upload_document(
            file=file,
            document_type=document_type,
            case_id=case_id,
            uploaded_by=current_user.username
        )
        
        return DocumentUploadResponse(
            message="Document uploaded successfully",
            document_id=str(document.id),
            filename=document.filename,
            processing_status=document.processing_status
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    case_id: str = None,
    document_type: str = None,
    processing_status: str = None,
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(get_current_active_user)
):
    """List documents with optional filters"""
    if case_id and not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    document_service = DocumentService(db)
    
    documents = await document_service.list_documents(
        case_id=case_id,
        document_type=document_type,
        processing_status=processing_status,
        page=page,
        size=size
    )
    
    return [
        DocumentResponse(
            id=str(doc.id),
            filename=doc.filename,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            case_id=str(doc.case_id) if doc.case_id else None,
            document_type=doc.document_type,
            extracted_text=doc.extracted_text,
            ocr_confidence=doc.ocr_confidence,
            processing_status=doc.processing_status,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            uploaded_by=doc.uploaded_by,
            metadata=doc.metadata
        )
        for doc in documents
    ]

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get document details"""
    if not ObjectId.is_valid(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )
    
    db = await get_database()
    document_service = DocumentService(db)
    
    document = await document_service.get_document_by_id(document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentResponse(
        id=str(document.id),
        filename=document.filename,
        file_size=document.file_size,
        mime_type=document.mime_type,
        case_id=str(document.case_id) if document.case_id else None,
        document_type=document.document_type,
        extracted_text=document.extracted_text,
        ocr_confidence=document.ocr_confidence,
        processing_status=document.processing_status,
        created_at=document.created_at,
        updated_at=document.updated_at,
        uploaded_by=document.uploaded_by,
        metadata=document.metadata
    )

@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Download document file"""
    if not ObjectId.is_valid(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )
    
    db = await get_database()
    document_service = DocumentService(db)
    
    document = await document_service.get_document_by_id(document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on disk"
        )
    
    return FileResponse(
        path=document.file_path,
        filename=document.filename,
        media_type=document.mime_type
    )

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update document metadata"""
    if not ObjectId.is_valid(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )
    
    db = await get_database()
    document_service = DocumentService(db)
    
    document = await document_service.update_document(document_id, document_update)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentResponse(
        id=str(document.id),
        filename=document.filename,
        file_size=document.file_size,
        mime_type=document.mime_type,
        case_id=str(document.case_id) if document.case_id else None,
        document_type=document.document_type,
        extracted_text=document.extracted_text,
        ocr_confidence=document.ocr_confidence,
        processing_status=document.processing_status,
        created_at=document.created_at,
        updated_at=document.updated_at,
        uploaded_by=document.uploaded_by,
        metadata=document.metadata
    )

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a document"""
    if not ObjectId.is_valid(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )
    
    db = await get_database()
    document_service = DocumentService(db)
    
    success = await document_service.delete_document(document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return {"message": "Document deleted successfully"}

@router.post("/{document_id}/process")
async def process_document(
    document_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Trigger document processing (OCR, text extraction)"""
    if not ObjectId.is_valid(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )
    
    db = await get_database()
    document_service = DocumentService(db)
    
    try:
        await document_service.process_document(document_id)
        return {"message": "Document processing started"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process document"
        )