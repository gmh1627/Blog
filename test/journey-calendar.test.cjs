const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { exactDate, dateHeadingLinks, parseSummary, parseRailways, parseRailwayTable, parseFlights, transportEvents, buildCalendar } = require('../lib/journey-calendar.cjs');
const data = buildCalendar(path.resolve(__dirname, '..'));

test('only exact valid dates are admitted', () => {
  assert.equal(exactDate('2024.2.29'), '2024-02-29');
  for (const date of ['2024.2', '2025.2.29', '2026.13.1', '2016年元旦前后']) assert.equal(exactDate(date), null);
  assert.equal(parseRailways([{ properties: { date: '2026.11' } }]).length, 0);
  assert.equal(parseSummary('# 常驻城市\n## [北京](../1502/)\n- 2016年元旦前后\n  故宫').length, 0);
  const header = '{% hideToggle 展开飞行记录表 %}\n|日期|出发地|目的地|航班号|机型|里程（km）|时间|\n';
  assert.equal(parseFlights(header+'|2026.1|北京|广州|CA1234|320|100|08:00-10:00|\n{% endhideToggle %}').length, 0);
  assert.equal(parseFlights(header+'|2026.1.1|北京|广州|CA1234|320|100|08:00-10:00|\n||广州|北京|CA1235|320|100|11:00-13:00|\n{% endhideToggle %}').length, 1);
});

test('same-prefecture travel is interleaved with visits at the actual stops', () => {
  const events = data.days['2024-05-01'].events;
  assert.deepEqual(events.map((e) => e.type === 'visit' ? e.city : e.code), ['D2866', '高邮', 'G8265', '扬州']);
});

test('round trip shows destination visit between trains and home visit after return', () => {
  assert.deepEqual(data.days['2024-07-08'].events.map((e) => e.type === 'visit' ? e.city : e.code), ['D2506', '永济', 'D1717', '西安']);
});

test('flight then city itinerary then departing railway', () => {
  assert.deepEqual(data.days['2025-01-20'].events.map((e) => e.type), ['flight', 'visit', 'train']);
  assert.equal(data.days['2024-07-07'].events[0].type, 'flight');
  assert.equal(data.days['2024-07-17'].events.at(-1).type, 'flight');
});

test('an unprefixed final-day stop belongs between its arrival and departure', () => {
  const events = data.days['2024-01-20'].events;
  const visit = events.findIndex((e) => e.details === '岳阳楼');
  assert.equal(events[visit].city, '岳阳');
  assert.equal(events[visit - 1].destination, '岳阳东');
  assert.equal(events[visit + 1].origin, '岳阳东');
});

test('overnight arrival is visible on next day before sightseeing', () => {
  assert.equal(data.days['2026-08-08'].events[0].phase, 'arrival');
  assert.equal(data.days['2026-08-08'].events[1].type, 'visit');
  assert.equal(data.days['2026-11-16'].events[0].departureDate, '2026-11-15');
  const events = transportEvents({ date: '2026-11-30', time: '23:31-05:55' });
  assert.equal(events[1].date, '2026-12-01');
});

test('all precise flights are present and articles are unique per day', () => {
  assert.equal(data.summary.flights, 16);
  assert.ok(data.days['2026-08-31'].events.some((e) => e.code.endsWith('CA1845')));
  for (const day of Object.values(data.days)) {
    assert.equal(day.articles.length, new Set(day.articles.map((a) => a.url)).size);
    assert.ok(day.events.every((e) => !('articles' in e)));
  }
  const day = data.days['2025-07-17'];
  assert.equal(day.events.filter((e) => e.type === 'visit').length, 1);
  assert.ok(day.articles.some((a) => a.url.startsWith('/posts/1502/#')));
  assert.ok(day.articles.some((a) => a.url === '/posts/3321/'));
});

test('every dated railway departure follows the web record date', () => {
  const routes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../Map/web/data/visited_routes.geojson'), 'utf8'));
  for (const { properties: p } of routes.features) {
    const date = exactDate(p.date);
    if (date) assert.ok(data.days[date].events.some((e) => e.seq === p.seq && e.phase === 'departure'));
  }
});

test('summary supports one-day headings, date ranges and the existing comma typo', () => {
  assert.ok(data.days['2025-06-24'].events.some((e) => e.details?.includes('英布墓')));
  const ranged = parseSummary('# 2026年\n## [行程](../c975/)\n- 4.17-4.18\n  景点');
  assert.deepEqual(ranged.map((event) => event.date), ['2026-04-17', '2026-04-18']);
  assert.ok(ranged.every((event) => event.range));
  assert.ok(data.days['2026-08-12'].events.some((e) => e.details?.includes('宁园')));
});

const routes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../Map/web/data/visited_routes.geojson'), 'utf8')).features;
const articleText = fs.readFileSync(path.resolve(__dirname, '../source/_posts/行旅杂记.md'), 'utf8');
const railwayBlock = articleText.match(/{% hideToggle 展开铁路记录表 %}([\s\S]*?){% endhideToggle %}/)[1];
const reviewedRows = railwayBlock.split(/\r?\n/).filter((line) => /^\|\d/.test(line)).map((line, index) => [String(index + 1), ...line.slice(1, -1).split('|').map((cell) => cell.trim())]);
const dayOrder = (date) => data.days[date].events.map((event) => event.type === 'visit' ? event.city : `${event.code}:${event.phase}`);

test('all reviewed identities, dates, clocks, distances and notes reach the web', () => {
  assert.equal(routes.length, reviewedRows.length);
  for (const [seq, date, origin, destination, train, km, time, note] of reviewedRows) {
    const p = routes.find((f) => f.properties.seq === Number(seq)).properties;
    assert.deepEqual([p.date, p.origin, p.destination, p.train, p.table_km, p.time, p.note], [date, origin, destination, train, Number(km), time, note], `route ${seq}`);
  }
  assert.equal(routes.reduce((sum, f) => sum + f.properties.table_km, 0), reviewedRows.reduce((sum, row) => sum + Number(row[5]), 0));
});

test('corrected Qiyang to Yongzhou visits stay between the appropriate trains', () => {
  assert.deepEqual(dayOrder('2026-02-08'), ['D37:arrival', 'G1479:departure', '祁阳', 'G1503:departure', '永州', 'K1803:departure']);
  assert.equal(data.days['2026-02-08'].events.find((e) => e.city === '永州').details, '万达广场');
  assert.equal(data.days['2026-02-28'].events.find((e) => e.code === 'G2694').time, '11:37-19:03');
  assert.equal(data.days['2026-03-01'].events.find((e) => e.code === 'G2558').time, '11:36-16:09');
});

test('Baicheng afternoon visit separates C508 from the overnight K4259', () => {
  assert.deepEqual(dayOrder('2026-10-03'), ['兴安乌兰浩特市', 'C508:departure', '白城', 'K4259:departure']);
  assert.equal(data.days['2026-10-03'].events.find((e) => e.code === 'C508').time, '13:20-14:10');
  assert.equal(data.days['2026-10-04'].events.find((e) => e.code === 'K4259').clock, '07:36');
});

test('Zhangjiakou visit follows arrival and local city labels are resolved', () => {
  assert.deepEqual(dayOrder('2026-08-01'), ['Z183:departure', '张家口', '蔚县']);
});

test('Tianshui overnight trip and May 27 return have the confirmed departure dates', () => {
  assert.equal(data.days['2026-05-27'].events.find((e) => e.code === 'Z225').time, '21:59-次日07:41');
  assert.equal(data.days['2026-05-30'].events.find((e) => e.code === 'Z595').phase, 'departure');
  assert.equal(data.days['2026-05-31'].events[0].code, 'Z595');
  assert.equal(data.days['2026-05-31'].events[0].phase, 'arrival');
  assert.equal(data.days['2025-10-09'].events.find((e) => e.code === 'G2554').time, '09:00-13:54');
});

test('Gangu sightseeing follows its train and Weiyuanlou precedes the Dingxi train', () => {
  assert.deepEqual(dayOrder('2026-06-01'), ['天水', 'K1041:departure', '天水甘谷县']);
  assert.deepEqual(dayOrder('2026-06-02'), ['T113:departure', '天水武山县', '定西陇西县', 'K1041:departure', '定西']);
});

test('Shenmu evening train is last and empty Datong placeholder is removed', () => {
  assert.deepEqual(dayOrder('2026-05-16'), ['榆林府谷县', '榆林神木市', 'K8204:departure']);
  assert.equal(data.days['2026-05-17'].events.filter((e) => e.type === 'visit').length, 1);
});

test('Juyan belongs only to April 17 and Dongfeng appears in Ejina on both days', () => {
  const a = data.days['2026-04-17'].events;
  const b = data.days['2026-04-18'].events;
  assert.equal(a[0].city, '酒泉市');
  assert.equal(a[1].city, '阿拉善盟额济纳旗');
  assert.equal(b.length, 1);
  assert.equal(b[0].city, '阿拉善盟额济纳旗');
  assert.ok(!b[0].details.includes('居延'));
  assert.equal(data.days['2026-04-19'].events.find((e) => e.code === 'C2726').time, '17:19-17:47');
});

test('calendar has only travelogue links and current Beijing closure wording', () => {
  assert.ok(Object.values(data.days).every((day) => day.articles.every((a) => a.url !== '/posts/9e84/')));
  const march = data.days['2026-03-21'].events.find((e) => e.type === 'visit').details;
  assert.ok(march.includes('孙中山行馆（不开放）'));
  assert.ok(march.includes('孟小冬故居（不开放）'));
});

test('new travelogues with explicit cities are discovered without a code registry', () => {
  const visits = parseSummary('# 2027年\n## [全新的游记](../new-trip/)\n- 3.8\n  厦门：鼓浪屿\n  泉州：开元寺');
  assert.equal(visits.length, 2);
  assert.deepEqual(visits.map((v) => [v.date, v.city, v.details]), [['2027-03-08', '厦门', '鼓浪屿'], ['2027-03-08', '泉州', '开元寺']]);
  assert.equal(visits[0].articles[0].url, '/posts/new-trip/');
});

test('flight clocks are read from the time column and order flights with trains', () => {
  const flights = parseFlights(articleText);
  assert.equal(flights.length, 16);
  assert.ok(flights.every((flight) => /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(flight.time)));
  assert.equal(flights.find((flight) => flight.code.endsWith('MU5287')).time, '07:20-09:35');
  assert.equal(data.days['2026-04-19'].events[0].type, 'flight');
  assert.equal(data.days['2026-04-19'].events[0].time, '13:05-15:55');
  assert.equal(data.days['2026-04-19'].events[1].code, 'C2726');
});

test('June 28 2022 direction is corrected in web and calendar', () => {
  const route = routes.find((f) => f.properties.seq === 11).properties;
  assert.equal(route.origin, '广州南');
  assert.equal(route.destination, '湛江西');
  assert.equal(data.days['2022-06-28'].events[0].origin, '广州南');
});

test('calendar retains the corrected county names and resets Qinhuangdao after Suizhong', () => {
  const cases = [
    ['2026-01-02', '孟姜女坟', '葫芦岛绥中县'],
    ['2026-01-02', '山海关中国长城博物馆', '秦皇岛'],
    ['2025-09-13', '吴敬梓', '滁州全椒县'],
    ['2024-03-10', '西递村', '黄山黟县'],
    ['2024-07-29', '吉利汽车研究院', '宁波慈溪市'],
    ['2024-09-16', '杜甫故里', '郑州巩义市'],
  ];
  for (const [date, place, city] of cases) {
    assert.equal(data.days[date].events.find((event) => event.details?.includes(place))?.city, city, place);
  }
});

test('dated travelogue links keep the title and target the matching date section', () => {
  for (const [date, post, anchor, title] of [
    ['2025-11-30', '1502', '11-30（周日）', '北京行迹'],
    ['2025-11-15', '1502', '11-15至11-16（周末）', '北京行迹'],
    ['2025-11-16', '1502', '11-15至11-16（周末）', '北京行迹'],
    ['2025-07-17', '1502', '夏令营期间', '北京行迹'],
    ['2026-08-29', '1502', '8-29（周六）', '北京行迹'],
    ['2025-01-20', '8478', '2025年1月20日', '大城小事1：广州'],
    ['2026-08-09', '8478', '2026年8月8日-9日', '大城小事1：广州'],
    ['2026-02-27', 'a78e', '2026年2月27日-28日', '大城小事2：深圳（兼记东莞）'],
  ]) {
    const article = data.days[date].articles.find((a) => a.url.startsWith(`/posts/${post}/`));
    assert.equal(article?.url, `/posts/${post}/#${encodeURIComponent(anchor)}`);
    assert.equal(article.title, title);
  }
});

test('date sections respect year context, duplicate ids and fenced examples', () => {
  const links = dateHeadingLinks('## 2025年\n### 1.2\n### 1.3至1.4\n## 2026年\n### 1.2\n```md\n### 1.5\n```\n');
  assert.equal(links.get('2025-01-02'), '1-2');
  assert.equal(links.get('2025-01-04'), '1-3至1-4');
  assert.equal(links.get('2026-01-02'), '1-2-1');
  assert.equal(links.has('2026-01-05'), false);
});

test('removed transfer notes stay absent from the calendar', () => {
  for (const [date, code] of [['2025-06-23', 'K8363'], ['2024-09-17', 'G1885']]) {
    assert.equal(data.days[date].events.find((event) => event.code === code).note, '');
  }
});

test('article railway dates and clocks override stale map data and admit new routes', () => {
  const text = '{% hideToggle 展开铁路记录表 %}\n|日期|出发地|目的地|车次|里程（km）|时间|备注|\n|---|---|---|---|---|---|---|\n'
    + '|2027.1.2|合肥南|北京南|G1|1000|09:00-13:00|新备注|\n'
    + '|2027.1.3|北京南|厦门北|G2|2000|08:00-20:00||\n'
    + '|2027.1|厦门北|北京南|G3|2000|08:00-20:00||\n{% endhideToggle %}';
  const records = parseRailwayTable(text, [{ properties: { date: '2026.1.1', origin: '合肥南', destination: '北京南', train: 'G1', time: '00:00-01:00', origin_city: '合肥', destination_city: '北京' } }]);
  assert.equal(records.length, 2);
  assert.deepEqual([records[0].date, records[0].time, records[0].note], ['2027-01-02', '09:00-13:00', '新备注']);
  assert.deepEqual([records[1].originCity, records[1].destinationCity], ['北京', '厦门']);
  assert.throws(() => parseRailwayTable(text.replace('|09:00-13:00|新备注|', '|09:00-13:00|')), /column count/);
});
