from typing import List
from fastapi import APIRouter, HTTPException, status, Query
from app.models.case import Case, CaseCreate, CaseUpdate, CaseSearchParams, CaseResponse
from app.services.case_service import CaseService
from app.core.database import get_database
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=Case)
async def create_case(
    case_data: CaseCreate,
):
    """Create a new case"""
    db = await get_database()
    case_service = CaseService(db)
    
    case = await case_service.create_case(case_data, created_by="system")
    return case

@router.get("/", response_model=CaseResponse)
async def search_cases(
    q: str = Query(None, description="Search query"),
    organization: str = Query(None, description="Organization filter"),
    province: str = Query(None, description="Province filter"),
    city: str = Query(None, description="City filter"),
    case_type: str = Query(None, description="Case type filter"),
    status: str = Query(None, description="Status filter"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
):
    """Search and filter cases"""
    db = await get_database()
    case_service = CaseService(db)
    
    search_params = CaseSearchParams(
        q=q,
        organization=organization,
        province=province,
        city=city,
        case_type=case_type,
        status=status,
        page=page,
        size=size
    )
    
    result = await case_service.search_cases(search_params)
    return result

@router.get("/{case_id}", response_model=Case)
async def get_case(
    case_id: str,
):
    """Get a specific case by ID"""
    if not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    case_service = CaseService(db)
    
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    return case

@router.put("/{case_id}", response_model=Case)
async def update_case(
    case_id: str,
    case_update: CaseUpdate,
):
    """Update a case"""
    if not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    case_service = CaseService(db)
    
    case = await case_service.update_case(case_id, case_update)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    return case

@router.delete("/{case_id}")
async def delete_case(
    case_id: str,
):
    """Delete a case"""
    if not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    case_service = CaseService(db)
    
    success = await case_service.delete_case(case_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    return {"message": "Case deleted successfully"}

@router.get("/stats/overview")
async def get_case_statistics():
    """Get case statistics for dashboard"""
    db = await get_database()
    case_service = CaseService(db)
    
    stats = await case_service.get_case_statistics()
    return stats

@router.get("/export/csv")
async def export_cases_csv(
    q: str = Query(None, description="Search query"),
    organization: str = Query(None, description="Organization filter"),
    province: str = Query(None, description="Province filter"),
    city: str = Query(None, description="City filter"),
    case_type: str = Query(None, description="Case type filter"),
    status: str = Query(None, description="Status filter"),
):
    """Export filtered cases to CSV"""
    db = await get_database()
    case_service = CaseService(db)
    
    search_params = CaseSearchParams(
        q=q,
        organization=organization,
        province=province,
        city=city,
        case_type=case_type,
        status=status,
        page=1,
        size=10000  # Export all matching cases
    )
    
    csv_content = await case_service.export_cases_csv(search_params)
    
    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cases_export.csv"}
    )