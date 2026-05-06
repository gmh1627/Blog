# QGIS 地图绘制：回家路上2，闽赣段

对应文章：`source\_posts\回家路上2：泾县、福州、龙岩、赣州.md`

本图只画江西、福建部分，不画泾县到福州之前的安徽段，也不画赣州到湛江之后的粤段。通用图层顺序、字体、路线样式按 `QGIS旅行铁路地图制图流程.md` 执行。

本篇专用 GeoPackage 文件名：

```text
travel_map_home2_min_gan.gpkg
```

## 1. 地图范围

建议范围：

```text
X 最小值：114.0
Y 最小值：24.5
X 最大值：120.0
Y 最大值：27.3
```

如果路线显得太横，可以在版式里裁成更宽的图片，不必强行做 A4 比例。

## 2. 行政区数据

```text
福建地级市：https://geo.datav.aliyun.com/areas_v3/bound/350000_full.json
江西地级市：https://geo.datav.aliyun.com/areas_v3/bound/360000_full.json
福州县区：https://geo.datav.aliyun.com/areas_v3/bound/350100_full.json
龙岩县区：https://geo.datav.aliyun.com/areas_v3/bound/350800_full.json
赣州县区：https://geo.datav.aliyun.com/areas_v3/bound/360700_full.json
```

推荐图层名：

```text
datav_fujian_prefecture
datav_jiangxi_prefecture
datav_longyan_county
datav_ganzhou_county
```

## 3. 高亮区域

去过地级市：

```sql
SELECT *
FROM "datav_fujian_prefecture"
WHERE "name" IN (
'福州市',
'龙岩市'
)
```

```sql
SELECT *
FROM "datav_jiangxi_prefecture"
WHERE "name" = '赣州市'
```

县级重点：

```sql
SELECT *
FROM "datav_longyan_county"
WHERE "name" IN (
'上杭县',
'长汀县'
)
```

```sql
SELECT *
FROM "datav_ganzhou_county"
WHERE "name" IN (
'瑞金市',
'于都县',
'章贡区'
)
```

## 4. 车站图层

从 `china_railwayosm__points` 搜索并导出为：

```text
station_home2_min_gan
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'福州',
'古田会址',
'长汀南',
'瑞金',
'于都',
'赣州西',
'赣州'
)
GROUP BY "name"
```

## 5. 行程线

新建线图层：

```text
trip_route_home2_min_gan
```

只绘制闽赣段：

```text
福州/福州南 -> 古田会址
古田会址 -> 长汀南
长汀南 -> 瑞金
瑞金 -> 于都
于都 -> 赣州西/赣州
```

如果想表现“从北方进入、向广东离开”，可以在福州北侧和赣州南侧各画一小段淡灰虚线或箭头，但不要抢过主线。
