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
  assert.ok(data.days['2026-04-17'].events.some((e) => e.range));
  assert.ok(data.days['2026-04-18'].events.some((e) => e.range));
  assert.ok(data.days['2026-08-12'].events.some((e) => e.details?.includes('宁园')));
});
