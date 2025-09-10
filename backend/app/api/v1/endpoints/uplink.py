from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import glob
import os
import re
from datetime import datetime

from app.core.config import settings
from app.core.database import db, get_database, connect_to_mongo

router = APIRouter()

# Local PBOC CSV root (relative to backend/)
PBOC_DATA_PATH = "../pboc"


async def _ensure_db():
    if db.database is None:
        try:
            await connect_to_mongo()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MongoDB连接失败: {e}")


def _read_csvs(folder: str, prefix: str) -> pd.DataFrame:
    files = glob.glob(os.path.join(folder, f"{prefix}*.csv"))
    frames: List[pd.DataFrame] = []
    for fp in files:
        try:
            df = pd.read_csv(fp, index_col=0, dtype=str, low_memory=False)
            frames.append(df)
        except Exception:
            continue
    if not frames:
        return pd.DataFrame()
    out = pd.concat(frames, ignore_index=True)
    return out


def _build_dtllink_df() -> pd.DataFrame:
    """Mirror legacy uplink shaping: select columns, strip spaces, add 发布日期 from date, filter uid and join pboccat."""
    dtl = _read_csvs(PBOC_DATA_PATH, "pbocdtl")
    if dtl.empty:
        return pd.DataFrame()
    
    # 选择dtl中的基础字段，企业名称直接从pbocdtl获取
    dtl_cols = [
        "企业名称",
        "处罚决定书文号",
        "违法行为类型",
        "行政处罚内容",
        "行政处罚依据",
        "作出行政处罚决定机关名称",
        "作出行政处罚决定日期",
        "link",
        "uid",
    ]
    # Intersect available columns
    available_dtl = [c for c in dtl_cols if c in dtl.columns]
    dtllink = dtl[available_dtl].copy()
    
    # 通过link字段左关联pbocsum获取区域、name、date字段
    try:
        sum_df = _read_csvs(PBOC_DATA_PATH, "pbocsum")
        if not sum_df.empty and "link" in sum_df.columns and "link" in dtllink.columns:
            # 选择需要的pbocsum字段
            sum_cols = ["link", "区域", "name", "date"]
            available_sum_cols = [c for c in sum_cols if c in sum_df.columns]
            sum_subset = sum_df[available_sum_cols].copy()
            
            # 去重pbocsum数据（保留第一条记录）
            sum_subset = sum_subset.drop_duplicates(subset=["link"], keep="first")
            
            # 左关联
            dtllink = dtllink.merge(sum_subset, on="link", how="left")
    except Exception as e:
        # 如果关联失败，继续处理但不添加pbocsum字段
        pass
    
    # 统一 文号列为字符串
    if "处罚决定书文号" in dtllink.columns:
        dtllink.loc[:, "处罚决定书文号"] = dtllink["处罚决定书文号"].astype(str)
    
    # 在pboccat关联之前过滤掉uid为空的记录（与前端逻辑保持一致）
    if "uid" in dtllink.columns:
        dtllink = dtllink.dropna(subset=["uid"])
        # 过滤掉uid为空字符串的记录
        dtllink = dtllink[dtllink["uid"].astype(str).str.strip() != ""]
    
    # 左关联pboccat数据，增加amount、category、province、industry字段
    if "uid" in dtllink.columns:
        try:
            cat_df = _read_csvs(PBOC_DATA_PATH, "pboccat")
            if not cat_df.empty and "uid" in cat_df.columns:
                # 选择需要的pboccat字段
                cat_cols = ["uid", "amount", "category", "province", "industry"]
                available_cat_cols = [c for c in cat_cols if c in cat_df.columns]
                cat_subset = cat_df[available_cat_cols].copy()
                
                # 过滤掉uid为空的pboccat记录
                cat_subset = cat_subset.dropna(subset=["uid"])
                cat_subset = cat_subset[cat_subset["uid"].astype(str).str.strip() != ""]
                
                # 去重pboccat数据（保留第一条记录）
                cat_subset = cat_subset.drop_duplicates(subset=["uid"], keep="first")
                
                # 左关联
                dtllink = dtllink.merge(cat_subset, on="uid", how="left")
        except Exception as e:
            # 如果关联失败，继续处理但不添加pboccat字段
            pass
    
    # 处理企业名称中的空白字符问题
    if "企业名称" in dtllink.columns:
        # 将纯空白字符的企业名称设为None，但保留有实际内容的企业名称
        dtllink.loc[dtllink["企业名称"].str.strip() == "", "企业名称"] = None
    
    # 发布日期
    if "date" in dtllink.columns:
        try:
            dtllink["发布日期"] = pd.to_datetime(dtllink["date"], errors="coerce").dt.strftime("%Y-%m-%d")
        except Exception:
            dtllink["发布日期"] = None
    
    return dtllink


def _stats_for_df(df: pd.DataFrame) -> Dict[str, Any]:
    if df is None or df.empty:
        return {"total_cases": 0, "link_count": 0, "uid_count": 0, "min_date": None, "max_date": None}
    total = len(df)
    link_count = int(df["link"].nunique()) if "link" in df.columns else 0
    uid_count = int(df["uid"].nunique()) if "uid" in df.columns else 0
    min_date = None
    max_date = None
    for c in ["发布日期", "date", "publish_date"]:
        if c in df.columns:
            ser = pd.to_datetime(df[c], errors="coerce")
            if ser.notna().any():
                min_date = str(ser.min().date())
                max_date = str(ser.max().date())
                break
    return {"total_cases": total, "link_count": link_count, "uid_count": uid_count, "min_date": min_date, "max_date": max_date}


def _stats_for_cat(df_cat: pd.DataFrame, df_sum: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """Compute stats for pboccat.

    - total_cases: rows in cat
    - link_count: unique id/link/url count (prefer 'id', then 'link', then 'url')
    - min/max date: derived by joining to sum on link to use 发布日期/date when available
    """
    if df_cat is None or df_cat.empty:
        return {"total_cases": 0, "link_count": 0, "uid_count": 0, "min_date": None, "max_date": None}

    # Determine identifier column in cat
    link_col: Optional[str] = None
    for c in ["id", "link", "url"]:
        if c in df_cat.columns:
            link_col = c
            break

    total = len(df_cat)
    id_count = 0
    uid_count = 0
    if link_col is not None:
        try:
            id_count = int(df_cat[link_col].dropna().nunique())
        except Exception:
            id_count = 0

    # uid unique
    try:
        if "uid" in df_cat.columns:
            uid_count = int(df_cat["uid"].dropna().nunique())
    except Exception:
        uid_count = 0

    min_date = None
    max_date = None
    try:
        if df_sum is not None and not df_sum.empty and link_col is not None and "link" in df_sum.columns:
            join_cols = [c for c in ["link", "区域", "date", "发布日期"] if c in df_sum.columns]
            sum_min = df_sum[join_cols].drop_duplicates()
            merged = df_cat.merge(sum_min, how="left", left_on=link_col, right_on="link")
            # compute date range preferring 发布日期 then date
            for c in ["发布日期", "date", "publish_date"]:
                if c in merged.columns:
                    ser = pd.to_datetime(merged[c], errors="coerce")
                    if ser.notna().any():
                        min_date = str(ser.min().date())
                        max_date = str(ser.max().date())
                        break
    except Exception:
        # keep None if any error
        pass
    return {"total_cases": total, "link_count": int(id_count), "uid_count": uid_count, "min_date": min_date, "max_date": max_date}


@router.get("/info")
async def uplink_info():
    """Return CSV dataset stats plus current Mongo collection size and pending update count."""
    try:
        sum_df = _read_csvs(PBOC_DATA_PATH, "pbocsum")
        dtl_df = _read_csvs(PBOC_DATA_PATH, "pbocdtl")
        cat_df = _read_csvs(PBOC_DATA_PATH, "pboccat")
        sum_stats = _stats_for_df(sum_df)
        dtl_stats = _stats_for_df(dtl_df)
        cat_stats = _stats_for_cat(cat_df, sum_df)

        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        collection_size = await col.count_documents({})

        # pending by comparing links: 本地CSV中存在但MongoDB中不存在的link
        dtllink = _build_dtllink_df()
        pending = 0
        
        # 获取MongoDB中已存在的link列表
        existing_links = []
        async for doc in col.find({"link": {"$exists": True, "$ne": None}}, {"link": 1}):
            if doc.get("link"):
                existing_links.append(doc["link"])
        
        # 计算待更新数据量：本地CSV中存在但MongoDB中不存在的链接数量
        # 使用与frontend相同的逻辑: dtllink[~dtllink["link"].isin(olddf["link"])]
        if not dtllink.empty and "link" in dtllink.columns:
            pending_mask = ~dtllink["link"].isin(existing_links)
            pending = int(pending_mask.sum())
        else:
            pending = 0

        return {
            "sum": sum_stats,
            "dtl": dtl_stats,
            "cat": cat_stats,
            "collection": {"name": "pbocdtl", "size": collection_size, "pending": pending},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/null-stats")
async def uplink_null_stats():
    """Return null value statistics for each field in pending data."""
    try:
        # 获取待上线数据
        dtllink = _build_dtllink_df()
        
        if dtllink.empty:
            return {"null_stats": {}, "total_records": 0}
        
        # 获取MongoDB中已存在的link列表
        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        existing_links = []
        async for doc in col.find({"link": {"$exists": True, "$ne": None}}, {"link": 1}):
            if doc.get("link"):
                existing_links.append(doc["link"])
        
        # 过滤出待上线数据（本地存在但MongoDB中不存在的数据）
        if "link" in dtllink.columns:
            pending_mask = ~dtllink["link"].isin(existing_links)
            pending_data = dtllink[pending_mask]
        else:
            pending_data = dtllink
        
        if pending_data.empty:
            return {"null_stats": {}, "total_records": 0}
        
        # 统计每个字段的空值数量
        null_stats = {}
        total_records = len(pending_data)
        
        for column in pending_data.columns:
            # 统计空值（包括None、NaN、空字符串）
            null_count = pending_data[column].isnull().sum()
            empty_string_count = (pending_data[column] == "").sum() if pending_data[column].dtype == 'object' else 0
            total_null = int(null_count + empty_string_count)
            
            null_stats[column] = {
                "null_count": total_null,
                "null_percentage": round((total_null / total_records) * 100, 2) if total_records > 0 else 0,
                "non_null_count": total_records - total_null
            }
        
        return {
            "null_stats": null_stats,
            "total_records": total_records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def uplink_export():
    """Export current Mongo pbocdtl collection as CSV."""
    try:
        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        docs = []
        async for d in col.find({}):
            d.pop("_id", None)
            docs.append(d)
        df = pd.DataFrame(docs)
        # 使用UTF-8 BOM编码以确保中文在Excel中正确显示
        if not df.empty:
            csv_content = df.to_csv(index=False)
            csv_bytes = '\ufeff'.encode('utf-8') + csv_content.encode('utf-8')
        else:
            csv_bytes = '\ufeff'.encode('utf-8')
        filename = f"uplink_pbocdtl_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
        # 使用RFC 5987格式的文件名编码以支持中文文件名
        from urllib.parse import quote
        safe_filename = quote(filename.encode('utf-8'), safe='')
        headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"}
        return Response(content=csv_bytes, media_type="text/csv; charset=utf-8", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
async def uplink_clear():
    """Delete all documents in pbocdtl collection."""
    try:
        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        res = await col.delete_many({})
        return {"deleted": res.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update")
async def uplink_update(selected_ids: List[str] = None):
    """Insert selected dtl rows (from CSV) into Mongo pbocdtl by link-dedup."""
    try:
        dtllink = _build_dtllink_df()
        if dtllink.empty:
            return {"inserted": 0, "skipped": 0}

        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]

        # If no selected_ids provided, use all pending records (backward compatibility)
        if selected_ids is None or len(selected_ids) == 0:
            # existing links
            links = dtllink["link"].dropna().unique().tolist() if "link" in dtllink.columns else []
            existing_links: set[str] = set()
            if links:
                cursor = col.find({"link": {"$in": links}}, {"link": 1, "_id": 0})
                async for doc in cursor:
                    if "link" in doc and doc["link"]:
                        existing_links.add(doc["link"]) 

            # build docs to insert
            to_insert: List[Dict[str, Any]] = []
            for _, row in dtllink.iterrows():
                link = row.get("link")
                if not link or link in existing_links:
                    continue
                doc = {k: (None if (pd.isna(v)) else v) for k, v in row.to_dict().items()}
                to_insert.append(doc)

            inserted = 0
            if to_insert:
                start_time = datetime.now()
                res = await col.insert_many(to_insert)
                inserted = len(res.inserted_ids)
                processing_time = (datetime.now() - start_time).total_seconds()
                return {"inserted": inserted, "skipped": len(links) - inserted, "processing_time": f"{processing_time:.2f}s"}
            return {"inserted": 0, "skipped": len(links)}
        else:
            # Filter for selected records only
            selected_df = dtllink[dtllink["link"].isin(selected_ids)]
            if selected_df.empty:
                return {"inserted": 0, "skipped": 0}

            # Check which selected links already exist in MongoDB
            existing_links: set[str] = set()
            cursor = col.find({"link": {"$in": selected_ids}}, {"link": 1, "_id": 0})
            async for doc in cursor:
                if "link" in doc and doc["link"]:
                    existing_links.add(doc["link"])

            # build docs to insert (only those not already in MongoDB)
            to_insert: List[Dict[str, Any]] = []
            for _, row in selected_df.iterrows():
                link = row.get("link")
                if not link or link in existing_links:
                    continue
                doc = {k: (None if (pd.isna(v)) else v) for k, v in row.to_dict().items()}
                to_insert.append(doc)

            inserted = 0
            if to_insert:
                start_time = datetime.now()
                res = await col.insert_many(to_insert)
                inserted = len(res.inserted_ids)
                processing_time = (datetime.now() - start_time).total_seconds()
                return {"inserted": inserted, "skipped": len(selected_ids) - inserted, "processing_time": f"{processing_time:.2f}s"}
            return {"inserted": 0, "skipped": len(selected_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending")
async def uplink_pending():
    """Return pending records: MongoDB中存在但本地CSV中不存在的记录."""
    try:
        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        
        # 获取本地CSV数据
        dtllink = _build_dtllink_df()
        
        if dtllink.empty or "link" not in dtllink.columns:
            return {"records": [], "count": 0}
        
        # 获取MongoDB中已存在的link列表
        existing_links = []
        async for doc in col.find({"link": {"$exists": True, "$ne": None}}, {"link": 1}):
            if doc.get("link"):
                existing_links.append(doc["link"])
        
        # 筛选出本地CSV中存在但MongoDB中不存在的记录
        # 使用与frontend相同的逻辑: dtllink[~dtllink["link"].isin(olddf["link"])]
        pending_mask = ~dtllink["link"].isin(existing_links)
        pending_df = dtllink[pending_mask]
        
        # 转换为字典列表，处理NaN值
        pending_records = []
        for _, row in pending_df.iterrows():
            record = {k: (None if pd.isna(v) else v) for k, v in row.to_dict().items()}
            pending_records.append(record)
        
        return {
            "records": pending_records,
            "count": len(pending_records)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export-pending")
async def uplink_export_pending():
    """Export all pending records as CSV."""
    try:
        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        
        # 获取本地CSV数据
        dtllink = _build_dtllink_df()
        
        if dtllink.empty or "link" not in dtllink.columns:
            raise HTTPException(status_code=404, detail="No pending data available")
        
        # 获取MongoDB中已存在的link列表
        existing_links = []
        async for doc in col.find({"link": {"$exists": True, "$ne": None}}, {"link": 1}):
            if doc.get("link"):
                existing_links.append(doc["link"])
        
        # 筛选出本地CSV中存在但MongoDB中不存在的记录
        pending_mask = ~dtllink["link"].isin(existing_links)
        pending_df = dtllink[pending_mask]
        
        if pending_df.empty:
            raise HTTPException(status_code=404, detail="No pending records found")
        
        # 转换为CSV，使用UTF-8 BOM编码以确保中文在Excel中正确显示
        csv_content = pending_df.to_csv(index=False)
        # 添加UTF-8 BOM标记，确保Excel等软件正确识别中文编码
        csv_bytes = '\ufeff'.encode('utf-8') + csv_content.encode('utf-8')
        filename = f"pending_data_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
        # 使用RFC 5987格式的文件名编码以支持中文文件名
        from urllib.parse import quote
        safe_filename = quote(filename.encode('utf-8'), safe='')
        headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"}
        return Response(content=csv_bytes, media_type="text/csv; charset=utf-8", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ExportSelectedRequest(BaseModel):
    selected_ids: List[str]

@router.post("/export-selected")
async def uplink_export_selected(request: ExportSelectedRequest):
    """Export selected pending records as CSV."""
    try:
        if not request.selected_ids:
            raise HTTPException(status_code=400, detail="No selected IDs provided")
        
        # 获取本地CSV数据
        dtllink = _build_dtllink_df()
        
        if dtllink.empty or "link" not in dtllink.columns:
            raise HTTPException(status_code=404, detail="No pending data available")
        
        # 筛选出选中的记录 - 支持uid、id或索引
        selected_df = pd.DataFrame()
        
        for selected_id in request.selected_ids:
            # 尝试按uid匹配
            if "uid" in dtllink.columns:
                uid_match = dtllink[dtllink["uid"] == selected_id]
                if not uid_match.empty:
                    selected_df = pd.concat([selected_df, uid_match], ignore_index=True)
                    continue
            
            # 尝试按id匹配
            if "id" in dtllink.columns:
                id_match = dtllink[dtllink["id"] == selected_id]
                if not id_match.empty:
                    selected_df = pd.concat([selected_df, id_match], ignore_index=True)
                    continue
            
            # 尝试按索引匹配 (格式: index-N)
            if selected_id.startswith("index-"):
                try:
                    index_num = int(selected_id.split("-")[1])
                    if 0 <= index_num < len(dtllink):
                        index_match = dtllink.iloc[[index_num]]
                        selected_df = pd.concat([selected_df, index_match], ignore_index=True)
                except (ValueError, IndexError):
                    continue
        
        if selected_df.empty:
            raise HTTPException(status_code=404, detail="No matching records found")
        
        # 转换为CSV，使用UTF-8 BOM编码以确保中文在Excel中正确显示
        csv_content = selected_df.to_csv(index=False)
        # 添加UTF-8 BOM标记，确保Excel等软件正确识别中文编码
        csv_bytes = '\ufeff'.encode('utf-8') + csv_content.encode('utf-8')
        filename = f"selected_pending_data_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
        # 使用RFC 5987格式的文件名编码以支持中文文件名
        from urllib.parse import quote
        safe_filename = quote(filename.encode('utf-8'), safe='')
        headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"}
        return Response(content=csv_bytes, media_type="text/csv; charset=utf-8", headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
