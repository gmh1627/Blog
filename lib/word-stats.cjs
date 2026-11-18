'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { stripHTML } = require('hexo-util');

const EXTRA_POSTS = ['posts/4086/', 'posts/18e4/', 'posts/d4b0/', 'posts/4cde/'];
const EXCLUDED_TITLES = new Set(['行程轨迹汇总']);

function countWords(html) {
  // Same counter as the installed hexo-wordcount helper; retain the exact integer.
  const text = stripHTML(html || '');
  const chinese = (text.match(/[\u4E00-\u9FA5]/g) || []).length;
  const other = (text.replace(/[\u4E00-\u9FA5]/g, '').match(/[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g) || []).length;
  return chinese + other;
}

function formatWordCount(count) {
  return count < 1000 ? String(count) : `${Math.round(count / 100) / 10}k`;
}

function normalizeUrl(value, base) {
  const url = new URL(value, base);
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
  return url.href;
}

function updateJourneyIndex(text, articles, siteUrl) {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const byUrl = new Map(articles.map(article => [normalizeUrl(article.url, siteUrl), article]));
  const years = new Map();
  let currentYear = null;
  const base = new URL('journey/', siteUrl.endsWith('/') ? siteUrl : siteUrl + '/').href;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const year = line.match(/^-\s+(\d{4})(?:[（(][^）)]*[）)])?\s*$/);
    if (year) {
      currentYear = year[1];
      years.set(currentYear, { index, total: 0 });
      continue;
    }
    const link = line.match(/^([ \t]*)-\s+\[(.+?)\]\(([^)]+)\)(?:[（(][^）)]*[）)])?[ \t]*$/);
    if (link) {
      const [, indent, title, href] = link;
      if (!indent) currentYear = null;
      const prefix = `${indent}- [${title}](${href})`;
      if (EXCLUDED_TITLES.has(title)) { lines[index] = prefix; continue; }
      const article = byUrl.get(normalizeUrl(href, base));
      if (!article) throw new Error(`行程索引找不到已发布文章：${title}（${href}）`);
      lines[index] = `${prefix}（${formatWordCount(article.word_count)}）`;
      if (currentYear && indent) years.get(currentYear).total += article.word_count;
    } else if (line.startsWith('- ')) currentYear = null;
  }
  for (const [year, { index, total }] of years) lines[index] = `- ${year}（${formatWordCount(total)}）`;
  return lines.join(newline);
}

function reportMarkdown(articles, title, timestamp) {
  const total = articles.reduce((sum, article) => sum + article.word_count, 0);
  const average = articles.length ? Math.floor(total / articles.length) : 0;
  const lines = [`# ${title}`, '', `统计时间： ${timestamp}`, '', '## 总体统计', '',
    `- 文章总数： ${articles.length} 篇`, `- 总字数： ${formatWordCount(total)}`,
    `- 平均字数： ${average} 字/篇`, '', '## 按发表年份统计', '',
    '| 年份 | 篇数 | 总字数 | 平均字数 |', '|------|------|--------|----------|'];
  const years = new Map();
  for (const article of articles) {
    const year = article.published_time.slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    if (!years.has(year)) years.set(year, { count: 0, total: 0 });
    years.get(year).count++;
    years.get(year).total += article.word_count;
  }
  for (const [year, stats] of [...years].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${year} | ${stats.count} | ${stats.total} | ${Math.floor(stats.total / stats.count)} |`);
  }
  const table = (heading, rows) => {
    lines.push('', `## ${heading}`, '', '| 序号 | 文章标题 | 字数 | 发表时间 | 更新时间 |', '|------|----------|------|----------|----------|');
    rows.forEach((article, index) => lines.push(`| ${index + 1} | [${article.title.replace(/\|/g, '\\|')}](${article.url}) | ${formatWordCount(article.word_count)} | ${article.published_time} | ${article.updated_time} |`));
  };
  table('文章详情', articles);
  lines.push('', '## 字数分布', '');
  const ranges = [[0, 1000, '1000字以下'], [1000, 3000, '1000-3000字'], [3000, 5000, '3000-5000字'], [5000, 10000, '5000-10000字'], [10000, Infinity, '10000字以上']];
  for (const [min, max, label] of ranges) {
    const count = articles.filter(article => article.word_count >= min && article.word_count < max).length;
    const percentage = articles.length ? (count / articles.length * 100).toFixed(1) : '0.0';
    lines.push(`- ${label}： ${count} 篇 (${percentage}%)`);
  }
  table('按字数排序', [...articles].sort((a, b) => a.word_count - b.word_count));
  return lines.join('\n') + '\n';
}

function createReports(articles, siteUrl, timestamp) {
  const sorted = [...articles].sort((a, b) => a.published_time.localeCompare(b.published_time) || a.url.localeCompare(b.url));
  const travel = sorted.filter(article => article.tags.includes('游记'));
  const extra = new Set(EXTRA_POSTS.map(post => normalizeUrl(post, siteUrl.endsWith('/') ? siteUrl : siteUrl + '/')));
  const combined = sorted.filter(article => article.tags.includes('游记') || extra.has(normalizeUrl(article.url, siteUrl)));
  const reading = sorted.filter(article => article.tags.includes('读书笔记'));
  return [
    ['游记统计.md', '游记类别字数统计', travel],
    ['文章统计.md', '文章字数统计（游记 + 指定文章）', combined],
    ['读书笔记统计.md', '读书笔记类别字数统计', reading],
  ].map(([filename, title, entries]) => ({ filename, articles: entries, content: reportMarkdown(entries, title, timestamp) }));
}

function writeIfChanged(filename, content) {
  if (fs.existsSync(filename) && fs.readFileSync(filename, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, content, 'utf8');
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return true;
}

module.exports = { countWords, formatWordCount, normalizeUrl, updateJourneyIndex, createReports, reportMarkdown, writeIfChanged };
