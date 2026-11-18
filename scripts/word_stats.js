'use strict';

const fs = require('node:fs');
const path = require('node:path');
const frontMatter = require('hexo-front-matter');
const { countWords, formatWordCount, updateJourneyIndex, createReports, writeIfChanged } = require('../lib/word-stats.cjs');

// Hexo renders posts/pages at priority 10; update the index before generators run.
hexo.extend.filter.register('before_generate', async function () {
  const wordcount = this.extend.helper.get('wordcount');
  const date = this.extend.helper.get('date');
  const dateContext = { config: this.config, page: {} };
  const articles = this.locals.get('posts').toArray().map(post => {
    if (post.content == null) throw new Error(`文章尚未渲染：${post.source}`);
    const count = countWords(post.content);
    if (String(wordcount.call(this, post.content)) !== formatWordCount(count)) {
      throw new Error('字数统计规则与 hexo-wordcount 不一致，请检查插件版本');
    }
    return {
      title: post.title, url: post.permalink, word_count: count,
      published_time: post.date ? date.call(dateContext, post.date, 'YYYY-MM-DD') : '未知',
      updated_time: post.updated ? date.call(dateContext, post.updated, 'YYYY-MM-DD') : '未更新',
      tags: post.tags.toArray().map(tag => tag.name),
    };
  });

  const indexPath = path.join(this.source_dir, 'journey/index.md');
  const original = fs.readFileSync(indexPath, 'utf8');
  const updated = updateJourneyIndex(original, articles, this.config.url);
  const timestamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: this.config.timezone || 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(new Date());
  const reports = createReports(articles, this.config.url, timestamp);

  if (updated !== original) {
    const page = this.model('Page').findOne({ source: 'journey/index.md' });
    if (!page) throw new Error('Hexo 中找不到 journey/index.md 页面');
    page.raw = updated;
    page._content = frontMatter.parse(updated)._content;
    page.content = page._content;
    await this.post.render(page.full_source, page);
    await page.save();
    writeIfChanged(indexPath, updated);
    this.locals.invalidate();
  }
  for (const report of reports) {
    writeIfChanged(path.join(this.base_dir, '统计/字数统计', report.filename), report.content);
  }
  this.log.info('[字数统计] 已更新行程索引和 3 份统计报告');
}, 20);
