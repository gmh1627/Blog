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
          quote: '豆瓣电影个人主页',
          actions: ['collect', 'wish'],
          page_size: 10,
          max_line: 4
        })"
></script>