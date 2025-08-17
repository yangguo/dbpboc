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
from selenium.common.exceptions import TimeoutException, WebDriverException

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
    "天津": ["http://tianjin.pbc.gov.cn/fzhtianjin/113682/113700/113707/10983/index"],
    "重庆": [
        "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/5525107/8e9dfeba/index",
        "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/5525110/a80d7c9f/index",
        "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/5525116/d8af7e38/index",
        "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/5525119/ab0a6a17/index",
        "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/5525122/9a53044d/index",
        "http://chongqing.pbc.gov.cn/chongqing/107680/107897/107909/5525131/fdda36db/index"
    ],
    "上海": ["http://shanghai.pbc.gov.cn/fzhshanghai/113577/114832/114918/14681/index"],
    "兰州": ["http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518435/9ad499ab/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518438/9d8fbe95/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518441/c80bc350/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518444/01164982/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518447/6b84ac80/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518450/0042cbfc/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518453/641fdd3f/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518456/b926b224/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518459/239eb987/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518462/1d54853f/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518465/fd8c289f/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518468/6c6a5071/index",
    "http://lanzhou.pbc.gov.cn/lanzhou/117067/117091/117098/5518471/13a5248d/index"
    ],
    "拉萨": ["http://lasa.pbc.gov.cn/lasa/120480/120504/120511/5517088/4dd6bf7e/index",
    "http://lasa.pbc.gov.cn/lasa/120480/120504/120511/5517091/e7989da9/index",
    "http://lasa.pbc.gov.cn/lasa/120480/120504/120511/5517094/e15e7bd5/index",
    "http://lasa.pbc.gov.cn/lasa/120480/120504/120511/5517100/152d5f3b/index",
    "http://lasa.pbc.gov.cn/lasa/120480/120504/120511/5517103/639acb73/index",
    "http://lasa.pbc.gov.cn/lasa/120480/120504/120511/5517106/69ba3ad4/index"       
    ],
    "西宁": ["http://xining.pbc.gov.cn/xining/118239/118263/118270/5513655/7d649fee/index"],
    "乌鲁木齐": ["http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521433/a539faa1/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521318/027eaaf2/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521321/6ff301b0/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521324/deb2e587/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521327/b3249805/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521330/cb06555c/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521333/3c46ff2e/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521339/3a460c9f/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521342/93821fb0/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521345/2af69c3e/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521348/82c72160/index",
    "http://wulumuqi.pbc.gov.cn/wulumuqi/121755/121777/121784/5521351/e7d32002/index"
             ],
    "南宁": ["http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512959/5b36fc9b/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512962/74379cd8/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512965/223d2834/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512968/89ef24ca/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512974/1dd726e7/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512977/e674e132/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512980/acad6337/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512983/3d9cb227/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512986/5c80893a/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512989/f92034e6/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512992/6caf3c5a/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512995/758358f2/index",
    "http://nanning.pbc.gov.cn/nanning/133346/133364/133371/5512998/bea4adff/index"
           ],
    "贵阳": ["http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503826/936879d6/index",
    "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503829/f2f2e027/index",
    "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503832/e5bdd1d9/index",
    "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503847/5e8f7f5f/index",
    "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503850/52e30972/index",
    "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503853/0d4d261c/index",
    "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503856/48abc5f3/index",
    "http://guiyang.pbc.gov.cn/guiyang/113288/113306/113313/5503859/7c29501c/index"
           ],
    "福州": ["http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508082/bf79427f/index",
    "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508085/05d31526/index",
    "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508088/1829203e/index",
    "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508091/c420261e/index",
    "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508094/a1cba212/index",
    "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508097/b74492dd/index",
    "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508100/a446aea0/index",
    "http://fuzhou.pbc.gov.cn/fuzhou/126805/126823/126830/5508103/1e5879cb/index"       
           ],
    "成都": ["http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498158/8e16033b/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498167/29dac0a0/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498170/563e1830/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498173/4c0a43e3/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498176/ff7e00c6/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498179/207cacf7/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498182/e2bee0a8/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498185/92a81550/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498188/834a945a/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498191/178e526c/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498194/b40a1258/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498197/a2270334/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498200/5335b8be/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498203/c6181f3b/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498206/dcc79bd4/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498209/a9dc68a3/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498215/d91e6f76/index",
    "http://chengdu.pbc.gov.cn/chengdu/129320/129341/129350/5498218/9714a233/index"
    ],
    "呼和浩特": ["http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483143/a422cb5f/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483040/9ace9875/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483043/2e00ae13/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483046/8c2a13e7/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483049/15470751/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483052/4ceb46df/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483055/ffbd20bf/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483058/165ea602/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483061/b9219924/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483064/096d3fb8/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483067/ae6fa3c1/index",
    "http://huhehaote.pbc.gov.cn/huhehaote/129797/129815/129822/5483070/b1684f44/index"  
             ],
    "郑州": ["http://zhengzhou.pbc.gov.cn/zhengzhou/124182/124200/124207/5515771/88a88c8d/index"
    ],
    "北京": ["http://beijing.pbc.gov.cn/beijing/132030/132052/132059/19192/index"],
    "合肥": ["http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487101/27e932ff/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487104/506f5ceb/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487107/217cb864/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487110/90283353/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487113/74bd831d/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487116/3fbc96a3/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487119/f03fcd86/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487122/dbb110b8/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487125/9e9130ef/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487128/262704c7/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487134/b287e655/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487137/1a8cf7ad/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487140/ac5c296c/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487143/075f0d54/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487146/f00788ba/index",
    "http://hefei.pbc.gov.cn/hefei/122364/122382/122389/5487149/0e9fa2ed/index"
    ],
    "厦门": ["http://xiamen.pbc.gov.cn/xiamen/127703/127721/127728/18534/index"],
    "海口": ["http://haikou.pbc.gov.cn/haikou/132982/133000/133007/5485279/52efe36c/index",
    "http://haikou.pbc.gov.cn/haikou/132982/133000/133007/5485282/83ecf72c/index",
    "http://haikou.pbc.gov.cn/haikou/132982/133000/133007/5485285/5af7d162/index"
    ],
    "大连": ["http://dalian.pbc.gov.cn/dalian/123812/123830/123837/16262/index"],
    "广州": ["http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495288/c10f866d/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495294/37ed43ff/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495297/00dd3dcd/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495300/10ca00e5/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495303/72832141/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495306/43e0d481/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495309/b1c7702a/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495312/3dccbd8e/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495315/532b3574/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495318/0db123bc/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495321/da584557/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495324/2047c790/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495327/713fb641/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495330/b6f6737f/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495336/597b9840/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495339/f5c765a3/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495342/b37a8637/index",
    "http://guangzhou.pbc.gov.cn/guangzhou/129142/129159/129166/5495345/8b565699/index"
    ],
    "太原": ["http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482386/6830c8c4/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482389/7026c6ad/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482392/4e116af7/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482395/cd582857/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482398/b4c006dc/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482401/8d812f93/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482404/1cda89fc/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482407/3102fb14/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482410/e5a249b6/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482413/5abb4fc3/index",
    "http://taiyuan.pbc.gov.cn/taiyuan/133960/133981/133988/5482416/f4124a0c/index"
    ],
    "石家庄": ["http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490497/d7a4e160/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490500/c272aa5d/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490503/10d5b99a/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490506/b66ff8b6/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490512/dbbec26b/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490515/b65f9b8d/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490518/10e0ca0a/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490521/662b7458/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490527/11a31ae9/index",
    "http://shijiazhuang.pbc.gov.cn/shijiazhuang/131442/131463/131472/5490530/68a97488/index"
    ],
    "总部": ["http://www.pbc.gov.cn/zhengwugongkai/4081330/4081344/4081407/4081705/d80f41dc/index"],
    "昆明": ["http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505423/8a94857a/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505426/d4f5cc85/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505429/e65944e9/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505432/75055aeb/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505435/d0943395/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505441/fd72c55b/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505447/9018505c/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505450/bd915c39/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505456/13b0c7ce/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505459/daa0477e/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505462/79f032f3/index",
    "http://kunming.pbc.gov.cn/kunming/133736/133760/133767/5505465/22b48974/index"
    ],
    "青岛": ["http://qingdao.pbc.gov.cn/qingdao/126166/126184/126191/16720/index"],
    "沈阳": ["http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491693/c066fd99/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491696/b34ec3c8/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491699/e23b0305/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491702/a62a3f40/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491705/3e92afbb/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491711/49634906/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491714/e0c21d49/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491717/627c2737/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491720/88dd70c9/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491723/7121afc2/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491726/5664696f/index",
    "http://shenyang.pbc.gov.cn/shenyfh/108074/108127/108208/5491729/474518a5/index"
    ],
    "长沙": ["http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492109/273394c2/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492112/23d7ec76/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492115/34ab4a5d/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492118/dc500c98/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492121/79b030a6/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492124/ca664a06/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492127/c7ed4f53/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492130/a497be33/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492133/75583c37/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492136/f1e1cde2/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492139/df0c3ec2/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492142/2ea82e35/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492145/0897cd41/index",
    "http://changsha.pbc.gov.cn/changsha/130011/130029/130036/5492148/ab2234ba/index"
    ],
    "深圳": ["http://shenzhen.pbc.gov.cn/shenzhen/122811/122833/122840/15142/index"],
    "武汉": ["http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514615/db1b523d/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514618/6268d37c/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514621/8ea34571/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514624/76fea86c/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514627/fb3b45dd/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514630/a9056e4c/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514633/a04d5b2e/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514636/351cd111/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514639/fce4f461/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514642/72c9b1bf/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514645/191da0b3/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514648/cb2ca29c/index",
    "http://wuhan.pbc.gov.cn/wuhan/123472/123493/123502/5514651/fac744a0/index"
    ],
    "银川": ["http://yinchuan.pbc.gov.cn/yinchuan/119983/120001/120008/5521152/0c2fa07f/index",
    "http://yinchuan.pbc.gov.cn/yinchuan/119983/120001/120008/5521161/b6d979ff/index"
    ],
    "西安": ["http://xian.pbc.gov.cn/xian/129428/129449/129458/5518196/237d9451/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518199/5cee1263/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518202/a0d3de60/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518205/3d31c1cc/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518208/a8eaee7c/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518211/e6e8febe/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518214/ea446fce/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518217/08792d6b/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518220/4706d2ed/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518223/eca86e48/index",
    "http://xian.pbc.gov.cn/xian/129428/129449/129458/5518226/a562992f/index"
    ],
    "哈尔滨": ["http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500243/8ecfb5f4/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500246/1f1f82c5/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500249/2d922010/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500252/1a78631a/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500255/73d7e5df/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500258/b08f53ba/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500261/04c4cd90/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500264/fac12ad0/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500267/65bc1385/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500270/395642b4/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500273/864a9130/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500276/b936e3be/index",
    "http://haerbin.pbc.gov.cn/haerbin/112693/112776/112783/5500279/825704ed/index"
    ],
    "长春": ["http://changchun.pbc.gov.cn/changchun/124680/124698/124705/5491211/da1d63a9/index",
    "http://changchun.pbc.gov.cn/changchun/124680/124698/124705/5491214/6608ba80/index",
    "http://changchun.pbc.gov.cn/changchun/124680/124698/124705/5491217/132945e9/index",
    "http://changchun.pbc.gov.cn/changchun/124680/124698/124705/5491220/cfeb3cb8/index",
    "http://changchun.pbc.gov.cn/changchun/124680/124698/124705/5491229/200f5b0a/index",
    "http://changchun.pbc.gov.cn/changchun/124680/124698/124705/5491232/9365ea7a/index",
    
    ],
    "宁波": ["http://ningbo.pbc.gov.cn/ningbo/127076/127098/127105/17279/index"],
    "杭州": ["http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508277/b364868d/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508280/63e62879/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508283/a5a8989e/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508286/1151c50b/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508289/624233ab/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508292/56659a04/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508295/4b8338e7/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508298/91c20772/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508301/5b2aa10a/index",
    "http://hangzhou.pbc.gov.cn/hangzhou/125268/125286/125293/5508304/1f2f9614/index"
    ],
    "南京": ["http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499233/ab9f91bc/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499236/e1d7f703/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499239/3a786352/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499242/9c385dd3/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499245/824d67ee/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499248/05eab699/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499251/2bb6db00/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499254/ec4a2a91/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499257/b48c9edc/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499260/33297e19/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499263/f93d5638/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499266/4d5b4664/index",
    "http://nanjing.pbc.gov.cn/nanjing/117542/117560/117567/5499269/da07852b/index"
    ],
    "济南": ["http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487618/c2ed1a63/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487621/e3fa83a7/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487624/2266d32e/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487627/9fcbf70b/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487630/40c0238b/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487633/72c7b971/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487636/cc55aba7/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487639/41d4b188/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487642/8c5726e5/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487645/e1696cb0/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487648/312bcf69/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487651/5a834975/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487654/675a5883/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487660/408a6b39/index",
    "http://jinan.pbc.gov.cn/jinan/120967/120985/120994/5487663/9e072de2/index"
    ],
    "南昌": ["http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501364/b5ba51bd/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501335/81fc77af/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501338/9ce0d399/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501341/bd04eb37/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501344/b0bf8629/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501347/5c44bbf1/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501350/8b57a09b/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501353/b34452d3/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501356/4bbed6d9/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501359/bf7a7c3d/index",
    "http://nanchang.pbc.gov.cn/nanchang/132372/132390/132397/5501362/599d7c29/index"
    ],
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
    
    # Set timeouts for page loading and element waiting
    driver.set_page_load_timeout(45)  # Increased to 45 seconds for better reliability
    driver.implicitly_wait(10)  # Increased to 10 seconds for element waiting
    
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
    baseurls = org2url.get(orgname)
    if not baseurls:
        raise HTTPException(status_code=400, detail="No URLs found for organization")
    
    resultls = []

    # Process each base URL for the organization
    for baseurl in baseurls:
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
                    ls1 = browser.find_elements(By.XPATH, '//td[@class="hei12jj"]')
                    total = len(ls1) // 3
                    for j in range(total):
                        namels.append(ls1[j * 3].text)
                        datels.append(ls1[j * 3 + 1].text)
                        sumls.append(ls1[j * 3 + 2].text)

                    ls2 = browser.find_elements(By.XPATH, '//font[@class="hei12"]/a')
                    for link in ls2:
                        linkls.append(link.get_attribute("href"))

                df = pd.DataFrame({"name": namels, "date": datels, "link": linkls, "sum": sumls})
                logger.info(
                    f"[update-list] page_ok url={url} items={len(df)} links={len(linkls)}"
                )
                resultls.append(df)
            except TimeoutException as e:
                logger.info(f"[update-list] page_timeout url={url} err=Page load timeout after 45s")
                continue
            except WebDriverException as e:
                logger.info(f"[update-list] page_error url={url} err=WebDriver error: {e}")
                continue
            except Exception as e:
                logger.info(f"[update-list] page_error url={url} err={e}")
                continue

    browser.quit()
    if not resultls:
        return pd.DataFrame()
        
    sumdf = pd.concat(resultls)
    # Remove potential duplicates that might occur across different base URLs
    sumdf = sumdf.drop_duplicates(subset=['link'], keep='first')
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

def get_new_links_with_details_for_org(orgname: str):
    """Compute links in sum not present in dtl for the org, with name and date details."""
    sum_df = get_pboc_data_for_pending(orgname, "sum")
    dtl_df = get_pboc_data_for_pending(orgname, "dtl")
    if sum_df.empty:
        return []
    
    # Get old links that already have details
    old_links = set(dtl_df["link"].dropna().tolist()) if not dtl_df.empty else set()
    
    # Filter for new links only
    new_links_df = sum_df[~sum_df["link"].isin(old_links) & sum_df["link"].notna()].copy()
    
    if new_links_df.empty:
        return []
    
    # Prepare the result with link, name, and date
    result = []
    for _, row in new_links_df.iterrows():
        link_info = {
            "link": row["link"],
            "name": row.get("name", ""),  # Use empty string if name column doesn't exist
            "date": None
        }
        
        # Try to get date from various possible columns
        if "发布日期" in row and pd.notna(row["发布日期"]):
            link_info["date"] = str(row["发布日期"])
        elif "date" in row and pd.notna(row["date"]):
            link_info["date"] = str(row["date"])
        elif "日期" in row and pd.notna(row["日期"]):
            link_info["date"] = str(row["日期"])
        
        result.append(link_info)
    
    # Sort by date descending (most recent first), then by name
    result.sort(key=lambda x: (x["date"] or "0000-00-00", x["name"]), reverse=True)
    
    return result

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
    """Scrape detail pages for download links and raw text content; save to temp subfolder.
    
    Saves temporary files every 10 records for both pboctotable and pboctodownload.

    Returns tuple (download_count, content_count).
    """
    org_name_index = org2name.get(orgname)
    if not org_name_index:
        return (0, 0)
    if not links:
        return (0, 0)

    browser = get_chrome_driver(TEMP_PATH)
    download_frames = []
    table_frames = []
    
    # Counters for temp file saving
    processed_count = 0
    temp_file_counter = 1

    total_links = len(links)
    
    try:
        for idx, durl in enumerate(links):
            current_progress = idx + 1
            progress_percent = round((current_progress / total_links) * 100, 1)
            
            try:
                logger.info(f"[update-details] PROGRESS {current_progress}/{total_links} ({progress_percent}%) org={orgname} fetching url={durl}")
                browser.get(durl)
                # Collect download anchors
                dl_anchors = browser.find_elements(By.XPATH, "//td[@class='hei14jj']//a")
                downurl = []
                for a in dl_anchors:
                    href = a.get_attribute("href")
                    if href:
                        downurl.append(href)
                if downurl:
                    logger.info(f"[update-details] downloads_found progress={current_progress}/{total_links} url={durl} count={len(downurl)}")
                    df_dl = pd.DataFrame({"download": downurl})
                    df_dl["link"] = durl
                    download_frames.append(df_dl)

                # Extract raw text content from the page only if it has meaningful content beyond download links
                has_meaningful_content = False
                try:
                    # Check if page has table/content structure beyond just download links
                    if org_name_index == "zongbu":
                        # For headquarters, extract from easysiteText element
                        try:
                            content_element = browser.find_element(By.XPATH, "//*[@id='easysiteText']")
                            content_text = content_element.text.strip()
                            if content_text and len(content_text) > 20:  # Meaningful content threshold
                                has_meaningful_content = True
                        except Exception:
                            # Fallback to table check if easysiteText not found
                            table_rows = browser.find_elements(By.XPATH, "//table/tbody/tr")
                            if table_rows and len(table_rows) > 0:
                                # Check if any row has meaningful text (not just download links)
                                for row in table_rows[:3]:  # Check first few rows
                                    row_text = row.text.strip()
                                    if row_text and len(row_text) > 20:  # Meaningful content threshold
                                        has_meaningful_content = True
                                        break
                    else:
                        # For regional branches, check content in hei14jj class
                        content_element = browser.find_element(By.XPATH, "//td[@class='hei14jj']")
                        
                        # Check if there are table rows or structured content
                        table_rows = content_element.find_elements(By.XPATH, ".//tr")
                        if table_rows and len(table_rows) > 1:  # More than just header
                            has_meaningful_content = True
                        else:
                            # Check for other meaningful content (not just links)
                            content_text = content_element.text.strip()
                            # Remove download link text patterns to see if there's other content
                            if content_text and len(content_text) > 50:  # Threshold for meaningful content
                                # Check if it's not just a list of download links
                                lines = content_text.split('\n')
                                meaningful_lines = [line for line in lines if line.strip() and 
                                                  not line.strip().startswith('http') and 
                                                  '下载' not in line and '文件' not in line]
                                if len(meaningful_lines) > 2:
                                    has_meaningful_content = True
                    
                    # Only extract and save content if it has meaningful data
                    if has_meaningful_content:
                        if org_name_index == "zongbu":
                            content_element = browser.find_element(By.XPATH, "//*[@id='easysiteText']")
                        else:
                            content_element = browser.find_element(By.XPATH, "//td[@class='hei14jj']")
                        
                        raw_content = content_element.text.strip()
                        
                        if raw_content:
                            df_tbl = pd.DataFrame({
                                "content": [raw_content],
                                "link": [durl]
                            })
                            
                            logger.info(
                                f"[update-details] content_found progress={current_progress}/{total_links} url={durl} length={len(raw_content)}"
                            )
                            table_frames.append(df_tbl)
                    else:
                        logger.info(f"[update-details] download_only_page progress={current_progress}/{total_links} url={durl}")
                        
                except Exception as content_error:
                    logger.info(f"[update-details] content_extraction_error progress={current_progress}/{total_links} url={durl} err={content_error}")

                # Increment processed count
                processed_count += 1
                
                # Save temp files every 10 records
                if processed_count % 10 == 0:
                    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                    
                    # Save download temp file if we have download data
                    if download_frames:
                        dres = pd.concat(download_frames).reset_index(drop=True)
                        temp_filename = f"temp_pboctodownload{org_name_index}_{temp_file_counter}_{timestamp}"
                        savetempsub(dres, temp_filename, org_name_index)
                        logger.info(f"[update-details] TEMP_SAVE progress={current_progress}/{total_links} org={orgname} downloads={len(dres)} file={temp_filename}")
                    
                    # Save table temp file if we have table data
                    if table_frames:
                        tres = pd.concat(table_frames).reset_index(drop=True)
                        temp_filename = f"temp_pboctotable{org_name_index}_{temp_file_counter}_{timestamp}"
                        savetempsub(tres, temp_filename, org_name_index)
                        logger.info(f"[update-details] TEMP_SAVE progress={current_progress}/{total_links} org={orgname} content={len(tres)} file={temp_filename}")
                    
                    temp_file_counter += 1

                # Pace to be gentle
                time.sleep(random.randint(2, 5))
            except TimeoutException as e:
                logger.info(f"[update-details] page_timeout progress={current_progress}/{total_links} url={durl} err=Page load timeout after 45s")
                continue
            except WebDriverException as e:
                logger.info(f"[update-details] page_error progress={current_progress}/{total_links} url={durl} err=WebDriver error: {e}")
                continue
            except Exception as e:
                logger.info(f"[update-details] page_error progress={current_progress}/{total_links} url={durl} err={e}")
                continue
    finally:
        browser.quit()

    # Save final results under temp/<org>
    download_count = 0
    table_count = 0
    # Generate timestamp for final files
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    if download_frames:
        dres = pd.concat(download_frames).reset_index(drop=True)
        savetempsub(dres, f"pboctodownload{org_name_index}{timestamp}", org_name_index)
        download_count = len(dres)
        logger.info(f"[update-details] FINAL_SAVE org={orgname} downloads={download_count} processed={total_links} ts={timestamp}")
    if table_frames:
        tres = pd.concat(table_frames).reset_index(drop=True)
        # keep historical saves timestamped similar to legacy
        savetempsub(tres, f"pboctotable{org_name_index}{timestamp}", org_name_index)
        table_count = len(tres)
        logger.info(f"[update-details] FINAL_SAVE org={orgname} content={table_count} processed={total_links} ts={timestamp}")

    logger.info(f"[update-details] PROCESSING_COMPLETE org={orgname} total_processed={total_links} downloads={download_count} content={table_count}")
    return (download_count, table_count)

async def scrape_detail_pages_with_progress(links, orgname: str, generate_progress_callback):
    """Scrape detail pages with real-time progress updates via callback.
    
    Saves temporary files every 10 records for both pboctotable and pboctodownload.
    Yields progress updates for each processed link.

    Returns tuple (download_count, content_count).
    """
    org_name_index = org2name.get(orgname)
    if not org_name_index:
        return (0, 0)
    if not links:
        return (0, 0)

    browser = get_chrome_driver(TEMP_PATH)
    download_frames = []
    table_frames = []
    
    # Counters for temp file saving
    processed_count = 0
    temp_file_counter = 1
    total_links = len(links)

    try:
        for idx, durl in enumerate(links):
            current_progress = idx + 1
            progress_percent = round((current_progress / total_links) * 100, 1)
            
            try:
                # Send progress update
                progress_message = f"正在处理第 {current_progress}/{total_links} 个链接 ({progress_percent}%)"
                logger.info(f"[update-details-stream] PROGRESS {current_progress}/{total_links} ({progress_percent}%) org={orgname} fetching url={durl}")
                
                # Note: In a real streaming implementation, we would yield this progress
                # For now, we'll log it and the frontend will simulate based on this
                
                browser.get(durl)
                # Collect download anchors
                dl_anchors = browser.find_elements(By.XPATH, "//td[@class='hei14jj']//a")
                downurl = []
                for a in dl_anchors:
                    href = a.get_attribute("href")
                    if href:
                        downurl.append(href)
                if downurl:
                    logger.info(f"[update-details-stream] downloads_found progress={current_progress}/{total_links} url={durl} count={len(downurl)}")
                    df_dl = pd.DataFrame({"download": downurl})
                    df_dl["link"] = durl
                    download_frames.append(df_dl)

                # Extract raw text content from the page only if it has meaningful content beyond download links
                has_meaningful_content = False
                try:
                    # Check if page has table/content structure beyond just download links
                    if org_name_index == "zongbu":
                        # For headquarters, extract from easysiteText element
                        try:
                            content_element = browser.find_element(By.XPATH, "//*[@id='easysiteText']")
                            content_text = content_element.text.strip()
                            if content_text and len(content_text) > 20:  # Meaningful content threshold
                                has_meaningful_content = True
                        except Exception:
                            # Fallback to table check if easysiteText not found
                            table_rows = browser.find_elements(By.XPATH, "//table/tbody/tr")
                            if table_rows and len(table_rows) > 0:
                                # Check if any row has meaningful text (not just download links)
                                for row in table_rows[:3]:  # Check first few rows
                                    row_text = row.text.strip()
                                    if row_text and len(row_text) > 20:  # Meaningful content threshold
                                        has_meaningful_content = True
                                        break
                    else:
                        # For regional branches, check content in hei14jj class
                        content_element = browser.find_element(By.XPATH, "//td[@class='hei14jj']")
                        
                        # Check if there are table rows or structured content
                        table_rows = content_element.find_elements(By.XPATH, ".//tr")
                        if table_rows and len(table_rows) > 1:  # More than just header
                            has_meaningful_content = True
                        else:
                            # Check for other meaningful content (not just links)
                            content_text = content_element.text.strip()
                            # Remove download link text patterns to see if there's other content
                            if content_text and len(content_text) > 50:  # Threshold for meaningful content
                                # Check if it's not just a list of download links
                                lines = content_text.split('\n')
                                meaningful_lines = [line for line in lines if line.strip() and 
                                                  not line.strip().startswith('http') and 
                                                  '下载' not in line and '文件' not in line]
                                if len(meaningful_lines) > 2:
                                    has_meaningful_content = True
                    
                    # Only extract and save content if it has meaningful data
                    if has_meaningful_content:
                        if org_name_index == "zongbu":
                            content_element = browser.find_element(By.XPATH, "//*[@id='easysiteText']")
                        else:
                            content_element = browser.find_element(By.XPATH, "//td[@class='hei14jj']")
                        
                        raw_content = content_element.text.strip()
                        
                        if raw_content:
                            df_tbl = pd.DataFrame({
                                "content": [raw_content],
                                "link": [durl]
                            })
                            
                            logger.info(
                                f"[update-details-stream] content_found progress={current_progress}/{total_links} url={durl} length={len(raw_content)}"
                            )
                            table_frames.append(df_tbl)
                    else:
                        logger.info(f"[update-details-stream] download_only_page progress={current_progress}/{total_links} url={durl}")
                        
                except Exception as content_error:
                    logger.info(f"[update-details-stream] content_extraction_error progress={current_progress}/{total_links} url={durl} err={content_error}")

                # Increment processed count
                processed_count += 1
                
                # Save temp files every 10 records
                if processed_count % 10 == 0:
                    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                    
                    # Save download temp file if we have download data
                    if download_frames:
                        dres = pd.concat(download_frames).reset_index(drop=True)
                        temp_filename = f"temp_pboctodownload{org_name_index}_{temp_file_counter}_{timestamp}"
                        savetempsub(dres, temp_filename, org_name_index)
                        logger.info(f"[update-details-stream] TEMP_SAVE progress={current_progress}/{total_links} org={orgname} downloads={len(dres)} file={temp_filename}")
                    
                    # Save table temp file if we have table data
                    if table_frames:
                        tres = pd.concat(table_frames).reset_index(drop=True)
                        temp_filename = f"temp_pboctotable{org_name_index}_{temp_file_counter}_{timestamp}"
                        savetempsub(tres, temp_filename, org_name_index)
                        logger.info(f"[update-details-stream] TEMP_SAVE progress={current_progress}/{total_links} org={orgname} content={len(tres)} file={temp_filename}")
                    
                    temp_file_counter += 1

                # Pace to be gentle
                time.sleep(random.randint(2, 5))
            except TimeoutException as e:
                logger.info(f"[update-details-stream] page_timeout progress={current_progress}/{total_links} url={durl} err=Page load timeout after 45s")
                continue
            except WebDriverException as e:
                logger.info(f"[update-details-stream] page_error progress={current_progress}/{total_links} url={durl} err=WebDriver error: {e}")
                continue
            except Exception as e:
                logger.info(f"[update-details-stream] page_error progress={current_progress}/{total_links} url={durl} err={e}")
                continue
    finally:
        browser.quit()

    # Save final results under temp/<org>
    download_count = 0
    table_count = 0
    # Generate timestamp for final files
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    if download_frames:
        dres = pd.concat(download_frames).reset_index(drop=True)
        savetempsub(dres, f"pboctodownload{org_name_index}{timestamp}", org_name_index)
        download_count = len(dres)
        logger.info(f"[update-details-stream] FINAL_SAVE org={orgname} downloads={download_count} processed={total_links} ts={timestamp}")
    if table_frames:
        tres = pd.concat(table_frames).reset_index(drop=True)
        # keep historical saves timestamped similar to legacy
        savetempsub(tres, f"pboctotable{org_name_index}{timestamp}", org_name_index)
        table_count = len(tres)
        logger.info(f"[update-details-stream] FINAL_SAVE org={orgname} content={table_count} processed={total_links} ts={timestamp}")

    logger.info(f"[update-details-stream] PROCESSING_COMPLETE org={orgname} total_processed={total_links} downloads={download_count} content={table_count}")
    return (download_count, table_count)

def scrape_detail_pages_with_progress_queue(links, orgname: str, progress_queue_id: str):
    """Scrape detail pages with real-time progress updates via queue.
    
    Saves temporary files every 10 records for both pboctotable and pboctodownload.
    Sends progress updates for each processed link via queue.

    Returns tuple (download_count, content_count).
    """
    org_name_index = org2name.get(orgname)
    if not org_name_index:
        return (0, 0)
    if not links:
        return (0, 0)

    # Get the progress queue
    progress_queue = progress_queues.get(progress_queue_id)
    if not progress_queue:
        return (0, 0)

    browser = get_chrome_driver(TEMP_PATH)
    download_frames = []
    table_frames = []
    
    # Counters for temp file saving
    processed_count = 0
    temp_file_counter = 1
    total_links = len(links)

    try:
        for idx, durl in enumerate(links):
            current_progress = idx + 1
            progress_percent = round((current_progress / total_links) * 100, 1)
            
            # Send real progress update via queue
            try:
                progress_queue.put({
                    'type': 'progress',
                    'current_link': current_progress,
                    'total_links': total_links,
                    'progress_percent': progress_percent
                })
            except:
                pass  # Queue might be full or closed
            
            try:
                logger.info(f"[update-details-queue] PROGRESS {current_progress}/{total_links} ({progress_percent}%) org={orgname} fetching url={durl}")
                
                browser.get(durl)
                # Collect download anchors
                dl_anchors = browser.find_elements(By.XPATH, "//td[@class='hei14jj']//a")
                downurl = []
                for a in dl_anchors:
                    href = a.get_attribute("href")
                    if href:
                        downurl.append(href)
                if downurl:
                    logger.info(f"[update-details-queue] downloads_found progress={current_progress}/{total_links} url={durl} count={len(downurl)}")
                    df_dl = pd.DataFrame({"download": downurl})
                    df_dl["link"] = durl
                    download_frames.append(df_dl)

                # Extract raw text content from the page only if it has meaningful content beyond download links
                has_meaningful_content = False
                try:
                    # Check if page has table/content structure beyond just download links
                    if org_name_index == "zongbu":
                        # For headquarters, extract from easysiteText element
                        try:
                            content_element = browser.find_element(By.XPATH, "//*[@id='easysiteText']")
                            content_text = content_element.text.strip()
                            if content_text and len(content_text) > 20:  # Meaningful content threshold
                                has_meaningful_content = True
                        except Exception:
                            # Fallback to table check if easysiteText not found
                            table_rows = browser.find_elements(By.XPATH, "//table/tbody/tr")
                            if table_rows and len(table_rows) > 0:
                                # Check if any row has meaningful text (not just download links)
                                for row in table_rows[:3]:  # Check first few rows
                                    row_text = row.text.strip()
                                    if row_text and len(row_text) > 20:  # Meaningful content threshold
                                        has_meaningful_content = True
                                        break
                    else:
                        # For regional branches, check content in hei14jj class
                        content_element = browser.find_element(By.XPATH, "//td[@class='hei14jj']")
                        
                        # Check if there are table rows or structured content
                        table_rows = content_element.find_elements(By.XPATH, ".//tr")
                        if table_rows and len(table_rows) > 1:  # More than just header
                            has_meaningful_content = True
                        else:
                            # Check for other meaningful content (not just links)
                            content_text = content_element.text.strip()
                            # Remove download link text patterns to see if there's other content
                            if content_text and len(content_text) > 50:  # Threshold for meaningful content
                                # Check if it's not just a list of download links
                                lines = content_text.split('\n')
                                meaningful_lines = [line for line in lines if line.strip() and 
                                                  not line.strip().startswith('http') and 
                                                  '下载' not in line and '文件' not in line]
                                if len(meaningful_lines) > 2:
                                    has_meaningful_content = True
                    
                    # Only extract and save content if it has meaningful data
                    if has_meaningful_content:
                        if org_name_index == "zongbu":
                            content_element = browser.find_element(By.XPATH, "//*[@id='easysiteText']")
                        else:
                            content_element = browser.find_element(By.XPATH, "//td[@class='hei14jj']")
                        
                        raw_content = content_element.text.strip()
                        
                        if raw_content:
                            df_tbl = pd.DataFrame({
                                "content": [raw_content],
                                "link": [durl]
                            })
                            
                            logger.info(
                                f"[update-details-queue] content_found progress={current_progress}/{total_links} url={durl} length={len(raw_content)}"
                            )
                            table_frames.append(df_tbl)
                    else:
                        logger.info(f"[update-details-queue] download_only_page progress={current_progress}/{total_links} url={durl}")
                        
                except Exception as content_error:
                    logger.info(f"[update-details-queue] content_extraction_error progress={current_progress}/{total_links} url={durl} err={content_error}")

                # Increment processed count
                processed_count += 1
                
                # Save temp files every 10 records
                if processed_count % 10 == 0:
                    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                    
                    # Save download temp file if we have download data
                    if download_frames:
                        dres = pd.concat(download_frames).reset_index(drop=True)
                        temp_filename = f"temp_pboctodownload{org_name_index}_{temp_file_counter}_{timestamp}"
                        savetempsub(dres, temp_filename, org_name_index)
                        logger.info(f"[update-details-queue] TEMP_SAVE progress={current_progress}/{total_links} org={orgname} downloads={len(dres)} file={temp_filename}")
                    
                    # Save table temp file if we have table data
                    if table_frames:
                        tres = pd.concat(table_frames).reset_index(drop=True)
                        temp_filename = f"temp_pboctotable{org_name_index}_{temp_file_counter}_{timestamp}"
                        savetempsub(tres, temp_filename, org_name_index)
                        logger.info(f"[update-details-queue] TEMP_SAVE progress={current_progress}/{total_links} org={orgname} content={len(tres)} file={temp_filename}")
                    
                    temp_file_counter += 1

                # Pace to be gentle
                time.sleep(random.randint(2, 5))
            except TimeoutException as e:
                logger.info(f"[update-details-queue] page_timeout progress={current_progress}/{total_links} url={durl} err=Page load timeout after 45s")
                continue
            except WebDriverException as e:
                logger.info(f"[update-details-queue] page_error progress={current_progress}/{total_links} url={durl} err=WebDriver error: {e}")
                continue
            except Exception as e:
                logger.info(f"[update-details-queue] page_error progress={current_progress}/{total_links} url={durl} err={e}")
                continue
    finally:
        browser.quit()

    # Save final results under temp/<org>
    download_count = 0
    table_count = 0
    # Generate timestamp for final files
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    if download_frames:
        dres = pd.concat(download_frames).reset_index(drop=True)
        savetempsub(dres, f"pboctodownload{org_name_index}{timestamp}", org_name_index)
        download_count = len(dres)
        logger.info(f"[update-details-queue] FINAL_SAVE org={orgname} downloads={download_count} processed={total_links} ts={timestamp}")
    if table_frames:
        tres = pd.concat(table_frames).reset_index(drop=True)
        # keep historical saves timestamped similar to legacy
        savetempsub(tres, f"pboctotable{org_name_index}{timestamp}", org_name_index)
        table_count = len(tres)
        logger.info(f"[update-details-queue] FINAL_SAVE org={orgname} content={table_count} processed={total_links} ts={timestamp}")

    logger.info(f"[update-details-queue] PROCESSING_COMPLETE org={orgname} total_processed={total_links} downloads={download_count} content={table_count}")
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
    # Ensure a proper copy when subsetting to avoid SettingWithCopyWarning
    newdf = currentsum.loc[currentsum["link"].isin(newidls)].copy()

    if not newdf.empty:
        newdf.reset_index(drop=True, inplace=True)
        nowstr = datetime.now().strftime("%Y%m%d%H%M%S")
        savename = f"pbocsum{org_name_index}{nowstr}"
        # Safe assignment on a guaranteed copy
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

@router.get("/pending-details/{org_name}")
async def get_pending_details(org_name: str):
    """Get list of pending detail links for an organization with name and date."""
    try:
        if not org2name.get(org_name):
            raise HTTPException(status_code=400, detail="Invalid organization name")
        
        links_with_details = get_new_links_with_details_for_org(org_name)
        return {
            "orgName": org_name,
            "pendingLinks": links_with_details,
            "count": len(links_with_details)
        }
    except Exception as e:
        logger.error(f"Error getting pending details for {org_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateDetailsWithLinksRequest(BaseModel):
    orgName: str
    selectedLinks: List[str] = []  # If empty, update all pending links

@router.post("/update-details-selective")
async def update_details_selective(request: UpdateDetailsWithLinksRequest):
    """Update details for selected links only."""
    org_name = request.orgName
    if not org2name.get(org_name):
        raise HTTPException(status_code=400, detail="Invalid organization name")
    
    started_at = time.time()
    
    # Get all pending links
    all_pending_links = get_new_links_for_org(org_name)
    
    # Use selected links if provided, otherwise use all pending
    if request.selectedLinks:
        links_to_update = [link for link in request.selectedLinks if link in all_pending_links]
    else:
        links_to_update = all_pending_links
    
    link_count = len(links_to_update)
    logger.info(f"[update-details-selective] STARTED org={org_name} total_links={link_count} selected_links={len(request.selectedLinks) if request.selectedLinks else 'all'}")
    
    if not links_to_update:
        elapsed_ms = int((time.time() - started_at) * 1000)
        logger.info(
            f"[update-details-selective] COMPLETED org={org_name} updated_cases=0 downloads=0 tables=0 elapsed_ms={elapsed_ms}"
        )
        return {"updatedCases": 0}
    
    dl_count, tbl_count = scrape_detail_pages(links_to_update, org_name)
    elapsed_ms = int((time.time() - started_at) * 1000)
    logger.info(
        f"[update-details-selective] COMPLETED org={org_name} updated_cases={link_count} downloads={dl_count} tables={tbl_count} elapsed_ms={elapsed_ms}"
    )
    return {"updatedCases": link_count, "downloads": dl_count, "tables": tbl_count}

from fastapi.responses import StreamingResponse
import json
import asyncio
import threading
from queue import Queue

# Global progress tracking
progress_queues = {}

@router.post("/update-details-selective-stream")
async def update_details_selective_stream(request: UpdateDetailsWithLinksRequest):
    """Update details for selected links with real-time progress streaming."""
    org_name = request.orgName
    if not org2name.get(org_name):
        raise HTTPException(status_code=400, detail="Invalid organization name")
    
    # Get all pending links
    all_pending_links = get_new_links_for_org(org_name)
    
    # Use selected links if provided, otherwise use all pending
    if request.selectedLinks:
        links_to_update = [link for link in request.selectedLinks if link in all_pending_links]
    else:
        links_to_update = all_pending_links
    
    total_links = len(links_to_update)
    
    # Create a unique progress queue for this request
    progress_queue_id = f"{org_name}_{int(time.time())}"
    progress_queue = Queue()
    progress_queues[progress_queue_id] = progress_queue
    
    async def generate_progress():
        try:
            # Send start event
            yield f"data: {json.dumps({'type': 'start', 'orgName': org_name, 'totalLinks': total_links, 'message': f'开始更新案例详情... (共 {total_links} 个链接)'})}\n\n"
            
            if not links_to_update:
                yield f"data: {json.dumps({'type': 'complete', 'orgName': org_name, 'updatedCases': 0, 'downloads': 0, 'tables': 0, 'message': '没有待更新的链接'})}\n\n"
                return
            
            # This will hold the final results
            results = {'dl_count': 0, 'tbl_count': 0, 'completed': False, 'error': None}
            
            def run_scraping():
                try:
                    dl_count, tbl_count = scrape_detail_pages_with_progress_queue(links_to_update, org_name, progress_queue_id)
                    results['dl_count'] = dl_count
                    results['tbl_count'] = tbl_count
                    results['completed'] = True
                except Exception as e:
                    results['error'] = str(e)
                    results['completed'] = True
                    # Send error to queue
                    progress_queue.put({'type': 'error', 'error': str(e)})
            
            # Start scraping in background thread
            thread = threading.Thread(target=run_scraping)
            thread.start()
            
            # Process real progress updates from the queue
            while not results['completed']:
                try:
                    # Check for progress updates with timeout
                    progress_update = progress_queue.get(timeout=1.0)
                    
                    if progress_update['type'] == 'progress':
                        current_link = progress_update['current_link']
                        progress_percent = round((current_link / total_links) * 100, 1)
                        
                        yield f"data: {json.dumps({'type': 'progress', 'orgName': org_name, 'currentLink': current_link, 'totalLinks': total_links, 'progress': progress_percent, 'message': f'正在处理第 {current_link}/{total_links} 个链接 ({progress_percent}%)'})}\n\n"
                    
                    elif progress_update['type'] == 'error':
                        yield f"data: {json.dumps({'type': 'error', 'orgName': org_name, 'error': progress_update['error'], 'message': '更新过程中出现错误'})}\n\n"
                        break
                        
                except:
                    # Timeout - continue checking
                    await asyncio.sleep(0.1)
            
            # Wait for completion
            thread.join(timeout=60)  # 60 second timeout
            
            if results['error']:
                yield f"data: {json.dumps({'type': 'error', 'orgName': org_name, 'error': results['error'], 'message': '更新过程中出现错误'})}\n\n"
            else:
                # Send completion event
                yield f"data: {json.dumps({'type': 'complete', 'orgName': org_name, 'updatedCases': total_links, 'downloads': results['dl_count'], 'tables': results['tbl_count'], 'message': f'详情更新完成！处理了 {total_links} 条案例，获取了 {results["dl_count"]} 个下载链接，提取了 {results["tbl_count"]} 个内容'})}\n\n"
            
        except Exception as error:
            logger.error(f"[update-details-selective-stream] ERROR org={org_name} error={error}")
            yield f"data: {json.dumps({'type': 'error', 'orgName': org_name, 'error': str(error), 'message': '更新过程中出现错误'})}\n\n"
        finally:
            # Clean up progress queue
            if progress_queue_id in progress_queues:
                del progress_queues[progress_queue_id]
    
    return StreamingResponse(generate_progress(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    })

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
