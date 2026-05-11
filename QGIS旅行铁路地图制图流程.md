# QGIS 旅行铁路地图制图流程

## 1. 基本原则

- `.osm.pbf` 只作为原始数据，不直接长期制图。
- 正式制图图层建议保存到每篇文章专用的 `.gpkg`，例如 `travel_map_home2_min_gan.gpkg`，避免不同文章互相覆盖图层名。
- 不要先过滤 `.osm.pbf` 再导出，容易导出 0 要素。
- 推荐流程：`OpenStreetMap 底图 -> OSM/GeoJSON 数据 -> 每篇专用 GeoPackage -> 过滤/复制/设样式/导出图片`。
- 项目 CRS 使用 `EPSG:4326 - WGS 84`。

## 2. OpenStreetMap 底图

OpenStreetMap 底图用于提供水系、道路和周边城市背景。它是在线瓦片底图，不等同于 `.osm.pbf` 原始数据。

优先使用 QGIS 自带的 XYZ Tiles：

```text
视图 -> 面板 -> 浏览器
浏览器面板 -> XYZ Tiles -> OpenStreetMap
双击 OpenStreetMap
```

如果 `XYZ Tiles` 下没有 OpenStreetMap，手动新建连接：

```text
浏览器面板 -> XYZ Tiles -> 右键 -> 新建连接
名称：OpenStreetMap
URL：https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

加入后把 `OpenStreetMap` 放在图层列表最底部。正式导出时可把不透明度调低，让自定义行政区、路线和标签成为主视觉。

## 3. 行政区数据

推荐使用 DataV GeoJSON：

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
河南地级市：https://geo.datav.aliyun.com/areas_v3/bound/410000_full.json
湖北地级市：https://geo.datav.aliyun.com/areas_v3/bound/420000_full.json
淮南市县区：https://geo.datav.aliyun.com/areas_v3/bound/340400_full.json
阜阳市县区：https://geo.datav.aliyun.com/areas_v3/bound/341200_full.json
```

拖入 QGIS 后导出到本篇文章专用 `.gpkg`，命名示例：

```text
datav_anhui_prefecture
datav_henan_prefecture
datav_hubei_prefecture
province_boundary
datav_huainan_county
datav_fuyang_county
```

省界建议从各省地级市图层复制一份，使用“融合/Dissolve”按省合并为省级外轮廓，或直接使用省级边界数据。省界图层只显示边界，不填充。

## 4. 经过区域过滤

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
start_city
end_city
```

建议新建 `start_city` 和 `end_city` 两个独立图层。不要只靠 `*_visited` 图层改颜色，否则起点、终点和普通经过城市会混在一起，后面换文章也不方便。

## 5. 图层顺序

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
start_city
end_city
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

## 6. 样式

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

起点地级市：

```text
填充：#F4C95D
填充不透明度：65%
边界：#A65F00
线宽：0.8-1.0 mm
图层名：start_city
用途：只用于本篇路线起点城市
```

终点地级市：

```text
填充：#D8B4F8
填充不透明度：65%
边界：#6D3F99
线宽：0.8-1.0 mm
图层名：end_city
用途：只用于本篇路线终点城市；如果起点和终点相同，可只使用 start_city 或二选一保留更醒目的颜色
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
省界 > 起点/终点地级市 > 经过地级市 > 普通地级市 > 经过县区
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

## 7. 标签

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

## 8. 铁路与行程线

铁路部分分成三类图层：

```text
普通铁路底图：china_railwayosm__lines / china_railwayosm__multilinestrings
车站点：my_station
本次行程高亮线：trip_route
```

### 8.1 普通铁路底图

把 `china_railway.osm.pbf` 拖入 QGIS 后，通常会看到多个子图层。铁路线路主要看这两个：

```text
china_railwayosm__lines
china_railwayosm__multilinestrings
```

两者都可能包含铁路，建议都导出到本篇文章专用 `.gpkg`。如果属性表里 `railway` 字段只有 `rail`，无需再筛；如果还有其他类型，再用：

```sql
SELECT *
FROM "lines"
WHERE "railway" = 'rail'
```

```sql
SELECT *
FROM "multilinestrings"
WHERE "railway" = 'rail'
```

普通铁路只作为背景参考，样式保持淡灰细线：

```text
颜色：#B8B8B8
不透明度：80-100%
线宽：0.2-0.3 mm
```

### 8.2 车站点

从 `china_railway.osm.pbf` 的 `points` 子图层筛选本次用到的车站，导出为：

```text
my_station
```

车站查询优先用不带“站”的名称，并用 `GROUP BY "name"` 去重。示例：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'合肥南',
'寿县',
'颍上北',
'颍上',
'阜阳',
'阜阳西',
'周口东',
'周口',
'漯河',
'漯河西',
'驻马店西',
'驻马店',
'信阳',
'信阳东',
'孝感北',
'孝感东',
'汉口'
)
GROUP BY "name"
```

如果同名车站仍有多个点，打开属性表和地图位置检查；确认后改用 `osm_id` 精确保留每站一个点。

### 8.3 新建行程线

在本篇文章专用 `.gpkg` 中新建线图层：

```text
trip_route
```

几何类型：

```text
LineString
CRS：EPSG:4326 - WGS 84
```

建议字段：

```text
seq      整数
segment  文本
mode     文本
note     文本
```

`seq` 用来记录顺序，`segment` 写区间名，`mode` 可写 `rail`、`bus`、`ferry` 等。

### 8.4 手动画线

使用“线段数字化”手动画，不使用自动追踪。自动追踪容易跳到很远的线路，尤其在铁路密集区和多线并行处不稳定。

操作顺序：

```text
右键 trip_route -> 切换编辑
选择“线段数字化”
沿普通铁路底图点击起点、转折点、终点
右键结束一段
填写 seq、segment、mode
保存编辑
切换编辑关闭
```

画线时不用逐节点完全贴合铁路，只要在当前出图比例下看起来沿着铁路即可。长距离段可以少点几次，城市枢纽、线路转弯处多点几次。

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

### 8.5 行程线样式

`trip_route` 用两层线做黑白等长条块：

```text
底层简单线：黑色，1.2 mm
上层简单线：白色，1.0 mm
上层线勾选“使用自定义虚线图型”
短横：2.0 mm
空格：4.5 mm
端点样式：平端或方角
```

如果一篇文章中有汽车、渡轮等非铁路段，建议另建图层，不要混用铁轨样式：

```text
trip_bus：灰色虚线，0.5-0.7 mm
trip_ferry：蓝灰色虚线，0.6-0.8 mm
```

### 8.6 图层位置

行程线、车站和标签的相对位置：

```text
my_station
各类 label 图层
trip_route
普通铁路
行政区高亮
普通行政区底图
OpenStreetMap
```

## 9. 导出

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
