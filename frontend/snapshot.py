import os
import time
from typing import Any

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

SNAPSHOT_JS = """
    var ele = document.querySelector('div[_echarts_instance_]');
    var mychart = echarts.getInstanceByDom(ele);
    return mychart.getDataURL({
        type: '%s',
        pixelRatio: %s,
         excludeComponents: ['toolbox']
    });
"""

SNAPSHOT_SVG_JS = """
   var element = document.querySelector('div[_echarts_instance_] div');
   return element.innerHTML;
"""


def make_snapshot(
    html_path: str,
    file_type: str,
    pixel_ratio: int = 2,
    delay: int = 2,
    browser="Chrome",
    driver: Any = None,
):
    if delay < 0:
        raise Exception("Time travel is not possible")
    if not driver:
        if browser == "Chrome":
            driver = get_chrome_driver()
        elif browser == "Safari":
            driver = get_safari_driver()
        else:
            raise Exception("Unknown browser!")

    if file_type == "svg":
        snapshot_js = SNAPSHOT_SVG_JS
    else:
        snapshot_js = SNAPSHOT_JS % (file_type, pixel_ratio)

    if not html_path.startswith("http"):
        html_path = "file://" + os.path.abspath(html_path)

    driver.get(html_path)
    time.sleep(delay)

    return driver.execute_script(snapshot_js)


def get_chrome_driver(folder):
    options = webdriver.ChromeOptions()
    # options.add_argument("headless")
    # headless
    # options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--verbose")
    options.add_argument("--window-size=1920,1080")
    # Add these additional options
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-print-preview")
    # Disable the "Safe Browsing" feature
    options.add_argument("--safebrowsing-disable-download-protection")
    options.add_argument("--safebrowsing-disable-extension-blacklist")

    mime_types = "application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    # set download path to /tmp
    prefs = {
        "download.default_directory": folder,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": False,
        "safebrowsing.disable_download_protection": True,
        "plugins.always_open_pdf_externally": True,
        "profile.default_content_settings.popups": 0,
        "profile.default_content_setting_values.automatic_downloads": 1,
        "profile.content_settings.exceptions.automatic_downloads.*.setting": 1,
        "profile.default_content_setting_values.popups": 0,
        "profile.default_content_setting_values.notifications": 1,
        "profile.managed_default_content_settings.notifications": 1,
        "browser.helperApps.neverAsk.saveToDisk": mime_types,
        "browser.helperApps.neverAsk.openFile": mime_types,
        "pdfjs.disabled": True,
        # Allow insecure downloads
        "download.allow_insecure": True,
    }

    options.add_experimental_option("prefs", prefs)

    # service = ChromeService(executable_path=ChromeDriverManager(version="117.0.5939").install())
    # service = ChromeService()
    service = ChromeService(executable_path=ChromeDriverManager().install())

    # return webdriver.Chrome(options=options)
    driver = webdriver.Chrome(service=service, options=options)

    # driver.command_executor._commands["send_command"] = ("POST", '/session/$sessionId/chromium/send_command')
    # params = {'cmd':'Page.setDownloadBehavior', 'params': {'behavior': 'allow', 'downloadPath': folder}}
    # command_result = driver.execute("send_command", params)
    # print("response from browser:")
    # for key in command_result:
    #     print("result:" + key + ":" + str(command_result[key]))

    return driver


def get_safari_driver():
    return webdriver.Safari()
