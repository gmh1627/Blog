"""Build a browsable 1st-8th batch national heritage dataset.

The standardized identifiers/categories come from the CC BY 4.0
china-cultural-heritage project. Names, eras, and locations are refreshed from
the Wikisource copies of the State Council notices, which are public-domain
government documents. Run this script from any working directory.
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import tempfile
from collections import Counter
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
WIKISOURCE_API = "https://zh.wikisource.org/w/api.php"
SOURCE_REPOSITORY = "https://github.com/lingdian1226/china-cultural-heritage.git"

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


def classify_period(era: str) -> str:
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


def parse_merged_table(batch: int, table) -> list[dict[str, str | int | bool]]:
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
        units.append({
            "id": f"merge-{batch}-{serial:03d}",
            "code": clean(code),
            "name": name,
            "alias": alias,
            "batch": batch,
            "year": {4: 1996, 5: 2001, 6: 2006, 7: 2013, 8: 2019}[batch],
            "category": category,
            "era": clean(era),
            "period": classify_period(era),
            "province": primary_province(location),
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


def build_base_items(standardized: list[dict], notices: dict[int, dict[int, dict]]) -> list[dict]:
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
        results.append({
            "id": item["id"],
            "code": item["id"],
            "name": name,
            "alias": alias,
            "batch": batch,
            "year": years[batch],
            "category": CATEGORY_LABELS.get(item.get("category", ""), "未分类"),
            "period": classify_period(era),
            "era": era,
            "province": primary_province(location),
            "location": location,
            "kind": "unit",
            "remark": "增补项目" if serial > EXPECTED_NOTICE[batch] else "",
            "source": SOURCE_URLS[batch],
        })
    return results


def batch4_merged_items() -> list[dict]:
    results = []
    for serial, (raw_name, era, location, remark) in enumerate(BATCH4_MERGED, 1):
        name, alias = normalize_name(raw_name)
        results.append({
            "id": f"merge-4-{serial:03d}",
            "code": "",
            "name": name,
            "alias": alias,
            "batch": 4,
            "year": 1996,
            "category": "未分类",
            "era": era,
            "period": classify_period(era),
            "province": primary_province(location),
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
        "location", "kind", "remark", "source", "visited", "visit_time", "notes",
    )
    with (DATA_DIR / "全国重点文物保护单位.csv").open("w", encoding="utf-8-sig", newline="") as handle:
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
    soups = {batch: fetch_notice(session, title) for batch, title in PAGES.items()}
    notices = {batch: parse_notice_units(batch, soup) for batch, soup in soups.items()}

    with tempfile.TemporaryDirectory(prefix="heritage-source-") as temp_dir:
        subprocess.run(
            ["git", "clone", "--depth", "1", "--quiet", SOURCE_REPOSITORY, temp_dir],
            check=True,
        )
        standardized = load_standardized_items(Path(temp_dir))

    base = build_base_items(standardized, notices)
    base_counts = Counter(item["batch"] for item in base)
    if dict(sorted(base_counts.items())) != EXPECTED_BASE:
        raise AssertionError(f"Base counts do not match: {dict(base_counts)}")

    merged = batch4_merged_items()
    for batch in range(5, 9):
        merge_tables = data_tables(soups[batch])[1:]
        if len(merge_tables) != 1:
            raise AssertionError(f"Batch {batch}: expected one merged-project table")
        merged.extend(parse_merged_table(batch, merge_tables[0]))
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
