# QGIS 旅行铁路地图制图流程

## 1. 基本原则

- `.osm.pbf` 只作为原始数据，不直接长期制图。
- 正式制图图层统一保存到 `travel_map.gpkg`。
- 不要先过滤 `.osm.pbf` 再导出，容易导出 0 要素。
- 推荐流程：`OSM/GeoJSON -> GeoPackage -> 过滤/复制/设样式/导出图片`。
- 项目 CRS 使用 `EPSG:4326 - WGS 84`。

## 2. 行政区数据

推荐使用 DataV GeoJSON：

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
河南地级市：https://geo.datav.aliyun.com/areas_v3/bound/410000_full.json
湖北地级市：https://geo.datav.aliyun.com/areas_v3/bound/420000_full.json
淮南市县区：https://geo.datav.aliyun.com/areas_v3/bound/340400_full.json
阜阳市县区：https://geo.datav.aliyun.com/areas_v3/bound/341200_full.json
```

拖入 QGIS 后导出到 `travel_map.gpkg`，命名示例：

```text
datav_anhui_prefecture
datav_henan_prefecture
datav_hubei_prefecture
province_boundary
datav_huainan_county
datav_fuyang_county
```

省界建议从各省地级市图层复制一份，使用“融合/Dissolve”按省合并为省级外轮廓，或直接使用省级边界数据。省界图层只显示边界，不填充。

## 3. 经过区域过滤

文档中的查询统一写成完整 SQL。若在 QGIS 某些窗口只需要条件表达式，再手动取 `WHERE` 后面的部分。

安徽：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" IN (
'合肥市',
'淮南市',
'阜阳市'
)
```

河南：

```sql
SELECT *
FROM "datav_henan_prefecture"
WHERE "name" IN (
'周口市',
'漯河市',
'驻马店市',
'信阳市'
)
```

湖北：

```sql
SELECT *
FROM "datav_hubei_prefecture"
WHERE "name" = '孝感市'
```

县区：

```sql
SELECT *
FROM "datav_huainan_county"
WHERE "name" = '寿县'
```

```sql
SELECT *
FROM "datav_fuyang_county"
WHERE "name" = '颍上县'
```

复制原图层后过滤，命名为：

```text
anhui_visited
henan_visited
hubei_visited
```

## 4. 图层顺序

从上到下：

```text
my_station
datav_henan_prefecture_label
datav_anhui_prefecture_label
datav_hubei_prefecture_label
huainan_county_label
fuyang_county_label
trip_route
china_railwayosm__lines
china_railwayosm__multilinestrings
hubei_visited
datav_fuyang_county
datav_huainan_county
anhui_visited
henan_visited
province_boundary
datav_hubei_prefecture
datav_anhui_prefecture
datav_henan_prefecture
OpenStreetMap
```

标签图层应放在 `trip_route` 上方，避免铁路线压住文字。

## 5. 样式

普通地级市底图：

```text
安徽：#E6F0D8
河南：#F1E4C8
湖北：#D8EAF2
填充不透明度：100%
边界：#333333
线宽：0.26 mm
```

经过地级市：

```text
填充：#A8E6A1
填充不透明度：50%
边界：#2E7D4F
线宽：0.7-0.9 mm
```

经过县区：

```text
填充：#5FBF72
填充不透明度：50%
边界：#4F7F55
线宽：0.15-0.25 mm
```

边界明显程度遵循：

```text
省界 > 经过地级市 > 普通地级市 > 经过县区
```

普通铁路：

```text
颜色：#B8B8B8
不透明度：80-100%
线宽：0.2-0.3 mm
```

OpenStreetMap 底图：

```text
不透明度：35-55%
作用：只保留水系、道路、城市背景纹理
若底图文字干扰自定义标签，可继续降低到底图文字不抢眼为止
```

`*_visited` 图层只负责填充和边界，不开启标签；所有文字统一放在 `*_label` 图层和 `my_station` 图层中。

## 6. 标签

复制行政区图层作为专用标签层。标签层本身设为无填充、无边线，只显示标签。

市名：

```text
字体：华文新魏
字号：13 pt
颜色：#333333
描边：白色，0.8 mm
```

县名：

```text
字体：华文楷体
字号：10 pt
颜色：#0E3D22
描边：白色，0.5 mm
```

车站名：

```text
字体：宋体
字号：9 pt
颜色：#111111
描边：白色，0.6-0.8 mm
```

## 7. 铁路与行程线

将 `china_railway.osm.pbf` 中的铁路图层导出到 GeoPackage：

```text
china_railwayosm__lines
china_railwayosm__multilinestrings
```

如果 `railway` 字段只有 `rail`，无需再筛。

新建线图层：

```text
trip_route
```

字段：

```text
seq      整数
segment  文本
```

使用“线段数字化”手动画，不使用自动追踪。

行程分段示例：

```text
1 合肥南-寿县-颍上北
2 颍上-阜阳
3 阜阳西-周口东
4 周口-漯河
5 漯河西-驻马店西
6 驻马店-信阳
7 信阳东-孝感北
8 孝感东-汉口
9 汉口-合肥南
```

车站点去重过滤。本示例已确认重复点，直接用 `osm_id` 精确保留每站一个点：

```sql
SELECT *
FROM "points"
WHERE "osm_id" IN (
'1912964679',
'2264149886',
'2279413292',
'2492403981',
'2504111813',
'3377737086',
'4592125064',
'4592130192',
'5749716721',
'6237929169',
'7284562662',
'8278853407',
'8401357510',
'9023014147',
'9263921398',
'9350376210',
'9987644049'
)
```

车站标签统一去掉末尾“站”字：

```qgis
regexp_replace("name", '站$', '')
```

铁轨样式：

```text
底层简单线：黑色，1.2 mm
上层简单线：白色，1.0 mm
上层线勾选“使用自定义虚线图型”
短横：2.0 mm
空格：4.5 mm
端点样式：平端或方角
```

## 8. 导出

不要截图，使用打印布局：

```text
项目 -> 新建打印布局
添加项目 -> 添加地图
布局 -> 导出为图像
```

按经纬度范围确定页面比例。示例：

```text
Xmin = 112.5
Xmax = 119
Ymin = 29.8
Ymax = 34.5
宽高比 = (119 - 112.5) / (35 - 29.8) = 1.32
页面可设为 264 mm x 200 mm
```

导出建议：

```text
格式：PNG
DPI：200 或 300
```

署名：

```text
地图数据 © OpenStreetMap contributors
行政区边界 DataV GeoAtlas
```
