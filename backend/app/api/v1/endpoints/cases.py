from typing import List
from fastapi import APIRouter, HTTPException, status, Query
from app.models.case import Case, CaseCreate, CaseUpdate, CaseSearchParams, CaseResponse
from app.services.case_service import CaseService
from app.core.database import get_database
from bson import ObjectId
import pandas as pd
import glob
import os

router = APIRouter()

cityList = [
  '北京', '天津', '石家庄', '太原', '呼和浩特', '沈阳', '长春', '哈尔滨',
  '上海', '南京', '杭州', '合肥', '福州', '南昌', '济南', '郑州',
  '武汉', '长沙', '广州', '南宁', '海口', '重庆', '成都', '贵阳',
  '昆明', '拉萨', '西安', '兰州', '西宁', '银川', '乌鲁木齐', '大连',
  '青岛', '宁波', '厦门', '深圳'
]

PBOC_DATA_PATH = "../pboc"

def get_csvdf_for_pending(penfolder, beginwith):
    files = glob.glob(os.path.join(penfolder, "**", beginwith + "*.csv"), recursive=True)
    dflist = []
    for filepath in files:
        try:
            pendf = pd.read_csv(filepath, index_col=0, low_memory=False)
            dflist.append(pendf)
        except Exception:
            continue
    if dflist:
        df = pd.concat(dflist)
        df.reset_index(drop=True, inplace=True)
    else:
        df = pd.DataFrame()
    return df

def get_pboc_data_for_pending(orgname: str, data_type: str):
    if data_type not in ["sum", "dtl"]:
        return pd.DataFrame()
    beginwith = f"pboc{data_type}"
    all_data = get_csvdf_for_pending(PBOC_DATA_PATH, beginwith)
    if all_data.empty:
        return pd.DataFrame()
    org_data = all_data[all_data["区域"] == orgname]
    if not org_data.empty:
        org_data = org_data.copy()
        if "date" in org_data.columns:
            org_data["发布日期"] = pd.to_datetime(org_data["date"], errors='coerce').dt.date
    return org_data

@router.get("/pending-orgs", response_model=List[str])
async def get_pending_orgs():
    """
    Get a list of organizations that have new cases to be updated.
    """
    pending_orgs = []
    for org_name in cityList:
        try:
            sum_df = get_pboc_data_for_pending(org_name, "sum")
            dtl_df = get_pboc_data_for_pending(org_name, "dtl")

            if sum_df.empty:
                continue

            max_sum_date = sum_df["发布日期"].max()
            
            if dtl_df.empty:
                pending_orgs.append(org_name)
                continue

            max_dtl_date = dtl_df["发布日期"].max()

            if pd.isna(max_dtl_date) or max_dtl_date < max_sum_date:
                pending_orgs.append(org_name)
        except Exception as e:
            # Log the error or handle as needed
            print(f"Error processing org {org_name}: {e}")
            continue
            
    return pending_orgs

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