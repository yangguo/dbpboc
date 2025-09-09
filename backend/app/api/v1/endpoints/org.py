from fastapi import APIRouter, HTTPException
from app.services.case_service import CaseService
from app.core.database import get_database
from typing import Dict, Any, List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/stats")
async def get_org_stats() -> Dict[str, Any]:
    """Get organization statistics"""
    try:
        db = await get_database()
        case_service = CaseService(db)
        
        # Get organization statistics
        stats = await case_service.get_case_statistics()
        
        # Format response for organization stats
        return {
            "totalOrganizations": len(stats.get("by_province", {})),
            "byProvince": stats.get("by_province", {}),
            "byCaseType": stats.get("by_case_type", {}),
            "totalCases": stats.get("total_cases", 0),
            "totalPenalty": stats.get("total_penalty", 0)
        }
    except Exception as e:
        logger.error(f"Error getting org stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def get_org_list() -> List[Dict[str, Any]]:
    """Get list of organizations"""
    try:
        db = await get_database()
        case_service = CaseService(db)
        
        # Get organization list from case data
        org_list = await case_service.get_organizations()
        
        return org_list
    except Exception as e:
        logger.error(f"Error getting org list: {e}")
        raise HTTPException(status_code=500, detail=str(e))