# QGIS 地图绘制：扬州、镇江

对应文章：`source\_posts\江南江北送君归：从扬州到镇江.md`

通用图层顺序、字体、路线样式按 `QGIS旅行铁路地图制图流程.md` 执行。本文只写本篇地图的范围、数据和过滤条件。

本篇专用 GeoPackage 文件名：

```text
travel_map_yangzhou_zhenjiang.gpkg
```

本文所有 DataV、OSM 导出的正式制图图层都保存到这个文件，不再使用通用的 `travel_map.gpkg`。

## 1. 地图范围

建议范围：

```text
X 最小值：117.0
Y 最小值：31.5
X 最大值：120.0
Y 最大值：33.3
```

如果只做扬州、镇江局部图：

```text
X 最小值：119.0
Y 最小值：31.7
X 最大值：119.8
Y 最大值：32.8
```

## 2. 行政区数据

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
江苏地级市：https://geo.datav.aliyun.com/areas_v3/bound/320000_full.json
扬州县区：https://geo.datav.aliyun.com/areas_v3/bound/321000_full.json
镇江县区：https://geo.datav.aliyun.com/areas_v3/bound/321100_full.json
```

推荐图层名：

```text
datav_anhui_prefecture
datav_jiangsu_prefecture
datav_yangzhou_county
datav_zhenjiang_county
```

## 3. 高亮区域

江苏去过城市：

```sql
SELECT *
FROM "datav_jiangsu_prefecture"
WHERE "name" IN (
'扬州市',
'镇江市'
)
```

合肥作为起点可弱化或单独高亮：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" = '合肥市'
```

县级重点建议标高邮：

```sql
SELECT *
FROM "datav_yangzhou_county"
WHERE "name" = '高邮市'
```

瓜洲属于扬州内部的镇级地点，DataV 县区图层里通常不会直接有 `瓜洲镇`，建议用点标注，不要为它单独找镇级边界。

## 4. 车站图层

从 `china_railwayosm__points` 搜索并导出为：

```text
station_yangzhou_zhenjiang
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'合肥南',
'高邮',
'扬州东',
'扬州',
'镇江'
)
GROUP BY "name"
```

扬州市区实际到达站按票面选择 `扬州东` 或 `扬州`。

## 5. 行程线

铁路图层：

```text
trip_route_yangzhou_zhenjiang
```

绘制：

```text
合肥南 -> 高邮
高邮 -> 扬州东/扬州
镇江 -> 合肥南
```

渡江段另建线图层：

```text
trip_ferry_zhenyang
```

绘制：

```text
扬州瓜洲 -> 镇扬汽渡 -> 镇江
```

渡轮不是铁路，不要使用黑白铁轨样式。建议用深蓝或蓝灰色虚线，线宽约 `0.6-0.8 mm`，标签写 `镇扬汽渡`。
