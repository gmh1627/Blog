# QGIS 地图绘制：枣庄、徐州、淮北

对应文章：`source\_posts\清明游记：枣庄、徐州、淮北.md`

通用图层顺序、字体、路线样式按 `QGIS旅行铁路地图制图流程.md` 执行。本文只写本篇地图的范围、数据和过滤条件。

本篇专用 GeoPackage 文件名：

```text
travel_map_zaozhuang_xuzhou_huaibei.gpkg
```

本文所有 DataV、OSM 导出的正式制图图层都保存到这个文件，不再使用通用的 `travel_map.gpkg`。

## 1. 地图范围

局部主图建议范围：

```text
X 最小值：116.4
Y 最小值：33.3
X 最大值：118.8
Y 最大值：35.4
```

这个范围突出鲁苏皖交界，不把合肥拉进来。若一定要画合肥出发和返程，需要把 `Y 最小值` 放到约 `31.5`，画面会变得很长。

## 2. 行政区数据

```text
山东地级市：https://geo.datav.aliyun.com/areas_v3/bound/370000_full.json
江苏地级市：https://geo.datav.aliyun.com/areas_v3/bound/320000_full.json
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
枣庄县区：https://geo.datav.aliyun.com/areas_v3/bound/370400_full.json
徐州县区：https://geo.datav.aliyun.com/areas_v3/bound/320300_full.json
淮北县区：https://geo.datav.aliyun.com/areas_v3/bound/340600_full.json
```

推荐图层名：

```text
datav_shandong_prefecture
datav_jiangsu_prefecture
datav_anhui_prefecture
datav_zaozhuang_county
datav_xuzhou_county
datav_huaibei_county
```

## 3. 高亮区域

去过城市：

```sql
SELECT *
FROM "datav_shandong_prefecture"
WHERE "name" = '枣庄市'
```

```sql
SELECT *
FROM "datav_jiangsu_prefecture"
WHERE "name" = '徐州市'
```

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" = '淮北市'
```

县级重点：

```sql
SELECT *
FROM "datav_zaozhuang_county"
WHERE "name" = '台儿庄区'
```

可选重点：

```sql
SELECT *
FROM "datav_zaozhuang_county"
WHERE "name" = '薛城区'
```

`薛城区` 是枣庄站和新城区所在位置，只在你想解释枣庄市区结构时高亮；普通旅行地图只高亮 `台儿庄区` 即可。

## 4. 车站图层

从 `china_railwayosm__points` 搜索并导出为：

```text
station_zaozhuang_xuzhou_huaibei
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'枣庄',
'徐州东',
'徐州',
'淮北',
'合肥南'
)
GROUP BY "name"
```

局部图中 `合肥南` 可以不显示，只在完整行程图中保留。

## 5. 行程线

铁路图层：

```text
trip_route_zaozhuang_xuzhou_huaibei
```

绘制：

```text
徐州东 -> 枣庄
徐州 -> 淮北
```

如果画完整出发/返程，再补：

```text
合肥南 -> 徐州东 -> 枣庄
淮北 -> 合肥南
```

汽车段另建：

```text
trip_bus_taierzhuang
```

绘制：

```text
枣庄 -> 台儿庄区
台儿庄区 -> 徐州市区
```

汽车段建议灰色虚线，不要使用铁轨样式。
