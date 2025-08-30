from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Tuple, Dict, Any
import pandas as pd
import glob
import os
import time
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Local PBOC CSV root (relative to backend/)
PBOC_DATA_PATH = "../pboc"


# Simple in-process cache for the joined dataset
_DATA_CACHE: Dict[str, Any] = {
    "df": None,          # Cached DataFrame
    "etag": None,        # Files mtime signature
    "ts": 0.0,           # Built timestamp
}
_CACHE_TTL_SECONDS = 300  # skip filesystem etag checks within this window


def _read_csvs(folder: str, prefix: str, debug: list | None = None) -> pd.DataFrame:
    t0 = time.time()
    files = glob.glob(os.path.join(folder, "**", f"{prefix}*.csv"), recursive=True)
    if debug is not None:
        msg = f"[{prefix}] matched files: {len(files)}"
        debug.append(msg)
        logger.info(msg)
    frames = []
    for fp in files:
        try:
            df = pd.read_csv(fp, index_col=0, dtype=str, low_memory=False)
            frames.append(df)
        except Exception:
            continue
    if not frames:
        out = pd.DataFrame()
    else:
        out = pd.concat(frames, ignore_index=True)
    t1 = time.time()
    if debug is not None:
        rows = 0 if out is None or out.empty else len(out)
        msg = f"[{prefix}] loaded rows: {rows}, time: {t1 - t0:.2f}s"
        debug.append(msg)
        logger.info(msg)
    return out


def _load_joined_dataset(debug: list | None = None) -> pd.DataFrame:
    """Load pbocsum, pbocdtl, pboccat and join on link/id.

    - sum_df: columns [name, date, link, 区域]
    - dtl_df: columns [企业名称, 处罚决定书文号, 违法行为类型, 行政处罚依据, 行政处罚内容, 作出行政处罚决定机关名称, 作出行政处罚决定日期, link, uid, date]
    - cat_df: columns [amount, category, province, industry, id, uid]
    """
    sum_df = _read_csvs(PBOC_DATA_PATH, "pbocsum", debug)
    dtl_df = _read_csvs(PBOC_DATA_PATH, "pbocdtl", debug)
    cat_df = _read_csvs(PBOC_DATA_PATH, "pboccat", debug)

    if dtl_df.empty:
        return pd.DataFrame()

    # Ensure merge keys exist
    if not {"link"}.issubset(dtl_df.columns):
        return pd.DataFrame()

    # Join dtl -> sum on link
    merged = dtl_df.copy()
    if not sum_df.empty and {"link"}.issubset(sum_df.columns):
        sum_cols = [c for c in ["name", "date", "link", "区域"] if c in sum_df.columns]
        sum_sub = sum_df[sum_cols].drop_duplicates()
        t0 = time.time()
        merged = merged.merge(sum_sub, on="link", how="left", suffixes=("", "_sum"))
        t1 = time.time()
        if debug is not None:
            msg = f"merge(dtl<-sum) rows: {len(merged)} time: {t1 - t0:.2f}s"
            debug.append(msg)
            logger.info(msg)

    # Join -> cat, prefer uid join; fallback to link=id
    if not cat_df.empty:
        # Preferred: join on uid if present in both
        if {"uid"}.issubset(cat_df.columns) and {"uid"}.issubset(merged.columns):
            cat_cols = [c for c in ["amount", "category", "province", "industry", "uid"] if c in cat_df.columns]
            cat_sub = cat_df[cat_cols].copy()
            # Ensure unique by uid to avoid one-to-many expansion
            before = len(cat_sub)
            cat_sub = cat_sub.sort_values(["uid"]).drop_duplicates(subset=["uid"], keep="first")
            t0 = time.time()
            merged = merged.merge(cat_sub, on="uid", how="left", suffixes=("", "_cat"))
            t1 = time.time()
            if debug is not None:
                msg = f"merge(dtl<-cat by uid) rows: {len(merged)} time: {t1 - t0:.2f}s (cat unique: {before}->{len(cat_sub)})"
                debug.append(msg)
                logger.info(msg)
        # Fallback: join on link=id if uid missing on either side
        elif {"id"}.issubset(cat_df.columns) and {"link"}.issubset(merged.columns):
            cat_cols = [c for c in ["amount", "category", "province", "industry", "id"] if c in cat_df.columns]
            cat_sub = cat_df[cat_cols].copy()
            # Ensure unique by id to avoid one-to-many expansion
            before = len(cat_sub)
            cat_sub = cat_sub.sort_values(["id"]).drop_duplicates(subset=["id"], keep="first")
            t0 = time.time()
            merged = merged.merge(cat_sub, left_on="link", right_on="id", how="left")
            t1 = time.time()
            if debug is not None:
                msg = f"merge(dtl<-cat by link=id) rows: {len(merged)} time: {t1 - t0:.2f}s (cat unique: {before}->{len(cat_sub)})"
                debug.append(msg)
                logger.info(msg)

    # Normalize dates and amounts
    if "date" in merged.columns:
        # Prefer publish date from sum if available (sum.date)
        # If dtl also has a "date" column, keep as dtl_date
        if "date_sum" in merged.columns:
            merged.rename(columns={"date": "dtl_date", "date_sum": "publish_date"}, inplace=True)
        else:
            merged.rename(columns={"date": "publish_date"}, inplace=True)

    # Amount to numeric
    if "amount" in merged.columns:
        merged["amount_num"] = pd.to_numeric(
            merged["amount"].astype(str).str.replace(",", "", regex=False), errors="coerce"
        )

    return merged


def _compute_files_etag() -> Tuple[int, int]:
    """Compute an etag from the newest mtime and file count of matching CSVs.

    Returns (max_mtime, file_count). If no files, returns (0, 0).
    """
    patterns = [
        os.path.join(PBOC_DATA_PATH, "**", "pbocsum*.csv"),
        os.path.join(PBOC_DATA_PATH, "**", "pbocdtl*.csv"),
        os.path.join(PBOC_DATA_PATH, "**", "pboccat*.csv"),
    ]
    files: list[str] = []
    for pat in patterns:
        files.extend(glob.glob(pat, recursive=True))
    if not files:
        return (0, 0)
    try:
        mtimes = [int(os.path.getmtime(fp)) for fp in files]
        return (max(mtimes), len(files))
    except Exception:
        # If any issue, fall back to time-based invalidation
        return (0, len(files))


def _get_joined_dataset_cached(debug: list | None = None, force_reload: bool = False) -> pd.DataFrame:
    """Return cached joined dataset, reloading if files changed or forced.

    Also prepares helper columns once (e.g., parsed publish date) to avoid
    recomputation on every request.
    """
    now = time.time()
    # If we have a cached df and it's fresh, return immediately (no glob)
    if (not force_reload) and _DATA_CACHE.get("df") is not None and (now - float(_DATA_CACHE.get("ts") or 0)) < _CACHE_TTL_SECONDS:
        return _DATA_CACHE["df"]  # type: ignore

    # Otherwise, compute filesystem etag and compare
    current_etag = _compute_files_etag()
    cached_etag = _DATA_CACHE.get("etag")
    if (not force_reload) and _DATA_CACHE.get("df") is not None and cached_etag == current_etag:
        # Refresh timestamp and reuse df
        _DATA_CACHE["ts"] = now
        return _DATA_CACHE["df"]  # type: ignore

    # (Re)load
    if debug is not None:
        logger.info("cache miss or force reload; loading dataset")
        debug.append("cache: reload dataset")  # type: ignore
    df = _load_joined_dataset(debug)

    # Build helper columns once
    if not df.empty:
        if "publish_date" in df.columns:
            df["_pub"] = pd.to_datetime(df["publish_date"], errors="coerce")
        # Precompute a lowercase search blob for fast keyword search
        cols = [
            c for c in ["企业名称", "违法行为类型", "行政处罚内容", "处罚决定书文号", "category", "name"] if c in df.columns
        ]
        if cols:
            try:
                blob = pd.Series([""] * len(df))
                for c in cols:
                    blob = blob.str.cat(df[c].astype(str).str.lower().fillna(""), sep="\n")
                df["_blob"] = blob
            except Exception:
                # Fallback: if anything fails, skip blob precompute
                pass
        if "企业名称" in df.columns:
            try:
                df["_entity_lc"] = df["企业名称"].astype(str).str.lower()
            except Exception:
                pass

    _DATA_CACHE["df"] = df
    _DATA_CACHE["etag"] = current_etag
    _DATA_CACHE["ts"] = now
    return df


@router.get("/cases")
def search_cases(
    q: Optional[str] = Query(None, description="关键词：企业名称/违法类型/处罚内容/文号/分类/标题"),
    entity_name: Optional[str] = Query(None, description="企业名称（精确或模糊匹配）"),
    region: Optional[str] = Query(None, description="区域（sum.区域）"),
    province: Optional[str] = Query(None, description="省份（cat.province）"),
    industry: Optional[str] = Query(None, description="行业（cat.industry）"),
    start_date: Optional[str] = Query(None, description="发布日期起 YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="发布日期止 YYYY-MM-DD"),
    min_amount: Optional[float] = Query(None, description="最低罚款金额"),
    max_amount: Optional[float] = Query(None, description="最高罚款金额"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    verbose: bool = Query(False, description="是否返回调试日志"),
    force_reload: bool = Query(False, description="强制刷新数据缓存"),
):
    try:
        debug: list[str] = [] if verbose else None  # type: ignore
        t_start = time.time()
        if verbose:
            msg = f"search_cases started with params: q={q}, region={region}, province={province}, industry={industry}, dates=({start_date},{end_date}), amount=({min_amount},{max_amount}), page={page}, size={page_size}"
            debug.append(msg)  # type: ignore
            logger.info(msg)

        # Use cached dataset to avoid re-reading CSVs on every request
        df = _get_joined_dataset_cached(debug=debug, force_reload=force_reload)
        if df.empty:
            resp = {
                "total": 0,
                "page": page,
                "page_size": page_size,
                "items": [],
            }
            if verbose:
                t_end = time.time()
                debug.append(f"no data, total time: {t_end - t_start:.2f}s")  # type: ignore
                resp["debug"] = debug  # type: ignore
            return resp

        # Build filters
        mask = pd.Series([True] * len(df))
        if verbose:
            debug.append(f"initial rows: {len(df)}")  # type: ignore

        # If entity_name provided but q not, treat as keyword too
        if entity_name and not q:
            q = entity_name

        if q:
            q_lower = q.lower()
            if "_blob" in df.columns:
                mask = mask & df["_blob"].str.contains(q_lower, na=False)
            else:
                cols = [
                    col for col in [
                        "企业名称",
                        "违法行为类型",
                        "行政处罚内容",
                        "处罚决定书文号",
                        "category",
                        "name",  # sum title
                    ] if col in df.columns
                ]
                if cols:
                    any_match = pd.Series([False] * len(df))
                    for c in cols:
                        any_match = any_match | df[c].astype(str).str.contains(q, na=False, case=False)
                    mask = mask & any_match
            if verbose:
                debug.append(f"after keyword filter rows: {int(mask.sum())}")  # type: ignore

        # Dedicated filter on 企业名称 if specified (applied in addition to q)
        if entity_name and "企业名称" in df.columns:
            if "_entity_lc" in df.columns:
                mask = mask & df["_entity_lc"].str.contains(entity_name.lower(), na=False)
            else:
                mask = mask & df["企业名称"].astype(str).str.contains(entity_name, na=False, case=False)
            if verbose:
                debug.append(f"after entity_name filter rows: {int(mask.sum())}")  # type: ignore

        if region and "区域" in df.columns:
            mask = mask & (df["区域"].astype(str) == region)
            if verbose:
                debug.append(f"after region filter rows: {int(mask.sum())}")  # type: ignore

        if province and "province" in df.columns:
            mask = mask & (df["province"].astype(str).str.contains(province, na=False))
            if verbose:
                debug.append(f"after province filter rows: {int(mask.sum())}")  # type: ignore

        if industry and "industry" in df.columns:
            mask = mask & (df["industry"].astype(str).str.contains(industry, na=False))
            if verbose:
                debug.append(f"after industry filter rows: {int(mask.sum())}")  # type: ignore

        # Date range on publish_date
        if "publish_date" in df.columns:
            pub = pd.to_datetime(df["publish_date"], errors="coerce")
            if start_date:
                try:
                    sd = pd.to_datetime(start_date)
                    mask = mask & (pub >= sd)
                except Exception:
                    pass
                if verbose:
                    debug.append(f"after start_date filter rows: {int(mask.sum())}")  # type: ignore
            if end_date:
                try:
                    ed = pd.to_datetime(end_date)
                    mask = mask & (pub <= ed)
                except Exception:
                    pass
                if verbose:
                    debug.append(f"after end_date filter rows: {int(mask.sum())}")  # type: ignore

        # Amount range
        if "amount_num" in df.columns:
            if min_amount is not None:
                mask = mask & (df["amount_num"] >= float(min_amount))
            if max_amount is not None:
                mask = mask & (df["amount_num"] <= float(max_amount))
            if verbose:
                debug.append(f"after amount filter rows: {int(mask.sum())}")  # type: ignore

        filtered = df[mask].copy()
        if verbose:
            debug.append(f"filtered rows: {len(filtered)}")  # type: ignore

        # Sort by publish_date desc then amount desc (use cached parsed column if available)
        if "_pub" in filtered.columns or "publish_date" in filtered.columns:
            if "_pub" not in filtered.columns:
                filtered["_pub"] = pd.to_datetime(filtered["publish_date"], errors="coerce")
            filtered.sort_values(["_pub", "amount_num"], ascending=[False, False], inplace=True)

        # Strictly de-duplicate by pbocdtl uid
        if "uid" in filtered.columns:
            before = len(filtered)
            filtered = filtered.drop_duplicates(subset=["uid"], keep="first")
            if verbose and before != len(filtered):
                debug.append(f"deduplicated by uid: {before} -> {len(filtered)}")  # type: ignore
        else:
            filtered.sort_values(by="link", inplace=True)

        total = int(len(filtered))
        start = (page - 1) * page_size
        end = start + page_size
        page_df = filtered.iloc[start:end]
        if verbose:
            debug.append(f"paginate: total={total}, page={page}, size={page_size}, slice=[{start}:{end})")  # type: ignore

        # Serialize minimal fields suitable for list UI
        def _clean_val(v):
            if pd.isna(v):
                return None
            return v

        items = []
        for _, row in page_df.iterrows():
            amount_num_val = row.get("amount_num")
            try:
                amount_num_out = float(amount_num_val) if pd.notna(amount_num_val) else None
            except Exception:
                amount_num_out = None

            item = {
                "uid": _clean_val(row.get("uid")),
                "doc_no": _clean_val(row.get("处罚决定书文号")),
                "entity_name": _clean_val(row.get("企业名称")),
                "violation_type": _clean_val(row.get("违法行为类型")),
                "penalty_content": _clean_val(row.get("行政处罚内容")),
                "agency": _clean_val(row.get("作出行政处罚决定机关名称")),
                "decision_date": _clean_val(row.get("作出行政处罚决定日期")),
                "publish_date": _clean_val(row.get("publish_date")),
                "region": _clean_val(row.get("区域")),
                "province": _clean_val(row.get("province")),
                "industry": _clean_val(row.get("industry")),
                "amount": _clean_val(row.get("amount")),
                "amount_num": amount_num_out,
                "category": _clean_val(row.get("category")),
                "title": _clean_val(row.get("name")),
                "link": _clean_val(row.get("link")),
            }
            items.append(item)

        resp = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items,
        }
        if verbose:
            t_end = time.time()
            debug.append(f"done in {t_end - t_start:.2f}s")  # type: ignore
            resp["debug"] = debug  # type: ignore
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
