# 行走的日子

日历放在 `source/journey/index.md` 开头，通过 `{% journey_calendar %}` 插入。运行 `npm run build` 时，Hexo 自动生成 `/journey/calendar.json`，无需手动维护第二份行程表。

页面可在“月视图”和“全年视图”之间切换。全年同时显示 12 个月，日期仍标记游览、铁路、航班；点击日期查看当天详情，点击月份标题可进入对应月视图。

- 游览内容与游记链接：`source/_posts/行程轨迹汇总.md`。
- 铁路日期、时刻和里程：`Map/web/data/visited_routes.geojson`，与铁路网页保持一致。完整校对记录位于 `Map/制图工具/scripts/travel_history/railway_records.csv`，每行同时保存序号、日期、起终点、车次、里程、时刻和备注。
- 飞行日期、航班与里程：`source/_posts/行旅杂记.md` 的“飞行记录表”。

只录入有明确年月日的内容，月份、季节和模糊日期不会被放进日历。跨夜铁路在出发日显示出发、抵达日显示抵达。没有记录飞行时刻时不补造时刻。日期范围内的合并游览记录保留范围说明。

同一天按到访地点和交通衔接排列，保留高邮/扬州、永济/西安等同一行程内不同地点的区别。同一篇游记只在当天开头链接一次；不同游记重复记述的同一段游览合并展示。铁路中间站不作为新的游览记录。

游览、铁路、航班使用绿色圆点、橙色方点和紫色菱形区分。游览条目先显示“游览”，下一行将城市加粗，后接具体地点。日历只显示当天游记链接，不插入通用交通记录链接。

### 添加游览和航班

在 `source/_posts/行程轨迹汇总.md` 的对应年份、游记标题下增加日期和城市，示例：

```markdown
# 2026年
## [游记标题](../游记的abbrlink/)
- 11.20
  北京：景点一、景点二
```

同一天去了几个城市就依次写几行城市和地点。飞行记录直接追加到 `source/_posts/行旅杂记.md` 的飞行记录表，日期写完整年月日。之后运行 `npm run build`。新增城市、机场或县区时，应核对日历是否将交通放在正确的城市之间。

### 添加铁路

在 `Map/制图工具/scripts/travel_history/railway_records.csv` **末尾**追加一行，序号接着现有最后一行递增，已有序号保持不变。各列用 `|` 分隔；跨夜写“次日”，备注可以留空。格式示例：

```text
序号|2026.11.20|出发站|到达站|车次|里程|20:00-次日08:00|备注
```

从博客根目录运行：

```powershell
& .\Map\制图工具\update_travel_history.ps1
```

这会匹配车站、生成线路和静态地图、导出网页和压缩首屏数据、执行地图校验，再生成博客日历。新到访城市和省份也要加入行旅杂记的到访清单。新线路生成后查看路线是否符合实际；需要指定经过站时，在 `parse_source.py` 的 `ROUTE_CONTROL_POINTS` 中增加该车次和起终点的约束；尚未收录的经过站还需在 `build_routes.py` 的 `WAYPOINT_COORDS` 中补充坐标。

如果只更正已有铁路记录的日期、时刻、备注，可以用更快的方式：

```powershell
& .\Map\制图工具\update_travel_history.ps1 -TimetableOnly
```

脚本默认使用本机 `E:\QGIS 3.44.8`，安装位置变化时可传 `-QgisPython`。脚本只构建和校验，不执行博客部署或 Git 推送。

数据处理位于 `lib/journey-calendar.cjs`，展示脚本与样式位于 `source/js/journey-calendar.js`、`source/css/journey-calendar.css`。运行 `node --test test/journey-calendar.test.cjs` 检查日期过滤、行程顺序、跨夜和游记去重。
