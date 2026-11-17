const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { exactDate, parseSummary, parseRailways, parseFlights, transportEvents, buildCalendar } = require('../lib/journey-calendar.cjs');
const data = buildCalendar(path.resolve(__dirname, '..'));

test('only exact valid dates are admitted', () => {
  assert.equal(exactDate('2024.2.29'), '2024-02-29');
  for (const date of ['2024.2', '2025.2.29', '2026.13.1', '2016年元旦前后']) assert.equal(exactDate(date), null);
  assert.equal(parseRailways([{ properties: { date: '2026.11' } }]).length, 0);
  assert.equal(parseSummary('# 常驻城市\n## [北京](../1502/)\n- 2016年元旦前后\n  故宫').length, 0);
  assert.equal(parseFlights('{% hideToggle 展开飞行记录表 %}\n|2026.1|北京|广州|CA1234|320|100|\n{% endhideToggle %}').length, 0);
  assert.equal(parseFlights('{% hideToggle 展开飞行记录表 %}\n|2026.1.1|北京|广州|CA1234|320|100|\n||广州|北京|CA1235|320|100|\n{% endhideToggle %}').length, 1);
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
  assert.ok(day.articles.some((a) => a.url === '/posts/1502/'));
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
const reviewedRows = fs.readFileSync(path.resolve(__dirname, '../Map/制图工具/scripts/travel_history/railway_records.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map((line) => line.split('|'));
const dayOrder = (date) => data.days[date].events.map((event) => event.type === 'visit' ? event.city : `${event.code}:${event.phase}`);

test('all 148 reviewed identities, dates, clocks, distances and notes reach the web', () => {
  assert.equal(routes.length, 148);
  assert.equal(reviewedRows.length, 148);
  for (const [seq, date, origin, destination, train, km, time, note] of reviewedRows) {
    const p = routes.find((f) => f.properties.seq === Number(seq)).properties;
    assert.deepEqual([p.date, p.origin, p.destination, p.train, p.table_km, p.time, p.note], [date, origin, destination, train, Number(km), time, note], `route ${seq}`);
  }
  assert.equal(routes.reduce((sum, f) => sum + f.properties.table_km, 0), 62666);
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
