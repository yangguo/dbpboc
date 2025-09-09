from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.core.database import get_database

router = APIRouter()

@router.get("/pending")
async def get_pending_data() -> Dict[str, Any]:
    """
    获取待更新的数据列表
    返回数据库中的统计信息，因为CSV文件是动态生成的
    """
    try:
        # 获取MongoDB中的现有数据
        db = await get_database()
        
        # 获取各个集合的数据量
        sum_collection = db["pbocsum"]
        dtl_collection = db["pbocdtl"]
        cat_collection = db["pboccat"]
        
        # 统计现有数据量
        sum_count = await sum_collection.count_documents({})
        dtl_count = await dtl_collection.count_documents({})
        cat_count = await cat_collection.count_documents({})
        
        # 获取唯一链接数
        sum_links = await sum_collection.distinct("link")
        dtl_links = await dtl_collection.distinct("link")
        
        sum_unique_links = len(sum_links) if sum_links else 0
        dtl_unique_links = len(dtl_links) if dtl_links else 0
        
        # 计算待更新数据量（这里简化为0，因为数据是从网站实时抓取的）
        # 实际的待更新数据需要通过爬虫检查网站更新
        pending_count = 0
        
        return {
            "pending_count": pending_count,
            "pending_data": [],
            "message": f"Found {pending_count} pending records",
            "database_stats": {
                "pbocsum_count": sum_count,
                "pbocdtl_count": dtl_count,
                "pboccat_count": cat_count,
                "sum_unique_links": sum_unique_links,
                "dtl_unique_links": dtl_unique_links
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting pending data: {str(e)}")