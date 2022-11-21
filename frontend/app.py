import pandas as pd
import requests
import streamlit as st

# from docx2pdf import convert

temppath = "../data/temp"
# backendurl = "http://backend.docker:8000"
backendurl = "http://localhost:8000"

from dbpboc import (
    display_pbocsum,
    display_summary,
    download_attachment,
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
    update_sumeventdf,
    update_toupd,
)
from doc2text import (
    convert_uploadfiles,
    docx2pdf,
    docxconvertion,
    get_convertfname,
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
        "案例分类",
    ]

    choice = st.sidebar.selectbox("选择", menu)

    if choice == "案例总数":
        st.subheader("案例总数")

        display_summary()

    elif choice == "案例更新":
        st.subheader("案例更新")

        display_pbocsum()

        # choose orgname index
        org_name = st.sidebar.selectbox("机构", cityls)
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
            # for org_name in org_namels:
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

        df = get_pbocdetail("")
        loclist = df["区域"].unique().tolist()
        with st.form(key="my_form"):
            title_text = st.text_input("搜索当事人关键词")
            location_text = st.selectbox("选择地区", loclist)
            submit_button = st.form_submit_button(label="搜索")

        if submit_button:
            st.write("处罚列表")
            sampledf = searchpboc(df, title_text, location_text)
            total = len(sampledf)
            st.sidebar.write("总数:", total)
            # pd.set_option('colwidth',40)

            st.table(sampledf)

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
                    downcol = "file"
                    # get download column list
                    dwndf = lendf[lendf[downcol].notnull()]
                    downloadlink = dwndf["link"].tolist()
                    linkls = dwndf["link"].tolist()
            else:
                downloadlink = []
                linkls = []
            # display download column list
            st.write(downloadlink)
            # get length of toupd
            newsum_len = len(downloadlink)
            # display sumeventdf
            st.success(f"共{newsum_len}条案例待更新")

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
                st.session_state["pboc_table"] = None
            # get filelist
            filedf = get_pboctofile(org_name)
            if filedf.empty:
                st.error("没有附件")
            else:
                # get link list
                linklist = filedf["link"].tolist()
                # get filelist
                filelist = filedf["file"].tolist()
                # display length
                st.info(f"共{len(linklist)}条附件")
                # choose file index
                file_idx = st.selectbox(
                    "附件列表", range(len(filelist)), format_func=lambda x: filelist[x]
                )
                # choose batch mode
                batchmode = st.sidebar.checkbox("批量处理")
                # pdf mode
                pdfmode = st.sidebar.checkbox("PDF模式")
                file_name = filelist[file_idx]
                file_link = linklist[file_idx]
                # button to read excel file content
                readexcelbutton = st.sidebar.button("读取excel文件")
                if readexcelbutton:
                    if batchmode:
                        resls = []
                        for file_idx in range(len(filelist)):
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            # check file extension
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]
                            # ignore filename capitalization
                            if (
                                file_name.lower().endswith(".xls")
                                or file_name.lower().endswith(".xlsx")
                                or file_name.lower().endswith(".et")
                            ):
                                # read excel file
                                filepath = temppath + "/" + file_name
                                res = pd.read_excel(filepath, header=None)
                                # display shape
                                st.write(res.shape)
                                st.write(res)
                                # update link column
                                res["link"] = file_link
                                res["file"] = file_name
                                resls.append(res)
                        if len(resls) > 0:
                            resdf = pd.concat(resls)
                            # st.write(resdf.shape)
                            # st.write(resdf)
                            st.session_state["pboc_table"] = resdf
                    else:
                        # get excel file content
                        filepath = temppath + "/" + file_name
                        filecontent = pd.read_excel(filepath, header=None)
                        # display file content
                        st.write(filecontent)
                        # update link column
                        filecontent["link"] = file_link
                        filecontent["file"] = file_name
                        # update session state
                        st.session_state["pboc_table"] = filecontent
                # if readfilebutton:

                # button to read pdf file content
                readpdfbutton = st.sidebar.button("读取pdf文件")
                if readpdfbutton:
                    if batchmode:
                        resls = []
                        for file_idx in range(len(filelist)):
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]
                            st.write(file_link)
                            # get pdf file content
                            filepath = temppath + "/" + file_name
                            filecontent = pdf2table(filepath)
                            # display shape
                            st.write(filecontent.shape)
                            # display file content
                            st.write(filecontent)
                            # update link column
                            filecontent["link"] = file_link
                            filecontent["file"] = file_name
                            # append to resls
                            resls.append(filecontent)
                        # concat resls
                        if len(resls) > 0:
                            resdf = pd.concat(resls)
                            # st.write(resdf)
                            # update session state
                            st.session_state["pboc_table"] = resdf

                    elif pdfmode:
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
                        # update session state
                        st.session_state["pboc_table"] = filecontent
                    else:
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
                        # update session state
                        st.session_state["pboc_table"] = filecontent

                # button to word pdf file content
                readwordbutton = st.sidebar.button("读取word文件")
                if readwordbutton:
                    if batchmode:
                        resls = []
                        for file_idx in range(len(filelist)):
                            st.write(str(file_idx) + ": " + filelist[file_idx])
                            file_name = filelist[file_idx]
                            file_link = linklist[file_idx]
                            st.write(file_link)
                            if (
                                file_name.lower().endswith(".docx")
                                or file_name.lower().endswith(".doc")
                                or file_name.lower().endswith(".wps")
                            ):
                                # get pdf file content
                                filepath = get_convertfname(file_name, temppath, "docx")
                                filecontent = word2df(filepath)
                                # display shape
                                st.write(filecontent.shape)
                                # display file content
                                st.write(filecontent)
                                # update link column
                                filecontent["link"] = file_link
                                filecontent["file"] = file_name
                                # append to resls
                                resls.append(filecontent)
                        # concat resls
                        if len(resls) > 0:
                            resdf = pd.concat(resls)
                            # st.write(resdf)
                            # update session state
                            st.session_state["pboc_table"] = resdf
                    else:
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
                        # update session state
                        st.session_state["pboc_table"] = filecontent

                cols = [
                    "序号",
                    "企业名称",
                    "处罚决定书文号",
                    "违法行为类型",
                    "行政处罚内容",
                    "作出行政处罚决定机关名称",
                    "作出行政处罚决定日期",
                    "备注",
                ]
                # choose save column list
                savecols = st.multiselect("保存列", cols, default=cols)

                # button to save df
                savebutton = st.sidebar.button("保存")
                if savebutton:
                    # get dfupd
                    dfupd = st.session_state["pboc_table"]
                    st.write(dfupd)
                    # save dfupd to pboctotable
                    save_pboctable(dfupd, savecols, org_name)
                    st.success("保存成功")

                # button for convert
                convert_button = st.sidebar.button("word格式转换")
                if convert_button:
                    docxconvertion(temppath)

                # button for convert docx to pdf
                converttopdf_button = st.sidebar.button("docx转pdf")
                if converttopdf_button:
                    filepath = filepath = temppath + "/" + file_name
                    docx2pdf(filepath, temppath)

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

            st.write(df)
            # get column list
            columnls = df.columns.tolist()
            # choose column index
            column = st.sidebar.selectbox("选择列", columnls)
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


if __name__ == "__main__":
    main()
