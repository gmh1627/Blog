---
title: Movies
---
<body>
  <div id="douban"></div>
</body>
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/idouban/dist/index.css"
/>
<script
  src="https://cdn.jsdelivr.net/npm/idouban/dist/index.js"
  onload="idouban.init({
          selector: '#douban',
          lang: 'zh',
          douban_id: '258576743',
          type: 'movie',
          quote: '以下为豆瓣电影个人主页，以添加到豆瓣的日期（不一定是观看时间）为序。此外，部分影视作品如《建军大业》《大国崛起》因无法评分而无法在列表中出现。',
          actions: ['collect', 'wish'],
          page_size: 10,
          max_line: 4
        })"
></script>