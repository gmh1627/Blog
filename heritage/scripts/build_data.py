"""Build a browsable 1st-8th batch national heritage dataset.

The standardized identifiers/categories come from the CC BY 4.0
china-cultural-heritage project. Names, eras, and locations are refreshed from
the Wikisource copies of the State Council notices, which are public-domain
government documents. Run this script from any working directory.
"""

from __future__ import annotations

import csv
import io
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CACHE_DIR = DATA_DIR / ".cache"
WIKISOURCE_API = "https://zh.wikisource.org/w/api.php"
SOURCE_REPOSITORY = "https://github.com/lingdian1226/china-cultural-heritage.git"
CURRENT_DIVISIONS_URL = (
    "https://raw.githubusercontent.com/wujingke/division_codes/main/output/csv/division_codes.csv"
)
HISTORICAL_DIVISIONS_URL = "https://raw.githubusercontent.com/yescallop/areacodes/master/result.csv"
HERITAGE_KML_URL = "https://cultural.rainywhisper.com/data/CulRelPro_China_1961-2019.kml"

PAGES = {
    1: "国务院关于公布第一批全国重点文物保护单位名单的通知",
    2: "国务院关于公布第二批全国重点文物保护单位的通知",
    3: "国务院关于公布第三批全国重点文物保护单位的通知",
    4: "国务院关于公布第四批全国重点文物保护单位的通知",
    5: "国务院关于公布第五批全国重点文物保护单位和与现有全国重点文物保护单位合并项目的通知",
    6: "国务院关于核定并公布第六批全国重点文物保护单位的通知",
    7: "国务院关于核定并公布第七批全国重点文物保护单位的通知",
    8: "国务院关于核定并公布第八批全国重点文物保护单位的通知",
}

SOURCE_URLS = {
    batch: "https://zh.wikisource.org/wiki/" + requests.utils.quote(title, safe="")
    for batch, title in PAGES.items()
}

EXPECTED_BASE = {1: 180, 2: 62, 3: 258, 4: 250, 5: 521, 6: 1081, 7: 1944, 8: 762}
EXPECTED_NOTICE = {1: 180, 2: 62, 3: 258, 4: 250, 5: 518, 6: 1080, 7: 1943, 8: 762}
EXPECTED_MERGED = {4: 12, 5: 23, 6: 106, 7: 47, 8: 50}

CATEGORY_LABELS = {
    "archaeological-sites": "古遗址",
    "ancient-tombs": "古墓葬",
    "ancient-buildings": "古建筑",
    "stone-carvings": "石窟寺及石刻",
    "modern-historic": "近现代重要史迹及代表性建筑",
    "others": "其他",
}

PROVINCES = (
    "北京市", "天津市", "河北省", "山西省", "内蒙古自治区", "辽宁省", "吉林省", "黑龙江省",
    "上海市", "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省", "河南省", "湖北省",
    "湖南省", "广东省", "广西壮族自治区", "海南省", "重庆市", "四川省", "贵州省", "云南省",
    "西藏自治区", "陕西省", "甘肃省", "青海省", "宁夏回族自治区", "新疆维吾尔自治区",
    "香港特别行政区", "澳门特别行政区", "台湾省",
)

BATCH4_MERGED = (
    ("镇朔楼", "明", "河北省张家口市", "归入清远楼"),
    ("沉香阁", "清", "上海市南市区", "归入豫园"),
    ("梁南康简王肖绩墓石刻", "南朝", "江苏省句容市", "归入丹阳南朝陵墓石刻"),
    ("戚继光牌坊", "明", "山东省蓬莱市", "归入蓬莱水城及蓬莱阁"),
    ("辟雍碑", "西晋", "河南省偃师市", "归入汉魏洛阳故城"),
    ("繁塔", "宋", "河南省开封市", "归入宋东京城遗址"),
    ("延庆观", "元", "河南省开封市", "归入宋东京城遗址"),
    ("南山—石篆山摩崖造像及多宝塔", "宋", "四川省大足县", "归入北山摩崖造像"),
    ("石门山摩崖造像", "宋", "四川省大足县", "归入宝顶山摩崖造像"),
    ("岭山寺塔", "宋", "陕西省延安市", "归入延安革命遗址"),
    ("中国共产党六届六中全会旧址", "1938年", "陕西省延安市", "归入延安革命遗址"),
    ("东千佛洞石窟", "北魏至西夏", "甘肃省安西县", "归入榆林窟"),
)

NAME_OVERRIDES = {
    "芦一作“卢”沟桥": ("卢沟桥", ""),
    "北京城东南角楼一作“北京市城东南角楼”": ("北京城东南角楼", ""),
    "大士阁一作“大土阁”": ("大士阁", "大土阁"),
    "真覚寺金刚宝座（五塔寺塔）": ("真觉寺金刚宝座（五塔寺塔）", ""),
    "楡林窟": ("榆林窟", ""),
}

PERIOD_OVERRIDES = {
    "京杭大运河": "隋唐五代",
    "大运河": "隋唐五代",
}

BASE_REMARK_OVERRIDES = {
    "3-0064-3-012": "第六批与宣化城墙合并，名称：宣化古城；镇朔楼已于第四批归入清远楼",
}

# Items whose notices and auxiliary datasets do not contain a usable current
# county, or whose auxiliary county is known to be incorrect.
CURRENT_LOCATION_OVERRIDES = {
    "1-0039-4-006": ("甘肃省", "临夏回族自治州", "永靖县"),
    "1-0069-3-022": ("河南省", "开封市", "顺河回族区"),
    "1-0088-3-041": ("山西省", "大同市", "平城区"),
    "1-0091-3-044": ("山西省", "大同市", "平城区"),
    "1-0100-3-053": ("北京市", "北京市", "东城区"),
    "2-0029-3-014": ("北京市", "北京市", "东城区"),
    "2-0035-3-020": ("北京市", "北京市", "东城区"),
    "3-0003-5-003": ("江苏省", "南京市", "秦淮区"),
    "3-0020-5-020": ("广东省", "广州市", "越秀区"),
    "3-0057-3-005": ("四川省", "自贡市", "大安区"),
    "3-0218-1-038": ("河南省", "开封市", "龙亭区"),
    "4-0099-3-021": ("山西省", "阳泉市", "郊区"),
    "4-0175-3-097": ("河南省", "开封市", "跨县级行政区"),
    "4-0186-3-108": ("云南省", "迪庆藏族自治州", "香格里拉市"),
    "4-0249-6-001": ("四川省", "泸州市", "江阳区"),
    "5-0098-1-098": ("海南省", "三亚市", "吉阳区"),
    "5-0160-2-016": ("江苏省", "南京市", "雨花台区"),
    "5-0225-3-031": ("山西省", "大同市", "平城区"),
    "5-0232-3-038": ("山西省", "长治市", "潞州区"),
    "5-0233-3-039": ("山西省", "长治市", "潞州区"),
    "5-0339-3-145": ("河南省", "开封市", "龙亭区"),
    "5-0447-4-005": ("江苏省", "南京市", "栖霞区"),
    "6-0175-1-175": ("海南省", "三沙市", "西沙区"),
    "6-0272-2-052": ("海南省", "三亚市", "海棠区"),
    "6-0474-3-177": ("山西省", "长治市", "潞州区"),
    "6-0654-3-357": ("河南省", "开封市", "顺河回族区"),
    "6-0984-5-111": ("河南省", "开封市", "龙亭区"),
    "6-1070-5-197": ("甘肃省", "兰州市", "城关区"),
    "7-0400-1-400": ("海南省", "三沙市", "西沙区"),
    "7-0808-3-106": ("山西省", "大同市", "平城区"),
    "7-1293-3-591": ("海南省", "三亚市", "崖州区"),
    "8-0122-1-122": ("海南省", "三沙市", "西沙区"),
    "8-0124-1-124": ("海南省", "三沙市", "西沙区"),
    "1-0028-5-028": ("重庆市", "重庆市", "渝中区"),
    "3-0163-3-111": ("重庆市", "重庆市", "沙坪坝区"),
    "3-0113-3-061": ("山西省", "晋城市", "泽州县"),
    "3-0118-3-066": ("西藏自治区", "日喀则市", "桑珠孜区"),
    "3-0159-3-107": ("新疆维吾尔自治区", "吐鲁番市", "高昌区"),
    "3-0241-2-012": ("新疆维吾尔自治区", "吐鲁番市", "高昌区"),
    "4-0151-3-073": ("广东省", "潮州市", "湘桥区"),
    "4-0218-5-020": ("广东省", "湛江市", "麻章区"),
    "5-0062-1-062": ("山东省", "菏泽市", "牡丹区"),
    "5-0141-1-141": ("新疆维吾尔自治区", "哈密市", "伊州区"),
    "5-0144-1-144": ("新疆维吾尔自治区", "吐鲁番市", "高昌区"),
    "5-0189-2-045": ("新疆维吾尔自治区", "哈密市", "伊州区"),
    "5-0377-3-183": ("广东省", "潮州市", "湘桥区"),
    "5-0480-5-007": ("黑龙江省", "黑河市", "爱辉区"),
    "6-0290-2-070": ("新疆维吾尔自治区", "哈密市", "伊州区"),
    "6-0297-2-077": ("新疆维吾尔自治区", "哈密市", "伊州区"),
    "6-0942-5-069": ("江苏省", "淮安市", "淮安区"),
    "6-1077-5-204": ("新疆维吾尔自治区", "吐鲁番市", "跨县级行政区"),
    "merge-4-001": ("河北省", "张家口市", "宣化区"),
    "merge-4-010": ("陕西省", "延安市", "宝塔区"),
    "merge-4-011": ("陕西省", "延安市", "宝塔区"),
    "merge-5-008": ("新疆维吾尔自治区", "吐鲁番市", "高昌区"),
    "merge-5-014": ("四川省", "巴中市", "巴州区"),
    "merge-5-015": ("福建省", "泉州市", "丰泽区"),
    "merge-5-022": ("浙江省", "嘉兴市", "南湖区"),
    "merge-6-004": ("江苏省", "宿迁市", "宿城区"),
    "merge-6-017": ("河北省", "张家口市", "宣化区"),
    "merge-6-035": ("河北省", "张家口市", "宣化区"),
    "merge-6-041": ("四川省", "乐山市", "市中区"),
    "merge-6-053": ("甘肃省", "天水市", "麦积区"),
    "merge-6-057": ("新疆维吾尔自治区", "吐鲁番市", "高昌区"),
    "merge-6-066": ("浙江省", "绍兴市", "越城区"),
    "merge-6-102": ("陕西省", "延安市", "宝塔区"),
    "merge-6-103": ("陕西省", "延安市", "宝塔区"),
    "merge-6-104": ("陕西省", "延安市", "宝塔区"),
    "merge-6-105": ("陕西省", "延安市", "宝塔区"),
    "merge-6-106": ("陕西省", "延安市", "宝塔区"),
    "1-0023-5-023": ("陕西省", "延安市", "宝塔区"),
    "1-0168-2-007": ("吉林省", "通化市", "集安市"),
    "3-0172-4-009": ("重庆市", "重庆市", "涪陵区"),
    "3-0184-1-004": ("安徽省", "马鞍山市", "和县"),
    "5-0045-1-045": ("安徽省", "马鞍山市", "含山县"),
    "5-0156-2-012": ("辽宁省", "沈阳市", "法库县"),
    "5-0456-4-014": ("河南省", "三门峡市", "义马市"),
    "6-0252-2-032": ("安徽省", "马鞍山市", "当涂县"),
    "7-0816-3-114": ("山西省", "长治市", "潞州区"),
    "7-0844-3-142": ("山西省", "长治市", "潞州区"),
    "8-0090-1-090": ("河南省", "三门峡市", "义马市"),
    "8-0177-2-010": ("安徽省", "马鞍山市", "当涂县"),
    "3-0072-3-020": ("四川省", "阿坝藏族羌族自治州", "马尔康市"),
    "5-0185-2-041": ("甘肃省", "跨地级行政区", "跨县级行政区"),
    "5-0384-3-190": ("四川省", "阿坝藏族羌族自治州", "马尔康市"),
    "6-0506-3-209": ("江苏省", "淮安市", "跨县级行政区"),
    "7-0404-1-404": ("四川省", "阿坝藏族羌族自治州", "马尔康市"),
    "7-1317-3-615": ("四川省", "阿坝藏族羌族自治州", "马尔康市"),
    "7-1318-3-616": ("四川省", "阿坝藏族羌族自治州", "马尔康市"),
    "7-1607-4-110": ("新疆维吾尔自治区", "吐鲁番市", "高昌区"),
    "8-0258-3-061": ("山西省", "晋城市", "城区"),
    "6-0531-3-234": ("江苏省", "淮安市", "淮安区"),
    "6-0969-5-096": ("福建省", "漳州市", "芗城区"),
    "5-0177-2-033": ("四川省", "眉山市", "彭山区"),
    "merge-6-032": ("四川省", "眉山市", "彭山区"),
    "7-0389-1-389": ("广东省", "东莞市", "不设县级行政区"),
    "merge-4-006": ("河南省", "开封市", "禹王台区"),
    "merge-4-007": ("河南省", "开封市", "鼓楼区"),
    "merge-5-004": ("江西省", "景德镇市", "浮梁县"),
    "merge-5-012": ("江苏省", "苏州市", "姑苏区"),
    "merge-5-016": ("江西省", "九江市", "庐山市"),
    "merge-5-017": ("江苏省", "南京市", "跨县级行政区"),
    "merge-5-018": ("江苏省", "南通市", "崇川区"),
    "merge-5-021": ("浙江省", "宁波市", "江北区"),
    "merge-6-005": ("江苏省", "徐州市", "鼓楼区"),
    "merge-6-010": ("河南省", "郑州市", "惠济区"),
    "merge-6-013": ("广东省", "广州市", "越秀区"),
    "merge-6-014": ("广东省", "韶关市", "曲江区"),
    "merge-6-016": ("陕西省", "铜川市", "印台区"),
    "merge-6-018": ("辽宁省", "辽阳市", "跨县级行政区"),
    "merge-6-019": ("辽宁省", "辽阳市", "跨县级行政区"),
    "merge-6-023": ("江苏省", "南京市", "跨县级行政区"),
    "merge-6-024": ("浙江省", "杭州市", "西湖区"),
    "merge-6-028": ("湖北省", "荆州市", "沙市区"),
    "merge-6-029": ("湖北省", "荆州市", "荆州区"),
    "merge-6-033": ("四川省", "成都市", "跨县级行政区"),
    "merge-6-046": ("浙江省", "杭州市", "西湖区"),
    "merge-6-049": ("四川省", "广元市", "利州区"),
    "merge-6-052": ("陕西省", "铜川市", "耀州区"),
    "merge-6-063": ("江苏省", "南通市", "崇川区"),
    "merge-6-064": ("浙江省", "杭州市", "上城区"),
    "merge-6-092": ("江西省", "萍乡市", "安源区"),
    "merge-6-093": ("江西省", "萍乡市", "安源区"),
    "merge-6-095": ("山东省", "青岛市", "跨县级行政区"),
    "merge-6-097": ("广西壮族自治区", "北海市", "海城区"),
    "merge-6-098": ("四川省", "广安市", "广安区"),
    "merge-6-100": ("四川省", "泸州市", "江阳区"),
}

MUNICIPALITIES = {"北京市", "天津市", "上海市", "重庆市"}
GENERIC_PREFECTURE_LABELS = {
    "省直辖县级行政区划": "省直辖县级行政区",
    "自治区直辖县级行政区划": "自治区直辖县级行政区",
}

def http_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(total=5, connect=5, read=5, backoff_factor=1.25)
    session.mount("https://", HTTPAdapter(max_retries=retry))
    session.headers["User-Agent"] = "CulturalHeritageOrganizer/1.0"
    return session


def fetch_notice(session: requests.Session, title: str) -> BeautifulSoup:
    response = session.get(
        WIKISOURCE_API,
        params={
            "action": "parse",
            "page": title,
            "prop": "text",
            "format": "json",
            "formatversion": 2,
            "variant": "zh-hans",
        },
        timeout=90,
    )
    response.raise_for_status()
    payload = response.json()
    if "error" in payload:
        raise RuntimeError(f"Cannot load {title}: {payload['error']}")
    return BeautifulSoup(payload["parse"]["text"], "html.parser")


def clean(value: str) -> str:
    return re.sub(r"\s+", "", value).replace("－", "-").replace("～", "至")


def normalize_name(value: str) -> tuple[str, str]:
    name = clean(value)
    if name in NAME_OVERRIDES:
        return NAME_OVERRIDES[name]
    match = re.fullmatch(r"(.+?)一作[“\"](.+?)[”\"]", name)
    if match:
        return match.group(1), match.group(2)
    return name.replace("覚", "觉"), ""


def heritage_name_key(value: str) -> str:
    name, _ = normalize_name(value)
    name = name.replace("造象", "造像").replace("旧阯", "旧址")
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]", "", name)


def classify_period(era: str, name: str = "") -> str:
    if name in PERIOD_OVERRIDES:
        return PERIOD_OVERRIDES[name]
    value = clean(era)
    if not value or re.search(r"不详|未载|未知", value):
        return "其他"
    if "以前" in value:
        return "其他"
    groups = (
        ("史前", r"旧石器|新石器|史前|更新世|古生代"),
        ("夏商周", r"先秦|(?<!西)夏|商|西周|东周|(?<!北|后)周|春秋|战国|青铜时代"),
        ("秦汉", r"秦|汉|新莽"),
        ("魏晋南北朝", r"三国|魏|晋|十六国|南北朝|南朝|北朝|北魏|东魏|西魏|北齐|北周|高句丽"),
        ("隋唐五代", r"隋|唐|五代|后周|吐蕃|南诏|渤海"),
        ("宋辽金西夏", r"宋|辽|金|西夏|大理"),
        ("元", r"(?<!公)元"),
        ("明", r"明"),
        ("清", r"清"),
        ("近代", r"民国|近现代|近代"),
        ("现代", r"中华人民共和国|现代|当代|至今"),
    )
    for label, pattern in groups:
        if re.search(pattern, value):
            return label
    years = [int(match.group(1)) for match in re.finditer(r"(?<!公元前)(\d{3,4})年?", value)]
    if years:
        earliest = min(years)
        if earliest >= 1949:
            return "现代"
        if earliest >= 1840:
            return "近代"
    return "其他"


def row_cells(row) -> list[str]:
    return [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"], recursive=False)]


def leading_integer(value: str) -> int | None:
    match = re.match(r"\D*(\d+)", value)
    return int(match.group(1)) if match else None


def category_from_heading(heading: str) -> str:
    if "古遗址" in heading:
        return "古遗址"
    if "古墓葬" in heading:
        return "古墓葬"
    if "古建筑" in heading:
        return "古建筑"
    if "石窟寺" in heading or "石刻" in heading:
        return "石窟寺及石刻"
    if "近现代" in heading or "革命遗址" in heading:
        return "近现代重要史迹及代表性建筑"
    if "其他" in heading:
        return "其他"
    return "未分类"


def primary_province(address: str) -> str:
    if address.startswith("新疆生产建设兵团"):
        return "新疆维吾尔自治区"
    historical_names = {
        "广西僮族自治区": "广西壮族自治区",
        "新疆维吾尔自区": "新疆维吾尔自治区",
    }
    for prefix, province in historical_names.items():
        if address.startswith(prefix):
            return province
    for province in PROVINCES:
        if address.startswith(province):
            return province
    return "其他"


def region_base(value: str) -> str:
    return re.sub(r"(自治州|地区|自治县|特区|林区|矿区|新区|市|县|区|旗|盟)$", "", clean(value))


def fetch_csv(session: requests.Session, url: str) -> list[dict[str, str]]:
    filename = "current-divisions.csv" if url == CURRENT_DIVISIONS_URL else "historical-divisions.csv"
    return list(csv.DictReader(io.StringIO(fetch_cached(session, url, filename).decode("utf-8-sig"))))


def fetch_cached(session: requests.Session, url: str, filename: str) -> bytes:
    path = CACHE_DIR / filename
    if path.exists():
        return path.read_bytes()
    response = session.get(url, timeout=180)
    response.raise_for_status()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_bytes(response.content)
    return response.content


def load_admin_divisions(session: requests.Session) -> dict:
    current_rows = fetch_csv(session, CURRENT_DIVISIONS_URL)
    historical_rows = fetch_csv(session, HISTORICAL_DIVISIONS_URL)
    heritage_kml = fetch_cached(session, HERITAGE_KML_URL, "heritage-locations.kml")
    point_code_path = DATA_DIR / "location_codes.json"
    point_codes = json.loads(point_code_path.read_text(encoding="utf-8")) if point_code_path.exists() else {}

    provinces_by_code = {
        row["code_6"]: row["name"] for row in current_rows if row["level"] == "1"
    }
    cities_by_code = {
        row["code_6"]: row["name"] for row in current_rows if row["level"] == "2"
    }
    counties_by_code = {}
    prefectures = defaultdict(set)
    county_parent_codes = set()
    for row in current_rows:
        if row["level"] != "3":
            continue
        code = row["code_6"]
        province = provinces_by_code.get(f"{code[:2]}0000")
        district = row["name"]
        if not province:
            continue
        if province in MUNICIPALITIES:
            city = province
        else:
            city = cities_by_code.get(row["parent_code_6"])
            if not city:
                city = "自治区直辖县级行政区" if province.endswith("自治区") else "省直辖县级行政区"
            city = GENERIC_PREFECTURE_LABELS.get(city, city)
        location = {"province": province, "city": city, "district": district}
        counties_by_code[code] = location
        prefectures[province].add(city)
        county_parent_codes.add(row["parent_code_6"])

    direct_prefectures = set()
    for code, city in cities_by_code.items():
        province = provinces_by_code.get(f"{code[:2]}0000")
        if not province:
            continue
        prefectures[province].add(city)
        if code not in county_parent_codes:
            direct_prefectures.add((province, city))

    successors = {}
    county_rows = []
    for row in historical_rows:
        if row["级别"] != "县级":
            continue
        county_rows.append(row)
        successors[row["代码"]] = re.findall(r"\d{6}", row["新代码"])

    def current_successors(code: str, seen: frozenset[str] = frozenset()) -> set[str]:
        if code in counties_by_code:
            return {code}
        if code in seen:
            return set()
        results = set()
        for next_code in successors.get(code, []):
            results.update(current_successors(next_code, seen | {code}))
        return results

    aliases = defaultdict(set)
    alias_context = defaultdict(lambda: defaultdict(set))
    for code, location in counties_by_code.items():
        aliases[location["district"]].add(code)
        alias_context[location["district"]][location["province"]].add(code)
    for row in county_rows:
        name = clean(row["名称"])
        aliases[name]
        targets = current_successors(row["代码"])
        if not targets:
            continue
        aliases[name].update(targets)
        alias_context[name][clean(row["一级行政区"])].update(targets)

    ignored_aliases = {"市辖区", "城区", "郊区", "矿区", "新区", "市区", "县"}
    alias_names = sorted(
        (name for name in aliases if len(name) >= 2 and name not in ignored_aliases),
        key=len,
        reverse=True,
    )
    heritage_references = defaultdict(list)
    heritage_references_by_name = defaultdict(list)
    heritage_references_by_key = defaultdict(list)
    pack_numbers = {
        "第一批": 1, "第二批": 2, "第三批": 3, "第四批": 4,
        "第五批": 5, "第六批": 6, "第七批": 7, "第八批": 8,
    }
    root = ET.fromstring(heritage_kml)
    namespace = {"kml": "http://www.opengis.net/kml/2.2"}
    for placemark in root.findall(".//kml:Placemark", namespace):
        values = {
            field.attrib.get("name", ""): clean(field.text or "")
            for field in placemark.findall(".//kml:SimpleData", namespace)
        }
        code = values.get("Cnum", "")
        if code:
            heritage_references[code].append(values)
        reference_name, _ = normalize_name(values.get("NameCN", ""))
        batch = pack_numbers.get(values.get("PackCN", ""))
        if batch and reference_name:
            heritage_references_by_name[(batch, reference_name)].append(values)
            heritage_references_by_key[(batch, heritage_name_key(reference_name))].append(values)
    return {
        "counties_by_code": counties_by_code,
        "aliases": aliases,
        "alias_context": alias_context,
        "alias_names": alias_names,
        "prefectures": prefectures,
        "direct_prefectures": direct_prefectures,
        "all_prefecture_names": {name for names in prefectures.values() for name in names},
        "heritage_references": heritage_references,
        "heritage_references_by_name": heritage_references_by_name,
        "heritage_references_by_key": heritage_references_by_key,
        "point_codes": point_codes,
    }


def summarize_locations(codes: set[str], admin: dict) -> dict[str, str] | None:
    locations = [admin["counties_by_code"][code] for code in sorted(codes) if code in admin["counties_by_code"]]
    if not locations:
        return None
    provinces = sorted({item["province"] for item in locations})
    if len(provinces) > 1:
        return {"province": "跨省级行政区", "city": "跨地级行政区", "district": "跨县级行政区"}
    cities = sorted({item["city"] for item in locations})
    if len(cities) > 1:
        return {"province": provinces[0], "city": "跨地级行政区", "district": "跨县级行政区"}
    districts = sorted({item["district"] for item in locations})
    return {
        "province": provinces[0],
        "city": cities[0],
        "district": districts[0] if len(districts) == 1 else "跨县级行政区",
    }


def resolve_current_location(
    heritage_code: str,
    batch: int,
    name: str,
    original_province: str,
    raw_city: str,
    raw_district: str,
    notice_location: str,
    admin: dict,
) -> dict[str, str]:
    override = CURRENT_LOCATION_OVERRIDES.get(heritage_code)
    if override:
        return dict(zip(("province", "city", "district"), override))
    if not re.search(r"[、，,及和]", notice_location):
        point_location = summarize_locations(set(admin["point_codes"].get(heritage_code, [])), admin)
        notice_province = primary_province(notice_location)
        if point_location and (
            notice_province not in PROVINCES or point_location["province"] == notice_province
        ):
            return point_location
    references = [
        *admin["heritage_references"].get(heritage_code, []),
        *admin["heritage_references_by_name"].get((batch, name), []),
        *admin["heritage_references_by_key"].get((batch, heritage_name_key(name)), []),
    ]
    source_province = clean(original_province) or primary_province(notice_location)
    notice_province = primary_province(notice_location)
    notice_cities = [
        city
        for city in admin["prefectures"].get(notice_province, set())
        if city in notice_location
    ]
    notice_city = notice_cities[0] if len(notice_cities) == 1 else ""
    hints = [
        (clean(raw_district), source_province, notice_city or clean(raw_city)),
        (clean(notice_location), notice_province, notice_city),
        (clean(raw_city), source_province, notice_city),
        *(
            (
                reference.get("CADCN", ""),
                reference.get("PADCN", ""),
                reference.get("MADCN", ""),
            )
            for reference in references
        ),
        *((reference.get("AddCN", ""), source_province, "") for reference in references),
        (clean(name), source_province, clean(raw_city)),
    ]
    mentioned_provinces = {province for province in PROVINCES if province in notice_location}
    if len(mentioned_provinces) > 1:
        return {"province": "跨省级行政区", "city": "跨地级行政区", "district": "跨县级行政区"}

    for hint, province_context, city_context in hints:
        if not hint:
            continue
        normalized_hint = hint
        for province_name in PROVINCES:
            normalized_hint = normalized_hint.replace(province_name, "")
        if normalized_hint in admin["all_prefecture_names"]:
            continue
        hint = hint.replace("扎达县", "札达县").replace("浮粱县", "浮梁县")
        matches = [
            alias
            for alias in admin["alias_names"]
            if alias in hint and alias not in admin["all_prefecture_names"]
        ]
        if not matches:
            continue
        longest = len(matches[0])
        matches = [alias for alias in matches if len(alias) == longest]
        codes = set()
        for alias in matches:
            contextual = admin["alias_context"][alias].get(province_context, set())
            codes.update(contextual or admin["aliases"][alias])
        if city_context:
            city_base = region_base(city_context)
            city_codes = {
                code
                for code in codes
                if region_base(admin["counties_by_code"][code]["city"]) == city_base
                or admin["counties_by_code"][code]["city"] in city_context
            }
            if city_codes:
                codes = city_codes
        resolved = summarize_locations(codes, admin)
        if resolved:
            return resolved

    province = primary_province(notice_location) if notice_location else clean(original_province)
    if province in MUNICIPALITIES:
        return {"province": province, "city": province, "district": "县级行政区待核实"}
    city_candidate = clean(raw_city) or clean(notice_location)
    candidate_base = region_base(city_candidate)
    city_matches = {
        city
        for city in admin["prefectures"].get(province, set())
        if city in city_candidate or region_base(city) == candidate_base
    }
    if len(city_matches) == 1:
        city = next(iter(city_matches))
        district = "不设县级行政区" if (province, city) in admin["direct_prefectures"] else "县级行政区待核实"
        return {"province": province, "city": city, "district": district}
    if province in admin["prefectures"]:
        return {"province": province, "city": "地级行政区待核实", "district": "县级行政区待核实"}
    return {"province": "省级行政区待核实", "city": "地级行政区待核实", "district": "县级行政区待核实"}


def data_tables(soup: BeautifulSoup) -> list:
    return [table for table in soup.find_all("table") if len(table.find_all("tr")) > 20]


def parse_notice_units(batch: int, soup: BeautifulSoup) -> dict[int, dict[str, str]]:
    table = data_tables(soup)[0]
    units: dict[int, dict[str, str]] = {}
    category = "未分类"
    for row in table.find_all("tr"):
        cells = row_cells(row)
        if len(cells) == 1:
            category = category_from_heading(cells[0])
            continue
        if len(cells) < 5 or clean(cells[0]) in {"编号", "序号"}:
            continue
        serial = leading_integer(clean(cells[0]))
        if serial is None:
            continue
        units[serial] = {
            "name": clean(cells[2]),
            "era": clean(cells[3]),
            "location": clean(cells[4]),
            "notice_category": category,
        }
    expected = EXPECTED_NOTICE[batch]
    if len(units) != expected:
        raise AssertionError(f"Batch {batch}: parsed {len(units)} notice rows, expected {expected}")
    return units


def parse_merged_table(batch: int, table, admin: dict) -> list[dict[str, str | int | bool]]:
    units = []
    category = "未分类"
    for row in table.find_all("tr"):
        cells = row_cells(row)
        if len(cells) == 1:
            category = category_from_heading(cells[0])
            continue
        if len(cells) not in {5, 6} or clean(cells[0]) in {"编号", "序号"}:
            continue
        serial = leading_integer(clean(cells[0]))
        if serial is None:
            continue
        if len(cells) == 6:
            code, name, era, location, remark = cells[1:]
        else:
            code, name, era, location, remark = "", *cells[1:]
        location = clean(location)
        name, alias = normalize_name(name)
        current = resolve_current_location(
            f"merge-{batch}-{serial:03d}", batch, name, primary_province(location), location, "", location, admin
        )
        units.append({
            "id": f"merge-{batch}-{serial:03d}",
            "code": clean(code),
            "name": name,
            "alias": alias,
            "batch": batch,
            "year": {4: 1996, 5: 2001, 6: 2006, 7: 2013, 8: 2019}[batch],
            "category": category,
            "era": clean(era),
            "period": classify_period(era, name),
            **current,
            "location": location,
            "kind": "merged",
            "remark": clean(remark),
            "source": SOURCE_URLS[batch],
        })
    return units


def load_standardized_items(source_root: Path) -> list[dict]:
    items = []
    for path in sorted((source_root / "data" / "national-level").glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            items.extend(json.load(handle)["items"])
    # Batch 8's 50 merged projects are stored alongside independent units in
    # the upstream files. The second Batch 7 Babaoshan row is a known duplicate.
    return [
        item for item in items
        if "-0000-" not in item["id"] and item["id"] != "7-1944-5-331"
    ]


def build_base_items(standardized: list[dict], notices: dict[int, dict[int, dict]], admin: dict) -> list[dict]:
    results = []
    years = {1: 1961, 2: 1982, 3: 1988, 4: 1996, 5: 2001, 6: 2006, 7: 2013, 8: 2019}
    for item in standardized:
        batch = int(item["batch"])
        serial = int(item["id"].split("-")[1])
        notice = notices[batch].get(serial)
        fallback_location = clean(f"{item.get('province', '')}{item.get('city', '')}")
        location = notice["location"] if notice else fallback_location
        era = (notice["era"] if notice else "") or clean(item.get("era", ""))
        name, alias = normalize_name(notice["name"] if notice else item["name"])
        current = resolve_current_location(
            item["id"],
            batch,
            name,
            clean(item.get("province", "")),
            clean(item.get("city", "")),
            clean(item.get("district", "")),
            location,
            admin,
        )
        results.append({
            "id": item["id"],
            "code": item["id"],
            "name": name,
            "alias": alias,
            "batch": batch,
            "year": years[batch],
            "category": CATEGORY_LABELS.get(item.get("category", ""), "未分类"),
            "period": classify_period(era, name),
            "era": era,
            **current,
            "location": location,
            "kind": "unit",
            "remark": BASE_REMARK_OVERRIDES.get(
                item["id"], "增补项目" if serial > EXPECTED_NOTICE[batch] else ""
            ),
            "source": SOURCE_URLS[batch],
        })
    return results


def batch4_merged_items(admin: dict) -> list[dict]:
    results = []
    for serial, (raw_name, era, location, remark) in enumerate(BATCH4_MERGED, 1):
        name, alias = normalize_name(raw_name)
        current = resolve_current_location(
            f"merge-4-{serial:03d}", 4, name, primary_province(location), location, "", location, admin
        )
        results.append({
            "id": f"merge-4-{serial:03d}",
            "code": "",
            "name": name,
            "alias": alias,
            "batch": 4,
            "year": 1996,
            "category": "未分类",
            "era": era,
            "period": classify_period(era, name),
            **current,
            "location": location,
            "kind": "merged",
            "remark": remark,
            "source": SOURCE_URLS[4],
        })
    return results


def write_outputs(units: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    fields = (
        "id", "code", "name", "alias", "batch", "year", "category", "period", "era", "province",
        "city", "district", "location", "kind", "remark", "source", "visited", "visit_time", "notes",
    )
    with (DATA_DIR / "heritage.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for unit in units:
            writer.writerow({**unit, "visited": "", "visit_time": "", "notes": ""})
    payload = json.dumps(units, ensure_ascii=False, separators=(",", ":"))
    (DATA_DIR / "units.js").write_text(
        f"window.HERITAGE_UNITS={payload};\n", encoding="utf-8"
    )


def main() -> None:
    session = http_session()
    admin = load_admin_divisions(session)
    soups = {batch: fetch_notice(session, title) for batch, title in PAGES.items()}
    notices = {batch: parse_notice_units(batch, soup) for batch, soup in soups.items()}

    with tempfile.TemporaryDirectory(prefix="heritage-source-") as temp_dir:
        subprocess.run(
            ["git", "clone", "--depth", "1", "--quiet", SOURCE_REPOSITORY, temp_dir],
            check=True,
        )
        standardized = load_standardized_items(Path(temp_dir))

    base = build_base_items(standardized, notices, admin)
    base_counts = Counter(item["batch"] for item in base)
    if dict(sorted(base_counts.items())) != EXPECTED_BASE:
        raise AssertionError(f"Base counts do not match: {dict(base_counts)}")

    merged = batch4_merged_items(admin)
    for batch in range(5, 9):
        merge_tables = data_tables(soups[batch])[1:]
        if len(merge_tables) != 1:
            raise AssertionError(f"Batch {batch}: expected one merged-project table")
        merged.extend(parse_merged_table(batch, merge_tables[0], admin))
    merged_counts = Counter(item["batch"] for item in merged)
    if dict(sorted(merged_counts.items())) != EXPECTED_MERGED:
        raise AssertionError(f"Merged counts do not match: {dict(merged_counts)}")

    units = sorted(
        base + merged,
        key=lambda item: (item["batch"], item["kind"] == "merged", item["id"]),
    )
    if len(units) != 5296 or len({item["id"] for item in units}) != len(units):
        raise AssertionError("Expected 5,296 unique rows")
    write_outputs(units)
    print(f"Wrote {len(base)} independent units and {len(merged)} merged projects")
    print("Base by batch:", dict(sorted(base_counts.items())))
    print("Merged by batch:", dict(sorted(merged_counts.items())))


if __name__ == "__main__":
    main()
