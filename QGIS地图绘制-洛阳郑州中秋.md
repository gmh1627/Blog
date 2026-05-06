# QGIS 地图绘制：洛阳、郑州中秋

对应文章：`source\_posts\“人生短短几个秋啊，不醉不罢休”——在洛阳、郑州的中秋.md`

通用图层顺序、字体、路线样式按 `QGIS旅行铁路地图制图流程.md` 执行。本文只写本篇地图的范围、数据和过滤条件。

本篇专用 GeoPackage 文件名：

```text
travel_map_luoyang_zhengzhou.gpkg
```

本文所有 DataV、OSM 导出的正式制图图层都保存到这个文件，不再使用通用的 `travel_map.gpkg`。

## 1. 地图范围

主图建议画完整铁路行程：

```text
X 最小值：111.0
Y 最小值：31.3
X 最大值：117.8
Y 最大值：35.2
```

如果觉得合肥到郑州段太长，可以另做河南局部放大图：

```text
X 最小值：111.0
Y 最小值：33.6
X 最大值：114.6
Y 最大值：35.1
```

## 2. 行政区数据

导入 DataV GeoJSON 后，先导出到 `travel_map_luoyang_zhengzhou.gpkg`，再过滤。

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
河南地级市：https://geo.datav.aliyun.com/areas_v3/bound/410000_full.json
郑州县区：https://geo.datav.aliyun.com/areas_v3/bound/410100_full.json
洛阳县区：https://geo.datav.aliyun.com/areas_v3/bound/410300_full.json
```

推荐图层名：

```text
datav_anhui_prefecture
datav_henan_prefecture
datav_zhengzhou_county
datav_luoyang_county
```

## 3. 高亮区域

河南去过城市：

```sql
SELECT *
FROM "datav_henan_prefecture"
WHERE "name" IN (
'洛阳市',
'郑州市'
)
```

安徽起点可弱化显示，若要高亮合肥：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" = '合肥市'
```

县级重点建议只标巩义：

```sql
SELECT *
FROM "datav_zhengzhou_county"
WHERE "name" = '巩义市'
```

洛阳若只做地级市高亮即可，不必再细分县区；若想突出龙门石窟，可在地图上用点标注，不建议把洛龙区整体高亮得过重。

## 4. 车站图层

从 `china_railwayosm__points` 搜索并导出为本篇车站图层，例如：

```text
station_luoyang_zhengzhou
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'合肥',
'合肥南',
'郑州',
'郑州东',
'洛阳',
'巩义',
'巩义南'
)
GROUP BY "name"
```

`巩义` 和 `巩义南` 按实际票面二选一；返程若从郑州东走高铁，则保留 `郑州东`，否则保留 `郑州`。

## 5. 行程线

新建线图层：

```text
trip_route_luoyang_zhengzhou
```

按铁路实际走向手动画这些段：

```text
合肥 -> 郑州
郑州 -> 洛阳
洛阳 -> 巩义/巩义南
巩义/巩义南 -> 郑州/郑州东
郑州/郑州东 -> 合肥南
```

长距离主图上，合肥至郑州、郑州至合肥两段可以不画得过细，只要贴近普通铁路底图即可。河南局部放大图再细画洛阳、巩义、郑州之间的转折。
