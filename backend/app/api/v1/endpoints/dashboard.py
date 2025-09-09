from fastapi import APIRouter, HTTPException
from app.services.case_service import CaseService
from app.core.database import get_database
from typing import Dict, Any, List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/stats")
async def get_dashboard_stats() -> Dict[str, Any]:
    """Get dashboard statistics"""
    try:
        db = await get_database()
        case_service = CaseService(db)
        
        # Get case statistics
        stats = await case_service.get_case_statistics()
        
        # Format response to match frontend expectations
        return {
            "totalCases": stats.get("total_cases", 0),
            "totalPenalty": stats.get("total_penalty", 0),
            "avgPenalty": stats.get("avg_penalty", 0),
            "byStatus": stats.get("by_status", {}),
            "byProvince": stats.get("by_province", {}),
            "byCaseType": stats.get("by_case_type", {}),
            "recentCases": stats.get("recent_cases", 0)
        }
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent-cases")
async def get_recent_cases(limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent cases for dashboard"""
    try:
        db = await get_database()
        case_service = CaseService(db)
        
        # Get recent cases
        recent_cases = await case_service.get_recent_cases(limit)
        
        return recent_cases
    except Exception as e:
        logger.error(f"Error getting recent cases: {e}")
        raise HTTPException(status_code=500, detail=str(e))