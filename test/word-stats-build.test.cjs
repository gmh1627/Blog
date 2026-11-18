const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Hexo = require('hexo');

test('one fresh or incremental Hexo generation writes current counts into source, HTML and reports', async () => {
  const root = path.resolve(__dirname, '..');
  const probe = path.join(root, '_probe');
  fs.mkdirSync(probe, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(probe, 'word-stats-'));
  const write = (name, text) => {
    const file = path.join(fixture, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  write('package.json', JSON.stringify({ name: 'word-stats-fixture', hexo: { version: '8.1.2' }, dependencies: {
    'hexo-renderer-marked': '*', 'hexo-renderer-pug': '*', 'hexo-wordcount': '*',
  } }));
  write('_config.yml', 'url: https://example.com/blog\nroot: /blog/\ntheme: fixture\npermalink: posts/:title/\nfuture: false\ntimezone: Asia/Shanghai\n');
  write('themes/fixture/_config.yml', '{}');
  write('themes/fixture/layout/page.pug', 'doctype html\nhtml\n  body!= page.content\n');
  write('themes/fixture/layout/post.pug', 'doctype html\nhtml\n  body\n    h1= page.title\n    .word-count= wordcount(page.content)\n    article!= page.content\n');
  write('scripts/word_stats.js', fs.readFileSync(path.join(root, 'scripts/word_stats.js'), 'utf8'));
  write('lib/word-stats.cjs', fs.readFileSync(path.join(root, 'lib/word-stats.cjs'), 'utf8'));
  const post = (title, tags, body, date = '2026-01-01') => `---\ntitle: ${title}\ntags: ${tags}\ndate: ${date}\n---\n${body}\n`;
  write('source/_posts/travel.md', post('travel', '游记', '旅'.repeat(1200)));
  write('source/_posts/reading.md', post('reading', '读书笔记', '读'.repeat(500)));
  write('source/_posts/4086.md', post('4086', '文艺', '字'.repeat(60)));
  write('source/_posts/future.md', post('future', '游记', '字'.repeat(10000), '2099-01-01'));
  write('source/_drafts/secret.md', post('secret', '游记', '字'.repeat(10000)));
  write('source/journey/index.md', '---\ntitle: Journey\n---\n- 2026（旧值）\n  - [旅行](../posts/travel/)（旧值）\n');
  const hexo = new Hexo(fixture, { silent: true });
  let generations = 0;
  hexo.on('generateBefore', () => generations++);
  const read = name => fs.readFileSync(path.join(fixture, name), 'utf8');
  try {
    await hexo.init();
    await hexo.call('generate', {});
    assert.equal(generations, 1);
    assert.match(read('source/journey/index.md'), /旅行.*（1\.2k）/);
    assert.match(read('public/journey/index.html'), /旅行<\/a>（1\.2k）/);
    assert.match(read('public/posts/travel/index.html'), /class="word-count">1\.2k</);
    assert.match(read('统计/字数统计/游记统计.md'), /\| 2026 \| 1 \| 1200 \| 1200 \|/);
    assert.match(read('统计/字数统计/文章统计.md'), /文章总数： 2 篇/);
    assert.match(read('统计/字数统计/读书笔记统计.md'), /总字数： 500/);
    assert.doesNotMatch(read('统计/字数统计/游记统计.md'), /future|secret/);

    write('source/_posts/travel.md', post('travel', '游记', '旅'.repeat(1700)));
    await hexo.call('generate', {});
    assert.equal(generations, 2);
    assert.match(read('source/journey/index.md'), /旅行.*（1\.7k）/);
    assert.match(read('public/journey/index.html'), /旅行<\/a>（1\.7k）/);
    assert.match(read('统计/字数统计/游记统计.md'), /\| 2026 \| 1 \| 1700 \| 1700 \|/);
  } finally {
    await hexo.exit();
    assert.ok(fixture.startsWith(probe + path.sep));
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
