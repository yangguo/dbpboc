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
            pendf = pd.read_csv(filepath, index_col=0)
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
    """
    if data_type not in ["sum", "dtl"]:
        return pd.DataFrame()

    beginwith = f"pboc{data_type}"
    all_data = get_csvdf(PBOC_DATA_PATH, beginwith)
    
    if all_data.empty:
        return pd.DataFrame()

    org_data = all_data[all_data["区域"] == orgname]
    
    if not org_data.empty:
        org_data = org_data.copy()
        if "date" in org_data.columns:
            org_data["发布日期"] = pd.to_datetime(org_data["date"], errors='coerce').dt.date
    
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
