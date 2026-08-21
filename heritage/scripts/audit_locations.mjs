import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadWindowData(filename, key) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
  return context.window[key];
}

function csvRows(filename) {
  const lines = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function kmlFields(block) {
  return Object.fromEntries([...block.matchAll(/<SimpleData name="([^"]+)">([\s\S]*?)<\/SimpleData>/g)]
    .map((match) => [match[1], match[2].replaceAll('&amp;', '&').replaceAll('&apos;', "'")]));
}

const units = loadWindowData(path.join(root, 'data', 'units.js'), 'HERITAGE_UNITS');
const divisions = csvRows(path.join(root, 'data', '.cache', 'current-divisions.csv'));
const kml = fs.readFileSync(path.join(root, 'data', '.cache', 'heritage-locations.kml'), 'utf8');
const packNumbers = new Map([
  ['第一批', 1], ['第二批', 2], ['第三批', 3], ['第四批', 4],
  ['第五批', 5], ['第六批', 6], ['第七批', 7], ['第八批', 8],
]);
const municipalities = new Set(['北京市', '天津市', '上海市', '重庆市']);
const provinceByPrefix = new Map(divisions
  .filter((row) => row.level === '1')
  .map((row) => [row.code_6.slice(0, 2), row.name]));
const citiesByProvince = new Map();
const countyKeys = new Set();
const divisionByCode = new Map(divisions.map((row) => [row.code_6, row]));

for (const row of divisions) {
  const province = provinceByPrefix.get(row.code_6.slice(0, 2));
  if (!province) continue;
  if (row.level === '2') {
    if (!citiesByProvince.has(province)) citiesByProvince.set(province, []);
    citiesByProvince.get(province).push(row.name);
  }
  if (row.level === '3' && row.parent_code_6) {
    const parent = divisionByCode.get(row.parent_code_6);
    const city = parent?.level === '1' ? province : parent?.name;
    if (city) countyKeys.add(`${province}|${city}|${row.name}`);
  }
}

const structural = units.filter((unit) => unit.district
  && !unit.district.startsWith('跨')
  && !['不设县级行政区'].includes(unit.district)
  && !['省直辖县级行政区', '自治区直辖县级行政区'].includes(unit.city)
  && !countyKeys.has(`${unit.province}|${unit.city}|${unit.district}`));

const unitByName = new Map(units.map((unit) => [`${unit.batch}|${unit.name}`, unit]));
const conflicts = [];
for (const match of kml.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/g)) {
  const fields = kmlFields(match[0]);
  const batch = packNumbers.get(fields.PackCN);
  const unit = unitByName.get(`${batch}|${fields.NameCN}`);
  if (!unit || !fields.AddCN || !fields.MADCN) continue;
  const province = fields.PADCN || unit.province;
  const cityHits = (citiesByProvince.get(province) || []).filter((city) => fields.AddCN.includes(city));
  if (cityHits.length !== 1 || cityHits[0] === fields.MADCN) continue;
  conflicts.push({
    id: unit.id,
    name: unit.name,
    notice: fields.AddCN,
    kml: [fields.PADCN, fields.MADCN, fields.CADCN].filter(Boolean).join(' · '),
    current: unit.current_location,
  });
}

console.log(`units=${units.length}`);
console.log(`invalid_current_hierarchy=${structural.length}`);
for (const unit of structural) console.log(`  ${unit.id}\t${unit.name}\t${unit.current_location}`);
console.log(`kml_notice_conflicts=${conflicts.length}`);
for (const item of conflicts) {
  console.log(`  ${item.id}\t${item.name}\t公告=${item.notice}\tKML=${item.kml}\t当前=${item.current}`);
}

if (structural.length) process.exitCode = 1;
