from typing import List
import logging
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel
from app.models.case import Case, CaseCreate, CaseUpdate, CaseSearchParams, CaseResponse
from app.services.case_service import CaseService
from app.core.database import get_database
from bson import ObjectId
import pandas as pd
import glob
import os
import time
import random
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# Mappings and constants
cityList = [
  '北京', '天津', '石家庄', '太原', '呼和浩特', '沈阳', '长春', '哈尔滨',
  '上海', '南京', '杭州', '合肥', '福州', '南昌', '济南', '郑州',
  '武汉', '长沙', '广州', '南宁', '海口', '重庆', '成都', '贵阳',
  '昆明', '拉萨', '西安', '兰州', '西宁', '银川', '乌鲁木齐', '大连',
  '青岛', '宁波', '厦门', '深圳'
]

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

org2url = {
    "天津": "http://tianjin.pbc.gov.cn/fzhtianjin/113682/113700/113707/10983/index",
    "重庆": "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/5525107/8e9dfeba/index",
    "上海": "http://shanghai.pbc.gov.cn/fzhshanghai/113577/114832/114918/14681/index",
    "兰州": "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/12820/index",
    "拉萨": "http://lasa.pbc.gov.cn/lasa/120480/120504/120511/18819/index",
    "西宁": "http://xining.pbc.gov.cn/xining/118239/118263/118270/13228/index",
    "乌鲁木齐": "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/14752/index",
    "南宁": "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/19833/index",
    "贵阳": "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/10855/index",
    "福州": "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/17179/index",
    "成都": "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/18154/index",
    "呼和浩特": "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/23932/index",
    "郑州": "http://zhengzhou.pbc.gov.cn/zhengzhou/124182/124200/124207/18390/index",
    "北京": "http://beijing.pbc.gov.cn/beijing/132030/132052/132059/19192/index",
    "合肥": "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/14535/index",
    "厦门": "http://xiamen.pbc.gov.cn/xiamen/127703/127721/127728/18534/index",
    "海口": "http://haikou.pbc.gov.cn/haikou/132982/133000/133007/19966/index",
    "大连": "http://dalian.pbc.gov.cn/dalian/123812/123830/123837/16262/index",
    "广州": "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/20713/index",
    "太原": "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/20320/index",
    "石家庄": "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/20016/index",
    "总部": "http://www.pbc.gov.cn/zhengwugongkai/4081330/4081344/4081407/4081705/d80f41dc/index",
    "昆明": "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/20429/index",
    "青岛": "http://qingdao.pbc.gov.cn/qingdao/126166/126184/126191/16720/index",
    "沈阳": "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/8267/index",
    "长沙": "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/18625/index",
    "深圳": "http://shenzhen.pbc.gov.cn/shenzhen/122811/122833/122840/15142/index",
    "武汉": "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/16682/index",
    "银川": "http://yinchuan.pbc.gov.cn/yinchuan/119983/120001/120008/14095/index",
    "西安": "http://xian.pbc.gov.cn/xian/129428/129449/129458/23967/index",
    "哈尔滨": "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/11181/index",
    "长春": "http://changchun.pbc.gov.cn/changchun/124680/124698/124705/16071/index",
    "宁波": "http://ningbo.pbc.gov.cn/ningbo/127076/127098/127105/17279/index",
    "杭州": "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/16349/index",
    "南京": "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/12561/index",
    "济南": "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/13768/index",
    "南昌": "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/19361/index",
}

PBOC_DATA_PATH = "../pboc"
TEMP_PATH = "../temp"

class UpdateListRequest(BaseModel):
    orgName: str
    startPage: int
    endPage: int

class UpdateDetailsRequest(BaseModel):
    orgName: str

def get_chrome_driver(folder):
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--verbose")
    options.add_argument("--window-size=1920,1080")
    options.add_experimental_option("prefs", {"download.default_directory": folder})
    service = ChromeService(executable_path=ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def savedf(df, basename):
    savename = f"{basename}.csv"
    savepath = os.path.join(PBOC_DATA_PATH, savename)
    df.to_csv(savepath)

def savetempsub(df: pd.DataFrame, basename: str, subfolder: str):
    savename = f"{basename}.csv"
    folder = os.path.join(TEMP_PATH, subfolder)
    os.makedirs(folder, exist_ok=True)
    savepath = os.path.join(folder, savename)
    # Quote non-numeric similar to legacy to preserve commas
    df.to_csv(savepath, quoting=1, escapechar='\\')

def get_sumeventdf(orgname: str, start: int, end: int):
    org_name_index = org2name.get(orgname)
    if not org_name_index:
        raise HTTPException(status_code=400, detail="Invalid organization name")

    browser = get_chrome_driver(TEMP_PATH)
    baseurl = org2url.get(orgname)
    resultls = []

    for i in range(start, end + 1):
        url = f"{baseurl}{i}.html"
        try:
            logger.info(f"[update-list] fetching url={url}")
            browser.get(url)
            time.sleep(random.randint(2, 5))
            
            namels, datels, linkls, sumls = [], [], [], []
            if org_name_index == "zongbu":
                ls3 = browser.find_elements(By.XPATH, "//div[2]/ul/li/a")
                ls4 = browser.find_elements(By.XPATH, "//div[2]/ul/li/span")
                for j in range(len(ls3)):
                    namels.append(ls3[j].text)
                    datels.append(ls4[j].text)
                    linkls.append(ls3[j].get_attribute("href"))
                    sumls.append("")
            else:
                ls1 = browser.find_elements(By.XPATH, '\\td[@class=\\"hei12jj\\"]')
                total = len(ls1) // 3
                for j in range(total):
                    namels.append(ls1[j * 3].text)
                    datels.append(ls1[j * 3 + 1].text)
                    sumls.append(ls1[j * 3 + 2].text)

                ls2 = browser.find_elements(By.XPATH, '\\font[@class=\\"hei12\\"]/a')
                for link in ls2:
                    linkls.append(link.get_attribute("href"))

            df = pd.DataFrame({"name": namels, "date": datels, "link": linkls, "sum": sumls})
            logger.info(
                f"[update-list] page_ok url={url} items={len(df)} links={len(linkls)}"
            )
            resultls.append(df)
        except Exception as e:
            logger.info(f"[update-list] page_error url={url} err={e}")
            continue

    browser.quit()
    if not resultls:
        return pd.DataFrame()
        
    sumdf = pd.concat(resultls)
    sumdf["区域"] = orgname
    return sumdf

def get_csvdf_for_pending(penfolder, beginwith):
    files = glob.glob(os.path.join(penfolder, "**", beginwith + "*.csv"), recursive=True)
    dflist = []
    for filepath in files:
        try:
            pendf = pd.read_csv(filepath, index_col=0, low_memory=False)
            dflist.append(pendf)
        except Exception:
            continue
    if dflist:
        df = pd.concat(dflist)
        df.reset_index(drop=True, inplace=True)
    else:
        df = pd.DataFrame()
    return df

def get_new_links_for_org(orgname: str):
    """Compute links in sum not present in dtl for the org."""
    sum_df = get_pboc_data_for_pending(orgname, "sum")
    dtl_df = get_pboc_data_for_pending(orgname, "dtl")
    if sum_df.empty:
        return []
    current_links = sum_df["link"].dropna().tolist()
    old_links = dtl_df["link"].dropna().tolist() if not dtl_df.empty else []
    return [x for x in current_links if x not in set(old_links)]

def web2table(rows):
    data = []
    for tr in rows:
        cell_texts = []
        tds = tr.find_elements(By.TAG_NAME, "td")
        for td in tds:
            cell_texts.append(td.text)
        if cell_texts:
            data.append(cell_texts)
    return pd.DataFrame(data)

def scrape_detail_pages(links, orgname: str):
    """Scrape detail pages for download links and tables; save to temp subfolder.

    Returns tuple (download_count, table_count).
    """
    org_name_index = org2name.get(orgname)
    if not org_name_index:
        return (0, 0)
    if not links:
        return (0, 0)

    browser = get_chrome_driver(TEMP_PATH)
    download_frames = []
    table_frames = []

    try:
        for idx, durl in enumerate(links):
            try:
                logger.info(f"[update-details] fetching url={durl}")
                browser.get(durl)
                # Collect download anchors
                dl_anchors = browser.find_elements(By.XPATH, "//td[@class='hei14jj']//a")
                downurl = []
                for a in dl_anchors:
                    href = a.get_attribute("href")
                    if href:
                        downurl.append(href)
                if downurl:
                    logger.info(f"[update-details] downloads_found url={durl} count={len(downurl)}")
                    df_dl = pd.DataFrame({"download": downurl})
                    df_dl["link"] = durl
                    download_frames.append(df_dl)

                # Collect table rows; headquarters uses a different table structure
                if org_name_index == "zongbu":
                    rows = browser.find_elements(By.XPATH, "//table/tbody/tr")
                else:
                    rows = browser.find_elements(By.XPATH, "//td[@class='hei14jj']//tr")
                df_tbl = web2table(rows)
                if not df_tbl.empty:
                    colen = len(df_tbl.columns)
                    if colen == 8:
                        layout = "8cols"
                        df_tbl.columns = [
                            "序号", "企业名称", "处罚决定书文号", "违法行为类型", "行政处罚内容",
                            "作出行政处罚决定机关名称", "作出行政处罚决定日期", "备注",
                        ]
                    elif colen == 7:
                        layout = "7cols+备注"
                        df_tbl["备注"] = ""
                        df_tbl.columns = [
                            "序号", "企业名称", "处罚决定书文号", "违法行为类型", "行政处罚内容",
                            "作出行政处罚决定机关名称", "作出行政处罚决定日期", "备注",
                        ]
                    elif colen == 6:
                        layout = "6cols+序号备注"
                        df_tbl["序号"] = ""
                        df_tbl["备注"] = ""
                        df_tbl.columns = [
                            "企业名称", "处罚决定书文号", "违法行为类型", "行政处罚内容",
                            "作出行政处罚决定机关名称", "作出行政处罚决定日期", "序号", "备注",
                        ]
                    elif colen >= 9:
                        layout = f">=9cols_drop_to_8"
                        df_tbl = df_tbl.drop(df_tbl.columns[7], axis=1)
                        df_tbl = df_tbl[df_tbl.columns[:8]]
                        df_tbl.columns = [
                            "序号", "企业名称", "处罚决定书文号", "违法行为类型", "行政处罚内容",
                            "作出行政处罚决定机关名称", "作出行政处罚决定日期", "备注",
                        ]
                    else:
                        # Unrecognized layout; skip
                        layout = f"unknown_{colen}cols"
                        df_tbl = pd.DataFrame()

                    if not df_tbl.empty:
                        logger.info(
                            f"[update-details] table_found url={durl} rows={len(df_tbl)} layout={layout}"
                        )
                        df_tbl["link"] = durl
                        table_frames.append(df_tbl)

                # Pace to be gentle
                time.sleep(random.randint(2, 5))
            except Exception as e:
                logger.info(f"[update-details] page_error url={durl} err={e}")
                continue
    finally:
        browser.quit()

    # Save intermediate results under temp/<org>
    download_count = 0
    table_count = 0
    if download_frames:
        dres = pd.concat(download_frames).reset_index(drop=True)
        savetempsub(dres, f"pboctodownload{org_name_index}", org_name_index)
        download_count = len(dres)
        logger.info(f"[update-details] saved_downloads org={orgname} count={download_count}")
    if table_frames:
        tres = pd.concat(table_frames).reset_index(drop=True)
        # keep historical saves timestamped similar to legacy
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        savetempsub(tres, f"pboctotable{org_name_index}{timestamp}", org_name_index)
        table_count = len(tres)
        logger.info(f"[update-details] saved_tables org={orgname} count={table_count} ts={timestamp}")

    return (download_count, table_count)

def update_sumeventdf(currentsum: pd.DataFrame, orgname: str):
    org_name_index = org2name.get(orgname)
    beginwith = f"pbocsum"
    oldsum_df = get_csvdf_for_pending(PBOC_DATA_PATH, beginwith)
    oldsum = oldsum_df[oldsum_df["区域"] == orgname]

    if oldsum.empty:
        oldidls = []
    else:
        oldidls = oldsum["link"].tolist()
    
    currentidls = currentsum["link"].tolist()
    newidls = [x for x in currentidls if x not in oldidls]
    newdf = currentsum[currentsum["link"].isin(newidls)]

    if not newdf.empty:
        newdf.reset_index(drop=True, inplace=True)
        nowstr = datetime.now().strftime("%Y%m%d%H%M%S")
        savename = f"pbocsum{org_name_index}{nowstr}"
        newdf["区域"] = orgname
        savedf(newdf, savename)
    return newdf

@router.post("/update-list")
async def update_list(request: UpdateListRequest):
    org_name = request.orgName
    start_page = request.startPage
    end_page = request.endPage

    started_at = time.time()
    logger.info(f"[update-list] org={org_name} pages={start_page}-{end_page} started")

    sumeventdf = get_sumeventdf(org_name, start_page, end_page)
    scraped_rows = 0 if sumeventdf is None or sumeventdf.empty else len(sumeventdf)
    scraped_links = 0 if sumeventdf is None or sumeventdf.empty else sumeventdf.get("link", pd.Series()).nunique()

    if sumeventdf.empty:
        elapsed_ms = int((time.time() - started_at) * 1000)
        logger.info(
            f"[update-list] org={org_name} pages={start_page}-{end_page} scraped_rows={scraped_rows} scraped_links={scraped_links} new_cases=0 elapsed_ms={elapsed_ms}"
        )
        return {"newCases": 0}

    newsum = update_sumeventdf(sumeventdf, org_name)
    new_cases = 0 if newsum is None or newsum.empty else len(newsum)
    elapsed_ms = int((time.time() - started_at) * 1000)
    logger.info(
        f"[update-list] org={org_name} pages={start_page}-{end_page} scraped_rows={scraped_rows} scraped_links={scraped_links} new_cases={new_cases} elapsed_ms={elapsed_ms}"
    )
    return {"newCases": new_cases}

@router.post("/update-details")
async def update_details(request: UpdateDetailsRequest):
    org_name = request.orgName
    if not org2name.get(org_name):
        raise HTTPException(status_code=400, detail="Invalid organization name")

    started_at = time.time()
    links_to_update = get_new_links_for_org(org_name)
    link_count = len(links_to_update)
    logger.info(f"[update-details] org={org_name} links_to_update={link_count}")
    if not links_to_update:
        elapsed_ms = int((time.time() - started_at) * 1000)
        logger.info(
            f"[update-details] org={org_name} updated_cases=0 downloads=0 tables=0 elapsed_ms={elapsed_ms}"
        )
        return {"updatedCases": 0}

    dl_count, tbl_count = scrape_detail_pages(links_to_update, org_name)
    elapsed_ms = int((time.time() - started_at) * 1000)
    logger.info(
        f"[update-details] org={org_name} updated_cases={link_count} downloads={dl_count} tables={tbl_count} elapsed_ms={elapsed_ms}"
    )
    # Return number of pages processed; optionally include counts
    return {"updatedCases": link_count, "downloads": dl_count, "tables": tbl_count}

def get_pboc_data_for_pending(orgname: str, data_type: str):
    if data_type not in ["sum", "dtl"]:
        return pd.DataFrame()
    beginwith = f"pboc{data_type}"
    all_data = get_csvdf_for_pending(PBOC_DATA_PATH, beginwith)
    if all_data.empty:
        return pd.DataFrame()
    org_data = all_data[all_data["区域"] == orgname]
    if not org_data.empty:
        org_data = org_data.copy()
        if "date" in org_data.columns:
            org_data["发布日期"] = pd.to_datetime(org_data["date"], errors='coerce').dt.date
    return org_data

@router.get("/pending-orgs", response_model=List[str])
async def get_pending_orgs():
    """
    Get a list of organizations that have new cases to be updated.
    """
    pending_orgs = []
    for org_name in cityList:
        try:
            sum_df = get_pboc_data_for_pending(org_name, "sum")
            dtl_df = get_pboc_data_for_pending(org_name, "dtl")

            if sum_df.empty:
                continue

            max_sum_date = sum_df["发布日期"].max()
            
            if dtl_df.empty:
                pending_orgs.append(org_name)
                continue

            max_dtl_date = dtl_df["发布日期"].max()

            if pd.isna(max_dtl_date) or max_dtl_date < max_sum_date:
                pending_orgs.append(org_name)
        except Exception as e:
            # Log the error or handle as needed
            logger.info(f"[pending-orgs] error org={org_name} err={e}")
            continue
            
    logger.info(f"[pending-orgs] total_pending={len(pending_orgs)} orgs={pending_orgs}")
    return pending_orgs

@router.post("/", response_model=Case)
async def create_case(
    case_data: CaseCreate,
):
    """Create a new case"""
    db = await get_database()
    case_service = CaseService(db)
    
    case = await case_service.create_case(case_data, created_by="system")
    return case

@router.get("/", response_model=CaseResponse)
async def search_cases(
    q: str = Query(None, description="Search query"),
    organization: str = Query(None, description="Organization filter"),
    province: str = Query(None, description="Province filter"),
    city: str = Query(None, description="City filter"),
    case_type: str = Query(None, description="Case type filter"),
    status: str = Query(None, description="Status filter"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
):
    """Search and filter cases"""
    db = await get_database()
    case_service = CaseService(db)
    
    search_params = CaseSearchParams(
        q=q,
        organization=organization,
        province=province,
        city=city,
        case_type=case_type,
        status=status,
        page=page,
        size=size
    )
    
    result = await case_service.search_cases(search_params)
    return result

@router.get("/{case_id}", response_model=Case)
async def get_case(
    case_id: str,
):
    """Get a specific case by ID"""
    if not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    case_service = CaseService(db)
    
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    return case

@router.put("/{case_id}", response_model=Case)
async def update_case(
    case_id: str,
    case_update: CaseUpdate,
):
    """Update a case"""
    if not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    case_service = CaseService(db)
    
    case = await case_service.update_case(case_id, case_update)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    return case

@router.delete("/{case_id}")
async def delete_case(
    case_id: str,
):
    """Delete a case"""
    if not ObjectId.is_valid(case_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format"
        )
    
    db = await get_database()
    case_service = CaseService(db)
    
    success = await case_service.delete_case(case_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    return {"message": "Case deleted successfully"}

@router.get("/stats/overview")
async def get_case_statistics():
    """Get case statistics for dashboard"""
    db = await get_database()
    case_service = CaseService(db)
    
    stats = await case_service.get_case_statistics()
    return stats

@router.get("/export/csv")
async def export_cases_csv(
    q: str = Query(None, description="Search query"),
    organization: str = Query(None, description="Organization filter"),
    province: str = Query(None, description="Province filter"),
    city: str = Query(None, description="City filter"),
    case_type: str = Query(None, description="Case type filter"),
    status: str = Query(None, description="Status filter"),
):
    """Export filtered cases to CSV"""
    db = await get_database()
    case_service = CaseService(db)
    
    search_params = CaseSearchParams(
        q=q,
        organization=organization,
        province=province,
        city=city,
        case_type=case_type,
        status=status,
        page=1,
        size=10000  # Export all matching cases
    )
    
    csv_content = await case_service.export_cases_csv(search_params)
    
    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cases_export.csv"}
    )
