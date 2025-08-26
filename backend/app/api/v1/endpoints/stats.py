from fastapi import APIRouter, HTTPException
import pandas as pd
import glob
import os

router = APIRouter()

PBOC_DATA_PATH = "../pboc" 

def get_csvdf(penfolder, beginwith):
    """
    Reads all CSV files in a folder that start with a given string.
    """
    files = glob.glob(os.path.join(penfolder, "**", beginwith + "*.csv"), recursive=True)
    dflist = []
    for filepath in files:
        try:
            pendf = pd.read_csv(
                filepath,
                index_col=0,
                dtype=str,
                low_memory=False,
            )
            dflist.append(pendf)
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            continue

    if dflist:
        df = pd.concat(dflist)
        df.reset_index(drop=True, inplace=True)
    else:
        df = pd.DataFrame()
    return df

def get_pboc_data(orgname: str, data_type: str):
    """
    Gets the data for a given organization and data type ('sum' or 'dtl').
    For 'dtl' data, gets all data and links with sum data by link field to get dates.
    """
    if data_type not in ["sum", "dtl"]:
        return pd.DataFrame()

    beginwith = f"pboc{data_type}"
    all_data = get_csvdf(PBOC_DATA_PATH, beginwith)
    
    if all_data.empty:
        return pd.DataFrame()

    if data_type == "sum":
        # For sum data, filter by orgname as before
        org_data = all_data[all_data["区域"] == orgname]
        
        if not org_data.empty:
            org_data = org_data.copy()
            if "date" in org_data.columns:
                org_data["发布日期"] = pd.to_datetime(org_data["date"], errors='coerce').dt.date
    else:
        # For dtl data, follow the process: link -> sum data -> filter by region
        # Step 1: Get sum data first
        sum_data = get_csvdf(PBOC_DATA_PATH, "pbocsum")
        if sum_data.empty:
            return pd.DataFrame()
        
        # Step 2: Filter sum data by orgname (region)
        org_sum_data = sum_data[sum_data["区域"] == orgname].copy()
        if org_sum_data.empty:
            return pd.DataFrame()
        
        # Step 3: Use link field to associate dtl data with filtered sum data
        if "link" not in all_data.columns or "link" not in org_sum_data.columns:
            return pd.DataFrame()
        
        # Filter dtl data to only include records with links from this organization
        org_data = all_data[all_data["link"].isin(org_sum_data["link"])].copy()
        
        # Step 4: Add date information by merging with sum data
        if not org_data.empty and "date" in org_sum_data.columns:
            # Remove any existing date-related columns from org_data to avoid conflicts
            date_columns_to_remove = [col for col in org_data.columns if col in ["发布日期", "date"]]
            if date_columns_to_remove:
                org_data = org_data.drop(columns=date_columns_to_remove)
            
            org_sum_data["发布日期"] = pd.to_datetime(org_sum_data["date"], errors='coerce').dt.date
            # Only keep link and date columns from sum data for merging
            date_mapping = org_sum_data[["link", "发布日期"]].drop_duplicates()
            org_data = org_data.merge(date_mapping, on="link", how="left")
    
    return org_data

def get_stats_for_df(df: pd.DataFrame):
    """
    Calculates statistics for a given DataFrame.
    """
    if df.empty:
        return {
            "total_cases": 0,
            "link_count": 0,
            "min_date": None,
            "max_date": None,
        }

    total_cases = len(df)
    link_count = df["link"].nunique() if "link" in df.columns else 0
    
    min_date = None
    max_date = None
    if "发布日期" in df.columns and not df["发布日期"].dropna().empty:
        min_date = df["发布日期"].min()
        max_date = df["发布日期"].max()

    return {
        "total_cases": total_cases,
        "link_count": link_count,
        "min_date": str(min_date) if min_date else None,
        "max_date": str(max_date) if max_date else None,
    }


@router.get("/{org_name}")
async def get_organization_stats(org_name: str):
    """
    Get statistics for a given organization from the local CSV files.
    """
    try:
        # Get stats for the summary data (pbocsum)
        sum_df = get_pboc_data(org_name, "sum")
        sum_stats = get_stats_for_df(sum_df)

        # Get stats for the detail data (pbocdtl)
        dtl_df = get_pboc_data(org_name, "dtl")
        dtl_stats = get_stats_for_df(dtl_df)

        return {
            "organization": org_name,
            "summary_stats": sum_stats,
            "detail_stats": dtl_stats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
