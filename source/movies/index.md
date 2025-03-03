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
          quote: '豆瓣电影个人主页（排序方式为添加到豆瓣的时间，并非观看时间。此外，部分影视作品如《建军大业》《大国崛起》因无法评分而无法在列表中出现）',
          actions: ['collect', 'wish'],
          page_size: 10,
          max_line: 4
        })"
></script>