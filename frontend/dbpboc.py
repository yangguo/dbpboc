import glob
import os
import random
import time
import urllib
from urllib.parse import unquote

import pandas as pd

# import wget
import pdfplumber
import requests
import streamlit as st
from doc2text import pdfurl2tableocr, picurl2table
from selenium.webdriver.common.by import By
from snapshot import get_chrome_driver
from utils import get_now

penpboc = "../pboc"
temppath = r"../data/temp"

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
    "广州": "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/20713/index",
    "太原": "taiyuan",
    "石家庄": "shijiazhuang",
    "总部": "zongbu",
    "昆明": "kunming",
    "青岛": "http://qingdao.pbc.gov.cn/qingdao/126166/126184/126191/16720/index",
    "沈阳": "shenyang",
    "长沙": "changsha",
    "深圳": "shenzhen",
    "武汉": "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/16682/index",
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


def get_csvdf(penfolder, beginwith):
    files2 = glob.glob(penfolder + "**/" + beginwith + "*.csv", recursive=True)
    dflist = []
    # filelist = []
    for filepath in files2:
        pendf = pd.read_csv(filepath)
        dflist.append(pendf)
        # filelist.append(filename)
    if len(dflist) > 0:
        df = pd.concat(dflist)
        df.reset_index(drop=True, inplace=True)
    else:
        df = pd.DataFrame()
    return df


def searchpboc(df, title_text, location_text):

    col = [
        "企业名称",
        "处罚决定书文号",
        "违法行为类型",
        "行政处罚内容",
        "作出行政处罚决定机关名称",
        "作出行政处罚决定日期",
        "区域",
        "文件",
        # "来源",
    ]

    searchdf = df[
        (df["企业名称"].str.contains(title_text)) & (df["区域"].str.contains(location_text))
    ][col]

    # reset index
    searchdf.reset_index(drop=True, inplace=True)

    return searchdf


# summary of pboc
def display_summary():
    # get old sumeventdf
    oldsum2 = get_pbocdetail("")
    # get length of old eventdf
    oldlen2 = len(oldsum2)
    # display isnull sum
    st.write(oldsum2.isnull().sum())
    # get min and max date of old eventdf
    min_date2 = oldsum2["作出行政处罚决定日期"].min()
    max_date2 = oldsum2["作出行政处罚决定日期"].max()
    # use metric
    col1, col2 = st.columns([1, 3])
    with col1:
        st.metric("案例总数", oldlen2)
    with col2:
        st.metric("案例日期范围", f"{min_date2} - {max_date2}")

    # sum max,min date and size by org
    sumdf2 = (
        oldsum2.groupby("区域")["作出行政处罚决定日期"].agg(["max", "min", "count"]).reset_index()
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
    org_name_index = org2name[orgname]
    beginwith = "pbocsum" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    cols = ["name", "date", "link", "sum"]
    # if not empty
    if len(pendf) > 0:
        # filter by cols
        pendf = pendf[cols]
        # format date
        pendf["发布日期"] = pd.to_datetime(pendf["date"]).dt.date
    return pendf


def get_pbocdetail(orgname):
    if orgname == "":
        org_name_index = ""
    else:
        org_name_index = org2name[orgname]

    beginwith = "pbocdtl" + org_name_index
    d0 = get_csvdf(penpboc, beginwith)
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
    # if orgname != "":
    #     st.write(orgname)
    #     d0["区域"] = orgname
    # fillna
    d0.fillna("", inplace=True)
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


def display_pbocsum():
    for org_name in org2name.keys():
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
        st.info("url:" + url)
        try:
            browser.implicitly_wait(3)
            browser.get(url)
            ls1 = browser.find_elements(By.XPATH, '//td[@class="hei12jj"]')
            namels = []
            datels = []
            sumls = []
            total = len(ls1) // 3
            for i in range(total):
                #     print(ls1[i].text)
                namels.append(ls1[i * 3].text)
                datels.append(ls1[i * 3 + 1].text)
                sumls.append(ls1[i * 3 + 2].text)

            ls2 = browser.find_elements(By.XPATH, '//font[@class="hei12"]/a')
            linkls = []
            for link in ls2:
                linkls.append(link.get_attribute("href"))
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
        newdf.reset_index(drop=True, inplace=True)
        # save to update dtl list
        toupdname = "pboctoupd" + org_name_index
        savedf(newdf, toupdname)
    return newdf


# get event detail
def get_eventdetail(eventsum, orgname):
    org_name_index = org2name[orgname]
    browser = get_chrome_driver(temppath)
    detaills = eventsum["link"].tolist()

    resultls = []
    errorls = []
    count = 0
    for durl in detaills:
        st.info(str(count) + " begin")
        st.info("url:" + durl)
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

            st.write("get table")
            # get web table
            dl2 = browser.find_elements(By.XPATH, '//td[@class="hei14jj"]//tr')
            df = web2table(dl2)
            st.write(df)

            if len(downurl) > 0:
                if len(downurl) == 1:
                    dfl = pd.DataFrame(index=[0])
                else:
                    dfl = pd.DataFrame()
                dfl["link"] = durl
                dfl["download"] = downurl
                filename = os.path.basename(durl)
                # unquote to decode url
                filename = unquote(filename)
                dfl["file"] = filename
                st.write(dfl)
                resultls.append(dfl)

            if len(downurl) == 0 and df.empty:
                dfl = pd.DataFrame(index=[0])
                dfl["link"] = durl
                dfl["download"] = durl
                filename = os.path.basename(durl)
                # unquote to decode url
                filename = unquote(filename)
                dfl["file"] = filename
                st.write(dfl)
                resultls.append(dfl)

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
                resultls.append(df)
            #         elif colen==7:
            #             df['备注']=''
            #             df.columns=['序号', '企业名称', '处罚决定书文号', '违法行为类型', '行政处罚内容', '作出行政处罚决定机关名称','作出行政处罚决定日期', '备注']
            #             df['link']=durl
            #             dwnurl.append(df)
            #         elif colen==6:
            #             df['序号']=''
            #             df['备注']=''
            #             df.columns=['企业名称', '处罚决定书文号', '违法行为类型', '行政处罚内容', '作出行政处罚决定机关名称','作出行政处罚决定日期', '序号', '备注']
            #             df['link']=durl
            #             dwnurl.append(df)
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
                resultls.append(df2)
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
            if resultls:
                tempdf = pd.concat(resultls)
                savename = "temptodownload-" + org_name_index + str(count + 1)
                savetemp(tempdf, savename)

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
    if resultls:
        pbocdf = pd.concat(resultls)
        # get file df
        filedf = pbocdf[pbocdf["file"].notnull() | pbocdf["download"].notnull()]
        savecsv = "pboctodownload" + org_name_index
        # reset index
        filedf = filedf.reset_index(drop=True)
        savetemp(filedf, savecsv)
        # get table df
        tabledf = pbocdf[pbocdf["file"].isnull() & pbocdf["download"].isnull()]
        savetable = "pboctotable" + org_name_index + get_now()
        # reset index
        tabledf = tabledf.reset_index(drop=True)
        savetemp(tabledf, savetable)
    else:
        pbocdf = pd.DataFrame()
    return pbocdf


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
    df.to_csv(savepath)


# download attachment
def download_attachment(linkurl, downloadls, orgname):
    org_name_index = org2name[orgname]
    browser = get_chrome_driver(temppath)

    # dwndf = lendf[lendf[downcol].notnull()]
    # # get link url
    # linkurl = dwndf["link"]
    # # get download url
    # downloadls = dwndf[downcol].tolist()

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
            # save path
            savepath = os.path.join(temppath, filename)
            # download file by click the link
            browser.get(url)

            ls2 = browser.find_elements(By.XPATH, "//table//table[2]//a")

            if len(ls2) > 0:
                dwnlink = ls2[0].get_attribute("href")
                if dwnlink:
                    browser.get(dwnlink)
                    url = dwnlink
                    filename = os.path.basename(url)
                    # unquote to decode url
                    filename = unquote(filename)
            # response = requests.get(url, stream=True)
            # with requests.get(url, stream=True) as response:
            #     with open(savepath, 'wb') as f:
            #         for chunk in response.iter_content(1024*8):
            #             if chunk:
            #                 f.write(chunk)
            #                 f.flush()

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
            savetemp(tempdf, savename)

        wait = random.randint(2, 10)
        time.sleep(wait)
        st.info("finish: " + str(count))
        count += 1

    if resultls:
        misdf = pd.concat(resultls)
        # filedf = lendf[lendf["download"].isnull()]
        # tabledf = pd.concat([filedf, misdf])
        tabledf = misdf
        savename = "pboctofile" + org_name_index + get_now()
        # reset index
        tabledf.reset_index(drop=True, inplace=True)
        savetemp(tabledf, savename)
    else:
        misdf = pd.DataFrame()
    # quit browser
    browser.quit()
    return misdf


def get_pboctodownload(orgname):
    org_name_index = org2name[orgname]
    beginwith = temppath + "/pboctodownload" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    return pendf


def get_pboctotable(orgname):
    org_name_index = org2name[orgname]
    beginwith = temppath + "/pboctotable" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    # fillna
    pendf.fillna("", inplace=True)
    return pendf


def get_pboctofile(orgname):
    org_name_index = org2name[orgname]
    beginwith = temppath + "/pboctofile" + org_name_index
    pendf = get_csvdf(penpboc, beginwith)
    return pendf


def save_pbocdetail(df, orgname):
    org_name_index = org2name[orgname]
    # get sum
    sumdf = get_pbocsum(orgname)
    # merge with df
    dfupd = pd.merge(df, sumdf, left_on="link", right_on="link", how="left")
    savename = penpboc + "/pbocdtl" + org_name_index + get_now()
    savedf(dfupd, savename)


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


def save_pboctable(df, savecols, orgname):
    org_name_index = org2name[orgname]
    savename = "pboctotable" + org_name_index + get_now()
    # set columns
    df.columns = savecols + ["link", "file"]
    savetemp(df, savename)


def mergetable(df, col):
    df[col].fillna(method="ffill", inplace=True)
    # print(df)
    # fillna with ''
    df.fillna("", inplace=True)
    mergecol = [col, "link"]
    # merge columns
    dfu = df.groupby(mergecol).agg(lambda x: "".join(x)).reset_index()
    return dfu
