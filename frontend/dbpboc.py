import csv
import glob
import os
import random
import re
import time
from ast import literal_eval
from urllib.parse import unquote
import plotly.express as px
import json
import pandas as pd
import pdfplumber
import streamlit as st
from database import delete_data, get_collection, get_data, get_size, insert_data
from doc2text import pdfurl2tableocr
from selenium.webdriver.common.by import By
from snapshot import get_chrome_driver
from utils import get_now, split_words

# from geopy.geocoders import Nominatim
# from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from collections import Counter
import uuid


penpboc = "../pboc"
temppath = r"../temp"
mappath = "../map/chinageo.json"

# choose orgname index
org2name = {
    "天津": "tianjin",
    "重庆": "chongqing",
    "上海": "shanghai",
    "兰州": "lanzhou",
    "拉萨": "lasa",
    "西宁": "xining",
    "乌鲁木齐": "wulumuqi",
    "南宁": "nanning",
    "贵阳": "guiyang",
    "福州": "fuzhou",
    "成都": "chengdu",
    "呼和浩特": "huhehaote",
    "郑州": "zhengzhou",
    "北京": "beijing",
    "合肥": "hefei",
    "厦门": "xiamen",
    "海口": "haikou",
    "大连": "dalian",
    "广州": "guangzhou",
    "太原": "taiyuan",
    "石家庄": "shijiazhuang",
    "总部": "zongbu",
    "昆明": "kunming",
    "青岛": "qingdao",
    "沈阳": "shenyang",
    "长沙": "changsha",
    "深圳": "shenzhen",
    "武汉": "wuhan",
    "银川": "yinchuan",
    "西安": "xian",
    "哈尔滨": "haerbin",
    "长春": "changchun",
    "宁波": "ningbo",
    "杭州": "hangzhou",
    "南京": "nanjing",
    "济南": "jinan",
    "南昌": "nanchang",
}

org2url = {
    "天津": "http://tianjin.pbc.gov.cn/fzhtianjin/113682/113700/113707/10983/index",
    "重庆": "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/8000/index",
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

city2province = {
    "天津": "天津市",
    "重庆": "重庆市",
    "上海": "上海市",
    "兰州": "甘肃省",
    "拉萨": "西藏自治区",
    "西宁": "青海省",
    "乌鲁木齐": "新疆维吾尔自治区",
    "南宁": "广西壮族自治区",
    "贵阳": "贵州省",
    "福州": "福建省",
    "成都": "四川省",
    "呼和浩特": "内蒙古自治区",
    "郑州": "河南省",
    "北京": "北京市",
    "合肥": "安徽省",
    "厦门": "福建省",
    "海口": "海南省",
    "大连": "辽宁省",
    "广州": "广东省",
    "太原": "山西省",
    "石家庄": "河北省",
    "总部": "北京市",
    "昆明": "云南省",
    "青岛": "山东省",
    "沈阳": "辽宁省",
    "长沙": "湖南省",
    "深圳": "广东省",
    "武汉": "湖北省",
    "银川": "宁夏回族自治区",
    "西安": "陕西省",
    "哈尔滨": "黑龙江省",
    "长春": "吉林省",
    "宁波": "浙江省",
    "杭州": "浙江省",
    "南京": "江苏省",
    "济南": "山东省",
    "南昌": "江西省",
}


def get_csvdf(penfolder, beginwith):
    files2 = glob.glob(penfolder + "**/" + beginwith + "*.csv", recursive=True)
    dflist = []
    # filelist = []
    for filepath in files2:
        pendf = pd.read_csv(filepath, index_col=0)
        dflist.append(pendf)
        # filelist.append(filename)
    if len(dflist) > 0:
        df = pd.concat(dflist)
        df.reset_index(drop=True, inplace=True)
    else:
        df = pd.DataFrame()
    return df


def searchpboc(
    df,
    start_date,
    end_date,
    wenhao_text,
    people_text,
    event_text,
    penalty_text,
    org_text,
    province,
    min_penalty,
):
    # st.write(df)
    # split words
    wenhao_text = split_words(wenhao_text)
    people_text = split_words(people_text)
    event_text = split_words(event_text)
    # law_text = split_words(law_text)
    penalty_text = split_words(penalty_text)
    org_text = split_words(org_text)

    col = [
        # "序号",
        "企业名称",
        "处罚决定书文号",
        "违法行为类型",
        "行政处罚内容",
        "作出行政处罚决定机关名称",
        "作出行政处罚决定日期",
        "备注",
        "区域",
        "link",
        "发布日期",
    ]
    searchdf = df[
        (df["发布日期"] >= start_date)
        & (df["发布日期"] <= end_date)
        & (df["企业名称"].str.contains(people_text))
        & (df["处罚决定书文号"].str.contains(wenhao_text))
        & (df["违法行为类型"].str.contains(event_text))
        & (df["行政处罚内容"].str.contains(penalty_text))
        & (df["作出行政处罚决定机关名称"].str.contains(org_text))
        & (df["区域"].isin(province))
        & (df["amount"] >= min_penalty)
    ]  # [col]
    # sort by date desc
    searchdf = searchdf.sort_values(by=["发布日期"], ascending=False)
    # drop duplicates
    # searchdf.drop_duplicates(subset=["link"], inplace=True)
    # reset index
    searchdf = searchdf.reset_index(drop=True)
    return searchdf


# summary of pboc
def display_summary():
    # get old sumeventdf
    oldsum2 = get_pbocdetail("")
    # get length of old eventdf
    oldlen2 = len(oldsum2)
    # display isnull sum
    # st.write(oldsum2.isnull().sum())
    # get min and max date of old eventdf
    min_date2 = oldsum2["发布日期"].min()
    max_date2 = oldsum2["发布日期"].max()
    # use metric
    col1, col2 = st.columns([1, 3])
    with col1:
        st.metric("案例总数", oldlen2)
    with col2:
        st.metric("案例日期范围", f"{min_date2} - {max_date2}")

    # sum max,min date and size by org
    sumdf2 = (
        oldsum2.groupby("区域")["发布日期"].agg(["max", "min", "count"]).reset_index()
    )
    sumdf2.columns = ["区域", "最近发文日期", "最早发文日期", "案例总数"]
    # sort by date
    sumdf2.sort_values(by=["最近发文日期"], ascending=False, inplace=True)
    # reset index
    sumdf2.reset_index(drop=True, inplace=True)
    # display
    st.markdown("#### 按区域统计")
    st.table(sumdf2)

    return sumdf2


def get_pbocsum(orgname):
    # org_name_index = org2name[orgname]
    # beginwith = "pbocsum" + org_name_index
    beginwith = "pbocsum"
    allpendf = get_csvdf(penpboc, beginwith)
    # get pendf by orgname
    pendf = allpendf[allpendf["区域"] == orgname]
    # cols = ["name", "date", "link", "sum"]
    # if not empty
    if len(pendf) > 0:
        # copy df
        pendf = pendf.copy()
        # pendf["发布日期"] = pd.to_datetime(pendf["date"]).dt.date
        pendf.loc[:, "发布日期"] = pd.to_datetime(pendf["date"]).dt.date
    return pendf


def get_pbocdetail(orgname):
    # if orgname == "":
    #     org_name_index = ""
    # else:
    #     org_name_index = org2name[orgname]

    # beginwith = "pbocdtl" + org_name_index
    beginwith = "pbocdtl"
    d0 = get_csvdf(penpboc, beginwith)
    if orgname != "":
        d0 = d0[d0["区域"] == orgname]
    # reset index
    # d1 = d0[["title", "subtitle", "date", "doc", "id"]].reset_index(drop=True)
    # format date
    # d1["date"] = pd.to_datetime(d1["date"]).dt.date
    # update column name
    # d1.columns = ["标题", "文号", "发布日期", "内容", "id"]
    # if not empty
    if len(d0) > 0:
        # format date
        d0["发布日期"] = pd.to_datetime(d0["date"]).dt.date
        # fillna
        # d0["序号"] = d0["序号"].fillna(1)
        # fix index data type
        # d0["序号"] = d0["序号"].astype(float).astype(int)
    # if orgname != "":
    #     st.write(orgname)
    #     d0["区域"] = orgname
    # fillna
    # d0.fillna("", inplace=True)
    return d0


def display_suminfo(df):
    # get length of old eventdf
    oldlen = len(df)
    if oldlen > 0:
        # get unique link number
        linkno = df["link"].nunique()
        # get min and max date of old eventdf
        min_date = df["发布日期"].min()
        max_date = df["发布日期"].max()
        # use metric for length and date
        col1, col2, col3 = st.columns([1, 1, 1])
        # col1.metric("案例总数", oldlen)
        col1.write(f"案例总数：{oldlen}")
        col2.write(f"链接数：{linkno}")
        # col2.metric("日期范围", f"{min_date} - {max_date}")
        col3.write(f"日期范围：{min_date} - {max_date}")


def display_pbocsum(org_name_ls):
    for org_name in org_name_ls:
        st.markdown("#### " + org_name)
        st.markdown("列表")
        oldsum = get_pbocsum(org_name)
        display_suminfo(oldsum)
        st.markdown("详情")
        dtl = get_pbocdetail(org_name)
        # dtl1 = dtl.drop_duplicates(subset=["name", "date", "link"])
        display_suminfo(dtl)


# get sumeventdf in page number range
def get_sumeventdf(orgname, start, end):
    org_name_index = org2name[orgname]
    browser = get_chrome_driver(temppath)

    baseurl = org2url[orgname]

    resultls = []
    errorls = []
    count = 0
    for i in range(start, end + 1):
        st.info("page: " + str(i))
        st.info(str(count) + " begin")
        url = baseurl + str(i) + ".html"
        st.info("url: " + url)
        # st.write(org_name_index)
        try:
            browser.implicitly_wait(3)
            browser.get(url)
            # wait for page load
            # time.sleep(10)
            namels = []
            datels = []
            linkls = []
            sumls = []
            if org_name_index == "zongbu":
                st.write("zongbu")
                ls3 = browser.find_elements(By.XPATH, "//div[2]/ul/li/a")
                ls4 = browser.find_elements(By.XPATH, "//div[2]/ul/li/span")
                for i in range(len(ls3)):
                    namels.append(ls3[i].text)
                    datels.append(ls4[i].text)
                    linkls.append(ls3[i].get_attribute("href"))
                    sumls.append("")
            else:
                ls1 = browser.find_elements(By.XPATH, '//td[@class="hei12jj"]')
                total = len(ls1) // 3
                for i in range(total):
                    #     print(ls1[i].text)
                    namels.append(ls1[i * 3].text)
                    datels.append(ls1[i * 3 + 1].text)
                    sumls.append(ls1[i * 3 + 2].text)

                ls2 = browser.find_elements(By.XPATH, '//font[@class="hei12"]/a')
                # linkls = []
                for link in ls2:
                    linkls.append(link.get_attribute("href"))

            # st.write(namels)
            df = pd.DataFrame(
                {"name": namels, "date": datels, "link": linkls, "sum": sumls}
            )
            resultls.append(df)
        except Exception as e:
            st.error("error!: " + str(e))
            errorls.append(url)

        mod = (i + 1) % 2
        if mod == 0 and count > 0:
            tempdf = pd.concat(resultls)
            savename = "tempsum-" + org_name_index + str(count + 1)
            savedf(tempdf, savename)

        wait = random.randint(2, 20)
        time.sleep(wait)
        st.info("finish: " + str(count))
        count += 1

    browser.quit()
    sumdf = pd.concat(resultls)
    savecsv = "tempsumall" + org_name_index + str(count)
    # add orgname
    sumdf["区域"] = orgname
    savedf(sumdf, savecsv)
    return sumdf


def savedf(df, basename):
    savename = basename + ".csv"
    savepath = os.path.join(penpboc, savename)
    df.to_csv(savepath)


# update sumeventdf
def update_sumeventdf(currentsum, orgname):
    org_name_index = org2name[orgname]
    # get detail
    oldsum = get_pbocsum(orgname)
    if oldsum.empty:
        oldidls = []
    else:
        oldidls = oldsum["link"].tolist()
    currentidls = currentsum["link"].tolist()
    # print('oldidls:',oldidls)
    # print('currentidls:', currentidls)
    # get current idls not in oldidls
    newidls = [x for x in currentidls if x not in oldidls]
    # print('newidls:', newidls)
    # newidls=list(set(currentidls)-set(oldidls))
    newdf = currentsum[currentsum["link"].isin(newidls)]
    # if newdf is not empty, save it
    if newdf.empty is False:
        newdf.reset_index(drop=True, inplace=True)
        nowstr = get_now()
        savename = "pbocsum" + org_name_index + nowstr
        # add orgname
        newdf["区域"] = orgname
        savedf(newdf, savename)
    return newdf


def get_pboctoupd(orgname):
    org_name_index = org2name[orgname]
    beginwith = "pboctoupd" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    return pendf


# update toupd
def update_toupd(orgname):
    org_name_index = org2name[orgname]
    # get sumeventdf
    currentsum = get_pbocsum(orgname)
    # get detail
    oldsum = get_pbocdetail(orgname)
    if oldsum.empty:
        oldidls = []
    else:
        oldidls = oldsum["link"].tolist()
    if currentsum.empty:
        currentidls = []
    else:
        currentidls = currentsum["link"].tolist()
    # get current idls not in oldidls
    newidls = [x for x in currentidls if x not in oldidls]

    if currentsum.empty:
        newdf = pd.DataFrame()
    else:
        newdf = currentsum[currentsum["link"].isin(newidls)]
    # if newdf is not empty, save it
    if newdf.empty is False:
        # sort by date desc
        newdf.sort_values(by=["date"], ascending=False, inplace=True)
        # reset index
        newdf.reset_index(drop=True, inplace=True)
        # save to update dtl list
        toupdname = "pboctoupd" + org_name_index
        # add orgname
        newdf["区域"] = orgname
        savedf(newdf, toupdname)
    return newdf


# get event detail
def get_eventdetail(eventsum, orgname):
    org_name_index = org2name[orgname]
    browser = get_chrome_driver(temppath)
    # browser = get_safari_driver()
    detaills = eventsum["link"].tolist()

    dresultls = []
    tresultls = []
    errorls = []
    count = 0
    for durl in detaills:
        st.info(str(count) + " begin")
        st.info("url: " + durl)
        try:
            browser.get(durl)

            st.write("get download link")
            # get download link
            dl1 = browser.find_elements(By.XPATH, '//td[@class="hei14jj"]//a')
            downurl = []
            if len(dl1) > 0:
                for dl in dl1:
                    dlink = dl.get_attribute("href")
                    st.write(dlink)
                    downurl.append(dlink)

            if len(downurl) > 0:
                if len(downurl) == 1:
                    dfl = pd.DataFrame(index=[0])
                else:
                    dfl = pd.DataFrame()
                dfl["download"] = downurl
                dfl["link"] = durl
                # filename = os.path.basename(durl)
                # # unquote to decode url
                # filename = unquote(filename)
                # dfl["file"] = filename
                st.write(dfl)
                dresultls.append(dfl)

            st.write("get table")
            # get web table
            if org_name_index == "zongbu":
                dl2 = browser.find_elements(By.XPATH, "//table/tbody/tr")
            else:
                dl2 = browser.find_elements(By.XPATH, '//td[@class="hei14jj"]//tr')
            df = web2table(dl2)
            st.write(df)
            # if len(downurl) == 0 and df.empty:
            #     dfl = pd.DataFrame(index=[0])
            #     dfl["link"] = durl
            #     dfl["download"] = durl
            #     filename = os.path.basename(durl)
            #     # unquote to decode url
            #     filename = unquote(filename)
            #     dfl["file"] = filename
            #     st.write(dfl)
            #     resultls.append(dfl)

            colen = len(df.columns)
            if colen == 8:
                df.columns = [
                    "序号",
                    "企业名称",
                    "处罚决定书文号",
                    "违法行为类型",
                    "行政处罚内容",
                    "作出行政处罚决定机关名称",
                    "作出行政处罚决定日期",
                    "备注",
                ]
                df["link"] = durl
                st.write(df)
                tresultls.append(df)
            elif colen == 7:
                df["备注"] = ""
                df.columns = [
                    "序号",
                    "企业名称",
                    "处罚决定书文号",
                    "违法行为类型",
                    "行政处罚内容",
                    "作出行政处罚决定机关名称",
                    "作出行政处罚决定日期",
                    "备注",
                ]
                df["link"] = durl
                st.write(df)
                tresultls.append(df)
            # elif colen==6:
            #     df['作出行政处罚决定日期']=''
            #     df['备注']=''
            #     df.columns=['序号','企业名称', '处罚决定书文号', '违法行为类型', '行政处罚内容', '作出行政处罚决定机关名称','作出行政处罚决定日期', '备注']
            #     df['link']=durl
            #     tresultls.append(df)
            elif colen == 6:
                df["序号"] = ""
                df["备注"] = ""
                df.columns = [
                    "企业名称",
                    "处罚决定书文号",
                    "违法行为类型",
                    "行政处罚内容",
                    "作出行政处罚决定机关名称",
                    "作出行政处罚决定日期",
                    "序号",
                    "备注",
                ]
                df["link"] = durl
                st.write(df)
                tresultls.append(df)
            elif colen >= 9:
                df1 = df.drop(df.columns[7], axis=1)
                df2 = df1[df1.columns[:8]]
                df2.columns = [
                    "序号",
                    "企业名称",
                    "处罚决定书文号",
                    "违法行为类型",
                    "行政处罚内容",
                    "作出行政处罚决定机关名称",
                    "作出行政处罚决定日期",
                    "备注",
                ]
                df2["link"] = durl
                st.write(df2)
                tresultls.append(df2)
            elif colen > 0:
                st.error("table error" + str(colen))
                st.error("check" + durl)
                errorls.append(durl)
        except Exception as e:
            st.error("error!: " + str(e))
            st.error("check url:" + durl)
            errorls.append(durl)

        mod = (count + 1) % 10
        if mod == 0 and count > 0:
            # concat all result
            resultls = dresultls + tresultls
            if resultls:
                tempdf = pd.concat(resultls)
                savename = "temptodownload-" + org_name_index + str(count + 1)
                # savetemp(tempdf, savename)
                savetempsub(tempdf, savename, org_name_index)

        wait = random.randint(2, 20)
        time.sleep(wait)
        st.info("finish: " + str(count))
        count += 1

    browser.quit()
    # print errorls
    if len(errorls) > 0:
        st.error("error list:")
        st.error(errorls)
    # if resultls is not empty, save it
    if dresultls:
        pbocdf = pd.concat(dresultls)
        savecsv = "pboctodownload" + org_name_index
        # reset index
        pbocdf.reset_index(drop=True, inplace=True)
        # savetemp(pbocdf, savecsv)
        savetempsub(pbocdf, savecsv, org_name_index)
    else:
        pbocdf = pd.DataFrame()

    if tresultls:
        # get table df
        tabledf = pd.concat(tresultls)
        savetable = "pboctotable" + org_name_index + get_now()
        # reset index
        tabledf = tabledf.reset_index(drop=True)
        # savetemp(tabledf, savetable)
        savetempsub(tabledf, savetable, org_name_index)
    else:
        tabledf = pd.DataFrame()

    alldf = pd.concat([pbocdf, tabledf])
    return alldf


def web2table(dl2):
    tbls = []
    for tr in dl2:
        rowls = []
        dl3 = tr.find_elements(By.TAG_NAME, "td")
        for td in dl3:
            #         print(td.text)
            rowls.append(td.text)
        tbls.append(rowls)
    df = pd.DataFrame(tbls)
    return df


def savetemp(df, basename):
    savename = basename + ".csv"
    savepath = os.path.join(temppath, savename)
    # create folder if not exist
    if not os.path.exists(temppath):
        os.makedirs(temppath)
    df.to_csv(savepath, quoting=csv.QUOTE_NONNUMERIC, escapechar="\\")


# save df to sub folder under temp folder
def savetempsub(df, basename, subfolder):
    savename = basename + ".csv"
    savepath = os.path.join(temppath, subfolder, savename)
    # create folder if not exist
    if not os.path.exists(os.path.join(temppath, subfolder)):
        os.makedirs(os.path.join(temppath, subfolder))
    df.to_csv(savepath, quoting=csv.QUOTE_NONNUMERIC, escapechar="\\")


# download attachment
def download_attachment(linkurl, downloadls, orgname):
    org_name_index = org2name[orgname]
    browser = get_chrome_driver(temppath)
    # browser = get_safari_driver()

    resultls = []
    errorls = []
    count = 0
    for link, url in zip(linkurl, downloadls):
        st.info("begin: " + str(count))
        st.info("url: " + url)
        try:
            # get filename from url
            filename = os.path.basename(url)
            # unquote to decode url
            filename = unquote(filename)

            # check if file exist
            if os.path.exists(os.path.join(temppath, org_name_index, filename)):
                st.info("file exist: " + filename)
                # continue
            else:
                # download file by click the link
                browser.get(url)

            datals = {"link": link, "download": url, "file": filename}
            df = pd.DataFrame(datals, index=[0])
            resultls.append(df)
        except Exception as e:
            st.error("error!: " + str(e))
            st.error("check url:" + url)
            errorls.append(url)

        mod = (count + 1) % 10
        if mod == 0 and count > 0:
            tempdf = pd.concat(resultls)
            savename = "temptofile-" + org_name_index + str(count + 1)
            # savetemp(tempdf, savename)
            savetempsub(tempdf, savename, org_name_index)

        wait = random.randint(2, 10)
        time.sleep(wait)
        st.info("finish: " + str(count))
        count += 1

    if resultls:
        misdf = pd.concat(resultls)
        # filedf = lendf[lendf["download"].isnull()]
        # tabledf = pd.concat([filedf, misdf])
        tabledf = misdf
        savename = "pboctofile" + org_name_index
        # reset index
        tabledf.reset_index(drop=True, inplace=True)
        # savetemp(tabledf, savename)
        savetempsub(tabledf, savename, org_name_index)
    else:
        misdf = pd.DataFrame()
    # quit browser
    browser.quit()
    return misdf


def get_pboctodownload(orgname):
    org_name_index = org2name[orgname]
    beginwith = temppath + "/" + org_name_index + "/pboctodownload" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    return pendf


def get_pboctotable(orgname):
    org_name_index = org2name[orgname]
    beginwith = temppath + "/" + org_name_index + "/pboctotable" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    # fillna
    # pendf.fillna("", inplace=True)
    return pendf


def get_pboctofile(orgname):
    org_name_index = org2name[orgname]
    beginwith = temppath + "/" + org_name_index + "/pboctofile" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    return pendf


def save_pbocdetail(df, orgname):
    org_name_index = org2name[orgname]
    # get sum
    sumdf = get_pbocsum(orgname)
    # get current detail
    olddtl = get_pbocdetail(orgname)
    # merge with df
    dfupd = pd.merge(df, sumdf, left_on="link", right_on="link", how="left")
    dfupd["区域"] = orgname
    # find new df not in old detail
    newdf = dfupd[~dfupd["link"].isin(olddtl["link"])]
    # add uid using uuid
    newdf["uid"] = [str(uuid.uuid4()) for _ in range(len(newdf))]

    savename = penpboc + "/pbocdtl" + org_name_index + get_now()
    savedf(newdf, savename)


def pdf2table(pdffile):
    pagels = []
    with pdfplumber.open(pdffile) as pdf:
        for page in pdf.pages:
            tbls = []
            for table in page.extract_tables():
                df = pd.DataFrame(table)
                tbls.append(df)
            #                 df=pd.DataFrame(tbls)
            print(tbls)
            if tbls:
                pagels.append(tbls[0])

    # use ocr
    print(pdffile)
    df = pdfurl2tableocr(pdffile, temppath)
    if df is not None:
        pagels.append(df)

    if pagels:
        alltb = pd.concat(pagels)
        # reset index
        alltb.reset_index(drop=True, inplace=True)
    else:
        alltb = pd.DataFrame()
    if len(pagels) != 1:
        print("page no", len(pagels))
        print("check file", pdffile)

        # savepath=os.path.splitext(pdffile)[0]+'.csv'
        # savename=os.path.basename(savepath)
        # print(savename)
        # alltb.to_csv(savename)

    return alltb


def save_pboctable(df, orgname):
    org_name_index = org2name[orgname]
    savename = "pboctotable" + org_name_index + get_now()
    # savetemp(df, savename)
    savetempsub(df, savename, org_name_index)


def mergetable(df, col):
    df[col].fillna(method="ffill", inplace=True)
    # print(df)
    # fillna with ''
    df.fillna("", inplace=True)
    mergecol = [col, "link"]
    # merge columns
    dfu = df.groupby(mergecol).agg(lambda x: "".join(x)).reset_index()
    return dfu


def download_pbocsum():
    st.markdown("#### 案例数据下载")

    # download by org
    st.markdown("##### 按区域下载")

    sumlist = []
    dtllist = []

    for orgname in org2name.keys():
        st.markdown("##### " + orgname)
        # get orgname
        org_name_index = org2name[orgname]
        # beginwith = "pbocsum" + org_name_index
        # oldsum = get_csvdf(penpboc, beginwith)
        oldsum = get_pbocsum(orgname)
        oldsum["区域"] = orgname
        lensum = len(oldsum)
        st.write("列表数据量: " + str(lensum))
        # get min and max date
        mindate = oldsum["date"].min()
        maxdate = oldsum["date"].max()
        st.write("列表日期: " + maxdate + " - " + mindate)

        # beginwith = "pbocdtl" + org_name_index
        # dtl = get_csvdf(penpboc, beginwith)
        # dtl["区域"] = orgname
        dtl = get_pbocdetail(orgname)
        lendtl = len(dtl)
        st.write("详情数据量: " + str(lendtl))
        # get min and max date
        mindate = dtl["date"].min()
        maxdate = dtl["date"].max()
        st.write("详情日期: " + maxdate + " - " + mindate)

        # listname
        listname = "pbocsum" + org_name_index + get_now() + ".csv"
        # download list data
        st.download_button(
            "下载列表数据", data=oldsum.to_csv().encode("utf_8_sig"), file_name=listname
        )
        # clean space in text
        dtl = dtl.map(clean_string)

        # detailname
        detailname = "pbocdtl" + org_name_index + get_now() + ".csv"
        # download detail data
        st.download_button(
            "下载详情数据", data=dtl.to_csv().encode("utf_8_sig"), file_name=detailname
        )
        sumlist.append(oldsum)
        dtllist.append(dtl)

    # download all data
    st.markdown("#### 全部数据")

    # get all sum
    allsum = pd.concat(sumlist)
    # get all detail
    alldtl = pd.concat(dtllist)

    lensum = len(allsum)
    st.write("列表数据量: " + str(lensum))
    # get unique link number
    linkno = allsum["link"].nunique()
    st.write("链接数: " + str(linkno))
    # get min and max date
    mindate = allsum["date"].min()
    maxdate = allsum["date"].max()
    st.write("列表日期: " + maxdate + " - " + mindate)

    # listname
    listname = "pbocsumall" + get_now() + ".csv"
    # download list data
    st.download_button(
        "下载列表数据", data=allsum.to_csv().encode("utf_8_sig"), file_name=listname
    )
    # display null sum
    st.write(allsum.isnull().sum())

    lendtl = len(alldtl)
    st.write("详情数据量: " + str(lendtl))
    # get unique link number
    linkno = alldtl["link"].nunique()
    st.write("链接数: " + str(linkno))
    # get min and max date
    mindate = alldtl["date"].min()
    maxdate = alldtl["date"].max()
    st.write("详情日期: " + maxdate + " - " + mindate)

    # detailname
    detailname = "pbocdtlall" + get_now() + ".csv"
    # download detail data
    st.download_button(
        "下载详情数据", data=alldtl.to_csv().encode("utf_8_sig"), file_name=detailname
    )
    # display null sum
    st.write(alldtl.isnull().sum())

    # get category data
    catdf = get_pboccat()
    # get length of catdf
    lencat = len(catdf)
    st.write("分类数据量: " + str(lencat))
    # get unique id number
    idno = catdf["id"].nunique()
    st.write("分类id数: " + str(idno))

    catname = "pboccat" + get_now() + ".csv"
    # download detail data
    st.download_button(
        "下载分类数据", data=catdf.to_csv().encode("utf_8_sig"), file_name=catname
    )

    # display null sum
    st.write(catdf.isnull().sum())


# display event detail
def display_eventdetail(search_df):
    # draw plotly figure
    display_search_df(search_df)
    # get search result from session
    search_dfnew = st.session_state["search_result_pboc"]
    total = len(search_dfnew)
    # st.sidebar.metric("总数:", total)
    st.markdown("### 搜索结果" + "(" + str(total) + "条)")
    # display download button
    st.download_button(
        "下载搜索结果",
        data=search_dfnew.to_csv().encode("utf_8_sig"),
        file_name="搜索结果.csv",
    )
    # display columns
    discols = ["发布日期", "处罚决定书文号", "企业名称", "区域", "uid"]
    # get display df
    display_df = search_dfnew[discols].copy()
    # set index column using loc
    # display_df["序号"] = display_df.index
    # display_df.loc[:, "序号"] = display_df.index
    # change column name
    # display_df.columns = ["link", "文号","当事人",  "发布日期", "区域"]

    data = st.dataframe(display_df, on_select="rerun", selection_mode="single-row")

    selected_rows = data["selection"]["rows"]

    # data = df2aggrid(display_df)
    # display data
    # selected_rows = data["selected_rows"]
    if selected_rows == []:
        st.error("请先选择查看案例")
        st.stop()

    # id = selected_rows[0]["序号"]
    uid = display_df.loc[selected_rows[0], "uid"]
    # display event detail
    st.markdown("##### 案情经过")
    # select search_dfnew by id
    # selected_rows_df = search_dfnew[search_dfnew.index == id]
    selected_rows_df = search_dfnew[search_dfnew["uid"] == uid]

    # display columns
    # st.text(selected_rows_df.columns)
    selected_rows_df = selected_rows_df[
        [
            "序号",
            "企业名称",
            "处罚决定书文号",
            "违法行为类型",
            "行政处罚内容",
            "作出行政处罚决定机关名称",
            "作出行政处罚决定日期",
            "备注",
            "link",
            "区域",
            "发布日期",
            "summary",
            "amount",
            "category",
            "industry",
        ]
    ]
    # rename columns
    selected_rows_df.columns = [
        "序号",
        "企业名称",
        "处罚决定书文号",
        "违法行为类型",
        "行政处罚内容",
        "作出行政处罚决定机关名称",
        "作出行政处罚决定日期",
        "备注",
        "链接",
        "区域",
        "发布日期",
        "摘要",
        "罚款金额",
        "违规类别",
        "行业",
    ]
    # fillna
    selected_rows_df = selected_rows_df.fillna("")
    # transpose and set column name
    selected_rows_df = selected_rows_df.astype(str).T

    selected_rows_df.columns = ["内容"]
    # display selected rows
    st.table(selected_rows_df)

    # get event detail url
    url = selected_rows_df.loc["链接", "内容"]
    # display url
    st.markdown("##### 案例链接")
    st.markdown(url)


def dfdelcol(resls, delstr, savecols, halfmode=False):
    dells = literal_eval(delstr)
    savecols = literal_eval(savecols)

    resultls = []
    for dels in dells:
        (idx, cols, savels) = dels
        df = resls[idx]
        st.write(idx)
        # display shape
        st.write(df.shape)
        st.write(df)
        comls = df.columns.tolist()

        # st.write(len(comls))
        # st.write(len(cols))
        if len(comls) != len(cols):
            st.warning("字段不匹配")
            # st.stop()

        if len(comls) > 10:
            st.warning("字段过多")
            # st.stop()

        # fix 8 columns
        if len(comls) == 8:
            cols = [0, 1, 2, 3, 4, 5, 6, 7]
            savels = [1, 2, 3, 4, 5, 6, 8, 9]

        # fix 9 columns 删除公示期限
        if len(comls) == 11:
            cols = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10]
            savels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

        # fix 9 columns 删除备注
        # if len(comls) == 9:
        #     cols = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        #     savels = [0, 1, 2, 3, 4, 5, 6, 8, 9]

        # fix 9 columns 删除序号
        # if len(comls)==9:
        #     cols=[0, 1, 2, 3, 4, 5, 6, 7, 8]
        #     savels=[1, 2, 3, 4, 5, 6,7, 8, 9]

        # fix 19 columns
        # if len(comls)==19:
        #     cols=[0, 7,8,12,15,16,18,19,20]
        #     savels=[ 1, 2, 3, 4, 6, 5, 7,8,9]
        #     # merge columns 2,3,4 into 2
        #     df.iloc[:, 2] = df.iloc[:, 2]+" " + df.iloc[:, 3]+" 处罚依据:" + df.iloc[:, 4]
        #     # merge columns 6,7 into 6
        #     df.iloc[:, 6] = df.iloc[:, 6]+" 罚款" + df.astype(str).iloc[:, 7]

        # fix 20 columns
        # if len(comls)==20:
        #     cols=[0, 1,2,6,10,13,17,18,19]
        #     savels=[ 1, 2, 3, 4, 6, 5, 7,8,9]
        #     # merge columns 2,3,4 into 2
        #     df.iloc[:, 2] = df.iloc[:, 2]+" " + df.iloc[:, 3]+" 处罚依据:" + df.iloc[:, 4]
        #     # merge columns 6,7 into 6
        #     df.iloc[:, 6] = df.iloc[:, 6]+" 罚款" + df.astype(str).iloc[:, 7]
        if len(comls) == 20:
            cols = [0, 6, 10, 11, 14, 15, 17, 18, 19]
            savels = [1, 2, 4, 3, 6, 5, 7, 8, 9]
            # merge columns 2,3,4 into 2
            # df.iloc[:, 2] = df.iloc[:, 2]+" " + df.iloc[:, 3]+" 处罚依据:" + df.iloc[:, 4]
            # merge columns 6,7 into 6
            # df.iloc[:, 6] = df.iloc[:, 6]+" 罚款" + df.astype(str).iloc[:, 7]

        # fix 21 columns
        if len(comls) == 21:
            cols = [0, 7, 8, 12, 15, 16, 18, 19, 20]
            savels = [1, 2, 4, 3, 6, 5, 7, 8, 9]
            # merge columns 12,13 into 12
            df.iloc[:, 12] = df.iloc[:, 12] + " 处罚依据:" + df.iloc[:, 13]
            # merge columns 8,11 into 8
            df.iloc[:, 8] = df.iloc[:, 8] + " 罚款" + df.astype(str).iloc[:, 11]
        # if len(comls)==21:
        #     cols=[0,  7,12,14, 15,16,18,19,20]
        #     savels=[ 1, 2, 3, 4, 6, 5, 7,8,9]
        #     # merge columns 12,13 into 12
        #     df.iloc[:, 12] = df.iloc[:, 12]+" 处罚依据:" + df.iloc[:, 13]
        # # merge columns 8,11 into 8
        # df.iloc[:, 8] = df.iloc[:, 8]+" 罚款" + df.astype(str).iloc[:, 11]

        # fix 22 columns
        if len(comls) == 22:
            cols = [0, 3, 4, 8, 12, 15, 19, 20, 21]
            savels = [1, 2, 3, 4, 6, 5, 7, 8, 9]
            # merge columns 4,5,6 into 4
            df.iloc[:, 4] = (
                df.iloc[:, 4] + " " + df.iloc[:, 5] + " 处罚依据:" + df.iloc[:, 6]
            )

        # fix 23 columns
        # if len(comls)==23:
        #     cols=[0,  4, 5, 9, 13, 16, 20, 21, 22]
        #     savels=[ 1, 2, 3, 4, 6, 5, 7, 8, 9]
        #     # merge columns 5,6,7 into 5
        #     df.iloc[:, 5] = df.iloc[:, 5]+" " + df.iloc[:, 6]+" 处罚依据:" + df.iloc[:, 7]

        if len(comls) == 23:
            cols = [0, 7, 8, 12, 15, 16, 19, 21, 22]
            savels = [1, 2, 4, 3, 6, 5, 7, 8, 9]
            # merge columns 12,13 into 12
            df.iloc[:, 12] = df.iloc[:, 12] + " 处罚依据:" + df.iloc[:, 13]
            # merge columns 8,11 into 8
            df.iloc[:, 8] = df.iloc[:, 8] + " 罚款" + df.astype(str).iloc[:, 11]

        # fix 25 columns
        if len(comls) == 25:
            cols = [0, 6, 7, 11, 15, 18, 22, 23, 24]
            savels = [1, 2, 3, 4, 6, 5, 7, 8, 9]
            # merge columns 7,8,9 into 7
            df.iloc[:, 7] = (
                df.iloc[:, 7] + " " + df.iloc[:, 8] + " 处罚依据:" + df.iloc[:, 9]
            )
            # merge columns 11,12 into 11
            df.iloc[:, 11] = df.iloc[:, 11] + " 罚款" + df.iloc[:, 12]

        # fix 26 columns
        if len(comls) == 26:
            cols = [0, 7, 8, 12, 16, 19, 23, 24, 25]
            savels = [1, 2, 3, 4, 6, 5, 7, 8, 9]
            # merge columns 8,9,10 into 8
            df.iloc[:, 8] = (
                df.iloc[:, 8] + " " + df.iloc[:, 9] + " 处罚依据:" + df.iloc[:, 10]
            )

        # fix 28 columns
        if len(comls) == 28:
            cols = [0, 9, 10, 14, 18, 21, 25, 26, 27]
            savels = [1, 2, 3, 4, 6, 5, 7, 8, 9]
            # merge columns 10,11,12 into 10
            df.iloc[:, 10] = (
                df.iloc[:, 10] + " " + df.iloc[:, 11] + " 处罚依据:" + df.iloc[:, 12]
            )

        # fix 29 columns
        if len(comls) == 29:
            cols = [0, 1, 10, 11, 15, 19, 22, 26, 27, 28]
            savels = [0, 1, 2, 3, 4, 6, 5, 7, 8, 9]
            # merge columns 11,12,13 into 11
            df.iloc[:, 11] = (
                df.iloc[:, 11] + " " + df.iloc[:, 12] + " 处罚依据:" + df.iloc[:, 13]
            )

        if halfmode:
            # get rows number
            rows = df.shape[0]
            # get upper half of rows number
            rows = int(rows / 2)
            # get upper half of rows number
            df = df.iloc[:rows, cols]

        newcol = []
        if len(comls) < len(cols):
            st.error("列数不一致")
            continue
        else:
            for x in cols:
                newcol.append(comls[x])
        # get df by column range
        dfnew = df[newcol]

        newsave = []
        for y in savels:
            newsave.append(savecols[y])

        # set column name
        dfnew.columns = newsave

        st.write(dfnew)
        resultls.append(dfnew)
    if resultls:
        resdf = pd.concat(resultls)
        # reset index
        resdf.reset_index(drop=True, inplace=True)
    else:
        resdf = pd.DataFrame()
    return resdf


def uplink_pbocsum():
    st.markdown("#### 案例数据上线")

    beginwith = "pbocsum"
    oldsum = get_csvdf(penpboc, beginwith)
    lensum = len(oldsum)
    st.write("列表数据量: " + str(lensum))
    # get min and max date
    mindate = oldsum["date"].min()
    maxdate = oldsum["date"].max()
    st.write("列表日期: " + maxdate + " - " + mindate)

    beginwith = "pbocdtl"
    dtl = get_csvdf(penpboc, beginwith)
    # dtl["区域"] = orgname
    lendtl = len(dtl)
    st.write("详情数据量: " + str(lendtl))
    # get min and max date
    mindate = dtl["date"].min()
    maxdate = dtl["date"].max()
    st.write("详情日期: " + maxdate + " - " + mindate)

    # listname
    # listname = "pbocsum" + get_now() + ".csv"
    # download list data
    # st.download_button(
    #     "下载列表数据", data=oldsum.to_csv().encode("utf_8_sig"), file_name=listname
    # )

    # st.code(dtl.columns.tolist())

    col = [
        # "序号",
        "企业名称",
        "处罚决定书文号",
        "违法行为类型",
        "行政处罚内容",
        "作出行政处罚决定机关名称",
        "作出行政处罚决定日期",
        "备注",
        "区域",
        "link",
        "name",
        "date",
    ]
    # st.write(dtl.isnull().sum())
    dtllink = dtl[col]

    # dtllink['处罚决定书文号'] = dtllink['处罚决定书文号'].astype(str)
    # convert 处罚决定书文号 to str using loc
    dtllink.loc[:, "处罚决定书文号"] = dtllink["处罚决定书文号"].astype(str)

    # st.write(dtllink)

    # remove space
    dtllink = dtllink.applymap(
        lambda x: re.sub(r"\s+", "", x) if isinstance(x, str) else x
    )

    # detailname
    # detailname = "pbocdtl" + get_now() + ".csv"
    # download detail data
    # st.download_button(
    #     "下载详情数据", data=dtllink.to_csv().encode("utf_8_sig"), file_name=detailname
    # )
    # convert date to datetime
    dtllink["发布日期"] = pd.to_datetime(dtllink["date"])

    collection = get_collection("penpboc", "pbocdtl")

    # display collection size
    collection_size = get_size(collection)
    st.write("上线数据量: " + str(collection_size))

    # get data from mongodb
    olddf = get_data(collection)

    # download mongodb collection data
    st.download_button(
        "下载上线数据",
        data=olddf.to_csv().encode("utf_8_sig"),
        file_name="上线案例数据.csv",
    )

    # delete data from the MongoDB collection
    if st.button("删除上线数据"):
        delete_data(collection)
        st.success("上线案例数据删除成功！")

    # get update data based on link
    updf = dtllink[~dtllink["link"].isin(olddf["link"])]
    # display update data
    st.write("待更新上线数据量: " + str(len(updf)))
    st.write(updf)

    # download update data
    st.download_button(
        "下载待更新数据",
        data=updf.to_csv().encode("utf_8_sig"),
        file_name="待更新数据.csv",
    )

    # Insert data into the MongoDB collection
    if st.button("更新上线数据"):
        insert_data(updf, collection)
        st.success("案例数据上线成功！")


def toupt_pbocsum(org_name_ls):
    touptls = []
    for org_name in org_name_ls:
        oldsum = get_pbocsum(org_name)
        maxsumdate = oldsum["发布日期"].max()
        dtl = get_pbocdetail(org_name)
        maxdtldate = dtl["发布日期"].max()
        if maxdtldate < maxsumdate:
            touptls.append(org_name)
    return touptls


# orgname to orgname_index
def get_orgname_index(orgname):
    org_name_index = org2name[orgname]
    return org_name_index


def clean_string(x):
    if isinstance(x, str):
        return re.sub(r"\s+", "", x)
    return x


# display bar chart in plotly
def display_search_df(searchdf):
    df_month = searchdf.copy()
    # df_month["发文日期"] = pd.to_datetime(df_month["发布日期"]).dt.date
    # count by month
    df_month["month"] = df_month["发布日期"].apply(lambda x: x.strftime("%Y-%m"))
    df_month_count = df_month.groupby(["month"]).size().reset_index(name="count")
    # count by month
    # fig = go.Figure(
    #     data=[go.Bar(x=df_month_count['month'], y=df_month_count['count'])])
    # fig.update_layout(title='处罚数量统计', xaxis_title='月份', yaxis_title='处罚数量')
    # st.plotly_chart(fig)

    # display checkbox to show/hide graph1
    # showgraph1 = st.sidebar.checkbox("按发文时间统计", key="showgraph1")
    # fix value of showgraph1
    showgraph1 = True
    if showgraph1:
        x_data = df_month_count["month"].tolist()
        y_data = df_month_count["count"].tolist()

        bar, yearmonth = print_bar(x_data, y_data, "处罚数量", "按发文时间统计")
        # st.write(yearmonth)
        if yearmonth is not None:
            # get year and month value from format "%Y-%m"
            # year = int(yearmonth.split("-")[0])
            # month = int(yearmonth.split("-")[1])
            # filter date by year and month
            searchdfnew = df_month[df_month["month"] == yearmonth]
            # drop column "month"
            searchdfnew.drop(columns=["month"], inplace=True)

            # set session state
            st.session_state["search_result_pboc"] = searchdfnew
            # refresh page
            # st.experimental_rerun()

        # 图一解析开始
        maxmonth = df_month["month"].max()
        minmonth = df_month["month"].min()
        # get total number of count
        num_total = len(df_month["month"])
        # get total number of month count
        month_total = len(set(df_month["month"].tolist()))
        # get average number of count per month count
        num_avg = num_total / month_total
        # get month value of max count
        top1month = max(
            set(df_month["month"].tolist()), key=df_month["month"].tolist().count
        )
        top1number = df_month["month"].tolist().count(top1month)

        image1_text = (
            "图一解析：从"
            + minmonth
            + "至"
            + maxmonth
            + "，共发生"
            + str(num_total)
            + "起处罚事件，"
            + "平均每月发生"
            + str(round(num_avg))
            + "起处罚事件。其中"
            + top1month
            + "最高发生"
            + str(top1number)
            + "起处罚事件。"
        )

        # display total coun
        st.markdown("##### " + image1_text)

    # get eventdf sum amount by month
    df_sum, df_sigle_penalty = sum_amount_by_month(df_month)

    sum_data = df_sum["sum"].tolist()
    line, yearmonthline = print_line(x_data, sum_data, "处罚金额", "案例金额统计")

    if yearmonthline is not None:
        # filter date by year and month
        searchdfnew = df_month[df_month["month"] == yearmonthline]
        # drop column "month"
        searchdfnew.drop(columns=["month"], inplace=True)
        # set session state
        st.session_state["search_result_pboc"] = searchdfnew
        # refresh page
        # st.experimental_rerun()

    # 图二解析：
    sum_data_number = 0  # 把案件金额的数组进行求和
    more_than_100 = 0  # 把案件金额大于100的数量进行统计
    case_total = 0  # 把案件的总数量进行统计

    penaltycount = df_sigle_penalty["amount"].tolist()
    for i in penaltycount:
        sum_data_number = sum_data_number + i / 10000
        if i > 100 * 10000:
            more_than_100 = more_than_100 + 1
        if i != 0:
            case_total = case_total + 1

    # for i in sum_data:
    #     sum_data_number = sum_data_number + i / 10000
    #     if i > 100 * 10000:
    #         more_than_100 = more_than_100 + 1
    # sum_data_number=round(sum_data_number,2)
    if case_total > 0:
        avg_sum = round(sum_data_number / case_total, 2)
    else:
        avg_sum = 0
    # get index of max sum
    topsum1 = df_sum["sum"].nlargest(1)
    topsum1_index = df_sum["sum"].idxmax()
    # get month value of max count
    topsum1month = df_sum.loc[topsum1_index, "month"]
    image2_text = (
        "图二解析：从"
        + minmonth
        + "至"
        + maxmonth
        + "，共发生罚款案件"
        + str(case_total)
        + "起;期间共涉及处罚金额"
        + str(round(sum_data_number, 2))
        + "万元，处罚事件平均处罚金额为"
        + str(avg_sum)
        + "万元，其中处罚金额高于100万元处罚事件共"
        + str(more_than_100)
        + "起。"
        + topsum1month
        + "发生最高处罚金额"
        + str(round(topsum1.values[0] / 10000, 2))
        + "万元。"
    )
    st.markdown("##### " + image2_text)

    # count by orgname
    df_org_count = df_month.groupby(["区域"]).size().reset_index(name="count")
    # sort by count
    df_org_count = df_org_count.sort_values(by="count", ascending=False)
    # st.write(df_org_count)
    org_ls = df_org_count["区域"].tolist()
    count_ls = df_org_count["count"].tolist()
    new_orgls, new_countls = count_by_province(org_ls, count_ls)
    # st.write(new_orgls+ new_countls)
    map_data = print_map(new_orgls, new_countls, "处罚地图")
    # st_pyecharts(map_data, map=map, width=800, height=650)
    # display map
    # components.html(map.render_embed(), height=650)

    pie, orgname = print_pie(org_ls, count_ls, "按发文机构统计")
    if orgname is not None:
        # filter searchdf by orgname
        searchdfnew = searchdf[searchdf["区域"] == orgname]
        # set session state
        st.session_state["search_result_pboc"] = searchdfnew
        # refresh page
        # st.experimental_rerun()

    # 图四解析开始
    # orgls = df_org_count["区域"].value_counts().keys().tolist()
    # countls = df_org_count["区域"].value_counts().tolist()
    result = ""

    for org, count in zip(org_ls[:3], count_ls[:3]):
        result = result + org + "（" + str(count) + "起）,"

    image4_text = (
        "图四解析："
        + minmonth
        + "至"
        + maxmonth
        + "，共"
        + str(len(org_ls))
        + "家地区监管机构提出处罚意见，"
        + "排名前三的机构为："
        + result[: len(result) - 1]
    )
    st.markdown("#####  " + image4_text)


def print_bar(x_data, y_data, y_axis_name, title):
    # Create a DataFrame from the input data
    data = pd.DataFrame({"月份": x_data, y_axis_name: y_data})
    # Create the bar chart
    fig = px.bar(
        data,
        x="月份",
        y=y_axis_name,
        title=title,
        color=y_axis_name,
        text=y_axis_name,
        color_continuous_scale=px.colors.sequential.Viridis,
    )

    # Display the chart
    event = st.plotly_chart(fig, use_container_width=True, on_select="rerun")

    monthselected = event["selection"]["point_indices"]

    if monthselected == []:
        clickevent = None
    else:
        clickevent = x_data[monthselected[0]]

    return fig, clickevent


def print_line(x_data, y_data, y_axis_name, title):
    # Create a DataFrame from the input data
    data = pd.DataFrame({"月份": x_data, y_axis_name: y_data})
    # Create the line chart
    fig = px.line(data, x="月份", y=y_axis_name, title=title, text=y_axis_name)

    # Display the chart
    event = st.plotly_chart(fig, use_container_width=True, on_select="rerun")

    monthselected = event["selection"]["point_indices"]

    if monthselected == []:
        clickevent = None
    else:
        clickevent = x_data[monthselected[0]]

    return fig, clickevent


def print_pie(namels, valuels, title):
    data = pd.DataFrame({"names": namels, "values": valuels})

    fig = px.pie(
        data,
        names="names",
        values="values",
        title=title,
        labels={"names": "名称", "values": "数量"},
    )
    fig.update_traces(textinfo="label+percent", insidetextorientation="radial")
    # Display the chart
    event = st.plotly_chart(fig, use_container_width=True, on_select="rerun")

    monthselected = event["selection"]["point_indices"]

    if monthselected == []:
        clickevent = None
    else:
        clickevent = namels[monthselected[0]]

    return fig, clickevent


def print_map(province_name, province_values, title_name):
    # load the GeoJSON file
    china_geojson = json.load(open(mappath, "r", encoding="utf-8-sig"))

    # st.write(china_geojson)

    # Create a DataFrame from the provided data
    data = pd.DataFrame({"省份": province_name, "处罚数量": province_values})
    # Create the choropleth map
    # fig = px.choropleth(
    fig = px.choropleth_mapbox(
        data,
        geojson=china_geojson,
        featureidkey="properties.name",
        locations="省份",
        color="处罚数量",
        color_continuous_scale="Viridis",
        mapbox_style="carto-positron",
        zoom=2,
        center={"lat": 35, "lon": 105},
        # scope='asia',
        title=title_name,
    )

    # Add text labels
    fig.update_traces(
        text=data["处罚数量"],
    )

    # Update geos
    fig.update_geos(
        visible=False,
        fitbounds="locations",
    )

    # Update layout
    fig.update_layout(title_text=title_name, title_x=0.5)

    # Display the chart in Streamlit
    st.plotly_chart(fig, use_container_width=True)
    return fig


def count_by_province(city_ls, count_ls):
    if len(city_ls) != len(count_ls):
        raise ValueError("城市列表和计数列表的长度必须相同")

    # Use Counter for efficient counting
    province_counts = Counter()

    for city, count in zip(city_ls, count_ls):
        province = city2province[city]
        if province:
            province_counts[province] += count
        else:
            raise ValueError(f"City {city} is not found in city2province mapping")

    sorted_provinces = sorted(province_counts.items(), key=lambda x: (-x[1], x[0]))

    provinces, counts = zip(*sorted_provinces) if sorted_provinces else ([], [])

    return list(provinces), list(counts)


# def get_chinese_province(location):
#     if location == "总部":
#         return "北京市"
#     if location == "全国":
#         return "未知省份"
#     if location == "无":
#         return "未知省份"

#     return extract_province(location)


# def get_chinese_province_nominatim(city, country="中国"):
#     geolocator = Nominatim(user_agent="city_to_chinese_province_converter")

#     try:
#         # Attempt to geocode the city
#         location = geolocator.geocode(
#             f"{city}, {country}", exactly_one=True, language="zh"
#         )

#         if location:
#             # Reverse geocode to get detailed address information in Chinese
#             address = geolocator.reverse(
#                 f"{location.latitude}, {location.longitude}", language="zh"
#             ).raw["address"]

#             # Extract the province information
#             province = address.get("state", "")

#             # If no state/province is found, try other potential fields
#             if not province:
#                 province = address.get("province", "")
#             if not province:
#                 province = address.get("region", "")

#             return province if province else "省份未找到"
#         else:
#             return "城市未找到"

#     except (GeocoderTimedOut, GeocoderUnavailable):
#         print("地理编码服务超时或不可用。请稍后再试。")
#         return "未知省份"


# def extract_province(location_string):
#     # Dictionary of provinces and autonomous regions with their common abbreviations
#     province_dict = {
#         "北京": "北京市",
#         "天津": "天津市",
#         "河北": "河北省",
#         "山西": "山西省",
#         "内蒙古": "内蒙古自治区",
#         "辽宁": "辽宁省",
#         "吉林": "吉林省",
#         "黑龙江": "黑龙江省",
#         "上海": "上海市",
#         "江苏": "江苏省",
#         "浙江": "浙江省",
#         "安徽": "安徽省",
#         "福建": "福建省",
#         "江西": "江西省",
#         "山东": "山东省",
#         "河南": "河南省",
#         "湖北": "湖北省",
#         "湖南": "湖南省",
#         "广东": "广东省",
#         "广西": "广西壮族自治区",
#         "海南": "海南省",
#         "重庆": "重庆市",
#         "四川": "四川省",
#         "贵州": "贵州省",
#         "云南": "云南省",
#         "西藏": "西藏自治区",
#         "陕西": "陕西省",
#         "甘肃": "甘肃省",
#         "青海": "青海省",
#         "宁夏": "宁夏回族自治区",
#         "新疆": "新疆维吾尔自治区",
#     }

#     # Check for direct matches or matches with common abbreviations
#     for key, value in province_dict.items():
#         if location_string.startswith(key):
#             return value

#     # Handle autonomous prefectures and cities
#     parts = re.split(r"(自治州|地区|市)", location_string)
#     if len(parts) > 1:
#         potential_province = parts[0]
#         for key, value in province_dict.items():
#             if potential_province.startswith(key):
#                 return value

#     # If no match found, try to extract using Nominatim
#     province = get_chinese_province_nominatim(location_string)
#     if province:
#         return province

#     return "未知省份"


def get_pboccat():
    amtdf = get_csvdf(penpboc, "pboccat")
    # process amount
    amtdf["amount"] = amtdf["amount"].astype(float)
    # rename columns law to lawlist
    amtdf.rename(columns={"law": "lawlist"}, inplace=True)
    # return amtdf[["id", "amount"]]
    return amtdf


def sum_amount_by_month(df):
    # amtdf = get_cbircamt()
    # df1 = pd.merge(
    #     df, amtdf.drop_duplicates("id"), left_on="id", right_on="id", how="left"
    # )
    df1 = df
    df1["amount"] = df1["amount"].fillna(0)
    df1["发布日期"] = pd.to_datetime(df1["发布日期"]).dt.date
    # df=df[df['发文日期']>=pd.to_datetime('2020-01-01')]
    df1["month"] = df1["发布日期"].apply(lambda x: x.strftime("%Y-%m"))
    df_month_sum = df1.groupby(["month"])["amount"].sum().reset_index(name="sum")
    df_sigle_penalty = df1[["month", "amount"]]
    return df_month_sum, df_sigle_penalty


def update_pboclabel():
    # get cbirc detail
    newdf = get_pbocdetail("")

    # get id list
    newidls = newdf["link"].tolist()

    # get amount details
    amtdf = get_pboccat()

    # get splitdf
    # splitdf = get_cbircanalysis("")

    # if amtdf is not empty
    if amtdf.empty:
        amtoldidls = []
    else:
        amtoldidls = amtdf["id"].tolist()
    # get new idls not in oldidls
    amtupdidls = [x for x in newidls if x not in amtoldidls]

    amtupddf = newdf[newdf["link"].isin(amtupdidls)]
    # reset index
    amtupddf.reset_index(drop=True, inplace=True)
    # display newdf
    st.markdown("### 待更新分类数据")
    st.write(amtupddf)
    # if newdf is not empty, save it
    if amtupddf.empty is False:
        updlen = len(amtupddf)
        st.info("待更新分类" + str(updlen) + "条数据")
        savename = "pboc_tocat" + get_now() + ".csv"
        # download detail data
        st.download_button(
            "下载分类案例数据",
            data=amtupddf.to_csv().encode("utf_8_sig"),
            file_name=savename,
        )
    else:
        st.info("无待更新分类数据")
