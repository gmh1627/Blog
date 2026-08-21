import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = resolve(appRoot, "data");
const cacheRoot = resolve(dataRoot, ".cache");
const unitsPath = resolve(dataRoot, "units.js");
const progressPath = resolve(cacheRoot, "encyclopedia-link-progress.json");
const overridesPath = resolve(dataRoot, "encyclopedia-link-overrides.json");
const outputPath = resolve(dataRoot, "encyclopedia-links.js");
const reviewPath = resolve(appRoot, "encyclopedia-links-review.csv");
const unitsPrefix = "window.HERITAGE_UNITS=";
const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity;
const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

function parseWindowData(source, prefix) {
  const text = source.trim();
  if (!text.startsWith(prefix) || !text.endsWith(";")) throw new Error(`${unitsPath} 格式无效`);
  return JSON.parse(text.slice(prefix.length, -1));
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[臺覌]/g, (character) => ({ 臺: "台", 覌: "观" })[character])
    .replace(/[\s·•,，、。:：;；()（）\[\]【】《》“”‘’'"‐‑‒–—―－-]/g, "")
    .toLowerCase();
}

function locationTokens(unit) {
  const suffixes = /(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|地区|盟|省|市|区|县|旗)$/;
  return [unit.district, unit.city, unit.province]
    .filter((value) => value && !value.startsWith("跨") && !value.includes("直辖县级行政区"))
    .flatMap((value) => [value, value.replace(suffixes, "")])
    .map(normalize)
    .filter((value) => value.length >= 2);
}

function evaluateCandidate(unit, title, abstract) {
  const unitName = normalize(unit.name);
  const candidateTitle = normalize(title);
  const text = normalize(`${title} ${abstract}`);
  if (!candidateTitle || String(abstract || "").trim().length < 30) return { accepted: false, confidence: "empty" };
  if (candidateTitle === unitName) return { accepted: true, confidence: "exact" };
  const titleRelated = unitName.includes(candidateTitle) || candidateTitle.includes(unitName);
  const hasLocation = locationTokens(unit).some((token) => text.includes(token));
  const hasHeritageSignal = /全国重点文物保护单位|文物保护单位/.test(String(abstract || ""));
  if (titleRelated && (hasLocation || hasHeritageSignal)) return { accepted: true, confidence: "related-location" };
  return { accepted: false, confidence: titleRelated ? "related-unconfirmed" : "different-title" };
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function fetchJson(url, { interval = 0, attempts = 5 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (interval) await sleep(interval);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "KangarooGao-Heritage-Link-Verifier/1.0 (https://kangaroogao.com/heritage/)" },
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(60000, 3000 * 2 ** attempt));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === attempts) throw error;
      await sleep(Math.min(30000, 1500 * 2 ** attempt));
    }
  }
  return null;
}

function baiduApiUrl(name) {
  const url = new URL("https://baike.baidu.com/api/openapi/BaikeLemmaCardApi");
  Object.entries({ scope: "103", format: "json", appid: "379020", bk_key: name, bk_length: "1000" })
    .forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function verifyBaidu(unit) {
  const data = await fetchJson(baiduApiUrl(unit.name), { interval: 80 });
  if (!data?.title || !data?.url || !data?.abstract) return { link: null, candidate: null };
  const evaluation = evaluateCandidate(unit, data.title, data.abstract);
  const candidate = {
    title: data.title,
    url: String(data.url).replace(/^http:/, "https:"),
    confidence: evaluation.confidence,
  };
  return { link: evaluation.accepted ? candidate : null, candidate };
}

function wikiApiUrl(parameters) {
  const url = new URL("https://zh.wikipedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", formatversion: "2", utf8: "1", origin: "*", ...parameters })
    .forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function verifyWikipediaExact(units) {
  const result = new Map();
  const uniqueNames = [...new Set(units.map((unit) => unit.name))];
  for (let offset = 0; offset < uniqueNames.length; offset += 40) {
    const names = uniqueNames.slice(offset, offset + 40);
    const data = await fetchJson(wikiApiUrl({
      titles: names.join("|"),
      redirects: "1",
      prop: "extracts|info",
      inprop: "url",
      exintro: "1",
      explaintext: "1",
      exchars: "1000",
    }), { interval: 120 });
    const resolved = new Map(names.map((name) => [name, name]));
    for (const item of data?.query?.normalized || []) {
      for (const [original, current] of resolved) if (current === item.from) resolved.set(original, item.to);
    }
    for (const item of data?.query?.redirects || []) {
      for (const [original, current] of resolved) if (current === item.from) resolved.set(original, item.to);
    }
    const pages = new Map((data?.query?.pages || []).map((page) => [page.title, page]));
    for (const name of names) {
      const page = pages.get(resolved.get(name));
      if (!page || page.missing || page.ns !== 0 || String(page.extract || "").trim().length < 30) {
        result.set(name, null);
        continue;
      }
      result.set(name, { title: page.title, url: page.fullurl, confidence: page.title === name ? "exact" : "redirect" });
    }
    console.log(`[维基精确] ${Math.min(offset + names.length, uniqueNames.length)} / ${uniqueNames.length}`);
  }
  return result;
}

async function verifyWikipediaSearch(unit) {
  const data = await fetchJson(wikiApiUrl({
    generator: "search",
    gsrsearch: unit.name,
    gsrnamespace: "0",
    gsrlimit: "3",
    prop: "extracts|info",
    inprop: "url",
    exintro: "1",
    explaintext: "1",
    exchars: "1000",
  }), { interval: 180 });
  const candidates = (data?.query?.pages || [])
    .filter((page) => page.ns === 0 && page.fullurl)
    .map((page) => ({ page, evaluation: evaluateCandidate(unit, page.title, page.extract) }));
  const accepted = candidates.find(({ evaluation }) => evaluation.accepted);
  if (accepted) {
    return {
      link: { title: accepted.page.title, url: accepted.page.fullurl, confidence: `search-${accepted.evaluation.confidence}` },
      candidate: null,
    };
  }
  const first = candidates[0];
  return {
    link: null,
    candidate: first ? { title: first.page.title, url: first.page.fullurl, confidence: first.evaluation.confidence } : null,
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function save(progress, units, overrides) {
  await mkdir(cacheRoot, { recursive: true });
  await writeFile(progressPath, `${JSON.stringify(progress)}\n`, "utf8");
  const links = {};
  const rows = [["编号", "名称", "百度词条", "百度地址", "百度置信度", "维基词条", "维基地址", "维基置信度", "待复核候选"]];
  for (const unit of units) {
    const entry = progress[unit.id] || {};
    const override = overrides.links?.[unit.id];
    const omitted = new Set(overrides.omit || []).has(unit.id);
    const baidu = override?.baidu === null ? null : (override?.baidu || entry.baidu || null);
    const wikipedia = override?.wikipedia === null ? null : (override?.wikipedia || entry.wikipedia || null);
    if (!omitted && (baidu || wikipedia)) {
      links[unit.id] = {};
      if (baidu) links[unit.id].baidu = { title: baidu.title, url: baidu.url };
      if (wikipedia) links[unit.id].wikipedia = { title: wikipedia.title, url: wikipedia.url };
    }
    const candidate = [entry.baiduCandidate, entry.wikipediaCandidate]
      .filter(Boolean)
      .map((item) => `${item.title} | ${item.url} | ${item.confidence}`)
      .join("；");
    rows.push([
      unit.id, unit.name,
      baidu?.title, baidu?.url, baidu?.confidence || (override?.baidu ? "manual" : ""),
      wikipedia?.title, wikipedia?.url, wikipedia?.confidence || (override?.wikipedia ? "manual" : ""),
      candidate,
    ]);
  }
  await writeFile(outputPath, `window.HERITAGE_ENCYCLOPEDIA_LINKS=${JSON.stringify(links)};\n`, "utf8");
  await writeFile(reviewPath, `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");
  return Object.keys(links).length;
}

const units = parseWindowData(await readFile(unitsPath, "utf8"), unitsPrefix).slice(0, limit);
const overrides = await readJson(overridesPath, { links: {}, omit: [] });
const progress = args.has("--reset") ? {} : await readJson(progressPath, {});
const wikipediaExact = await verifyWikipediaExact(units.filter((unit) => !progress[unit.id]?.wikipediaChecked));
for (const unit of units) {
  const entry = progress[unit.id] ||= {};
  if (!entry.wikipediaChecked) {
    entry.wikipedia = wikipediaExact.get(unit.name) || null;
    entry.wikipediaChecked = true;
  }
}
await save(progress, units, overrides);

let verifiedBaidu = 0;
for (const unit of units) {
  const entry = progress[unit.id] ||= {};
  if (!entry.baiduChecked) {
    const result = await verifyBaidu(unit);
    entry.baidu = result.link;
    entry.baiduCandidate = result.link ? null : result.candidate;
    entry.baiduChecked = true;
    verifiedBaidu += 1;
    if (verifiedBaidu % 25 === 0) {
      const linked = await save(progress, units, overrides);
      console.log(`[百度核验] 本次 ${verifiedBaidu} 项，已确认 ${linked} 项`);
    }
  }
}

let searched = 0;
const fallbackUnits = units.filter((unit) => {
  const entry = progress[unit.id];
  return !entry.baidu && !entry.wikipedia && !entry.wikipediaSearchChecked;
});
for (const unit of fallbackUnits) {
  const result = await verifyWikipediaSearch(unit);
  const entry = progress[unit.id];
  entry.wikipedia = result.link;
  entry.wikipediaCandidate = result.candidate;
  entry.wikipediaSearchChecked = true;
  searched += 1;
  if (searched % 25 === 0) {
    const linked = await save(progress, units, overrides);
    console.log(`[维基近似] ${searched} / ${fallbackUnits.length}，已确认 ${linked} 项`);
  }
}

const linked = await save(progress, units, overrides);
const baiduCount = units.filter((unit) => progress[unit.id]?.baidu).length;
const wikipediaCount = units.filter((unit) => progress[unit.id]?.wikipedia).length;
console.log(`[完成] ${units.length} 项中，百度 ${baiduCount}，维基 ${wikipediaCount}，至少一个直达词条 ${linked}。`);
