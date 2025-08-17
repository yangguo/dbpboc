from typing import List, Optional
import logging
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
import os
import glob
import pandas as pd
from urllib.parse import unquote

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# Constants
TEMP_PATH = "../temp"
PBOC_DATA_PATH = "../pboc"

# City mappings
org2name = {
    "天津": "tianjin", "重庆": "chongqing", "上海": "shanghai", "兰州": "lanzhou",
    "拉萨": "lasa", "西宁": "xining", "乌鲁木齐": "wulumuqi", "南宁": "nanning",
    "贵阳": "guiyang", "福州": "fuzhou", "成都": "chengdu", "呼和浩特": "huhehaote",
    "郑州": "zhengzhou", "北京": "beijing", "合肥": "hefei", "厦门": "xiamen",
    "海口": "haikou", "大连": "dalian", "广州": "guangzhou", "太原": "taiyuan",
    "石家庄": "shijiazhuang", "总部": "zongbu", "昆明": "kunming", "青岛": "qingdao",
    "沈阳": "shenyang", "长沙": "changsha", "深圳": "shenzhen", "武汉": "wuhan",
    "银川": "yinchuan", "西安": "xian", "哈尔滨": "haerbin", "长春": "changchun",
    "宁波": "ningbo", "杭州": "hangzhou", "南京": "nanjing", "济南": "jinan",
    "南昌": "nanchang",
}

class AttachmentItem(BaseModel):
    id: str
    link: str
    downloadUrl: str
    fileName: str
    status: str = 'pending'
    fileSize: Optional[str] = None

class FileItem(BaseModel):
    id: str
    fileName: str
    fileType: str
    link: str
    filePath: str
    status: str = 'pending'

class ProcessedDataItem(BaseModel):
    id: str
    data: dict

def get_csvdf(folder: str, beginwith: str) -> pd.DataFrame:
    """Get CSV files matching pattern from folder"""
    files = glob.glob(os.path.join(folder, f"**/{beginwith}*.csv"), recursive=True)
    dflist = []
    for filepath in files:
        try:
            df = pd.read_csv(filepath, index_col=0)
            dflist.append(df)
        except Exception as e:
            logger.error(f"Error reading {filepath}: {e}")
    
    if dflist:
        result_df = pd.concat(dflist)
        result_df.reset_index(drop=True, inplace=True)
        return result_df
    return pd.DataFrame()

@router.get("/download-list/{org_name}")
async def get_download_list(org_name: str) -> List[AttachmentItem]:
    """Get list of attachments to download for an organization"""
    if org_name not in org2name:
        raise HTTPException(status_code=400, detail="Invalid organization name")
    
    org_name_index = org2name[org_name]
    
    try:
        # Look for download files in temp folder - check both locations
        beginwith = f"pboctodownload{org_name_index}"
        
        # First try the organization-specific subfolder
        org_temp_path = os.path.join(TEMP_PATH, org_name_index)
        df = get_csvdf(org_temp_path, beginwith)
        
        # If not found, try the main temp folder
        if df.empty:
            df = get_csvdf(TEMP_PATH, beginwith)
        
        if df.empty:
            return []
        
        attachments = []
        for idx, row in df.iterrows():
            download_url = row.get('download', '')
            file_name = os.path.basename(download_url) if download_url else f"file_{idx}"
            # Decode URL-encoded filename
            from urllib.parse import unquote
            file_name = unquote(file_name)
            
            attachment = AttachmentItem(
                id=str(idx),
                link=row.get('link', ''),
                downloadUrl=download_url,
                fileName=file_name,
                status='pending'
            )
            attachments.append(attachment)
        
        return attachments
    
    except Exception as e:
        logger.error(f"Error getting download list for {org_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get download list")

@router.get("/file-list/{org_name}")
async def get_file_list(org_name: str) -> List[FileItem]:
    """Get list of files for processing for an organization"""
    if org_name not in org2name:
        raise HTTPException(status_code=400, detail="Invalid organization name")
    
    org_name_index = org2name[org_name]
    
    try:
        # Look for file list in temp folder - check both locations
        beginwith = f"pboctofile{org_name_index}"
        
        # First try the organization-specific subfolder
        org_temp_path = os.path.join(TEMP_PATH, org_name_index)
        df = get_csvdf(org_temp_path, beginwith)
        
        # If not found, try the main temp folder
        if df.empty:
            df = get_csvdf(TEMP_PATH, beginwith)
        
        if df.empty:
            return []
        
        files = []
        for idx, row in df.iterrows():
            file_name = row.get('file', '')
            file_ext = os.path.splitext(file_name)[1].lower()
            
            # Decode URL-encoded filename
            from urllib.parse import unquote
            file_name = unquote(file_name)
            
            # Determine file type
            if file_ext in ['.xlsx', '.xls', '.et', '.ett']:
                file_type = 'excel'
            elif file_ext == '.pdf':
                file_type = 'pdf'
            elif file_ext in ['.docx', '.doc', '.wps', '.docm']:
                file_type = 'word'
            elif file_ext in ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tif']:
                file_type = 'image'
            else:
                file_type = 'other'
            
            file_item = FileItem(
                id=str(idx),
                fileName=file_name,
                fileType=file_type,
                link=row.get('link', ''),
                filePath=os.path.join(TEMP_PATH, org_name_index, file_name),
                status='pending'
            )
            files.append(file_item)
        
        return files
    
    except Exception as e:
        logger.error(f"Error getting file list for {org_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get file list")

@router.get("/processed-data/{org_name}")
async def get_processed_data(org_name: str) -> List[ProcessedDataItem]:
    """Get processed table data for an organization"""
    if org_name not in org2name:
        raise HTTPException(status_code=400, detail="Invalid organization name")
    
    org_name_index = org2name[org_name]
    
    try:
        # Look for processed table data in temp folder - check both locations
        beginwith = f"pboctotable{org_name_index}"
        
        # First try the organization-specific subfolder
        org_temp_path = os.path.join(TEMP_PATH, org_name_index)
        df = get_csvdf(org_temp_path, beginwith)
        
        # If not found, try the main temp folder
        if df.empty:
            df = get_csvdf(TEMP_PATH, beginwith)
        
        if df.empty:
            return []
        
        processed_data = []
        for idx, row in df.iterrows():
            data_item = ProcessedDataItem(
                id=str(idx),
                data=row.to_dict()
            )
            processed_data.append(data_item)
        
        return processed_data
    
    except Exception as e:
        logger.error(f"Error getting processed data for {org_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get processed data")

@router.post("/save-processed/{org_name}")
async def save_processed_data(org_name: str, data: List[dict]):
    """Save processed data for an organization"""
    if org_name not in org2name:
        raise HTTPException(status_code=400, detail="Invalid organization name")
    
    org_name_index = org2name[org_name]
    
    try:
        # Convert data to DataFrame
        df = pd.DataFrame(data)
        
        # Save to temp folder
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"pboctotable{org_name_index}{timestamp}"
        
        folder = os.path.join(TEMP_PATH, org_name_index)
        os.makedirs(folder, exist_ok=True)
        
        filepath = os.path.join(folder, f"{filename}.csv")
        df.to_csv(filepath, quoting=1, escapechar='\\')
        
        return {"message": "Data saved successfully", "filename": filename}
    
    except Exception as e:
        logger.error(f"Error saving processed data for {org_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save processed data")

@router.get("/organizations")
async def get_organizations() -> List[str]:
    """Get list of available organizations"""
    return list(org2name.keys())
