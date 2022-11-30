import glob
import os
import random
import time
import urllib
from ast import literal_eval
from urllib.parse import unquote

import pandas as pd
import pdfplumber
import requests
import streamlit as st
from doc2text import pdfurl2tableocr, picurl2table
from selenium.webdriver.common.by import By
from snapshot import get_chrome_driver
from utils import df2aggrid, get_now, split_words

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
    ][col]
    # sort by date desc
    searchdf.sort_values(by=["发布日期"], ascending=False, inplace=True)
    # drop duplicates
    # searchdf.drop_duplicates(subset=["link"], inplace=True)
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
    sumdf2 = oldsum2.groupby("区域")["发布日期"].agg(["max", "min", "count"]).reset_index()
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

    dresultls = []
    tresultls = []
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
    if dresultls:
        pbocdf = pd.concat(dresultls)
        savecsv = "pboctodownload" + org_name_index
        # reset index
        pbocdf.reset_index(drop=True, inplace=True)
        savetemp(pbocdf, savecsv)
    else:
        pbocdf = pd.DataFrame()

    if tresultls:
        # get table df
        tabledf = pd.concat(tresultls)
        savetable = "pboctotable" + org_name_index + get_now()
        # reset index
        tabledf = tabledf.reset_index(drop=True)
        savetemp(tabledf, savetable)
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

            # check if file exist
            if os.path.exists(os.path.join(temppath, filename)):
                st.info("file exist: " + filename)
                # continue
            else:
                # save path
                savepath = os.path.join(temppath, filename)
                # download file by click the link
                browser.get(url)

            # ls2 = browser.find_elements(By.XPATH, "//table//table[2]//a")

            # if len(ls2) > 0:
            #     dwnlink = ls2[0].get_attribute("href")
            #     if dwnlink:
            #         browser.get(dwnlink)
            #         url = dwnlink
            #         filename = os.path.basename(url)
            #         # unquote to decode url
            #         filename = unquote(filename)
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
        savename = "pboctofile" + org_name_index
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
    # pendf.fillna("", inplace=True)
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
    dfupd["区域"] = orgname
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


def save_pboctable(df, orgname):
    org_name_index = org2name[orgname]
    savename = "pboctotable" + org_name_index + get_now()
    # display columns

    # set columns
    # df.columns = savecols
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


def download_pbocsum():

    st.markdown("#### 案例数据下载")

    for orgname in org2name.keys():

        st.markdown("##### " + orgname)
        # get orgname
        org_name_index = org2name[orgname]
        beginwith = "pbocsum" + org_name_index
        oldsum = get_csvdf(penpboc, beginwith)
        lensum = len(oldsum)
        st.write("列表数据量: " + str(lensum))

        beginwith = "pbocdtl" + org_name_index
        dtl = get_csvdf(penpboc, beginwith)
        dtl["区域"] = orgname
        lendtl = len(dtl)
        st.write("详情数据量: " + str(lendtl))

        # listname
        listname = "pbocsum" + org_name_index + get_now() + ".csv"
        # download list data
        st.download_button(
            "下载列表数据", data=oldsum.to_csv().encode("utf_8_sig"), file_name=listname
        )
        # detailname
        detailname = "pbocdtl" + org_name_index + get_now() + ".csv"
        # download detail data
        st.download_button(
            "下载详情数据", data=dtl.to_csv().encode("utf_8_sig"), file_name=detailname
        )


# display event detail
def display_eventdetail(search_df):
    # draw plotly figure
    # display_cbircmonth(search_df)
    # get search result from session
    search_dfnew = st.session_state["search_result_pboc"]
    total = len(search_dfnew)
    # st.sidebar.metric("总数:", total)
    st.markdown("### 搜索结果" + "(" + str(total) + "条)")
    # display download button
    st.download_button(
        "下载搜索结果", data=search_dfnew.to_csv().encode("utf_8_sig"), file_name="搜索结果.csv"
    )
    # display columns
    discols = ["发布日期", "处罚决定书文号", "企业名称", "区域"]
    # get display df
    display_df = search_dfnew[discols]
    # set index column
    display_df["序号"] = display_df.index
    # change column name
    # display_df.columns = ["link", "文号","当事人",  "发布日期", "区域"]

    data = df2aggrid(display_df)
    # display data
    selected_rows = data["selected_rows"]
    if selected_rows == []:
        st.error("请先选择查看案例")
        st.stop()

    id = selected_rows[0]["序号"]
    # select search_dfnew by id
    selected_rows_df = search_dfnew[search_dfnew.index == id]
    # transpose and set column name
    selected_rows_df = selected_rows_df.astype(str).T

    selected_rows_df.columns = ["内容"]
    # display selected rows
    st.table(selected_rows_df)

    # get event detail url
    url = selected_rows_df.loc["link", "内容"]
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

        # fix 9 columns 删除备注
        if len(comls) == 9:
            cols = [0, 1, 2, 3, 4, 5, 6, 7, 8]
            savels = [0, 1, 2, 3, 4, 5, 6, 8, 9]

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
