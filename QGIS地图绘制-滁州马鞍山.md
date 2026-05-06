# QGIS 地图绘制：滁州、马鞍山

对应文章：`source\_posts\小城小记2：滁州、马鞍山.md`

通用图层顺序、字体、路线样式按 `QGIS旅行铁路地图制图流程.md` 执行。本文只写本篇地图的范围、数据和过滤条件。

本篇专用 GeoPackage 文件名：

```text
travel_map_chuzhou_maanshan.gpkg
```

本文所有 DataV、OSM 导出的正式制图图层都保存到这个文件，不再使用通用的 `travel_map.gpkg`。

## 1. 地图范围

建议范围：

```text
X 最小值：117.0
Y 最小值：30.7
X 最大值：119.4
Y 最大值：33.0
```

这个范围能放下合肥、全椒、滁州、南京、马鞍山、芜湖一线。

## 2. 行政区数据

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
江苏地级市：https://geo.datav.aliyun.com/areas_v3/bound/320000_full.json
滁州县区：https://geo.datav.aliyun.com/areas_v3/bound/341100_full.json
马鞍山县区：https://geo.datav.aliyun.com/areas_v3/bound/340500_full.json
芜湖县区：https://geo.datav.aliyun.com/areas_v3/bound/340200_full.json
```

推荐图层名：

```text
datav_anhui_prefecture
datav_jiangsu_prefecture
datav_chuzhou_county
datav_maanshan_county
datav_wuhu_county
```

## 3. 高亮区域

安徽去过城市：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" IN (
'滁州市',
'马鞍山市'
)
```

如果想把起点、换向点也纳入行程背景，可另建弱高亮图层：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" IN (
'合肥市',
'芜湖市'
)
```

南京只是过线背景，不建议用绿色高亮；保留江苏底图和南京市名即可。

县级重点：

```sql
SELECT *
FROM "datav_chuzhou_county"
WHERE "name" = '全椒县'
```

马鞍山若只画采石矶、市区，不必单独高亮县区；如果想标李白墓相关背景，可在 `datav_maanshan_county` 中额外保留 `当涂县`。

## 4. 车站图层

从 `china_railwayosm__points` 搜索并导出为：

```text
station_chuzhou_maanshan
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'合肥南',
'合肥',
'全椒',
'滁州北',
'南京',
'马鞍山',
'芜湖'
)
GROUP BY "name"
```

`南京` 用作线路转折参考，可显示得更淡，或只保留标签不高亮。

## 5. 行程线

新建线图层：

```text
trip_route_chuzhou_maanshan
```

建议绘制：

```text
合肥/合肥南 -> 全椒
全椒 -> 滁州市区：可选，公交段用灰色虚线
滁州北 -> 南京 -> 马鞍山
马鞍山 -> 芜湖 -> 合肥/合肥南
```

铁路段用黑白铁轨样式；公交段若要画，另建 `trip_bus_chuzhou`，使用灰色虚线，避免和铁路混淆。
