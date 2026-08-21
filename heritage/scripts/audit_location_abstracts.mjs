import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = path.join(root, 'data', '.cache', 'location-abstract-audit.json');
const reportPath = path.join(root, 'data', '.cache', 'location-audit-review.csv');
const exclusionsPath = path.join(root, 'data', 'location-audit-exclusions.json');
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function loadWindowData(source, key) {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window[key];
}

function csvRows(source) {
  const lines = source.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function maximalHits(text, names) {
  return names.filter((name) => text.includes(name))
    .filter((name, _, hits) => !hits.some((longer) => longer.includes(name) && longer.length > name.length));
}

function locationExcerpt(abstract) {
  const text = String(abstract || '').replace(/\s+/g, ' ');
  const match = text.match(/(?:位于|坐落于|地处|地址为|位在)([^。；;]{0,120})/);
  return match ? match[1] : '';
}

async function readJson(filename, fallback) {
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function fetchAbstract(name) {
  const url = new URL('https://baike.baidu.com/api/openapi/BaikeLemmaCardApi');
  Object.entries({ scope: '103', format: 'json', appid: '379020', bk_key: name, bk_length: '1200' })
    .forEach(([key, value]) => url.searchParams.set(key, value));
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await sleep(80);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'KangarooGao-Heritage-Location-Auditor/1.0 (https://kangaroogao.com/heritage/)' },
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 429 || response.status >= 500) {
        await sleep(1500 * 2 ** attempt);
        continue;
      }
      if (!response.ok) return null;
      const data = await response.json();
      return data?.title && data?.abstract ? { title: data.title, abstract: data.abstract } : null;
    } catch (error) {
      if (attempt === 4) return null;
      await sleep(1000 * 2 ** attempt);
    }
  }
  return null;
}

const units = loadWindowData(await fs.readFile(path.join(root, 'data', 'units.js'), 'utf8'), 'HERITAGE_UNITS');
const divisions = csvRows(await fs.readFile(path.join(root, 'data', '.cache', 'current-divisions.csv'), 'utf8'));
const divisionByCode = new Map(divisions.map((row) => [row.code_6, row]));
const provinceByPrefix = new Map(divisions.filter((row) => row.level === '1').map((row) => [row.code_6.slice(0, 2), row.name]));
const countiesByProvince = new Map();
const citiesByProvince = new Map();

for (const row of divisions) {
  const province = provinceByPrefix.get(row.code_6.slice(0, 2));
  if (!province) continue;
  if (row.level === '2') {
    if (!citiesByProvince.has(province)) citiesByProvince.set(province, []);
    citiesByProvince.get(province).push(row.name);
  }
  if (row.level === '3') {
    const parent = divisionByCode.get(row.parent_code_6);
    const city = parent?.level === '1' ? province : parent?.name;
    if (!city) continue;
    if (!countiesByProvince.has(province)) countiesByProvince.set(province, []);
    countiesByProvince.get(province).push({ name: row.name, city });
  }
}

const progress = await readJson(cachePath, {});
const exclusions = await readJson(exclusionsPath, {});
const remaining = units.filter((unit) => !Object.hasOwn(progress, unit.id));
let checked = 0;
let cursor = 0;
async function worker() {
  while (cursor < remaining.length) {
    const unit = remaining[cursor];
    cursor += 1;
    progress[unit.id] = await fetchAbstract(unit.name);
    checked += 1;
    if (checked % 100 === 0) {
      await fs.writeFile(cachePath, `${JSON.stringify(progress)}\n`, 'utf8');
      console.log(`[百科地址] 本次 ${checked}，总计 ${Object.keys(progress).length} / ${units.length}`);
    }
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
await fs.writeFile(cachePath, `${JSON.stringify(progress)}\n`, 'utf8');

const findings = [];
for (const unit of units) {
  if (Object.hasOwn(exclusions, unit.id)) continue;
  if (unit.province.startsWith('跨') || unit.city.startsWith('跨') || unit.district.startsWith('跨')) continue;
  const entry = progress[unit.id];
  const excerpt = locationExcerpt(entry?.abstract);
  if (!excerpt) continue;
  const cityHits = maximalHits(excerpt, citiesByProvince.get(unit.province) || []);
  const countyItems = countiesByProvince.get(unit.province) || [];
  const countyHits = maximalHits(excerpt, countyItems.map((item) => item.name));
  const countyLocations = countyItems.filter((item) => countyHits.includes(item.name));
  const cityMismatch = cityHits.length === 1 && cityHits[0] !== unit.city;
  const sameCityCountyHits = countyLocations.filter((item) => item.city === unit.city).map((item) => item.name);
  const countyMismatch = sameCityCountyHits.length === 1 && sameCityCountyHits[0] !== unit.district;
  if (!cityMismatch && !countyMismatch) continue;
  findings.push({
    id: unit.id,
    name: unit.name,
    current: unit.current_location,
    candidate: cityMismatch
      ? `${unit.province} · ${cityHits[0]}`
      : `${unit.province} · ${unit.city} · ${sameCityCountyHits[0]}`,
    title: entry.title,
    excerpt,
  });
}

const rows = [['编号', '名称', '当前地址', '百科候选地址', '词条标题', '地址摘要'], ...findings.map((item) => Object.values(item))];
await fs.writeFile(reportPath, `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');
console.log(`[完成] 抓取 ${Object.keys(progress).length} 项，发现 ${findings.length} 项需要人工复核。`);
