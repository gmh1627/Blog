# 旅行日历

日历放在 `source/journey/index.md` 开头，通过 `{% journey_calendar %}` 插入。运行 `npm run build` 时，Hexo 自动生成 `/journey/calendar.json`，无需手动维护第二份行程表。

- 游览内容与游记链接：`source/_posts/行程轨迹汇总.md`。
- 铁路日期、时刻和里程：`Map/web/data/visited_routes.geojson`，与铁路网页保持一致，不从行旅杂记铁路表推算日期。
- 飞行日期、航班与里程：`source/_posts/行旅杂记.md` 的“飞行记录表”。

只录入有明确年月日的内容，月份、季节和模糊日期不会被放进日历。跨夜铁路在出发日显示出发、抵达日显示抵达。没有记录飞行时刻时不补造时刻。日期范围内的合并游览记录保留范围说明。

同一天按到访地点和交通衔接排列，保留高邮/扬州、永济/西安等同一行程内不同地点的区别。同一篇游记只在当天开头链接一次；不同游记重复记述的同一段游览合并展示。铁路中间站不作为新的游览记录。

数据处理位于 `lib/journey-calendar.cjs`，展示脚本与样式位于 `source/js/journey-calendar.js`、`source/css/journey-calendar.css`。运行 `node --test test/journey-calendar.test.cjs` 检查日期过滤、行程顺序、跨夜和游记去重。
