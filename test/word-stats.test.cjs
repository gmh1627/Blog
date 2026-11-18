const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { countWords, formatWordCount, updateJourneyIndex, createReports, reportMarkdown } = require('../lib/word-stats.cjs');

const helpers = {};
vm.runInNewContext(fs.readFileSync(require.resolve('hexo-wordcount'), 'utf8'), {
  require, hexo: { extend: { helper: { register: (name, helper) => { helpers[name] = helper; } } } },
});

test('exact counts use the same Chinese and word rules as the installed theme helper', () => {
  assert.equal(countWords('<p>中文 hello world 123</p>'), 5);
  for (const html of ['', '<p>中 文 &amp; test_123</p>', '<pre>const value = 42;</pre>Γειά Привет 日本語', '字'.repeat(1049), '字'.repeat(1500)]) {
    assert.equal(formatWordCount(countWords(html)), String(helpers.wordcount(html)));
  }
});

test('ordinary punctuation is excluded and link destinations are not counted', () => {
  assert.equal(countWords('<p>你好，世界！。“”：；（）——……</p>'), 4);
  assert.equal(countWords('<a href="https://example.com/a-very-long-address?number=123" title="链接标题">北京</a>'), 2);
  assert.equal(countWords('<p>hello, world! 123</p>'), 3);
});

const base = 'https://example.com/blog/';
const article = (id, count, tags = ['游记']) => ({
  title: id, url: `${base}posts/${id}/`, word_count: count,
  published_time: '2026-01-01', updated_time: '2026-11-18', tags,
});

test('journey totals sum exact counts and preserve the calendar, groups and line endings', () => {
  const source = '---\r\ntitle: Journey\r\n---\r\n{% journey_calendar %}\r\n- [行程轨迹汇总](../posts/summary/)（1k）\r\n- 常驻城市\r\n  - [常驻](../posts/home/)（旧值）\r\n- 2026（旧值）\r\n  - [甲](../posts/a/)\r\n  - [乙](../posts/b/#part)（旧值）\r\n';
  const updated = updateJourneyIndex(source, [article('home', 0), article('a', 1049), article('b', 1049)], base);
  assert.ok(updated.includes('{% journey_calendar %}\r\n'));
  assert.ok(updated.includes('- [行程轨迹汇总](../posts/summary/)\r\n'));
  assert.ok(updated.includes('- 2026（2.1k）\r\n'));
  assert.ok(updated.includes('- [常驻](../posts/home/)（0）\r\n'));
  assert.ok(updated.includes('- [乙](../posts/b/#part)（1k）\r\n'));
  assert.equal(updateJourneyIndex(updated, [article('home', 0), article('a', 1049), article('b', 1049)], base), updated);
  assert.throws(() => updateJourneyIndex('- [缺失](../posts/missing/)', [], base), /缺失/);
});

test('reports preserve tag groups, deduplicate extra posts and use exact yearly totals', () => {
  const reports = createReports([article('a', 1049), article('4086', 1049), article('reading', 60, ['读书笔记'])], base, '2026-11-18 10:00:00');
  assert.equal(reports.length, 3);
  assert.equal(reports[0].articles.length, 2);
  assert.equal(reports[1].articles.length, 2);
  assert.equal(reports[2].articles.length, 1);
  assert.ok(reports[0].content.includes('| 2026 | 2 | 2098 | 1049 |'));
  assert.ok(reports[0].content.includes('- 总字数： 2.1k'));
  assert.ok(reportMarkdown([], '空报告', '2026-11-18').includes('- 平均字数： 0 字/篇'));
});
