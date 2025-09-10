from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import glob
import os
import re
from datetime import datetime
import logging

from app.core.config import settings
from app.core.database import db, get_database, connect_to_mongo

# 配置日志
logger = logging.getLogger(__name__)

router = APIRouter()

# Request models
class UplinkUpdateRequest(BaseModel):
    selected_ids: List[str]

# Local PBOC CSV root (relative to backend/)
PBOC_DATA_PATH = "../pboc"


async def _ensure_db():
    if db.database is None:
        try:
            await connect_to_mongo()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MongoDB连接失败: {e}")


def _read_csvs(folder: str, prefix: str) -> pd.DataFrame:
    try:
        files = glob.glob(os.path.join(folder, f"{prefix}*.csv"))
        logger.info(f"正在读取CSV文件: {prefix}*.csv，找到 {len(files)} 个文件")
        
        if not files:
            logger.warning(f"在路径 {folder} 中未找到 {prefix}*.csv 文件")
            return pd.DataFrame()
        
        frames: List[pd.DataFrame] = []
        failed_files = []
        
        for fp in files:
            try:
                # 检查文件是否存在且可读
                if not os.path.exists(fp):
                    logger.error(f"文件不存在: {fp}")
                    failed_files.append((os.path.basename(fp), "文件不存在"))
                    continue
                    
                if not os.access(fp, os.R_OK):
                    logger.error(f"文件无读取权限: {fp}")
                    failed_files.append((os.path.basename(fp), "无读取权限"))
                    continue
                
                # 不使用index_col，保持与frontend一致
                df = pd.read_csv(fp, dtype=str, low_memory=False)
                
                if df.empty:
                    logger.warning(f"文件为空: {os.path.basename(fp)}")
                    failed_files.append((os.path.basename(fp), "文件为空"))
                    continue
                    
                frames.append(df)
                logger.info(f"成功读取文件: {os.path.basename(fp)}，记录数: {len(df)}，列数: {len(df.columns)}")
                
            except pd.errors.EmptyDataError:
                error_msg = "CSV文件为空或格式错误"
                logger.error(f"读取文件失败: {os.path.basename(fp)}，错误: {error_msg}")
                failed_files.append((os.path.basename(fp), error_msg))
                continue
            except pd.errors.ParserError as e:
                error_msg = f"CSV解析错误: {str(e)}"
                logger.error(f"读取文件失败: {os.path.basename(fp)}，错误: {error_msg}")
                failed_files.append((os.path.basename(fp), error_msg))
                continue
            except PermissionError:
                error_msg = "文件权限不足"
                logger.error(f"读取文件失败: {os.path.basename(fp)}，错误: {error_msg}")
                failed_files.append((os.path.basename(fp), error_msg))
                continue
            except Exception as e:
                error_msg = f"未知错误: {str(e)}"
                logger.error(f"读取文件失败: {os.path.basename(fp)}，错误: {error_msg}")
                failed_files.append((os.path.basename(fp), error_msg))
                continue
        
        # 记录失败的文件
        if failed_files:
            logger.warning(f"以下文件读取失败: {failed_files}")
        
        if not frames:
            logger.error(f"所有{prefix}文件都读取失败，返回空数据框")
            return pd.DataFrame()
        
        out = pd.concat(frames, ignore_index=True)
        logger.info(f"合并完成，总记录数: {len(out)}，成功文件数: {len(frames)}/{len(files)}")
        return out
        
    except Exception as e:
        logger.error(f"读取CSV文件时发生严重错误: {str(e)}")
        return pd.DataFrame()


def _build_dtllink_df() -> pd.DataFrame:
    """Mirror legacy uplink shaping: select columns, strip spaces, add 发布日期 from date, filter uid and join pboccat."""
    try:
        logger.info("开始构建dtllink数据框")
        
        # 检查PBOC数据路径是否存在
        if not os.path.exists(PBOC_DATA_PATH):
            logger.error(f"PBOC数据路径不存在: {PBOC_DATA_PATH}")
            return pd.DataFrame()
        
        dtl = _read_csvs(PBOC_DATA_PATH, "pbocdtl")
        if dtl.empty:
            logger.warning("pbocdtl数据为空，返回空数据框")
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
            logger.info("开始关联pbocsum数据")
            sum_df = _read_csvs(PBOC_DATA_PATH, "pbocsum")
            if not sum_df.empty and "link" in sum_df.columns and "link" in dtllink.columns:
                # 选择需要的pbocsum字段
                sum_cols = ["link", "区域", "name", "date"]
                available_sum_cols = [c for c in sum_cols if c in sum_df.columns]
                sum_subset = sum_df[available_sum_cols].copy()
                
                # 去重pbocsum数据（保留第一条记录）
                before_dedup = len(sum_subset)
                sum_subset = sum_subset.drop_duplicates(subset=["link"], keep="first")
                after_dedup = len(sum_subset)
                logger.info(f"pbocsum去重: {before_dedup} -> {after_dedup} 条记录")
                
                # 左关联
                before_merge = len(dtllink)
                dtllink = dtllink.merge(sum_subset, on="link", how="left")
                logger.info(f"pbocsum关联完成，记录数保持: {before_merge} -> {len(dtllink)}")
            else:
                logger.warning("pbocsum数据为空或缺少link字段，跳过关联")
        except Exception as e:
            logger.error(f"pbocsum关联失败: {str(e)}")
            # 如果关联失败，继续处理但不添加pbocsum字段
            pass
        
        # 统一 文号列为字符串
        if "处罚决定书文号" in dtllink.columns:
            dtllink.loc[:, "处罚决定书文号"] = dtllink["处罚决定书文号"].astype(str)
        
        # 在pboccat关联之前过滤掉uid为空的记录（与前端逻辑保持一致）
        if "uid" in dtllink.columns:
            before_filter = len(dtllink)
            dtllink = dtllink.dropna(subset=["uid"])
            # 过滤掉uid为空字符串的记录
            dtllink = dtllink[dtllink["uid"].astype(str).str.strip() != ""]
            after_filter = len(dtllink)
            logger.info(f"过滤空uid记录: {before_filter} -> {after_filter} 条记录")
        
        # 左关联pboccat数据，增加amount、category、province、industry字段
        if "uid" in dtllink.columns:
            try:
                logger.info("开始关联pboccat数据")
                cat_df = _read_csvs(PBOC_DATA_PATH, "pboccat")
                if not cat_df.empty and "uid" in cat_df.columns:
                    # 选择需要的pboccat字段
                    cat_cols = ["uid", "amount", "category", "province", "industry"]
                    available_cat_cols = [c for c in cat_cols if c in cat_df.columns]
                    cat_subset = cat_df[available_cat_cols].copy()
                    
                    # 过滤掉uid为空的pboccat记录
                    before_cat_filter = len(cat_subset)
                    cat_subset = cat_subset.dropna(subset=["uid"])
                    cat_subset = cat_subset[cat_subset["uid"].astype(str).str.strip() != ""]
                    after_cat_filter = len(cat_subset)
                    logger.info(f"pboccat过滤空uid: {before_cat_filter} -> {after_cat_filter} 条记录")
                    
                    # 去重pboccat数据（保留第一条记录）
                    before_cat_dedup = len(cat_subset)
                    cat_subset = cat_subset.drop_duplicates(subset=["uid"], keep="first")
                    after_cat_dedup = len(cat_subset)
                    logger.info(f"pboccat去重: {before_cat_dedup} -> {after_cat_dedup} 条记录")
                    
                    # 左关联
                    before_cat_merge = len(dtllink)
                    dtllink = dtllink.merge(cat_subset, on="uid", how="left")
                    logger.info(f"pboccat关联完成，记录数保持: {before_cat_merge} -> {len(dtllink)}")
                else:
                    logger.warning("pboccat数据为空或缺少uid字段，跳过关联")
            except Exception as e:
                logger.error(f"pboccat关联失败: {str(e)}")
                # 如果关联失败，继续处理但不添加pboccat字段
                pass
    
        # 处理企业名称中的空白字符问题
        if "企业名称" in dtllink.columns:
            before_name_clean = dtllink["企业名称"].notna().sum()
            # 将纯空白字符的企业名称设为None，但保留有实际内容的企业名称
            dtllink.loc[dtllink["企业名称"].str.strip() == "", "企业名称"] = None
            after_name_clean = dtllink["企业名称"].notna().sum()
            logger.info(f"企业名称清理: {before_name_clean} -> {after_name_clean} 条有效记录")
        
        # 发布日期
        if "date" in dtllink.columns:
            try:
                dtllink["发布日期"] = pd.to_datetime(dtllink["date"], errors="coerce").dt.strftime("%Y-%m-%d")
                valid_dates = dtllink["发布日期"].notna().sum()
                logger.info(f"发布日期处理完成，有效日期: {valid_dates} 条")
            except Exception as e:
                logger.error(f"发布日期处理失败: {str(e)}")
                dtllink["发布日期"] = None
        
        logger.info(f"dtllink数据框构建完成，最终记录数: {len(dtllink)}")
        return dtllink
        
    except Exception as e:
        logger.error(f"构建dtllink数据框时发生严重错误: {str(e)}")
        return pd.DataFrame()


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

        # 连接数据库
        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        collection_size = await col.count_documents({})

        # pending by comparing uids: 本地CSV中存在但MongoDB中不存在的uid
        dtllink = _build_dtllink_df()
        pending = 0
        
        # 获取MongoDB中已存在的uid列表
        existing_uids = []
        async for doc in col.find({"uid": {"$exists": True, "$ne": None}}, {"uid": 1}):
            if doc.get("uid"):
                existing_uids.append(doc["uid"])
        
        # 计算待更新数据量：本地CSV中存在但MongoDB中不存在的uid数量
        # 使用与frontend相同的逻辑: dtllink[~dtllink["uid"].isin(olddf["uid"])]
        if not dtllink.empty and "uid" in dtllink.columns:
            pending_mask = ~dtllink["uid"].isin(existing_uids)
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
        error_msg = f"获取uplink信息失败: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/null-stats")
async def uplink_null_stats():
    """Return null value statistics for each field in pending data."""
    try:
        # 获取待上线数据
        dtllink = _build_dtllink_df()
        
        if dtllink.empty:
            return {"null_stats": {}, "total_records": 0}
        
        # 获取MongoDB中已存在的uid列表
        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]
        existing_uids = []
        async for doc in col.find({"uid": {"$exists": True, "$ne": None}}, {"uid": 1}):
            if doc.get("uid"):
                existing_uids.append(doc["uid"])
        
        # 过滤出待上线数据（本地存在但MongoDB中不存在的数据）
        if "uid" in dtllink.columns:
            pending_mask = ~dtllink["uid"].isin(existing_uids)
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
async def uplink_update(request: UplinkUpdateRequest):
    """Insert selected dtl rows (from CSV) into Mongo pbocdtl by link-dedup."""
    start_time = datetime.now()
    processing_log = []
    
    try:
        logger.info("开始执行uplink更新操作")
        processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 开始执行uplink更新操作")
        
        # 构建数据
        data_start = datetime.now()
        dtllink = _build_dtllink_df()
        data_time = (datetime.now() - data_start).total_seconds()
        processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 数据构建完成，耗时: {data_time:.2f}秒")
        
        if dtllink.empty:
            logger.warning("数据为空，无记录可处理")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 数据为空，无记录可处理")
            total_time = (datetime.now() - start_time).total_seconds()
            return {
                "inserted": 0, 
                "skipped": 0,
                "total_records": 0,
                "processing_time": f"{total_time:.2f}s",
                "data_build_time": f"{data_time:.2f}s",
                "processing_log": processing_log
            }

        await _ensure_db()
        database = await get_database()
        col = database["pbocdtl"]

        # If no selected_ids provided, use all pending records (backward compatibility)
        if request.selected_ids is None or len(request.selected_ids) == 0:
            logger.info("处理所有待处理记录（向后兼容模式）")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 处理所有待处理记录（向后兼容模式）")
            
            # existing uids
            uids = dtllink["uid"].dropna().unique().tolist() if "uid" in dtllink.columns else []
            logger.info(f"找到 {len(uids)} 个唯一uid")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 找到 {len(uids)} 个唯一uid")
            
            existing_uids: set[str] = set()
            if uids:
                check_start = datetime.now()
                cursor = col.find({"uid": {"$in": uids}}, {"uid": 1, "_id": 0})
                async for doc in cursor:
                    if "uid" in doc and doc["uid"]:
                        existing_uids.add(doc["uid"])
                check_time = (datetime.now() - check_start).total_seconds()
                logger.info(f"检查已存在uid完成，找到 {len(existing_uids)} 个已存在，耗时: {check_time:.2f}秒")
                processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 检查已存在uid完成，找到 {len(existing_uids)} 个已存在，耗时: {check_time:.2f}秒")

            # build docs to insert
            build_start = datetime.now()
            to_insert: List[Dict[str, Any]] = []
            for _, row in dtllink.iterrows():
                uid = row.get("uid")
                if not uid or uid in existing_uids:
                    continue
                doc = {k: (None if (pd.isna(v)) else v) for k, v in row.to_dict().items()}
                to_insert.append(doc)
            build_time = (datetime.now() - build_start).total_seconds()
            logger.info(f"构建插入文档完成，准备插入 {len(to_insert)} 条记录，耗时: {build_time:.2f}秒")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 构建插入文档完成，准备插入 {len(to_insert)} 条记录，耗时: {build_time:.2f}秒")

            inserted = 0
            if to_insert:
                insert_start = datetime.now()
                res = await col.insert_many(to_insert)
                inserted = len(res.inserted_ids)
                insert_time = (datetime.now() - insert_start).total_seconds()
                logger.info(f"数据插入完成，成功插入 {inserted} 条记录，耗时: {insert_time:.2f}秒")
                processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 数据插入完成，成功插入 {inserted} 条记录，耗时: {insert_time:.2f}秒")
                
                total_time = (datetime.now() - start_time).total_seconds()
                return {
                    "inserted": inserted, 
                    "skipped": len(uids) - inserted,
                    "total_records": len(uids),
                    "processing_time": f"{total_time:.2f}s",
                    "data_build_time": f"{data_time:.2f}s",
                    "check_existing_time": f"{check_time:.2f}s",
                    "build_docs_time": f"{build_time:.2f}s",
                    "insert_time": f"{insert_time:.2f}s",
                    "processing_log": processing_log
                }
            
            total_time = (datetime.now() - start_time).total_seconds()
            logger.info("无新记录需要插入")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 无新记录需要插入")
            return {
                "inserted": 0, 
                "skipped": len(uids),
                "total_records": len(uids),
                "processing_time": f"{total_time:.2f}s",
                "data_build_time": f"{data_time:.2f}s",
                "processing_log": processing_log
            }
        else:
            # Filter for selected records only
            logger.info(f"处理选定的 {len(request.selected_ids)} 个记录")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 处理选定的 {len(request.selected_ids)} 个记录")
            
            filter_start = datetime.now()
            # 使用uid字段进行匹配，因为前端发送的是uid
            selected_df = dtllink[dtllink["uid"].isin(request.selected_ids)]
            filter_time = (datetime.now() - filter_start).total_seconds()
            logger.info(f"过滤选定记录完成，找到 {len(selected_df)} 条匹配记录，耗时: {filter_time:.2f}秒")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 过滤选定记录完成，找到 {len(selected_df)} 条匹配记录，耗时: {filter_time:.2f}秒")
            
            if selected_df.empty:
                logger.warning("选定的记录在数据中未找到")
                processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 选定的记录在数据中未找到")
                total_time = (datetime.now() - start_time).total_seconds()
                return {
                    "inserted": 0, 
                    "skipped": 0,
                    "total_records": len(request.selected_ids),
                    "processing_time": f"{total_time:.2f}s",
                    "data_build_time": f"{data_time:.2f}s",
                    "filter_time": f"{filter_time:.2f}s",
                    "processing_log": processing_log
                }

            # Check which selected uids already exist in MongoDB
            check_start = datetime.now()
            existing_uids: set[str] = set()
            cursor = col.find({"uid": {"$in": request.selected_ids}}, {"uid": 1, "_id": 0})
            async for doc in cursor:
                if "uid" in doc and doc["uid"]:
                    existing_uids.add(doc["uid"])
            check_time = (datetime.now() - check_start).total_seconds()
            logger.info(f"检查选定uid完成，找到 {len(existing_uids)} 个已存在，耗时: {check_time:.2f}秒")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 检查选定uid完成，找到 {len(existing_uids)} 个已存在，耗时: {check_time:.2f}秒")

            # build docs to insert (only those not already in MongoDB)
            build_start = datetime.now()
            to_insert: List[Dict[str, Any]] = []
            for _, row in selected_df.iterrows():
                uid = row.get("uid")
                if not uid or uid in existing_uids:
                    continue
                doc = {k: (None if (pd.isna(v)) else v) for k, v in row.to_dict().items()}
                to_insert.append(doc)
            build_time = (datetime.now() - build_start).total_seconds()
            logger.info(f"构建选定插入文档完成，准备插入 {len(to_insert)} 条记录，耗时: {build_time:.2f}秒")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 构建选定插入文档完成，准备插入 {len(to_insert)} 条记录，耗时: {build_time:.2f}秒")

            inserted = 0
            if to_insert:
                insert_start = datetime.now()
                res = await col.insert_many(to_insert)
                inserted = len(res.inserted_ids)
                insert_time = (datetime.now() - insert_start).total_seconds()
                logger.info(f"选定数据插入完成，成功插入 {inserted} 条记录，耗时: {insert_time:.2f}秒")
                processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 选定数据插入完成，成功插入 {inserted} 条记录，耗时: {insert_time:.2f}秒")
                
                total_time = (datetime.now() - start_time).total_seconds()
                return {
                    "inserted": inserted, 
                    "skipped": len(request.selected_ids) - inserted,
                    "total_records": len(request.selected_ids),
                    "processing_time": f"{total_time:.2f}s",
                    "data_build_time": f"{data_time:.2f}s",
                    "filter_time": f"{filter_time:.2f}s",
                    "check_existing_time": f"{check_time:.2f}s",
                    "build_docs_time": f"{build_time:.2f}s",
                    "insert_time": f"{insert_time:.2f}s",
                    "processing_log": processing_log
                }
            
            total_time = (datetime.now() - start_time).total_seconds()
            logger.info("选定记录中无新记录需要插入")
            processing_log.append(f"[{datetime.now().strftime('%H:%M:%S')}] 选定记录中无新记录需要插入")
            return {
                "inserted": 0, 
                "skipped": len(request.selected_ids),
                "total_records": len(request.selected_ids),
                "processing_time": f"{total_time:.2f}s",
                "data_build_time": f"{data_time:.2f}s",
                "filter_time": f"{filter_time:.2f}s",
                "check_existing_time": f"{check_time:.2f}s",
                "build_docs_time": f"{build_time:.2f}s",
                "processing_log": processing_log
            }
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
        
        if dtllink.empty or "uid" not in dtllink.columns:
            return {"records": [], "count": 0}
        
        # 获取MongoDB中已存在的uid列表
        existing_uids = []
        async for doc in col.find({"uid": {"$exists": True, "$ne": None}}, {"uid": 1}):
            if doc.get("uid"):
                existing_uids.append(doc["uid"])
        
        # 筛选出本地CSV中存在但MongoDB中不存在的记录
        # 使用与frontend相同的逻辑: dtllink[~dtllink["uid"].isin(olddf["uid"])]
        pending_mask = ~dtllink["uid"].isin(existing_uids)
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
        
        if dtllink.empty or "uid" not in dtllink.columns:
            raise HTTPException(status_code=404, detail="No pending data available")
        
        # 获取MongoDB中已存在的uid列表
        existing_uids = []
        async for doc in col.find({"uid": {"$exists": True, "$ne": None}}, {"uid": 1}):
            if doc.get("uid"):
                existing_uids.append(doc["uid"])
        
        # 筛选出本地CSV中存在但MongoDB中不存在的记录
        pending_mask = ~dtllink["uid"].isin(existing_uids)
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
        
        if dtllink.empty or "uid" not in dtllink.columns:
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
