import streamlit as st

from dbpboc import (
    get_pbocdetail,
    searchpboc,
    display_summary,
    display_pbocsum,
    get_sumeventdf,
    update_sumeventdf,
    update_toupd,
    get_pboctoupd,
    get_eventdetail,
    download_attachment,
    get_pboctodownload
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
        "案例下载",
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

        # download attachment button
        downloadbutton = st.sidebar.button("下载附件")
        if downloadbutton:
            # for org_name in org_namels:
            # write org_name
            st.markdown("#### 下载附件：" + org_name)
            # get download df
            lendf = get_pboctodownload(org_name)
            if len(lendf) > 0:
                # get download column list
                dwndf=lendf[lendf['download'].notnull()]
    
                downloadlink= dwndf['download'].tolist()
                # get length of toupd
                newsum_len = len(downloadlink)
            else:
                newsum_len = 0
            # display sumeventdf
            st.success(f"共{newsum_len}条案例待更新")
            if newsum_len > 0:
                # get event detail
                eventdetail = download_attachment(lendf, org_name)
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


if __name__ == "__main__":
    main()
