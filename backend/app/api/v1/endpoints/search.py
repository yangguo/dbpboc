from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import pandas as pd
import glob
import os
import time
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Local PBOC CSV root (relative to backend/)
PBOC_DATA_PATH = "../pboc"


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

    # Join -> cat on link/id
    if not cat_df.empty and {"id"}.issubset(cat_df.columns):
        cat_cols = [c for c in ["amount", "category", "province", "industry", "id"] if c in cat_df.columns]
        cat_sub = cat_df[cat_cols].drop_duplicates()
        t0 = time.time()
        merged = merged.merge(cat_sub, left_on="link", right_on="id", how="left")
        t1 = time.time()
        if debug is not None:
            msg = f"merge(...<-cat) rows: {len(merged)} time: {t1 - t0:.2f}s"
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


@router.get("/cases")
def search_cases(
    q: Optional[str] = Query(None, description="关键词：企业名称/违法类型/处罚内容/文号/分类/标题"),
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
):
    try:
        debug: list[str] = [] if verbose else None  # type: ignore
        t_start = time.time()
        if verbose:
            msg = f"search_cases started with params: q={q}, region={region}, province={province}, industry={industry}, dates=({start_date},{end_date}), amount=({min_amount},{max_amount}), page={page}, size={page_size}"
            debug.append(msg)  # type: ignore
            logger.info(msg)

        df = _load_joined_dataset(debug)
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

        if q:
            q_lower = q.lower()
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
                    any_match = any_match | df[c].astype(str).str.lower().str.contains(q_lower, na=False)
                mask = mask & any_match
                if verbose:
                    debug.append(f"after keyword filter rows: {int(mask.sum())}")  # type: ignore

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

        # Sort by publish_date desc then amount desc
        if "publish_date" in filtered.columns:
            filtered["_pub"] = pd.to_datetime(filtered["publish_date"], errors="coerce")
            filtered.sort_values(["_pub", "amount_num"], ascending=[False, False], inplace=True)
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
