from typing import List, Optional, Dict, Any
from datetime import datetime
import csv
import io
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.case import Case, CaseCreate, CaseUpdate, CaseSearchParams, CaseResponse
from bson import ObjectId
import re

class CaseService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.cases
    
    async def create_case(self, case_data: CaseCreate, created_by: str) -> Case:
        """Create a new case"""
        case_dict = case_data.dict()
        case_dict["created_at"] = datetime.utcnow()
        case_dict["updated_at"] = datetime.utcnow()
        case_dict["created_by"] = created_by
        
        result = await self.collection.insert_one(case_dict)
        case_dict["_id"] = result.inserted_id
        
        return Case(**case_dict)
    
    async def get_case_by_id(self, case_id: str) -> Optional[Case]:
        """Get case by ID"""
        case_doc = await self.collection.find_one({"_id": ObjectId(case_id)})
        if case_doc:
            return Case(**case_doc)
        return None
    
    async def get_case_by_number(self, case_number: str) -> Optional[Case]:
        """Get case by case number"""
        case_doc = await self.collection.find_one({"case_number": case_number})
        if case_doc:
            return Case(**case_doc)
        return None
    
    async def update_case(self, case_id: str, case_update: CaseUpdate) -> Optional[Case]:
        """Update case"""
        update_data = case_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": update_data}
        )
        
        if result.modified_count:
            return await self.get_case_by_id(case_id)
        return None
    
    async def delete_case(self, case_id: str) -> bool:
        """Delete case"""
        result = await self.collection.delete_one({"_id": ObjectId(case_id)})
        return result.deleted_count > 0
    
    async def search_cases(self, search_params: CaseSearchParams) -> CaseResponse:
        """Search cases with filters and pagination"""
        query = {}
        
        # Text search
        if search_params.q:
            query["$or"] = [
                {"title": {"$regex": search_params.q, "$options": "i"}},
                {"description": {"$regex": search_params.q, "$options": "i"}},
                {"case_number": {"$regex": search_params.q, "$options": "i"}},
                {"organization": {"$regex": search_params.q, "$options": "i"}}
            ]
        
        # Filters
        if search_params.organization:
            query["organization"] = {"$regex": search_params.organization, "$options": "i"}
        
        if search_params.province:
            query["province"] = search_params.province
        
        if search_params.city:
            query["city"] = search_params.city
        
        if search_params.case_type:
            query["case_type"] = search_params.case_type
        
        if search_params.status:
            query["status"] = search_params.status
        
        # Date range
        if search_params.date_from or search_params.date_to:
            date_query = {}
            if search_params.date_from:
                date_query["$gte"] = search_params.date_from
            if search_params.date_to:
                date_query["$lte"] = search_params.date_to
            query["penalty_date"] = date_query
        
        # Penalty amount range
        if search_params.min_penalty or search_params.max_penalty:
            penalty_query = {}
            if search_params.min_penalty:
                penalty_query["$gte"] = search_params.min_penalty
            if search_params.max_penalty:
                penalty_query["$lte"] = search_params.max_penalty
            query["penalty_amount"] = penalty_query
        
        # Tags
        if search_params.tags:
            query["tags"] = {"$in": search_params.tags}
        
        # Count total documents
        total = await self.collection.count_documents(query)
        
        # Calculate pagination
        skip = (search_params.page - 1) * search_params.size
        pages = (total + search_params.size - 1) // search_params.size
        
        # Execute query with pagination
        cursor = self.collection.find(query).skip(skip).limit(search_params.size)
        cursor = cursor.sort("created_at", -1)  # Sort by newest first
        
        cases = []
        async for case_doc in cursor:
            cases.append(Case(**case_doc))
        
        return CaseResponse(
            cases=cases,
            total=total,
            page=search_params.page,
            size=search_params.size,
            pages=pages
        )
    
    async def get_case_statistics(self) -> Dict[str, Any]:
        """Get case statistics for dashboard"""
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_cases": {"$sum": 1},
                    "total_penalty": {"$sum": "$penalty_amount"},
                    "avg_penalty": {"$avg": "$penalty_amount"}
                }
            }
        ]
        
        result = await self.collection.aggregate(pipeline).to_list(1)
        stats = result[0] if result else {
            "total_cases": 0,
            "total_penalty": 0,
            "avg_penalty": 0
        }
        
        # Get cases by status
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_result = await self.collection.aggregate(status_pipeline).to_list(None)
        stats["by_status"] = {item["_id"]: item["count"] for item in status_result}
        
        # Get cases by province
        province_pipeline = [
            {"$group": {"_id": "$province", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        province_result = await self.collection.aggregate(province_pipeline).to_list(10)
        stats["by_province"] = {item["_id"]: item["count"] for item in province_result}
        
        # Get cases by organization type
        org_pipeline = [
            {"$group": {"_id": "$case_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        org_result = await self.collection.aggregate(org_pipeline).to_list(None)
        stats["by_case_type"] = {item["_id"]: item["count"] for item in org_result}
        
        # Recent cases (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_count = await self.collection.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        stats["recent_cases"] = recent_count
        
        return stats
    
    async def export_cases_csv(self, search_params: CaseSearchParams) -> str:
        """Export cases to CSV format"""
        # Get all matching cases (without pagination)
        search_params.page = 1
        search_params.size = 10000
        
        result = await self.search_cases(search_params)
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "Case Number", "Title", "Organization", "Province", "City",
            "Case Type", "Penalty Amount", "Penalty Date", "Status",
            "Created At", "Tags"
        ])
        
        # Write data
        for case in result.cases:
            writer.writerow([
                case.case_number,
                case.title,
                case.organization,
                case.province,
                case.city,
                case.case_type,
                case.penalty_amount or 0,
                case.penalty_date.strftime("%Y-%m-%d") if case.penalty_date else "",
                case.status,
                case.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                ", ".join(case.tags)
            ])
        
        return output.getvalue()
    
    async def get_unique_values(self, field: str) -> List[str]:
        """Get unique values for a field (for filters)"""
        values = await self.collection.distinct(field)
        return [v for v in values if v]  # Filter out None/empty values
    
    async def bulk_update_cases(self, case_ids: List[str], update_data: Dict[str, Any]) -> int:
        """Bulk update multiple cases"""
        object_ids = [ObjectId(case_id) for case_id in case_ids]
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": update_data}
        )
        
        return result.modified_count