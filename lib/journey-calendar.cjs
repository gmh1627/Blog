'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { lexer } = require('marked');
const { slugize, stripHTML, unescapeHTML } = require('hexo-util');

function exactDate(value) {
  const match = String(value || '').trim().match(/^(\d{4})[.年/-](\d{1,2})[.月/-](\d{1,2})日?$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10) : null;
}

function addDays(date, count) {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

const CITY_GROUPS = [
  ['湛江', '雷州', '霞山', '赤坎', '硇洲', '东海岛', '湛江吴川'],
  ['北京', '北京首都', '北京大兴', '清河', '古北口', '大兴机场', '八达岭长城'],
  ['广州', '广州白云'], ['合肥', '合肥新桥'], ['深圳', '深圳宝安'],
  ['揭阳', '揭阳潮汕'], ['西安', '西安咸阳', '咸阳', '乾县', '临潼'],
  ['运城', '永济'], ['扬州', '高邮'], ['黄山', '西递'], ['枣庄', '台儿庄'],
  ['宣城', '泾县'], ['赣州', '瑞金', '于都'], ['龙岩', '长汀', '上杭'],
  ['滁州', '全椒'], ['淮南', '寿县'], ['阜阳', '颍上'], ['保定', '雄安', '白洋淀'],
  ['张家口', '蔚县', '宣化'], ['新乡', '卫辉'], ['永州', '祁阳', '零陵'],
  ['吕梁', '蔡家崖'], ['忻州', '岢岚', '宁武', '保德'], ['榆林', '神木', '府谷'],
  ['定西', '陇西'], ['天水', '甘谷', '武山'], ['酒泉', '敦煌'],
  ['嘉峪关', '嘉峪关酒泉'], ['兰州', '兰州中川'], ['大兴安岭', '漠河'],
  ['兴安', '乌兰浩特'], ['呼伦贝尔', '海拉尔', '满归'], ['秦皇岛', '山海关'],
  ['中山', '小榄'], ['武汉', '汉口'], ['郑州', '巩义'],
];

function canonicalCity(value) {
  const name = String(value || '').replace(/（.*?）|\(.*?\)/g, '').trim();
  const group = CITY_GROUPS.find((items) => items.some((alias) => name.startsWith(alias)));
  return group ? group[0] : name.replace(/市$/, '');
}

function locality(value) {
  const name = String(value || '');
  // Keep separate stops inside the same prefecture, such as Gaoyou/Yangzhou.
  for (const place of ['高邮', '永济', '巩义', '寿县', '颍上', '祁阳', '零陵', '瑞金', '于都', '长汀', '泾县', '全椒', '卫辉', '甘谷', '武山', '陇西', '敦煌', '海拉尔', '满归', '岢岚', '宁武', '神木', '府谷']) {
    if (name.includes(place)) return place;
  }
  if (name.includes('古田')) return '古田';
  return canonicalCity(name);
}

const ARTICLE_CITIES = {
  a7ec: '湛江', '1502': '北京', '8478': '广州', a78e: '深圳', '6385': '武汉',
  e08f: '黄山', '8176': '扬州', '439b': '西安', bb58: '杭州', '52b1': '潮州',
  '4186': '郑州', '786': '合肥', b857: '徐州', '3321': '上海', '83be': '六安',
  '99aa': '福州', cea0: '滁州', e4f4: '阜阳', ec8e: '天津', '674c': '保定',
  '7171': '秦皇岛', '2661': '新乡', '526f': '永州', c975: '嘉峪关',
  f9d1: '太原', c866: '兰州', cbd7: '南京', b102: '张家口', '1244': '德州', '6a8b': '赤峰',
};

function summaryDates(label, year) {
  const normalized = label.replace(/，/g, '.');
  const match = normalized.match(/^(\d{1,2})\.(\d{1,2})(?:\s*[-—至]\s*(?:(\d{1,2})\.)?(\d{1,2}))?$/);
  if (!match || !year) return [];
  const start = exactDate(`${year}.${match[1]}.${match[2]}`);
  const end = match[4] ? exactDate(`${year}.${match[3] || match[1]}.${match[4]}`) : start;
  if (!start || !end || end < start) return [];
  const dates = [];
  for (let date = start; date <= end && dates.length < 32; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function headingDates(text, year) {
  const full = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s*[-—–至]\s*(?:(\d{1,2})月)?(\d{1,2})日)?/);
  if (full) {
    const [, y, month, day, endMonth, endDay] = full;
    return summaryDates(`${month}.${day}${endDay ? `-${endMonth || month}.${endDay}` : ''}`, Number(y));
  }
  const short = text.match(/^(\d{1,2})\.(\d{1,2})(?:\s*[-—–至]\s*(?:(\d{1,2})\.)?(\d{1,2}))?/);
  return short ? summaryDates(short[0].replace(/–/g, '-'), year) : [];
}

function dateHeadingLinks(text, options = {}) {
  const tokens = lexer(text.replace(/^---[\s\S]*?\n---\s*/, ''));
  const counts = new Map();
  const links = new Map();
  let year = null;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== 'heading') continue;
    const title = stripHTML(unescapeHTML(token.text)).trim();
    // Use the same slug and duplicate suffix as hexo-renderer-marked.
    const base = slugize(title, { transform: options.modifyAnchors || 0 });
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    const yearMatch = title.match(/^(\d{4})年/);
    if (yearMatch) year = Number(yearMatch[1]);
    let dates = headingDates(title, year);
    if (!dates.length && !yearMatch) {
      // A section such as “夏令营期间” can state its range in the first paragraph.
      const next = tokens.slice(index + 1).find((item) => item.type !== 'space');
      if (next?.type === 'paragraph') dates = headingDates(next.text, year);
    }
    for (const date of dates) if (!links.has(date)) links.set(date, id);
  }
  return links;
}

function datedArticleLinks(posts, options) {
  const links = new Map();
  for (const file of fs.readdirSync(posts).filter((name) => /^(北京行迹|大城小事).*\.md$/.test(name))) {
    const text = fs.readFileSync(path.join(posts, file), 'utf8');
    const id = text.match(/^abbrlink:\s*['"]?([^'"\s]+)['"]?\s*$/m)?.[1];
    if (id) links.set(`/posts/${id}/`, dateHeadingLinks(text, options));
  }
  return links;
}

function parseSummary(text) {
  const visits = [];
  let year = null;
  let article = null;
  let dates = [];
  let city = '';
  let range = '';
  for (const raw of text.replace(/^---[\s\S]*?\n---\s*/, '').split(/\r?\n/)) {
    const line = raw.trim();
    const heading = line.match(/^#\s+(\d{4})年/);
    if (heading) { year = Number(heading[1]); continue; }
    const post = line.match(/^##\s+\[([^\]]+)\]\(\.\.\/([^/]+)\/\)(.*)$/);
    if (post) {
      article = { title: post[1], url: `/posts/${post[2]}/`, id: post[2] };
      dates = [];
      city = ARTICLE_CITIES[article.id] || '';
      // A heading can supply the only date for a one-day itinerary.
      const single = post[3].match(/（(\d{1,2})月(\d{1,2})日）/);
      if (single) dates = summaryDates(`${single[1]}.${single[2]}`, year);
      range = '';
      continue;
    }
    if (line.startsWith('#')) { article = null; dates = []; continue; }
    if (!article || !line) continue;
    const bullet = line.match(/^-\s+(.+)$/);
    if (bullet) {
      if (/^\d{4}$/.test(bullet[1])) { year = Number(bullet[1]); dates = []; continue; }
      dates = summaryDates(bullet[1], year);
      range = dates.length > 1 ? `${dates[0]} 至 ${dates.at(-1)} 的合并记录` : '';
      city = ARTICLE_CITIES[article.id] || '';
      continue;
    }
    if (!dates.length) continue;
    const place = line.match(/^([^：:]{1,18})[：:](.*)$/);
    let details = line;
    if (place) {
      city = place[1] === '市区' ? ARTICLE_CITIES[article.id] || place[1] : place[1];
      details = place[2].trim();
    }
    // These entries omit a city prefix, but remain in the same trip section.
    if (!place && article.id === 'bb58' && dates[0] === '2024-08-01') city = '南昌';
    if (!place && article.id === '3321' && dates[0].startsWith('2025-07')) city = '北京';
    if (!place && article.id === '6385' && dates[0] === '2024-01-20') city = '岳阳';
    if (!place && article.id === '2661') city = '新乡';
    for (const date of dates) {
      visits.push({ type: 'visit', date, city, details, range, articles: [{ title: article.title, url: article.url }], sourceOrder: visits.length });
    }
  }
  return visits;
}

function parseFlights(text) {
  const block = text.match(/{% hideToggle 展开飞行记录表 %}([\s\S]*?){% endhideToggle %}/);
  if (!block) throw new Error('Flight record table was not found');
  let headers = null;
  return block[1].split(/\r?\n/).flatMap((line) => {
    if (!line.trim().startsWith('|')) return [];
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    if (cells.includes('航班号')) { headers = cells; return []; }
    if (!headers || !/\d/.test(cells[5]) || !/[A-Z0-9]{2}\d{3,4}/.test(cells[3])) return [];
    const date = exactDate(cells[0]);
    const timeIndex = headers[0] === '日期' ? headers.indexOf('时间') : -1;
    const time = timeIndex >= 0 ? (cells[timeIndex] || '').replace(/\b(\d):/g, '0$1:') : '';
    return date ? [{ type: 'flight', date, origin: cells[1], destination: cells[2], code: cells[3], model: cells[4], distance: Number(cells[5]), originCity: canonicalCity(cells[1]), destinationCity: canonicalCity(cells[2]), time }] : [];
  });
}

function parseRailways(features) {
  return features.flatMap(({ properties: p }) => {
    const date = exactDate(p.date);
    return date ? [{ type: 'train', date, origin: p.origin, destination: p.destination, originCity: canonicalCity(p.origin_city || p.origin), destinationCity: canonicalCity(p.destination_city || p.destination), code: p.train, time: p.time || '', note: p.note || '', distance: Number(p.table_km), seq: p.seq }] : [];
  });
}

function clockMinutes(time) {
  const match = String(time).match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function transportEvents(record) {
  const clocks = [...record.time.matchAll(/(\d{1,2}):(\d{2})/g)].map((match) => `${match[1].padStart(2, '0')}:${match[2]}`);
  let offset = /后天|第三天/.test(record.time) ? 2 : /次日|翌日/.test(record.time) ? 1 : 0;
  if (!offset && clocks.length === 2 && clockMinutes(clocks[1]) < clockMinutes(clocks[0])) offset = 1;
  const departure = { ...record, phase: 'departure', clock: clocks[0] || '', arrivalDate: addDays(record.date, offset) };
  if (!offset) return [departure];
  return [departure, { ...record, date: departure.arrivalDate, phase: 'arrival', departureDate: record.date, clock: clocks[1] || '' }];
}

function orderTransports(events) {
  // Recorded clocks determine railway order. Flights without clock data are
  // inserted by the origin/destination chain.
  const known = events.filter((event) => event.clock).sort((a,b) => clockMinutes(a.clock) - clockMinutes(b.clock));
  for (const event of events.filter((item) => !item.clock)) {
    const next = known.findIndex((item) => item.originCity === event.destinationCity && item.phase !== 'arrival');
    const previous = known.findLastIndex((item) => item.destinationCity === event.originCity);
    known.splice(next >= 0 ? next : previous >= 0 ? previous + 1 : known.length, 0, event);
  }
  return known;
}

function orderDay(visits, transports) {
  const movements = orderTransports(transports);
  const slots = Array.from({ length: movements.length + 1 }, () => []);
  // A slot can include an unrecorded local transfer from the previous arrival
  // to the next departure (e.g. Wushan sightseeing, then Longxi's Weiyuanlou).
  const slotPlaces = slots.map((_, index) => {
    const previous = movements[index - 1];
    const next = movements[index];
    const places = [];
    if (previous && !(previous.arrivalDate > previous.date && previous.phase === 'departure')) places.push({ name: previous.destination, city: previous.destinationCity });
    if (next && next.phase !== 'arrival') places.push({ name: next.origin, city: next.originCity });
    return places;
  });
  const lastSlot = new Map();
  for (const visit of visits) {
    const minimum = Math.max(0, ...visit.articles.map((a) => lastSlot.get(a.url) || 0));
    const scores = slotPlaces.map((places, index) => index < minimum ? 0 : Math.max(0, ...places.map((place) =>
      locality(place.name) === locality(visit.city) ? 2 : place.city === canonicalCity(visit.city) ? 1 : 0)));
    let slot = Math.max(...scores) > 0 ? scores.indexOf(Math.max(...scores)) : -1;
    if (slot < 0) slot = minimum;
    slots[slot].push(visit);
    visit.articles.forEach((a) => lastSlot.set(a.url, slot));
  }
  const ordered = slots.flatMap((items, index) => index < movements.length ? [...items, movements[index]] : items);
  // The author explicitly places this evening train after the day's visits.
  const last = ordered.filter((event) => event.date === '2026-05-16' && event.code === 'K8204');
  return [...ordered.filter((event) => !last.includes(event)), ...last];
}

function buildCalendar(root, options = {}) {
  const posts = path.join(root, 'source/_posts');
  const visits = parseSummary(fs.readFileSync(path.join(posts, '行程轨迹汇总.md'), 'utf8'));
  const dateLinks = datedArticleLinks(posts, options);
  for (const visit of visits) {
    for (const article of visit.articles) {
      const anchor = dateLinks.get(article.url)?.get(visit.date);
      if (anchor) article.url += `#${encodeURIComponent(anchor)}`;
    }
  }
  const railwayData = JSON.parse(fs.readFileSync(path.join(root, 'Map/web/data/visited_routes.geojson'), 'utf8'));
  const railways = parseRailways(railwayData.features);
  const flights = parseFlights(fs.readFileSync(path.join(posts, '行旅杂记.md'), 'utf8'));
  const groups = new Map();
  const group = (date) => { if (!groups.has(date)) groups.set(date, { visits: [], transports: [] }); return groups.get(date); };
  for (const visit of visits) {
    const entries = group(visit.date).visits;
    const duplicate = entries.find((item) => item.details === visit.details && item.city === visit.city);
    if (duplicate) {
      for (const article of visit.articles) if (!duplicate.articles.some((a) => a.url === article.url)) duplicate.articles.push(article);
    } else entries.push(visit);
  }
  for (const record of [...railways, ...flights]) {
    for (const event of transportEvents(record)) group(event.date).transports.push(event);
  }
  const days = {};
  for (const [date, data] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const articles = new Map();
    data.visits.flatMap((v) => v.articles).forEach((a) => articles.set(a.url, a));
    days[date] = { articles: [...articles.values()], events: orderDay(data.visits, data.transports).map(({ articles, sourceOrder, ...event }) => event) };
  }
  return { days, summary: { days: Object.keys(days).length, visits: visits.length, trains: railways.length, flights: flights.length } };
}

module.exports = { exactDate, addDays, canonicalCity, dateHeadingLinks, parseSummary, parseFlights, parseRailways, transportEvents, orderDay, buildCalendar };
