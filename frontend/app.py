import csv

import pandas as pd
import requests
import streamlit as st

# from docx2pdf import convert

temppath = "../data/temp"
# backendurl = "http://backend.docker:8000"
# backendurl = "http://localhost:8000"

from dbpboc import (
    dfdelcol,
    display_eventdetail,
    display_pbocsum,
    display_summary,
    download_attachment,
    download_pbocsum,
    get_eventdetail,
    get_pbocdetail,
    get_pboctodownload,
    get_pboctofile,
    get_pboctotable,
    get_pboctoupd,
    get_sumeventdf,
    mergetable,
    pdf2table,
    save_pbocdetail,
    save_pboctable,
    searchpboc,
    toupt_pbocsum,
    update_sumeventdf,
    update_toupd,
    uplink_pbocsum,
)
from doc2text import (
    convert_uploadfiles,
    docx2pdf,
    docxconvertion,
    get_convertfname,
    img_to_pdf,
    picurl2table,
    word2df,
)

# set page config
st.set_page_config(
    page_title="人民银行监管处罚分析",
    page_icon=":bank:",
    layout="wide",
    initial_sidebar_state="expanded",
)

cityls = [
    "天津",
    "重庆",
    "上海",
    "兰州",
    "拉萨",
    "西宁",
    "乌鲁木齐",
    "南宁",
    "贵阳",
    "福州",
    "成都",
    "呼和浩特",
    "郑州",
    "北京",
    "合肥",
    "厦门",
    "海口",
    "大连",
    "广州",
    "太原",
    "石家庄",
    "总部",
    "昆明",
    "青岛",
    "沈阳",
    "长沙",
    "深圳",
    "武汉",
    "银川",
    "西安",
    "哈尔滨",
    "长春",
    "宁波",
    "杭州",
    "南京",
    "济南",
    "南昌",
]


def main():

    menu = [
        "案例总数",
        "案例搜索",
        "案例更新",
        "附件处理",
        # "案例分类",
        "案例下载",
        "案例上线",
    ]

    choice = st.sidebar.selectbox("选择", menu)

    if choice == "案例总数":
        st.subheader("案例总数")

        display_summary()

    elif choice == "案例更新":
        st.subheader("案例更新")

        # choose orgname index
        org_name_ls = st.sidebar.multiselect("机构", cityls)
        if org_name_ls == []:
            org_name_ls = cityls

        # checkbox to filter pending org_name_list
        pendingorg = st.sidebar.checkbox("待更新机构")
        if pendingorg:
            # get pending org_name list
            org_name_ls = toupt_pbocsum(org_name_ls)
            # display pending org_name list
            st.markdown("#### 待更新机构")
            # convert list to string
            orglsstr = ",".join(org_name_ls)
            st.markdown(" #### " + orglsstr)

        display_pbocsum(org_name_ls)

        # choose page start number and end number
        start_num = st.sidebar.number_input("起始页", value=1, min_value=1)
        # convert to int
        start_num = int(start_num)
        end_num = st.sidebar.number_input("结束页", value=1)
        # convert to int
        end_num = int(end_num)
        # button to scrapy web
        sumeventbutton = st.sidebar.button("更新列表")

        if sumeventbutton:
            for org_name in org_name_ls:
                # write org_name
                st.markdown("#### 更新列表：" + org_name)
                # get sumeventdf
                sumeventdf = get_sumeventdf(org_name, start_num, end_num)
                # get length of sumeventdf
                length = len(sumeventdf)
                # display length
                st.success(f"获取了{length}条案例")
                # update sumeventdf
                newsum = update_sumeventdf(sumeventdf, org_name)
                # get length of newsum
                sumevent_len = len(newsum)
                # display sumeventdf
                st.success(f"共{sumevent_len}条案例待更新")

        # update detail button
        eventdetailbutton = st.sidebar.button("更新详情")
        if eventdetailbutton:
            for org_name in org_name_ls:
                # write org_name
                st.markdown("#### 更新详情：" + org_name)
                # update sumeventdf
                newsum = update_toupd(org_name)
                # get length of toupd
                newsum_len = len(newsum)
                # display sumeventdf
                st.success(f"共{newsum_len}条案例待更新")
                if newsum_len > 0:
                    # get toupdate list
                    toupd = get_pboctoupd(org_name)
                    st.write(toupd)
                    # get event detail
                    eventdetail = get_eventdetail(toupd, org_name)
                    # get length of eventdetail
                    eventdetail_len = len(eventdetail)
                    # display eventdetail
                    st.success(f"更新完成，共{eventdetail_len}条案例详情")
                else:
                    st.error("没有更新的案例")

        # button to refresh page
        refreshbutton = st.sidebar.button("刷新页面")
        if refreshbutton:
            st.experimental_rerun()

    elif choice == "案例搜索":
        st.subheader("案例搜索")

        if "search_result_pboc" not in st.session_state:
            st.session_state["search_result_pboc"] = None
        if "keywords_pboc" not in st.session_state:  # 生成word的session初始化
            st.session_state["keywords_pboc"] = []

        resls = []
        for org_name in cityls:
            df = get_pbocdetail(org_name)
            resls.append(df)
        dfl = pd.concat(resls)
        # get min and max date of old eventdf
        min_date = dfl["发布日期"].min()
        max_date = dfl["发布日期"].max()

        # loclist = dfl["区域"].unique().tolist()
        loclist = cityls
        # one years ago
        one_year_ago = max_date - pd.Timedelta(days=365 * 1)

        # use form
        with st.form("搜索案例"):
            col1, col2 = st.columns(2)

            with col1:
                # input date range
                start_date = st.date_input(
                    "开始日期", value=one_year_ago, min_value=min_date
                )
                # input wenhao keyword
                wenhao_text = st.text_input("文号关键词")
                # input people keyword
                people_text = st.text_input("当事人关键词")
                # input event keyword
                event_text = st.text_input("案情关键词")
            with col2:
                end_date = st.date_input("结束日期", value=max_date, min_value=min_date)
                # input penalty keyword
                penalty_text = st.text_input("处罚决定关键词")
                # input org keyword
                org_text = st.text_input("处罚机关关键词")
                # choose province using multiselect
                province = st.multiselect("处罚区域", loclist)
            # search button
            searchbutton = st.form_submit_button("搜索")

        if searchbutton:
            # if text are all empty
            if (
                wenhao_text == ""
                and people_text == ""
                and event_text == ""
                # and law_text == ""
                and penalty_text == ""
                and org_text == ""
            ):
                st.warning("请输入搜索关键词")
            if province == []:
                province = loclist
            st.session_state["keywords_pboc"] = [
                start_date,
                end_date,
                wenhao_text,
                people_text,
                event_text,
                penalty_text,
                org_text,
                province,
            ]
            search_df = searchpboc(
                dfl,
                start_date,
                end_date,
                wenhao_text,
                people_text,
                event_text,
                penalty_text,
                org_text,
                province,
            )
            # save search_df to session state
            st.session_state["search_result_pboc"] = search_df
        else:
            search_df = st.session_state["search_result_pboc"]

        if search_df is None:
            st.error("请先搜索")
            st.stop()

        if len(search_df) > 0:
            # display eventdetail
            display_eventdetail(search_df)
        else:
            st.warning("没有搜索结果")

    elif choice == "附件处理":
        st.subheader("附件处理")
        # choose orgname index
        org_name = st.sidebar.selectbox("机构", cityls)

        # radio button to choose option one or two
        option = st.sidebar.radio("选择", ("附件下载", "附件读取", "内容处理"))

        if option == "附件下载":
            # get download df
            lendf = get_pboctodownload(org_name)

            # choose download list or file list
            downloadchose = st.sidebar.radio("选择", ("下载列表", "文件列表"))
            # display download df
            st.write("待下载列表")
            if len(lendf) > 0:
                if downloadchose == "下载列表":
                    downcol = "download"
                    # get download column list
                    dwndf = lendf[lendf[downcol].notnull()]
                    downloadlink = dwndf[downcol].tolist()
                    linkls = dwndf["link"].tolist()
                else:
                    downloadlink = []
                    linkls = []
                # else:
                #     downcol = "file"
                #     # get download column list
                #     dwndf = lendf[lendf[downcol].notnull()]
                #     downloadlink = dwndf["link"].tolist()
                #     linkls = dwndf["link"].tolist()
            else:
                downloadlink = []
                linkls = []
            # display download column list
            st.write(downloadlink)
            # get length of toupd
            newsum_len = len(downloadlink)
            # display sumeventdf
            st.success(f"共{newsum_len}条案例待更新")

            # get start and end index
            start_index = st.number_input("开始索引", value=0, min_value=0)
            end_index = st.number_input("结束索引", value=newsum_len, min_value=0)
            # get download link
            downloadlink = downloadlink[start_index:end_index]
            linkls = linkls[start_index:end_index]

            # download attachment button
            downloadbutton = st.sidebar.button("下载附件")
            if downloadbutton:
                # for org_name in org_namels:
                # write org_name
                st.markdown("#### 下载附件：" + org_name)

                if newsum_len > 0:
                    # get event detail
                    eventdetail = download_attachment(linkls, downloadlink, org_name)
                    # get length of eventdetail
                    eventdetail_len = len(eventdetail)
                    # display eventdetail
                    st.success(f"下载完成，共{eventdetail_len}条附件")
                else:
                    st.error("没有待下载的附件")

        elif option == "附件读取":
            # initialize search result in session state
            if "pboc_table" not in st.session_state:
                st.session_state["pboc_table"] = []
            # get filelist
            filedf = get_pboctofile(org_name)
            if filedf.empty:
                st.error("没有附件")
            else:
                # get link list
                linklist = filedf["link"].tolist()
                # get filelist
                filelist = filedf["file"].tolist()

                # choose begin and end index
                start_index = st.number_input("开始索引", value=0, min_value=0)
                end_index = st.number_input("结束索引", value=len(linklist), min_value=0)
                # get link list
                linklist = linklist[start_index:end_index]
                # get filelist
                filelist = filelist[start_index:end_index]
                # display length
                st.info(f"共{len(linklist)}条附件")
                st.write(filelist)
                # choose file index
                file_idx_ls = st.multiselect(
                    "附件列表", range(len(filelist)), format_func=lambda x: filelist[x]
                )
                if file_idx_ls == []:
                    file_idx_ls = [x for x in range(len(filelist))]
                # sort file index
                file_idx_ls.sort()
                # st.write(file_idx_ls)
                # choose batch mode
                batchmode = st.sidebar.checkbox("批量处理", value=True)
                # pdf mode
                pdfmode = st.sidebar.checkbox("PDF模式")
                # half mode
                halfmode = st.sidebar.checkbox("半页模式")

                # set initial value of file_idx
                file_idx = file_idx_ls[0]
                file_name = filelist[file_idx]
                file_link = linklist[file_idx]

                # button to read excel file content
                readexcelbutton = st.sidebar.button("读取excel文件")
                if readexcelbutton:
                    if batchmode:
                        resls = []
                        errls = []
                        count = 0
                        for file_idx in file_idx_ls:
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            # check file extension
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]

                            # ignore filename capitalization
                            if (
                                file_name.lower().endswith(".xls")
                                or file_name.lower().endswith(".xlsx")
                                or file_name.lower().endswith(".et")
                                or file_name.lower().endswith(".ett")
                            ):
                                # read excel file
                                filepath = temppath + "/" + file_name
                                # display filepath
                                st.write(filepath)
                                # display file link
                                st.write(file_link)
                                try:
                                    res = pd.read_excel(filepath, header=None)
                                    # display count
                                    st.write(count)
                                    # display shape
                                    st.write(res.shape)
                                    st.write(res)
                                    if res.empty:
                                        errls.append(file_name)
                                    else:
                                        # update link column
                                        res["link"] = file_link
                                        res["file"] = file_name
                                        resls.append(res)
                                        count += 1
                                except Exception as e:
                                    st.error(e)
                                    st.error("读取excel文件失败")
                                    errls.append(file_name)
                        # if len(resls) > 0:
                        # resdf = pd.concat(resls)
                        # st.write(resdf.shape)
                        # st.write(resdf)
                        st.session_state["pboc_table"] = resls
                        # display error list
                        st.error("读取失败的文件：" + str(errls))
                    else:
                        resls = []
                        # get excel file content
                        filepath = temppath + "/" + file_name
                        filecontent = pd.read_excel(filepath, header=None)
                        # display shape
                        st.write(filecontent.shape)
                        # display file content
                        st.write(filecontent)
                        # update link column
                        filecontent["link"] = file_link
                        filecontent["file"] = file_name
                        resls.append(filecontent)

                        # update session state
                        st.session_state["pboc_table"] = resls
                # if readfilebutton:

                # button to read pdf file content
                readpdfbutton = st.sidebar.button("读取pdf文件")
                if readpdfbutton:
                    if batchmode:
                        resls = []
                        errls = []
                        count = 0
                        for file_idx in file_idx_ls:
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]
                            st.write(file_link)
                            if file_name.lower().endswith(".pdf"):
                                # get pdf file content
                                filepath = temppath + "/" + file_name
                                try:
                                    filecontent = pdf2table(filepath)
                                    # display count
                                    st.write(count)
                                    # display shape
                                    st.write(filecontent.shape)
                                    # display file content
                                    st.write(filecontent)
                                    if filecontent.empty:
                                        errls.append(file_name)
                                    else:
                                        # update link column
                                        filecontent["link"] = file_link
                                        filecontent["file"] = file_name

                                        # append to resls
                                        resls.append(filecontent)
                                        count += 1
                                except Exception as e:
                                    st.error(e)
                                    st.error("读取pdf文件失败")
                                    errls.append(file_name)

                            if pdfmode:
                                filepath = get_convertfname(file_name, temppath, "pdf")
                                st.write(filepath)
                                filecontent = pdf2table(filepath)
                                # display count
                                st.write(count)
                                # display shape
                                st.write(filecontent.shape)
                                # display file content
                                st.write(filecontent)
                                # update link column
                                filecontent["link"] = file_link
                                filecontent["file"] = file_name
                                # append to resls
                                resls.append(filecontent)
                                count += 1
                        # concat resls
                        # if len(resls) > 0:
                        # resdf = pd.concat(resls)
                        # st.write(resdf)
                        # update session state
                        st.session_state["pboc_table"] = resls
                        # display error file list
                        st.error("以下文件读取失败")
                        st.write(errls)

                    elif pdfmode:
                        resls = []
                        # get excel file content
                        filepath = get_convertfname(file_name, temppath, "pdf")
                        st.write(filepath)
                        filecontent = pdf2table(filepath)
                        # display shape
                        st.write(filecontent.shape)
                        # display file content
                        st.write(filecontent)
                        # update link column
                        filecontent["link"] = file_link
                        filecontent["file"] = file_name
                        resls.append(filecontent)
                        # update session state
                        st.session_state["pboc_table"] = resls
                    else:
                        resls = []
                        # get excel file content
                        filepath = temppath + "/" + file_name
                        filecontent = pdf2table(filepath)
                        # display shape
                        st.write(filecontent.shape)
                        # display file content
                        st.write(filecontent)
                        # update link column
                        filecontent["link"] = file_link
                        filecontent["file"] = file_name
                        resls.append(filecontent)
                        # update session state
                        st.session_state["pboc_table"] = resls

                # button to word file content
                readwordbutton = st.sidebar.button("读取word文件")
                if readwordbutton:
                    if batchmode:
                        resls = []
                        errls = []
                        count = 0
                        for file_idx in file_idx_ls:
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]
                            st.write(file_link)
                            if (
                                file_name.lower().endswith(".docx")
                                or file_name.lower().endswith(".doc")
                                or file_name.lower().endswith(".wps")
                                or file_name.lower().endswith(".docm")
                            ):
                                # get pdf file content
                                filepath = get_convertfname(file_name, temppath, "docx")
                                try:
                                    filecontent = word2df(filepath)
                                except Exception as e:
                                    st.write(e)
                                    filecontent = pd.DataFrame()
                                # display count
                                st.write(count)
                                # display shape
                                st.write(filecontent.shape)
                                # display file content
                                st.write(filecontent)
                                # update link column
                                filecontent["link"] = file_link
                                filecontent["file"] = file_name
                                if filecontent.shape[0] > 0:
                                    # append to resls
                                    resls.append(filecontent)
                                    count += 1
                                else:
                                    errls.append(file_name)
                        # concat resls
                        # if len(resls) > 0:
                        # resdf = pd.concat(resls)
                        # st.write(resdf)
                        # update session state
                        st.session_state["pboc_table"] = resls

                        if len(errls) > 0:
                            st.write("以下文件无法读取")
                            st.write(errls)
                    else:
                        resls = []
                        # get excel file content
                        filepath = get_convertfname(file_name, temppath, "docx")
                        st.write(filepath)
                        filecontent = word2df(filepath)
                        # display shape
                        st.write(filecontent.shape)
                        # display file content
                        st.write(filecontent)
                        # update link column
                        filecontent["link"] = file_link
                        filecontent["file"] = file_name
                        resls.append(filecontent)
                        # update session state
                        st.session_state["pboc_table"] = resls

                # button to read pic file content
                readpicbutton = st.sidebar.button("读取图片文件")
                if readpicbutton:
                    if batchmode:
                        resls = []
                        errls = []
                        count = 0
                        for file_idx in file_idx_ls:
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]
                            st.write(file_link)
                            if (
                                file_name.lower().endswith(".png")
                                or file_name.lower().endswith(".jpg")
                                or file_name.lower().endswith(".jpeg")
                                or file_name.lower().endswith(".bmp")
                                or file_name.lower().endswith(".gif")
                                or file_name.lower().endswith(".tif")
                            ):
                                if pdfmode:
                                    # get pdf file path
                                    pdfname = (
                                        file_name.split("/")[-1].split(".")[0] + ".pdf"
                                    )
                                    filepath = temppath + "/" + pdfname
                                    st.write(filepath)
                                    try:
                                        filecontent = pdf2table(filepath)
                                    except Exception as e:
                                        st.write(e)
                                        filecontent = pd.DataFrame()
                                        errls.append(file_name)
                                else:
                                    # get pdf file content
                                    filepath = temppath + "/" + file_name
                                    try:
                                        filecontent = picurl2table(filepath)
                                    except Exception as e:
                                        st.write(e)
                                        filecontent = pd.DataFrame()
                                        errls.append(file_name)
                                # display count
                                st.write(count)
                                # display shape
                                st.write(filecontent.shape)
                                # display file content
                                st.write(filecontent)
                                # update link column
                                filecontent["link"] = file_link
                                filecontent["file"] = file_name
                                # append to resls
                                resls.append(filecontent)
                                count += 1
                        # concat resls
                        # if len(resls) > 0:
                        # resdf = pd.concat(resls)
                        # st.write(resdf)
                        # update session state
                        st.session_state["pboc_table"] = resls
                        if len(errls) > 0:
                            st.write("以下文件无法读取")
                            st.write(errls)

                    elif pdfmode:
                        resls = []
                        # get pdf file path
                        pdfname = file_name.split("/")[-1].split(".")[0] + ".pdf"
                        filepath = temppath + "/" + pdfname
                        st.write(filepath)
                        filecontent = pdf2table(filepath)
                        # display shape
                        st.write(filecontent.shape)
                        # display file content
                        st.write(filecontent)
                        # update link column
                        filecontent["link"] = file_link
                        filecontent["file"] = file_name
                        resls.append(filecontent)
                        # update session state
                        st.session_state["pboc_table"] = resls
                    else:
                        resls = []
                        # get excel file content
                        filepath = temppath + "/" + file_name
                        filecontent = picurl2table(filepath)
                        # display shape
                        st.write(filecontent.shape)
                        # display file content
                        st.write(filecontent)
                        # update link column
                        filecontent["link"] = file_link
                        filecontent["file"] = file_name
                        resls.append(filecontent)
                        # update session state
                        st.session_state["pboc_table"] = resls

                cols = [
                    "序号",
                    "企业名称",
                    "处罚决定书文号",
                    "违法行为类型",
                    "行政处罚内容",
                    "作出行政处罚决定机关名称",
                    "作出行政处罚决定日期",
                    "备注",
                    "link",
                    "file",
                ]
                # choose save column list
                savecols = st.text_area("保存列", value=cols)

                # ger resls from session state
                resls = st.session_state["pboc_table"]
                # generate blank string list by len of resls
                colstr = [
                    (x, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
                    for x in range(len(resls))
                ]
                delstr = st.text_area("字段(序号,留存字段,字段名)", value=colstr)
                dfupd = dfdelcol(resls, delstr, savecols, halfmode)
                st.markdown("## 读取结果")
                # display shape
                st.write(dfupd.shape)
                st.write(dfupd)
                # button to save df
                savebutton = st.sidebar.button("保存")
                if savebutton:
                    # get dfupd
                    # dfupd = st.session_state["pboc_table"]
                    # save dfupd to pboctotable
                    save_pboctable(dfupd, org_name)
                    st.success("保存成功")

                # button for convert
                convert_button = st.sidebar.button("word格式转换")
                if convert_button:
                    docxconvertion(temppath)

                # button for convert docx to pdf
                converttopdf_button = st.sidebar.button("文件转pdf")
                if converttopdf_button:
                    if batchmode:
                        for file_idx in file_idx_ls:
                            file_name = filelist[file_idx]
                            st.write(file_name)
                            filepath = temppath + "/" + file_name
                            docx2pdf(filepath, temppath)
                            st.write("转换成功" + filepath)
                    else:
                        filepath = temppath + "/" + file_name
                        docx2pdf(filepath, temppath)

                # button for convert image to pdf
                convertimg2pdf_button = st.sidebar.button("图片转pdf")
                if convertimg2pdf_button:
                    if batchmode:
                        for file_idx in file_idx_ls:
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]
                            st.write(file_link)
                            if (
                                file_name.lower().endswith(".png")
                                or file_name.lower().endswith(".jpg")
                                or file_name.lower().endswith(".jpeg")
                                or file_name.lower().endswith(".bmp")
                                or file_name.lower().endswith(".gif")
                                or file_name.lower().endswith(".tif")
                            ):
                                try:
                                    filepath = temppath + "/" + file_name
                                    img_to_pdf(filepath, temppath)
                                except Exception as e:
                                    st.write(e)
                                    st.write("转换失败")

                    else:
                        filepath = temppath + "/" + file_name
                        img_to_pdf(filepath, temppath)

        elif option == "内容处理":

            # initialize search result in session state
            if "pboc_updf" not in st.session_state:
                st.session_state["pboc_updf"] = None

            # button to read pboc table
            readpbocbutton = st.sidebar.button("重新读取表格")
            if readpbocbutton:
                # get pboctotable
                df = get_pboctotable(org_name)
                # update session state
                st.session_state["pboc_updf"] = df
            else:
                df = st.session_state["pboc_updf"]

            st.markdown("## 更新表格")
            dfupd = st.data_editor(df)
            # button to update column value
            updatebutton = st.sidebar.button("更新表格")
            if updatebutton:
                # update session state
                st.session_state["pboc_updf"] = dfupd

            st.markdown("### 更新后")
            df = st.session_state["pboc_updf"]
            st.write(df)
            # get column list
            columnls = df.columns.tolist()
            # choose column index
            column = st.sidebar.selectbox("选择删除列", columnls)
            # get column value list
            columnvallist = df[column].unique().tolist()
            # choose column value index
            columnval = st.sidebar.multiselect("选择删除列值", columnvallist)
            # button to delete column value
            deletebutton = st.sidebar.button("删除")
            if deletebutton:
                # exclude column value
                dfupd = df[~df[column].isin(columnval)]
                # display dfupd
                st.markdown("### 删除后")
                st.write(dfupd)
                # update session state
                st.session_state["pboc_updf"] = dfupd

            # update column names by range(filecontent.shape[1] in string
            # filecontent.columns = [str(i) for i in range(filecontent.shape[1])]
            # choose column index
            colname = st.sidebar.selectbox("选择合并列", columnls)
            # merge button
            mergebutton = st.sidebar.button("合并")
            if mergebutton:
                # group by colname,link and merge other columns
                dfupd = mergetable(df, colname)
                # display file content
                st.markdown("### 合并后")
                st.write(dfupd)
                # update session state
                st.session_state["pboc_updf"] = dfupd

            # button to save df
            savebutton = st.sidebar.button("保存")
            if savebutton:
                # get dfupd
                dfupd = st.session_state["pboc_updf"]
                # save dfupd to pboctotable
                save_pbocdetail(dfupd, org_name)
                st.success("保存成功")

    elif choice == "案例下载":
        download_pbocsum()

    elif choice == "案例上线":
        uplink_pbocsum()


if __name__ == "__main__":
    main()
