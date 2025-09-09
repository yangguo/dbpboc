from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
import logging
import pandas as pd
import os
import glob
from io import BytesIO
import zipfile
from datetime import datetime
from pathlib import Path

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# Resolve pboc folder relative to repository root for robustness
try:
    PBOC_DATA_PATH = str((Path(__file__).resolve().parents[5] / "pboc").resolve())
except Exception:
    # Fallback to previous relative path if resolution fails
    PBOC_DATA_PATH = "../pboc"


def _read_csvs(folder: str, beginwith: str) -> pd.DataFrame:
    files = glob.glob(os.path.join(folder, f"**/{beginwith}*.csv"), recursive=True)
    dflist = []
    for fp in files:
        try:
            df = pd.read_csv(fp, low_memory=False)
            # Drop unnamed index column if present
            if len(df.columns) > 0 and (df.columns[0] == "Unnamed: 0" or df.columns[0] == ""):
                df = df.drop(columns=[df.columns[0]])
            dflist.append(df)
        except Exception:
            continue
    if not dflist:
        return pd.DataFrame()
    out = pd.concat(dflist, ignore_index=True)
    return out


def _parse_date_column(df: pd.DataFrame) -> pd.Series:
    # Prefer 发布日期 then date
    if df is None or df.empty:
        return pd.Series(dtype="datetime64[ns]")
    for col in ["发布日期", "date", "公示日期", "publish_date"]:
        if col in df.columns:
            # Keep original index for alignment
            return pd.to_datetime(df[col], errors="coerce")
    # Fallback: no date column
    return pd.Series([pd.NaT] * len(df), index=df.index)


@router.get("/pboc-export")
async def export_pboc(
    regions: Optional[str] = Query(None, description="Comma-separated Chinese region names (e.g., 北京,天津)"),
    start: Optional[str] = Query(None, description="Start date YYYY-MM-DD (inclusive)"),
    end: Optional[str] = Query(None, description="End date YYYY-MM-DD (inclusive)"),
    datasets: Optional[str] = Query("pbocdtl,pbocsum,pboccat", description="Comma-separated datasets: pbocdtl,pbocsum,pboccat"),
):
    """
    Export filtered PBOC datasets (pbocdtl, pbocsum, pboccat) as a ZIP.

    - regions: comma-separated list of 区域 (e.g., 北京,天津). If omitted, includes all.
    - start/end: date range filter applied on 发布日期/日期 (inclusive). If omitted, no date filtering.
    - datasets: which tables to include, defaults to all three.
    """
    try:
        requested = [d.strip().lower() for d in (datasets or "").split(",") if d.strip()]
        valid = {"pbocdtl", "pbocsum", "pboccat"}
        requested = [d for d in requested if d in valid]
        if not requested:
            raise HTTPException(status_code=400, detail="No valid datasets specified")

        region_list: Optional[List[str]] = None
        if regions:
            # Normalize by stripping spaces
            region_list = [r.strip() for r in regions.split(",") if r.strip()]

        # Date filters
        start_dt = None
        end_dt = None
        if start:
            try:
                start_dt = datetime.strptime(start, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start date format, expected YYYY-MM-DD")
        if end:
            try:
                end_dt = datetime.strptime(end, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end date format, expected YYYY-MM-DD")

        # Load dfs as needed
        # Load sum if needed for its own export, for cat join, or to filter dtl by sum links
        need_sum = ("pbocsum" in requested) or ("pboccat" in requested) or ("pbocdtl" in requested)
        df_sum = _read_csvs(PBOC_DATA_PATH, "pbocsum") if need_sum else pd.DataFrame()
        df_dtl = _read_csvs(PBOC_DATA_PATH, "pbocdtl") if "pbocdtl" in requested else pd.DataFrame()
        df_cat = _read_csvs(PBOC_DATA_PATH, "pboccat") if "pboccat" in requested else pd.DataFrame()
        logger.info(f"[downloads] loaded shapes sum={getattr(df_sum, 'shape', None)} dtl={getattr(df_dtl, 'shape', None)} cat={getattr(df_cat, 'shape', None)}")

        # Filtering helpers
        def apply_filters(df: pd.DataFrame, region_col: Optional[str] = "区域") -> pd.DataFrame:
            if df is None or df.empty:
                return df
            out = df.copy()
            # Region filter
            if region_list and region_col and region_col in out.columns:
                out = out[out[region_col].isin(region_list)]
            # Date filter
            dates = _parse_date_column(out)
            # Use a temp column to ensure index alignment
            out = out.copy()
            out["__tmp_dt__"] = dates
            if start_dt is not None:
                out = out[out["__tmp_dt__"] >= pd.Timestamp(start_dt)]
            if end_dt is not None:
                # inclusive end
                out = out[out["__tmp_dt__"] <= pd.Timestamp(end_dt)]
            if "__tmp_dt__" in out.columns:
                out = out.drop(columns=["__tmp_dt__"]) 
            return out

        # Prepare each dataset
        outputs = []  # list of (filename, csv_string)
        date_tag = f"{start or 'all'}_{end or 'all'}"
        region_tag = "all" if not region_list else (region_list[0] if len(region_list) == 1 else "multi")
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        # Prepare filtered sum base (used for both exporting sum and filtering/joining for dtl/cat)
        sum_filtered = apply_filters(df_sum, region_col="区域") if not df_sum.empty else df_sum

        if "pbocsum" in requested:
            # Reorder typical columns if present
            if not sum_filtered.empty:
                # Ensure 发布日期 column exists for readability
                if "发布日期" not in sum_filtered.columns:
                    dates = _parse_date_column(sum_filtered)
                    sum_filtered = sum_filtered.copy()
                    sum_filtered["发布日期"] = dates.dt.date
            logger.info(f"[downloads] sum_filtered shape={getattr(sum_filtered, 'shape', None)}")
            # 使用UTF-8 BOM编码以确保中文在Excel中正确显示
            csv_content = sum_filtered.to_csv(index=False)
            csv_with_bom = '\ufeff' + csv_content
            outputs.append((f"pbocsum_{region_tag}_{date_tag}.csv", csv_with_bom))

        if "pbocdtl" in requested:
            if df_dtl.empty:
                dtl_filtered = df_dtl
            elif not sum_filtered.empty and "link" in df_dtl.columns and "link" in sum_filtered.columns:
                # Filter dtl by links present in filtered sum (more reliable than dtl's own region/date)
                links = sum_filtered["link"].dropna().unique().tolist()
                dtl_filtered = df_dtl[df_dtl["link"].isin(links)].copy()
                # Enrich 发布日期 from sum if missing
                if "发布日期" not in dtl_filtered.columns:
                    join_cols = [c for c in ["link", "date", "发布日期"] if c in sum_filtered.columns]
                    if join_cols:
                        sum_min = sum_filtered[join_cols].drop_duplicates()
                        dtl_filtered = dtl_filtered.merge(sum_min, how="left", on="link", suffixes=("", "_sum"))
                        if "发布日期" not in dtl_filtered.columns:
                            # derive from date/date_sum
                            src = "date_sum" if "date_sum" in dtl_filtered.columns else ("date" if "date" in dtl_filtered.columns else None)
                            if src:
                                dtl_filtered["发布日期"] = pd.to_datetime(dtl_filtered[src], errors="coerce").dt.date
            else:
                # Fallback: filter by dtl's own region/date
                dtl_filtered = apply_filters(df_dtl, region_col="区域")
                if not dtl_filtered.empty and "发布日期" not in dtl_filtered.columns:
                    dates = _parse_date_column(dtl_filtered)
                    dtl_filtered = dtl_filtered.copy()
                    dtl_filtered["发布日期"] = dates.dt.date
            logger.info(f"[downloads] dtl_filtered shape={getattr(dtl_filtered, 'shape', None)}")
            # 使用UTF-8 BOM编码以确保中文在Excel中正确显示
            csv_content = dtl_filtered.to_csv(index=False)
            csv_with_bom = '\ufeff' + csv_content
            outputs.append((f"pbocdtl_{region_tag}_{date_tag}.csv", csv_with_bom))

        if "pboccat" in requested:
            # Join with sum to get 区域/日期 via link
            cat_df = df_cat.copy()
            if not cat_df.empty:
                # Defensive: columns may vary; expect pboccat has 'id' as link
                link_col = None
                for c in ["id", "link", "url"]:
                    if c in cat_df.columns:
                        link_col = c
                        break
                if link_col and not df_sum.empty and "link" in df_sum.columns:
                    # Select minimal columns for join performance
                    join_cols = [c for c in ["link", "区域", "date", "发布日期"] if c in df_sum.columns]
                    sum_min = df_sum[join_cols].drop_duplicates()
                    merged = cat_df.merge(sum_min, how="left", left_on=link_col, right_on="link")
                    # Prefer sum 发布日期/date for filtering
                    # Apply region + date filters on merged
                    out = merged
                    if region_list and "区域" in out.columns:
                        out = out[out["区域"].isin(region_list)]
                    merged_dates = _parse_date_column(out)
                    # Use a temp column to ensure index alignment
                    out = out.copy()
                    out["__tmp_dt__"] = merged_dates
                    if start_dt is not None:
                        out = out[out["__tmp_dt__"] >= pd.Timestamp(start_dt)]
                    if end_dt is not None:
                        out = out[out["__tmp_dt__"] <= pd.Timestamp(end_dt)]
                    # For readability, add 发布日期 if absent
                    if "发布日期" not in out.columns:
                        out = out.copy()
                        out["发布日期"] = out["__tmp_dt__"].dt.date
                    if "__tmp_dt__" in out.columns:
                        out = out.drop(columns=["__tmp_dt__"]) 
                    cat_out = out
                else:
                    # Without join, we can only do province-based region filtering if present
                    cat_out = cat_df
                    if region_list and "province" in cat_out.columns:
                        # province like '天津市' — match if region is substring
                        cat_out = cat_out[cat_out["province"].astype(str).apply(lambda v: any(r in v for r in region_list))]
                    # No reliable date filter without join
                logger.info(f"[downloads] cat_out shape={getattr(cat_out, 'shape', None)}")
                # 使用UTF-8 BOM编码以确保中文在Excel中正确显示
                csv_content = cat_out.to_csv(index=False)
                csv_with_bom = '\ufeff' + csv_content
                outputs.append((f"pboccat_{region_tag}_{date_tag}.csv", csv_with_bom))
            else:
                # 使用UTF-8 BOM编码以确保中文在Excel中正确显示
                csv_content = pd.DataFrame().to_csv(index=False)
                csv_with_bom = '\ufeff' + csv_content
                outputs.append((f"pboccat_{region_tag}_{date_tag}.csv", csv_with_bom))

        # Build ZIP in-memory
        mem_zip = BytesIO()
        with zipfile.ZipFile(mem_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for fname, csv_content in outputs:
                data_bytes = csv_content.encode("utf-8") if isinstance(csv_content, str) else csv_content
                zf.writestr(fname, data_bytes)
        mem_zip.seek(0)

        zip_name = f"pboc_export_{region_tag}_{date_tag}_{timestamp}.zip"
        # Properly encode the filename to handle Chinese characters
        from urllib.parse import quote
        safe_filename = quote(zip_name.encode('utf-8'), safe='')
        # Return as bytes to avoid iterability issues with BytesIO in StreamingResponse
        return Response(
            content=mem_zip.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[downloads] Export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")
