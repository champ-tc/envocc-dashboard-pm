#!/usr/bin/env python
# coding: utf-8

# In[3]:


# -*- coding: utf-8 -*-

import os
import re
import time
import hashlib
import subprocess
import sys
from pathlib import Path

import pandas as pd
import logging

# ==============================================================================
# LOGGING CONFIG
# ==============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


# ==============================================================================
# AUTO INSTALL
# ==============================================================================
required_packages = {
    "selenium",
    "webdriver-manager",
    "pandas",
    "lxml",
    "html5lib",
    "openpyxl",
}

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.common.action_chains import ActionChains
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import (
        TimeoutException,
        StaleElementReferenceException,
        ElementClickInterceptedException,
        NoSuchElementException,
        WebDriverException,
    )
    from webdriver_manager.chrome import ChromeDriverManager
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", *sorted(required_packages)])
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.common.action_chains import ActionChains
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import (
        TimeoutException,
        StaleElementReferenceException,
        ElementClickInterceptedException,
        NoSuchElementException,
        WebDriverException,
    )
    from webdriver_manager.chrome import ChromeDriverManager

# ==============================================================================
# CONFIG
# ==============================================================================
URL = "https://hdc.moph.go.th/center/public/standard-report-detail/NL9idjvwQKjv6R6Maiw9"
HEADLESS = True


START_YEAR_THAI = 2569
END_YEAR_THAI = 2569

PROVINCE_ID_MAPPING = {
    "กรุงเทพมหานคร": "10",
    "สมุทรปราการ": "11",
    "นนทบุรี": "12",
    "ปทุมธานี": "13",
    "พระนครศรีอยุธยา": "14",
    "อ่างทอง": "15",
    "ลพบุรี": "16",
    "สิงห์บุรี": "17",
    "ชัยนาท": "18",
    "สระบุรี": "19",
    "ชลบุรี": "20",
    "ระยอง": "21",
    "จันทบุรี": "22",
    "ตราด": "23",
    "ฉะเชิงเทรา": "24",
    "ปราจีนบุรี": "25",
    "นครนายก": "26",
    "สระแก้ว": "27",
    "นครราชสีมา": "30",
    "บุรีรัมย์": "31",
    "สุรินทร์": "32",
    "ศรีสะเกษ": "33",
    "อุบลราชธานี": "34",
    "ยโสธร": "35",
    "ชัยภูมิ": "36",
    "อำนาจเจริญ": "37",
    "บึงกาฬ": "38",
    "หนองบัวลำภู": "39",
    "ขอนแก่น": "40",
    "อุดรธานี": "41",
    "เลย": "42",
    "หนองคาย": "43",
    "มหาสารคาม": "44",
    "ร้อยเอ็ด": "45",
    "กาฬสินธุ์": "46",
    "สกลนคร": "47",
    "นครพนม": "48",
    "มุกดาหาร": "49",
    "เชียงใหม่": "50",
    "ลำพูน": "51",
    "ลำปาง": "52",
    "อุตรดิตถ์": "53",
    "แพร่": "54",
    "น่าน": "55",
    "พะเยา": "56",
    "เชียงราย": "57",
    "แม่ฮ่องสอน": "58",
    "นครสวรรค์": "60",
    "อุทัยธานี": "61",
    "กำแพงเพชร": "62",
    "ตาก": "63",
    "สุโขทัย": "64",
    "พิษณุโลก": "65",
    "พิจิตร": "66",
    "เพชรบูรณ์": "67",
    "ราชบุรี": "70",
    "กาญจนบุรี": "71",
    "สุพรรณบุรี": "72",
    "นครปฐม": "73",
    "สมุทรสาคร": "74",
    "สมุทรสงคราม": "75",
    "เพชรบุรี": "76",
    "ประจวบคีรีขันธ์": "77",
    "นครศรีธรรมราช": "80",
    "กระบี่": "81",
    "พังงา": "82",
    "ภูเก็ต": "83",
    "สุราษฎร์ธานี": "84",
    "ระนอง": "85",
    "ชุมพร": "86",
    "สงขลา": "90",
    "สตูล": "91",
    "ตรัง": "92",
    "พัทลุง": "93",
    "ปัตตานี": "94",
    "ยะลา": "95",
    "นราธิวาส": "96",
}
PROVINCES = list(PROVINCE_ID_MAPPING.keys())

CHROMEDRIVER_PATH = None
# =============================================================================
# UTIL
# ==============================================================================
def norm_text(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()

def now_tag():
    return time.strftime("%Y%m%d_%H%M%S")

def get_current_thai_year():
    return time.localtime().tm_year + 543


def get_target_years():
    return [str(y) for y in range(START_YEAR_THAI, END_YEAR_THAI + 1)]

def create_driver():
    logger.info("Initializing Chrome driver...")
    options = webdriver.ChromeOptions()

    if HEADLESS:
        logger.info("Running in HEADLESS mode")
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1920,1080")
    else:
        logger.info("Running in HEADED mode")
        options.add_argument("--start-maximized")

    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--lang=th-TH")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-infobars")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-background-networking")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-features=Translate,BackForwardCache")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    prefs = {
        "profile.default_content_setting_values.notifications": 2,
        "profile.managed_default_content_settings.images": 2,
        "profile.managed_default_content_settings.fonts": 2,
        "profile.default_content_setting_values.geolocation": 2,
        "profile.default_content_setting_values.media_stream": 2,
    }
    options.add_experimental_option("prefs", prefs)


    driver = webdriver.Chrome(
    service=Service("/usr/bin/chromedriver"),
    options=options
)

    driver.set_page_load_timeout(60)

    try:
        driver.execute_cdp_cmd("Network.enable", {})
        driver.execute_cdp_cmd("Network.setBlockedURLs", {
            "urls": [
                "*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp", "*.svg",
                "*.woff", "*.woff2", "*.ttf", "*.otf",
                "*.mp4", "*.webm", "*.mp3"
            ]
        })
    except Exception:
        pass

    logger.info("Chrome driver initialized successfully")
    return driver

def wait_ready(driver, timeout=20):
    logger.debug(f"Waiting for page to be ready (timeout={timeout})...")
    WebDriverWait(driver, timeout, poll_frequency=0.2).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )

def install_ajax_hook(driver):
    logger.debug("Installing AJAX hook...")
    try:
        driver.execute_script("""
            if (!window.__chatgptAjaxHookInstalled) {
                window.__chatgptAjaxHookInstalled = true;
                window.__pendingFetchCount = 0;
                window.__pendingXHRCount = 0;

                const _fetch = window.fetch;
                if (_fetch) {
                    window.fetch = function() {
                        window.__pendingFetchCount++;
                        return _fetch.apply(this, arguments)
                            .finally(() => { window.__pendingFetchCount--; });
                    };
                }

                const _send = XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.send = function() {
                    window.__pendingXHRCount++;
                    this.addEventListener('loadend', function() {
                        window.__pendingXHRCount--;
                    }, { once: true });
                    return _send.apply(this, arguments);
                };
            }
        """)
    except Exception:
        pass

def wait_network_idle(driver, timeout=12, idle_rounds=2, poll=0.25):
    logger.debug(f"Waiting for network idle (timeout={timeout})...")
    end = time.time() + timeout
    stable = 0
    while time.time() < end:
        try:
            pending = driver.execute_script("""
                return (window.__pendingFetchCount || 0) + (window.__pendingXHRCount || 0);
            """)
        except Exception:
            pending = 0

        if pending == 0:
            stable += 1
            if stable >= idle_rounds:
                return
        else:
            stable = 0

        time.sleep(poll)

def close_popup(driver):
    try:
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
    except Exception:
        pass

    try:
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
    except Exception:
        pass

    try:
        driver.execute_script("""
            function norm(s){ return (s||'').replace(/\\s+/g,' ').trim().toLowerCase(); }
            function visible(el){
                if(!el) return false;
                const st = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return st.display !== 'none' &&
                       st.visibility !== 'hidden' &&
                       parseFloat(st.opacity || '1') !== 0 &&
                       r.width > 0 && r.height > 0;
            }

            const words = ['ปิด','ตกลง','ยอมรับ','รับทราบ','ok','close','accept'];
            const selectors = ['button','a','[role="button"]','.close','.btn-close','.swal2-close','.swal2-confirm'];

            for (const s of selectors) {
                for (const el of document.querySelectorAll(s)) {
                    try {
                        const txt = norm(el.innerText);
                        const aria = norm(el.getAttribute('aria-label'));
                        const title = norm(el.getAttribute('title'));
                        if (visible(el) && (
                            txt === '×' || txt === 'x' ||
                            words.some(w => txt.includes(w) || aria.includes(w) || title.includes(w))
                        )) {
                            el.click();
                        }
                    } catch(e) {}
                }
            }

            const removeSelectors = [
                '.modal-backdrop',
                '.cdk-overlay-backdrop',
                '.swal2-container',
                '.toast-container',
                '.cookie-banner',
                '.cookie-consent',
                '.consent-banner'
            ];
            for (const s of removeSelectors) {
                document.querySelectorAll(s).forEach(el => {
                    try { el.remove(); } catch(e) {}
                });
            }
        """)
    except Exception:
        pass

def safe_click(driver, el):
    close_popup(driver)
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)

    try:
        el.click()
        return
    except Exception:
        pass

    try:
        ActionChains(driver).move_to_element(el).pause(0.05).click(el).perform()
        return
    except Exception:
        pass

    driver.execute_script("arguments[0].click();", el)

def click_page_blank(driver):
    try:
        driver.execute_script("""
            document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
            document.body.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
            document.body.dispatchEvent(new MouseEvent('click', {bubbles:true}));
        """)
    except Exception:
        pass
    time.sleep(0.15)

def wait_spinner(driver, timeout=25, poll=0.25):
    logger.debug(f"Waiting for spinner to disappear (timeout={timeout})...")
    end = time.time() + timeout
    while time.time() < end:
        try:
            visible = driver.execute_script("""
                const sels = [
                    '.ngx-spinner-overlay',
                    'ngx-spinner',
                    '.spinner',
                    '.loading',
                    '.mat-mdc-progress-spinner',
                    '.mat-progress-spinner',
                    '.loading-overlay',
                    '.blockUI',
                    '.overlay',
                    '[class*="spinner"]',
                    '[class*="loading"]'
                ];
                let all = [];
                for (const s of sels) all = all.concat([...document.querySelectorAll(s)]);
                return all.some(el => {
                    const st = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return st.display !== 'none' &&
                           st.visibility !== 'hidden' &&
                           parseFloat(st.opacity || '1') !== 0 &&
                           r.width > 0 && r.height > 0;
                });
            """)
            if not visible:
                return
        except Exception:
            pass
        time.sleep(poll)

def wait_processing_message_done(driver, timeout=90):
    logger.debug(f"Waiting for 'Processing' message to disappear (timeout={timeout})...")
    processing_seen = False
    end = time.time() + timeout

    while time.time() < end:
        try:
            found = driver.execute_script("""
                function norm(s){ return (s || '').replace(/\\s+/g, ' ').trim(); }
                function visible(el){
                    if(!el) return false;
                    const st = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return st.display !== 'none' &&
                           st.visibility !== 'hidden' &&
                           parseFloat(st.opacity || '1') !== 0 &&
                           r.width > 0 && r.height > 0;
                }

                return [...document.querySelectorAll('body *')].some(el => {
                    try {
                        const txt = norm(el.innerText);
                        return visible(el) && txt.includes('กำลังประมวลผล');
                    } catch(e) {
                        return false;
                    }
                });
            """)

            if found:
                processing_seen = True
            else:
                if processing_seen:
                    time.sleep(0.4)
                    return
        except Exception:
            pass

        time.sleep(0.25)

    if processing_seen:
        raise RuntimeError("ข้อความ 'กำลังประมวลผล' ไม่หายภายในเวลาที่กำหนด")

# ==============================================================================
# OPEN PAGE
# ==============================================================================
def open_page(driver, hard=False):
    if hard:
        logger.info(f"Hard reloading page: {URL}")
        driver.get("about:blank")
    else:
        logger.info(f"Opening page: {URL}")
    driver.get(URL)
    wait_ready(driver, 20)
    install_ajax_hook(driver)
    close_popup(driver)
    wait_spinner(driver, 10)
    wait_network_idle(driver, 8)
    close_popup(driver)

# ==============================================================================
# DROPDOWN HELPERS
# ==============================================================================
def find_field_box(driver, label_text):
    xpaths = [
        f"(//*[self::label or self::div or self::span][contains(normalize-space(.), '{label_text}')]/following::*[contains(@class,'ngx-select__toggle')][1])[1]",
        f"(//*[self::label or self::div or self::span][contains(normalize-space(.), '{label_text}')]/following::*[contains(@class,'ngx-select')][1])[1]",
        f"(//*[self::label or self::div or self::span][contains(normalize-space(.), '{label_text}')]/following::*[contains(@class,'dropdown')][1])[1]",
        f"(//*[self::label or self::div or self::span][contains(normalize-space(.), '{label_text}')]/following::*[self::button or self::div][1])[1]",
    ]
    for xp in xpaths:
        try:
            return WebDriverWait(driver, 6, poll_frequency=0.2).until(
                EC.presence_of_element_located((By.XPATH, xp))
            )
        except Exception:
            continue
    raise RuntimeError(f"ไม่พบ field box ของ {label_text}")

def get_field_state(driver, label_text):
    try:
        box = find_field_box(driver, label_text)
        return driver.execute_script("""
            const el = arguments[0];
            function norm(s){ return (s || '').replace(/\\s+/g, ' ').trim(); }

            const text = norm(el.innerText);
            const value = norm(el.value);
            const attrs = [
                'value', 'ng-reflect-model', 'ng-reflect-value',
                'aria-label', 'title', 'data-value'
            ];

            let attrVals = {};
            for (const a of attrs) {
                try { attrVals[a] = norm(el.getAttribute(a)); } catch(e) { attrVals[a] = ''; }
            }

            let childVals = [];
            const children = el.querySelectorAll('input, [value], [ng-reflect-model], [ng-reflect-value], .ngx-select__selected, .ng-value-label');
            children.forEach(ch => {
                const pack = [
                    norm(ch.innerText),
                    norm(ch.value),
                    norm(ch.getAttribute && ch.getAttribute('value')),
                    norm(ch.getAttribute && ch.getAttribute('ng-reflect-model')),
                    norm(ch.getAttribute && ch.getAttribute('ng-reflect-value')),
                    norm(ch.getAttribute && ch.getAttribute('aria-label')),
                    norm(ch.getAttribute && ch.getAttribute('title')),
                    norm(ch.getAttribute && ch.getAttribute('data-value'))
                ].filter(Boolean);
                childVals.push(...pack);
            });

            childVals = [...new Set(childVals)];

            return {
                text,
                value,
                attrs: attrVals,
                childVals
            };
        """, box)
    except Exception:
        return {"text": "", "value": "", "attrs": {}, "childVals": []}

def get_field_text(driver, label_text):
    st = get_field_state(driver, label_text)
    vals = [st.get("text", ""), st.get("value", "")]
    vals.extend(list((st.get("attrs") or {}).values()))
    vals.extend(st.get("childVals", []))
    vals = [norm_text(v) for v in vals if norm_text(v)]
    return " | ".join(dict.fromkeys(vals))

def current_filter_snapshot(driver):
    return {
        "year": get_field_text(driver, "ปี"),
        "region": get_field_text(driver, "เขตสุขภาพ"),
        "province": get_field_text(driver, "จังหวัด"),
    }

def open_dropdown(driver, label_text):
    logger.debug(f"Opening dropdown for: {label_text}")
    box = find_field_box(driver, label_text)
    safe_click(driver, box)
    time.sleep(0.2)

def close_dropdown(driver):
    try:
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
    except Exception:
        pass
    time.sleep(0.1)

def get_visible_options(driver):
    try:
        return driver.execute_script("""
            function norm(s){ return (s||'').replace(/\\s+/g,' ').trim(); }
            function visible(el){
                const st = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return st.display !== 'none' &&
                       st.visibility !== 'hidden' &&
                       parseFloat(st.opacity || '1') !== 0 &&
                       r.width > 0 && r.height > 0;
            }

            const selectors = [
                '.ngx-select__option',
                '.ng-option',
                '.ng-dropdown-panel .ng-option',
                '.dropdown-menu li',
                '.ngx-dropdown-list-container li',
                '[role="option"]',
                'ul[role="listbox"] li',
                '.cdk-overlay-pane .mat-option',
                '.cdk-overlay-container .mat-option'
            ];

            let nodes = [];
            for (const s of selectors) {
                nodes = nodes.concat([...document.querySelectorAll(s)]);
            }

            const items = nodes.filter(visible).map(el => norm(el.innerText)).filter(Boolean);
            return [...new Set(items)];
        """)
    except Exception:
        return []

def click_option_js(driver, value):
    return driver.execute_script("""
        const target = arguments[0].trim();

        function norm(s){ return (s||'').replace(/\\s+/g,' ').trim(); }
        function visible(el){
            const st = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return st.display !== 'none' &&
                   st.visibility !== 'hidden' &&
                   parseFloat(st.opacity || '1') !== 0 &&
                   r.width > 0 && r.height > 0;
        }

        const selectors = [
            '.ngx-select__option',
            '.ng-option',
            '.ng-dropdown-panel .ng-option',
            '.dropdown-menu li',
            '.ngx-dropdown-list-container li',
            '[role="option"]',
            'ul[role="listbox"] li',
            '.cdk-overlay-pane .mat-option',
            '.cdk-overlay-container .mat-option'
        ];

        let nodes = [];
        for (const s of selectors) {
            nodes = nodes.concat([...document.querySelectorAll(s)]);
        }

        nodes = nodes.filter(visible);

        for (const el of nodes) {
            const txt = norm(el.innerText);
            if (txt == target) {
                el.scrollIntoView({block:'center'});
                el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
                el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
                el.click();
                return true;
            }
        }

        for (const el of nodes) {
            const txt = norm(el.innerText);
            if (txt.includes(target)) {
                el.scrollIntoView({block:'center'});
                el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
                el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
                el.click();
                return true;
            }
        }
        return false;
    """, value)

def type_into_dropdown_search(driver, value):
    return driver.execute_script("""
        const value = arguments[0];
        function visible(el){
            const st = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return st.display !== 'none' &&
                   st.visibility !== 'hidden' &&
                   parseFloat(st.opacity || '1') !== 0 &&
                   r.width > 0 && r.height > 0;
        }

        const inputs = [...document.querySelectorAll(
            '.ngx-select__dropdown input, .ng-dropdown-panel input, .ng-select input, input[type="text"]'
        )].filter(visible);

        if (!inputs.length) return false;

        const inp = inputs[0];
        inp.focus();
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        inp.value = value;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
        return true;
    """, value)

def ensure_value_applied(driver, label_text, expected_value, timeout=4):
    end = time.time() + timeout
    expected = norm_text(expected_value)

    while time.time() < end:
        state = get_field_state(driver, label_text)

        pool = [state.get("text", ""), state.get("value", "")]
        pool.extend(list((state.get("attrs") or {}).values()))
        pool.extend(state.get("childVals", []))
        pool = [norm_text(v) for v in pool if norm_text(v)]

        if any(expected == v or expected in v for v in pool):
            return True

        time.sleep(0.2)

    return False

def commit_dropdown_selection(driver):
    try:
        ActionChains(driver).send_keys(Keys.ENTER).perform()
    except Exception:
        pass
    time.sleep(0.1)
    click_page_blank(driver)
    wait_spinner(driver, 4)
    wait_network_idle(driver, 4)

def select_dropdown_value(driver, label_text, target_value, retries=3):
    target_value = norm_text(target_value)
    logger.info(f"Selecting dropdown value: {label_text} = {target_value}")
    if ensure_value_applied(driver, label_text, target_value, timeout=1.5):
        logger.debug(f"Value {target_value} already applied for {label_text}")
        return

    last_options = []

    for i in range(retries):
        logger.debug(f"Attempt {i+1}/{retries} to select {target_value} for {label_text}")
        close_popup(driver)
        open_dropdown(driver, label_text)

        type_into_dropdown_search(driver, target_value)
        time.sleep(0.25)

        options = get_visible_options(driver)
        last_options = options[:]

        clicked = False
        if options:
            clicked = click_option_js(driver, target_value)

        if not clicked:
            try:
                ActionChains(driver).send_keys(Keys.HOME).perform()
                time.sleep(0.05)
                for _ in range(12):
                    ActionChains(driver).send_keys(Keys.ARROW_DOWN).perform()
                    time.sleep(0.05)
                    if ensure_value_applied(driver, label_text, target_value, timeout=0.25):
                        clicked = True
                        break
                if not clicked:
                    ActionChains(driver).send_keys(Keys.ENTER).perform()
            except Exception:
                pass

        commit_dropdown_selection(driver)

        if ensure_value_applied(driver, label_text, target_value, timeout=2.5):
            logger.debug(f"Successfully selected {target_value} for {label_text}")
            close_dropdown(driver)
            return

        close_dropdown(driver)
        time.sleep(0.15)

    raise RuntimeError(f"เลือกค่า {label_text}={target_value} ไม่สำเร็จ | options={last_options}")

# ==============================================================================
# SELECT YEAR / REGION / PROVINCE
# ==============================================================================
def select_year(driver, year_value):
    select_dropdown_value(driver, "ปี", year_value, retries=4)
    if not ensure_value_applied(driver, "ปี", year_value, timeout=4):
        raise RuntimeError(f"ปีไม่เปลี่ยนจริง wanted={year_value} got={get_field_text(driver, 'ปี')}")

def select_region_all(driver):
    select_dropdown_value(driver, "เขตสุขภาพ", "ทั้งหมด", retries=4)
    if not ensure_value_applied(driver, "เขตสุขภาพ", "ทั้งหมด", timeout=4):
        raise RuntimeError(f"เขตสุขภาพไม่เปลี่ยนจริง got={get_field_text(driver, 'เขตสุขภาพ')}")

def select_province(driver, province_name):
    select_dropdown_value(driver, "จังหวัด", province_name, retries=4)
    if not ensure_value_applied(driver, "จังหวัด", province_name, timeout=4):
        raise RuntimeError(f"จังหวัดไม่เปลี่ยนจริง wanted={province_name} got={get_field_text(driver, 'จังหวัด')}")

def verify_filters_before_submit(driver, province_name, year_value):
    snap = current_filter_snapshot(driver)
    province_ok = norm_text(province_name) in norm_text(snap.get("province", ""))
    year_ok = norm_text(year_value) in norm_text(snap.get("year", ""))
    region_ok = "ทั้งหมด" in norm_text(snap.get("region", ""))

    if not (province_ok and year_ok and region_ok):
        raise RuntimeError(
            f"ค่ากรองยังไม่พร้อมก่อนกดดูรายงาน | wanted year={year_value}, province={province_name} | got={snap}"
        )

# ==============================================================================
# REPORT + TABLE WAIT
# ==============================================================================
def get_table_snapshot(driver):
    try:
        return driver.execute_script("""
            function norm(s){ return (s || '').replace(/\\s+/g, ' ').trim(); }
            function visible(el){
                const st = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return st.display !== 'none' &&
                       st.visibility !== 'hidden' &&
                       parseFloat(st.opacity || '1') !== 0 &&
                       r.width > 0 && r.height > 0;
            }

            function scoreTable(t){
                const header = t.tHead
                    ? [...t.tHead.querySelectorAll('th,td')].map(x => norm(x.innerText)).join(' | ')
                    : '';
                const bodyRows = t.tBodies && t.tBodies.length ? [...t.tBodies[0].rows] : [];
                const previewRows = bodyRows.slice(0, 8).map(r =>
                    [...r.cells].map(c => norm(c.innerText)).join(' | ')
                );
                const preview = previewRows.join(' || ');
                const text = [header, preview].join(' | ');
                let s = 0;
                if (text.includes('กลุ่มโรค/โรค')) s += 200;
                if (/wk\\s*\\d+/i.test(text)) s += 150;
                if (text.includes('จำนวนผู้ป่วย')) s += 100;
                s += Math.min(bodyRows.length || 0, 50);
                return { score: s, rows: bodyRows.length, header, preview };
            }

            const tables = [...document.querySelectorAll('table')].filter(visible);
            if (!tables.length) return null;

            const ranked = tables.map(t => ({t, ...scoreTable(t)})).sort((a,b) => b.score - a.score);
            const best = ranked[0];

            return {
                rows: best.rows || 0,
                header: best.header || '',
                preview: best.preview || '',
                score: best.score || 0
            };
        """)
    except Exception:
        return None

def get_table_fingerprint(driver):
    snap = get_table_snapshot(driver)
    if not snap:
        return ""
    raw = "###".join([
        str(snap.get("rows", 0)),
        snap.get("header", ""),
        snap.get("preview", ""),
        str(snap.get("score", 0)),
    ])
    return hashlib.md5(raw.encode("utf-8")).hexdigest()

def get_main_table_row_count(driver):
    snap = get_table_snapshot(driver)
    return int(snap.get("rows", 0)) if snap else 0

def has_meaningful_table(driver):
    snap = get_table_snapshot(driver)
    return bool(snap and snap.get("score", 0) >= 120 and snap.get("rows", 0) >= 1)

def wait_table_stable(driver, min_rounds=3, timeout=35):
    logger.info(f"Waiting for table to stabilize (timeout={timeout})...")
    end = time.time() + timeout
    stable = 0
    last_fp = None

    while time.time() < end:
        if has_meaningful_table(driver):
            fp = get_table_fingerprint(driver)
            if fp and fp == last_fp:
                stable += 1
                if stable >= min_rounds:
                    logger.debug(f"Table stable for {min_rounds} rounds.")
                    return
            else:
                stable = 0
                last_fp = fp
                logger.debug("Table changed, resetting stability count.")
        else:
            stable = 0
            last_fp = None
            logger.debug("No meaningful table found yet.")

        time.sleep(0.5)

    raise RuntimeError("ตารางยังไม่นิ่งพอ อาจยังโหลดข้อมูลไม่เสร็จ")

def find_report_button(driver):
    xpaths = [
        "//button[contains(@class,'btn-success') and contains(normalize-space(.),'ดูรายงาน')]",
        "//button[contains(@class,'btn') and contains(@class,'btn-success') and .//i[contains(@class,'bi-search')]]",
        "//button[.//i[contains(@class,'bi-search')] and contains(normalize-space(.),'ดูรายงาน')]",
        "//button[contains(normalize-space(.),'ดูรายงาน')]",
        "//*[self::button or self::a][contains(normalize-space(.),'ดูรายงาน')]",
    ]
    for xp in xpaths:
        try:
            return WebDriverWait(driver, 8, poll_frequency=0.2).until(
                EC.presence_of_element_located((By.XPATH, xp))
            )
        except Exception:
            continue
    raise RuntimeError("ไม่พบปุ่มดูรายงาน")

def force_click_report_button(driver, btn):
    close_popup(driver)
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)

    try:
        safe_click(driver, btn)
        return
    except Exception:
        pass

    try:
        driver.execute_script("""
            arguments[0].dispatchEvent(new MouseEvent('click', {
                view: window, bubbles: true, cancelable: true
            }));
        """, btn)
        return
    except Exception:
        pass

    driver.execute_script("arguments[0].click();", btn)

def click_view_report_and_wait(driver, province_name=None, year_value=None):
    logger.info(f"Clicking 'View Report' for {province_name} ({year_value})...")
    close_popup(driver)

    verify_filters_before_submit(driver, province_name, year_value)

    before_fp = get_table_fingerprint(driver)
    before_rows = get_main_table_row_count(driver)

    btn = find_report_button(driver)
    force_click_report_button(driver, btn)

    wait_spinner(driver, 10)
    wait_network_idle(driver, 8)
    wait_processing_message_done(driver, timeout=60)
    wait_spinner(driver, 15)
    wait_network_idle(driver, 8)
    close_popup(driver)

    wait_table_stable(driver, min_rounds=3, timeout=35)

    after_fp = get_table_fingerprint(driver)
    after_rows = get_main_table_row_count(driver)

    if (after_fp == before_fp and after_rows == before_rows) or after_rows <= 0:
        logger.warning("Table didn't seem to change or is empty. Retrying click...")
        btn = find_report_button(driver)
        force_click_report_button(driver, btn)

        wait_spinner(driver, 10)
        wait_network_idle(driver, 8)
        wait_processing_message_done(driver, timeout=60)
        wait_spinner(driver, 15)
        wait_network_idle(driver, 8)
        close_popup(driver)

        wait_table_stable(driver, min_rounds=3, timeout=35)

    if not has_meaningful_table(driver):
        raise RuntimeError("กดดูรายงานแล้ว แต่ยังไม่พบตารางที่พร้อมใช้งานจริง")
    
    logger.info(f"Report loaded successfully. Rows: {get_main_table_row_count(driver)}")

# ==============================================================================
# TABLE EXTRACTION
# ==============================================================================
def find_best_table_element(driver):
    return driver.execute_script("""
        function norm(s){ return (s || '').replace(/\\s+/g, ' ').trim(); }
        function visible(el){
            const st = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return st.display !== 'none' &&
                   st.visibility !== 'hidden' &&
                   parseFloat(st.opacity || '1') !== 0 &&
                   r.width > 0 && r.height > 0;
        }
        function scoreTable(t){
            const header = t.tHead
                ? [...t.tHead.querySelectorAll('th,td')].map(x => norm(x.innerText)).join(' | ')
                : '';
            const bodyRows = t.tBodies && t.tBodies.length ? [...t.tBodies[0].rows] : [];
            const preview = bodyRows.slice(0, 5).map(r =>
                [...r.cells].map(c => norm(c.innerText)).join(' | ')
            ).join(' || ');
            const text = [header, preview].join(' | ');
            let s = 0;
            if (text.includes('กลุ่มโรค/โรค')) s += 200;
            if (/wk\\s*\\d+/i.test(text)) s += 150;
            if (text.includes('จำนวนผู้ป่วย')) s += 100;
            s += Math.min(bodyRows.length || 0, 50);
            return s;
        }

        const tables = [...document.querySelectorAll('table')].filter(visible);
        if (!tables.length) return null;
        tables.sort((a, b) => scoreTable(b) - scoreTable(a));
        return tables[0];
    """)

def extract_table_payload(driver, table_el):
    logger.info("Extracting table payload...")
    return driver.execute_script("""
        const t = arguments[0];
        function norm(s){ return (s || '').replace(/\\s+/g, ' ').trim(); }

        if (!t) return null;

        const headerRows = t.tHead
            ? [...t.tHead.rows].map(r =>
                [...r.cells].map(c => ({
                    text: norm(c.innerText),
                    colspan: c.colSpan || 1,
                    rowspan: c.rowSpan || 1
                }))
            )
            : [];

        const tbody = t.tBodies && t.tBodies.length ? t.tBodies[0] : null;
        const body = tbody
            ? [...tbody.rows].map(r => [...r.cells].map(c => norm(c.innerText)))
            : [];

        return { headerRows, body };
    """, table_el)

def build_header_grid(raw_headers):
    max_cols = max(sum(cell["colspan"] for cell in row) for row in raw_headers)
    grid = [[None] * max_cols for _ in range(len(raw_headers))]

    for r, row in enumerate(raw_headers):
        c = 0
        for cell in row:
            while c < max_cols and grid[r][c] is not None:
                c += 1
            for rs in range(cell["rowspan"]):
                for cs in range(cell["colspan"]):
                    rr = r + rs
                    cc = c + cs
                    if rr < len(grid) and cc < max_cols:
                        grid[rr][cc] = norm_text(cell["text"])
            c += cell["colspan"]

    return grid, max_cols

def flatten_headers(grid, max_cols):
    headers = []
    for c in range(max_cols):
        parts = []
        for r in range(len(grid)):
            val = grid[r][c]
            if val and val not in parts:
                parts.append(val)
        headers.append(" / ".join(parts) if parts else f"col_{c+1}")
    return headers

def build_dataframe_from_payload(payload):
    if not payload:
        return pd.DataFrame()

    raw_headers = payload.get("headerRows", [])
    raw_body = payload.get("body", [])
    if not raw_headers or not raw_body:
        return pd.DataFrame()

    grid, max_cols = build_header_grid(raw_headers)
    headers = flatten_headers(grid, max_cols)

    rows = []
    for row in raw_body:
        row = list(row)
        if len(row) < len(headers):
            row += [""] * (len(headers) - len(row))
        elif len(row) > len(headers):
            row = row[:len(headers)]
        rows.append(row)

    return pd.DataFrame(rows, columns=headers)

# ==============================================================================
# FLOW
# ==============================================================================
def prepare_page_once(driver):
    open_page(driver)
    close_popup(driver)

def reset_page_if_needed(driver):
    try:
        close_popup(driver)
        wait_spinner(driver, 5)
        wait_network_idle(driver, 4)
    except Exception:
        pass

def scrape_one_province(driver, province_name, province_id, year_value):
    logger.info(f"Scraping data for: {province_name} ({province_id}), Year: {year_value}")
    reset_page_if_needed(driver)

    select_year(driver, year_value)
    close_popup(driver)

    select_region_all(driver)
    close_popup(driver)

    select_province(driver, province_name)
    close_popup(driver)

    verify_filters_before_submit(driver, province_name, year_value)

    click_view_report_and_wait(driver, province_name=province_name, year_value=year_value)
    close_popup(driver)

    table_el = find_best_table_element(driver)
    if table_el is None:
        raise RuntimeError("ไม่พบตารางหลังจากกดดูรายงาน")

    payload = extract_table_payload(driver, table_el)
    df = build_dataframe_from_payload(payload)
    if df.empty:
        raise RuntimeError("ตารางว่าง")

    df.insert(0, "provinceName", province_name)
    df.insert(1, "provinceId", province_id)
    df.insert(2, "yearThai", year_value)
    logger.info(f"Successfully scraped {len(df)} rows for {province_name}")
    return df

# ==============================================================================
# MAIN
# ==============================================================================
if __name__ == "__main__":
    target_years = get_target_years()
    year_label = f"{target_years[0]}_{target_years[-1]}" if len(target_years) > 1 else target_years[0]

    print("START: headless mode > ใช้ browser เดียว > เข้าเว็บ > ปิด popup > เลือกปี > เลือกจังหวัด > กดดูรายงาน > รอประมวลผล > รอตารางนิ่ง > ดึงข้อมูล > export raw")
    print(f"TARGET YEARS: {', '.join(target_years)}")

    all_frames = []
    results_summary = []
    driver = None
    total_jobs = len(target_years) * len(PROVINCES)
    job_no = 0

    try:
        driver = create_driver()
        prepare_page_once(driver)

        for year_value in target_years:
            logger.info(f"========== YEAR {year_value} ==========")

            for province in PROVINCES:
                job_no += 1
                pid = PROVINCE_ID_MAPPING[province]
                logger.info(f"[{job_no}/{total_jobs}] กำลังดึงข้อมูล ปี {year_value} | {province} ...")

                try:
                    df = scrape_one_province(driver, province, pid, year_value)
                    all_frames.append(df)
                    logger.info(f"    SUCCESS | {province} | rows={df.shape[0]} | cols={df.shape[1]}")
                    results_summary.append({
                        "year": year_value,
                        "province": province,
                        "status": "SUCCESS",
                        "rows": df.shape[0],
                        "detail": "OK"
                    })
                except Exception as e:
                    logger.warning(f"    FAIL ({type(e).__name__}: {e}) -> กำลังลองใหม่ (Retry)...")

                    try:
                        open_page(driver, hard=True)
                        df = scrape_one_province(driver, province, pid, year_value)
                        all_frames.append(df)
                        logger.info(f"    RETRY SUCCESS | {province} | rows={df.shape[0]} | cols={df.shape[1]}")
                        results_summary.append({
                            "year": year_value,
                            "province": province,
                            "status": "SUCCESS (RETRY)",
                            "rows": df.shape[0],
                            "detail": "Fixed by retry"
                        })
                    except Exception as e2:
                        logger.error(f"    RETRY FAIL ({type(e2).__name__}: {e2})")
                        results_summary.append({
                            "year": year_value,
                            "province": province,
                            "status": "FAILED",
                            "rows": 0,
                            "detail": str(e2)
                        })
                        try:
                            open_page(driver, hard=True)
                        except Exception:
                            pass

    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

    # ==============================================================================
    # SUMMARY REPORT
    # ==============================================================================
    logger.info("\n" + "="*80)
    logger.info(" SCRAPING SUMMARY REPORT")
    logger.info("="*80)
    summary_df = pd.DataFrame(results_summary)
    if not summary_df.empty:
        # แสดงสรุปแบบสวยงามใน log
        success_count = len(summary_df[summary_df['status'].str.contains('SUCCESS')])
        fail_count = len(summary_df[summary_df['status'] == 'FAILED'])
        logger.info(f"Total Provinces Attempted: {len(summary_df)}")
        logger.info(f"Success: {success_count}")
        logger.info(f"Failed:  {fail_count}")
        logger.info("-" * 40)
        
        # แสดงรายการที่ล้มเหลว (ถ้ามี)
        if fail_count > 0:
            logger.info("FAILED PROVINCES:")
            # We can't easily use logger.info with a dataframe like print(df)
            # but we can format it
            for _, row in summary_df[summary_df['status'] == 'FAILED'].iterrows():
                logger.info(f"  - {row['year']} {row['province']}: {row['detail']}")
            logger.info("-" * 40)
        
        # แสดงรายการทั้งหมดแบบสั้นๆ
        logger.info("DETAILED STATUS:")
        for _, row in summary_df.iterrows():
            status_icon = "✅" if "SUCCESS" in row['status'] else "❌"
            logger.info(f"{status_icon} [{row['year']}] {row['province']}: {row['status']} ({row['rows']} rows)")
    else:
        logger.info("No provinces were processed.")
    logger.info("="*80 + "\n")

    if all_frames:
        final_df = pd.concat(all_frames, ignore_index=True)
        pd.set_option("display.max_columns", None)
        pd.set_option("display.width", 3000)
        pd.set_option("display.max_colwidth", 200)

        logger.info(f"========== FINAL DATAFRAME head(20) ==========")
        print(final_df.head(20))

        BASE_DIR = Path(__file__).resolve().parent
        # กำหนดที่เก็บไฟล์ output
        output_dir = Path(os.getenv("DUCKDB_DATA_DIR", str(BASE_DIR)))
        output_dir.mkdir(parents=True, exist_ok=True)

        raw_csv = output_dir / f"hdc_report_raw_{year_label}.csv"
        final_df.to_csv(raw_csv, index=False, encoding="utf-8-sig")

        logger.info(f"บันทึกไฟล์ raw csv สำเร็จ: {raw_csv}")
    else:
        logger.warning("ไม่มีข้อมูลที่สแครปได้สำเร็จเลย")



# In[ ]:




