import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const heritageRoot = resolve(scriptRoot, '..');
const unitsPath = resolve(heritageRoot, 'data', 'units.js');
const source = (await readFile(unitsPath, 'utf8')).trim();
const prefix = 'window.HERITAGE_UNITS=';
if (!source.startsWith(prefix) || !source.endsWith(';')) {
  throw new Error('data/units.js format is invalid');
}

const allUnits = JSON.parse(source.slice(prefix.length, -1));
const baseUnits = allUnits.filter((unit) => unit.kind === 'unit');
const mergedUnits = allUnits.filter((unit) => unit.kind === 'merged');
if (baseUnits.length !== 5058 || mergedUnits.length !== 238) {
  throw new Error(`Expected 5,058 base units and 238 merge rows, got ${baseUnits.length} and ${mergedUnits.length}`);
}

const batchYears = new Map([[1, 1961], [2, 1982], [3, 1988], [4, 1996], [5, 2001], [6, 2006], [7, 2013], [8, 2019]]);
const batchCharacters = new Map([['一', 1], ['二', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7], ['八', 8]]);
const targetNameOverrides = new Map([
  ['宋东京城遗址', '北宋东京城遗址'],
  ['北山摩崖造象', '北山摩崖造像'],
  ['宝顶山摩崖造象', '宝顶山摩崖造像'],
  ['丸都山城', '丸都山故城'],
  ['湖田窑遗址', '湖田古瓷窑址'],
  ['辽陵及奉陵邑', '辽陵及奉陵邑（包括祖陵及祖州城、庆陵及庆州城）'],
  ['老君岩', '老君岩造像'],
  ['庐山别墅建筑群', '庐山会议旧址及庐山别墅建筑群'],
  ['屈斗宫德化窑', '屈斗宫德化窑遗址（包括浔中、盖德、三班）'],
  ['蜀王陵', '明蜀王陵'],
  ['兴城古城墙', '兴城城墙'],
  ['明中都皇故城皇陵石刻', '明中都皇故城及皇陵石刻'],
  ['广元千佛岩摩崖造像', '广元千佛崖摩崖造像'],
  ['广元千佛崖摩崖造象', '广元千佛崖摩崖造像'],
  ['库木吐拉千佛洞', '库木吐喇千佛洞'],
  ['浙江秋瑾故居', '秋瑾故居'],
  ['西狭颂摩崖石刻', '西峡颂摩崖石刻'],
]);

const roots = new Map();
const aliasToRoots = new Map();
const relationAssignments = new Map();

function addAlias(name, rootId) {
  const value = String(name || '').trim();
  if (!value) return;
  if (!aliasToRoots.has(value)) aliasToRoots.set(value, new Set());
  aliasToRoots.get(value).add(rootId);
}

for (const unit of baseUnits) {
  roots.set(unit.id, {
    id: unit.id,
    unit: { ...unit },
    baseUnits: [unit],
    mergedUnits: [],
    currentName: unit.name,
    searchTerms: new Set([unit.name, unit.alias].filter(Boolean)),
  });
  addAlias(unit.name, unit.id);
  addAlias(unit.alias, unit.id);
}

function targetBatch(remark) {
  const match = String(remark || '').match(/第([一二三四五六七八])批全国重点文物保护单位/);
  return match ? batchCharacters.get(match[1]) : null;
}

function targetNames(remark) {
  const value = String(remark || '');
  const match = value.match(/(?:归入|并入)(.+?)(?=[，。；]|$)/) || value.match(/与(.+?)合并/);
  if (!match) return [];
  const cleaned = match[1].replace(/^第[一二三四五六七八]批全国重点文物保护单位/, '').trim();
  if (cleaned === '冯焕阙、沈府君阙') return ['冯焕阙', '沈府君阙'];
  return [cleaned];
}

function resultingName(remark) {
  const value = String(remark || '');
  const match = value.match(/名称[：:]([^。；]+)/) || value.match(/更名为([^。；]+)/) || value.match(/名称改为([^。；]+)/);
  return match ? match[1].replace(/[，。；]$/g, '').trim() : '';
}

function findRoot(name, batch, province) {
  const normalized = targetNameOverrides.get(name) || name;
  const candidates = [...(aliasToRoots.get(normalized) || [])]
    .map((id) => roots.get(id))
    .filter(Boolean);
  if (!candidates.length) return null;
  const byBatch = batch ? candidates.filter((root) => root.unit.batch === batch) : candidates;
  const byProvince = (byBatch.length ? byBatch : candidates).filter((root) => root.unit.province === province);
  const narrowed = byProvince.length ? byProvince : (byBatch.length ? byBatch : candidates);
  if (narrowed.length !== 1) {
    throw new Error(`Ambiguous merge target ${name}: ${narrowed.map((root) => root.id).join(', ')}`);
  }
  return narrowed[0];
}

function mergeRoots(primary, secondary) {
  if (primary.id === secondary.id) return primary;
  primary.baseUnits.push(...secondary.baseUnits);
  primary.mergedUnits.push(...secondary.mergedUnits);
  secondary.searchTerms.forEach((value) => primary.searchTerms.add(value));
  for (const [alias, ids] of aliasToRoots) {
    if (!ids.delete(secondary.id)) continue;
    ids.add(primary.id);
    aliasToRoots.set(alias, ids);
  }
  for (const [mergeId, rootId] of relationAssignments) {
    if (rootId === secondary.id) relationAssignments.set(mergeId, primary.id);
  }
  roots.delete(secondary.id);
  return primary;
}

function detachDashengFactory() {
  const previous = mergedUnits.find((unit) => unit.id === 'merge-6-063');
  const oldRootId = relationAssignments.get(previous.id);
  const oldRoot = roots.get(oldRootId);
  if (!oldRoot) throw new Error('Could not detach 大生纱厂 from 南通博物苑');
  oldRoot.mergedUnits = oldRoot.mergedUnits.filter((unit) => unit.id !== previous.id);
  oldRoot.searchTerms.delete(previous.name);

  const root = {
    id: previous.id,
    unit: { ...previous, batch: 6, year: batchYears.get(6), kind: 'unit' },
    baseUnits: [],
    mergedUnits: [previous],
    currentName: '大生纱厂',
    searchTerms: new Set([previous.name]),
  };
  roots.set(root.id, root);
  aliasToRoots.set('大生纱厂', new Set([root.id]));
  relationAssignments.set(previous.id, root.id);
  return root;
}

for (const merged of mergedUnits) {
  let targets = targetNames(merged.remark);
  let resolved = [];

  if (merged.id === 'merge-7-1979') {
    resolved = [detachDashengFactory()];
  } else {
    resolved = targets.map((name) => findRoot(name, targetBatch(merged.remark), merged.province));
  }
  if (resolved.some((root) => !root)) {
    throw new Error(`Unresolved merge target for ${merged.id} ${merged.name}: ${targets.join('、')}`);
  }

  let root = resolved[0];
  for (const secondary of resolved.slice(1)) root = mergeRoots(root, secondary);
  root.mergedUnits.push(merged);
  root.searchTerms.add(merged.name);
  if (merged.alias) root.searchTerms.add(merged.alias);
  relationAssignments.set(merged.id, root.id);

  const currentName = resultingName(merged.remark);
  if (currentName) root.currentName = currentName;
  addAlias(merged.name, root.id);
  addAlias(currentName, root.id);
}

function unique(values) {
  return [...new Set(values.filter((value) => value && !String(value).startsWith('跨')))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

const municipalities = new Set(['北京市', '天津市', '上海市', '重庆市']);
const directCountyLabels = new Set(['省直辖县级行政区', '自治区直辖县级行政区']);

function cityEntries(unit, province) {
  if (unit.province !== province) return [];
  if (String(unit.city || '').startsWith('跨')) {
    const values = String(unit.current_location || '').split(' · ')[1] || '';
    return values.split('、').filter(Boolean).map((city) => ({ key: city, internal: city, display: city }));
  }
  if (municipalities.has(province) && unit.city === province) {
    return [{ key: province, internal: province, display: province }];
  }
  if (directCountyLabels.has(unit.city)) {
    return [{ key: unit.district, internal: unit.city, display: unit.district }];
  }
  return unit.city ? [{ key: unit.city, internal: unit.city, display: unit.city }] : [];
}

function locationText(province, city, district) {
  const parts = [province];
  if (city && city !== province && !directCountyLabels.has(city)) parts.push(city);
  if (district && district !== '不设县级行政区') parts.push(district);
  return parts.join(' · ');
}

function aggregateLocation(root, members) {
  const provinces = unique(members.flatMap((unit) => {
    if (!String(unit.province || '').startsWith('跨')) return [unit.province];
    return String(unit.current_location || '').split('、');
  }));
  if (provinces.length > 1) {
    return {
      province: '跨省级行政区', city: '跨地级行政区', district: '跨县级行政区',
      current_location: provinces.join('、'),
    };
  }

  const province = provinces[0] || root.unit.province;
  const cityMap = new Map();
  members.flatMap((unit) => cityEntries(unit, province)).forEach((entry) => cityMap.set(entry.key, entry));
  const cityItems = [...cityMap.values()].sort((a, b) => a.display.localeCompare(b.display, 'zh-CN'));
  if (cityItems.length > 1) {
    return {
      province, city: '跨地级行政区', district: '跨县级行政区',
      current_location: `${province} · ${cityItems.map((entry) => entry.display).join('、')}`,
    };
  }

  const cityItem = cityItems[0] || { key: root.unit.city, internal: root.unit.city, display: root.unit.city };
  const city = cityItem.internal;
  const districts = unique(members.flatMap((unit) => {
    if (!cityEntries(unit, province).some((entry) => entry.key === cityItem.key)) return [];
    if (!String(unit.district || '').startsWith('跨')) return [unit.district];
    const parts = String(unit.current_location || '').split(' · ');
    const value = municipalities.has(province) || directCountyLabels.has(unit.city) ? parts[1] : parts[2];
    return String(value || '').split('、');
  }));
  if (districts.length > 1) {
    return {
      province, city, district: '跨县级行政区',
      current_location: locationText(province, city, districts.join('、')),
    };
  }
  const district = districts[0] || root.unit.district;
  return {
    province, city, district,
    current_location: locationText(province, city, district),
  };
}

const canonicalUnits = [...roots.values()].map((root) => {
  const orderedBases = root.baseUnits.slice().sort((a, b) => a.batch - b.batch || a.id.localeCompare(b.id));
  const seed = orderedBases[0] || root.unit;
  const locationMembers = root.currentName !== seed.name || root.baseUnits.length > 1
    ? [...root.baseUnits, ...root.mergedUnits]
    : [seed];
  const recordIds = unique([
    root.id,
    ...root.baseUnits.map((unit) => unit.id),
    ...root.mergedUnits.map((unit) => unit.id),
  ]);
  const searchTerms = unique([...root.searchTerms]).filter((name) => name !== root.currentName);
  return {
    ...seed,
    id: root.id,
    name: root.currentName,
    alias: '',
    batch: seed.batch,
    year: batchYears.get(seed.batch),
    ...aggregateLocation(root, locationMembers),
    kind: 'unit',
    remark: seed.remark === '增补项目' ? seed.remark : '',
    record_ids: recordIds,
    search_terms: searchTerms.join(' '),
  };
}).sort((a, b) => a.batch - b.batch || a.id.localeCompare(b.id, 'zh-CN', { numeric: true }));

const relationRows = mergedUnits.map((unit) => {
  const root = roots.get(relationAssignments.get(unit.id));
  if (!root) throw new Error(`Missing canonical assignment for ${unit.id}`);
  return {
    id: unit.id,
    batch: unit.batch,
    year: unit.year,
    announced_name: unit.name,
    announced_location: unit.location,
    relation: unit.remark,
    canonical_id: root.id,
    canonical_name: root.currentName,
    canonical_batch: root.unit.batch,
    source: unit.source,
  };
});

function cell(value) {
  return String(value || '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

const batchCounts = new Map();
for (const row of relationRows) batchCounts.set(row.canonical_batch, (batchCounts.get(row.canonical_batch) || 0) + 1);
const document = [
  '# 全国重点文物保护单位合并记录',
  '',
  '> 本文档由 `scripts/build_merged_review.mjs` 自动生成，仅保存在本地，用于追溯第四至第八批公告中的合并关系。网页只显示现行合并单位，不显示合并过程。',
  '',
  '## 采用口径',
  '',
  `原始名录共 5,058 项，另有 ${mergedUnits.length} 条后续合并关系。网页以合并后的现行名称作为主名称，并归到主体最早获批的批次；原名称仍可用于网页搜索，但不单独显示。大生纱厂按第七批公告从南通博物苑中分出的现行关系单列。`,
  '',
  `折叠后网页共显示 **${canonicalUnits.length} 个现行单位**。`,
  '',
  '## 公告性质',
  '',
  '这些项目通常在对应批次的同一份国务院公布通知中，作为“与现有全国重点文物保护单位合并的项目”附表直接公布。它们不是先列入该批独立国保名单、再由另一份文件归入前批；在国家级名录层面，自公布时即按合并关系处理。个别项目后来又在新批次中调整关系，例如大生纱厂在第六批归入南通博物苑，第七批公告又将其分出并合并新项目。',
  '',
  '| 主体批次 | 涉及的后续合并关系 |',
  '|:---:|---:|',
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((batch) => `| 第 ${batch} 批 | ${batchCounts.get(batch) || 0} |`),
  '',
];

for (let batch = 1; batch <= 8; batch += 1) {
  const rows = relationRows
    .filter((row) => row.canonical_batch === batch)
    .sort((a, b) => a.batch - b.batch || a.id.localeCompare(b.id, 'zh-CN', { numeric: true }));
  if (!rows.length) continue;
  document.push(
    `## 归入第 ${batch} 批主体`,
    '',
    '| 后续批次 | 后续公布项目 | 现行单位 | 公告关系原文 |',
    '|:---:|---|---|---|',
    ...rows.map((row) => `| ${row.batch} | ${cell(row.announced_name)} | ${cell(row.canonical_name)} | ${cell(row.relation)} |`),
    '',
  );
}

await writeFile(unitsPath, `window.HERITAGE_UNITS=${JSON.stringify(canonicalUnits)};\n`, 'utf8');
await writeFile(resolve(heritageRoot, 'data', 'merge-relations.json'), `${JSON.stringify(relationRows, null, 2)}\n`, 'utf8');
await writeFile(resolve(heritageRoot, 'merged-review.md'), `${document.join('\n')}\n`, 'utf8');
console.log(`Folded ${baseUnits.length} base units and ${mergedUnits.length} merge rows into ${canonicalUnits.length} current units`);
