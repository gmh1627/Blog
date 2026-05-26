# QGIS 旅行铁路地图制图流程

这是一份通用流程，不绑定具体文章。每篇文章建议单独建一个 QGIS 工程，并使用独立的铁路工作包，例如：

```text
travel_map_xxx.gpkg
```

## 1. 基本原则

- OpenStreetMap 在线底图只作为背景，不参与过滤。
- DataV 行政区 GeoJSON 已经是矢量文件，直接导入使用，不需要再导出为 `.gpkg`。
- 只有 `china_railway.osm.pbf` 这类铁路 OSM 数据建议导出为本篇专用 `.gpkg`，主要包括 `lines`、`multilinestrings`、需要的 `points` 车站，以及自绘行程线。
- 不要先过滤 `.osm.pbf` 再导出，容易导出 0 要素。应先把铁路 OSM 子图层导出为 `.gpkg`，再在 `.gpkg` 图层上过滤、设样式、制图。
- 项目 CRS 使用 `EPSG:4326 - WGS 84`。

## 2. 加入 OpenStreetMap 底图

```text
视图 -> 面板 -> 浏览器
浏览器面板 -> XYZ Tiles -> OpenStreetMap
双击 OpenStreetMap
```

如果没有 `OpenStreetMap`，手动新建 XYZ 连接：

```text
浏览器面板 -> XYZ Tiles -> 右键 -> 新建连接
名称：OpenStreetMap
URL：https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

把 `OpenStreetMap` 放在最底层，导出时不透明度建议 `35-55%`。

## 3. 全国底图：只显示省界、省名和市名

如果想做类似普通中国地图的底图：显示省界、省名、市名，但不显示市界，建议使用两个 DataV 图层叠加。

省界、省名图层：

```text
https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json
```

导入后命名为：

```text
china_province
```

样式：

```text
填充：浅色，例如 #EEF2EA
填充不透明度：100%
边界：#333333
线宽：0.3-0.5 mm
标签字段："name"
```

市名图层：

```text
https://geo.datav.aliyun.com/areas_v3/bound/100000_full_city.json
```

导入后命名为：

```text
china_city_label
```

这个图层只用来显示市名，不显示市界。样式设置：

```text
填充不透明度：0%
边界不透明度：0%
标签字段："name"
```

如果不想显示北京、上海、天津、重庆的区县名，可给 `china_city_label` 使用标准 SQL 过滤：

```sql
SELECT *
FROM "china_city_label"
WHERE "adcode" NOT LIKE '11%'
AND "adcode" NOT LIKE '12%'
AND "adcode" NOT LIKE '31%'
AND "adcode" NOT LIKE '50%'
```

直辖市名称由 `china_province` 图层显示即可。

全国底图推荐图层顺序：

```text
my_station
trip_route
china_railwayosm__lines
china_railwayosm__multilinestrings
china_city_label
china_province
OpenStreetMap 可选
```

全国范围内市名会很密。若画面太乱，建议全国图只显示省名；局部放大图再显示地级市名。

## 4. 导入行政区 GeoJSON

DataV GeoJSON 直接拖入 QGIS，或通过：

```text
图层 -> 添加图层 -> 添加矢量图层
```

行政区图层保持 `.json` 来源即可，不要另存为 `.gpkg`。过滤、复制、设置样式都只影响当前 QGIS 工程，不会改坏原始 GeoJSON 文件。

常用命名：

```text
datav_xxx_prefecture      地级市
datav_xxx_county          县区
xxx_visited               经过的地级市
xxx_county_visited        经过的县区
start_city                起点城市
end_city                  终点城市
```

过滤时使用标准 SQL：

```sql
SELECT *
FROM "datav_xxx_prefecture"
WHERE "name" IN (
'城市甲',
'城市乙'
)
```

县区同理：

```sql
SELECT *
FROM "datav_xxx_county"
WHERE "name" IN (
'县区甲',
'县区乙'
)
```

## 5. 导出铁路 OSM 到 GPKG

把 `china_railway.osm.pbf` 拖入 QGIS，选择需要的子图层：

```text
points              车站
lines               铁路线
multilinestrings    铁路线
```

右键铁路子图层：

```text
导出 -> 要素另存为...
格式：GeoPackage
文件名：本篇专用 travel_map_xxx.gpkg
图层名：china_railwayosm__lines
```

`multilinestrings` 同样导出为：

```text
china_railwayosm__multilinestrings
```

车站可从 `points` 过滤后导出为：

```text
my_station
```

车站查询建议用不带“站”的名称，并用 `GROUP BY "name"` 去重：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'车站甲',
'车站乙'
)
GROUP BY "name"
```

## 6. 图层顺序

从上到下：

```text
my_station
各类 label 图层
trip_route
china_railwayosm__lines
china_railwayosm__multilinestrings
start_city
end_city
各省 visited 图层
各县区重点图层
province_boundary
各省 datav_*_prefecture
OpenStreetMap
```

标签图层放在行程线上方，避免铁路压住文字。

## 7. 样式规范

普通地级市底图：

```text
填充不透明度：100%
边界：#333333
线宽：0.26 mm
```

建议不同省份使用差异明显的浅色，例如：

```text
安徽：#E6F0D8
河南：#F1E4C8
湖北：#D8EAF2
江苏：#E8E0F2
山东：#F2DDE2
福建：#D8EFE4
江西：#F2DFD0
广东：#D9E4F5
广西：#E4EED2
山西：#F1E4C8
陕西：#E4EED2
```

高亮区域：

```text
经过地级市：填充 #A8E6A1，不透明度 50%，边界 #2E7D4F，线宽 0.7-0.9 mm
起点城市：填充 #F4C95D，不透明度 65%，边界 #A65F00，线宽 0.8-1.0 mm
终点城市：填充 #D8B4F8，不透明度 65%，边界 #6D3F99，线宽 0.8-1.0 mm
经过县区：填充 #5FBF72，不透明度 50%，边界 #4F7F55，线宽 0.15-0.25 mm
省界：无填充，边界 #222222，线宽 0.8-1.0 mm
```

边界明显程度：

```text
省界 > 起点/终点城市 > 经过地级市 > 普通地级市 > 经过县区
```

标签：

```text
市名：华文新魏，13 pt，#333333，白色描边 0.8 mm
县名：华文楷体，10 pt，#0E3D22，白色描边 0.5 mm
车站名：宋体，9 pt，#111111，白色描边 0.6-0.8 mm
```

铁路：

```text
普通铁路：#B8B8B8，不透明度 80-100%，线宽 0.2-0.3 mm
行程线底层：黑色简单线，1.2 mm
行程线上层：白色简单线，1.0 mm，自定义虚线，短横 2.0 mm，空格 4.5 mm
车站点：粉色圆点 #E88AA5，描边 #7A2E42，大小 2.2-2.8 mm
```

## 8. 新建行程线

在本篇专用 `.gpkg` 中新建线图层：

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

## 9. 启用捕捉与追踪

显示捕捉工具栏：

```text
视图 -> 工具栏 -> 捕捉工具栏
```

如果找不到，在顶部工具栏空白处右键，勾选：

```text
捕捉工具栏
```

设置捕捉：

```text
工程 -> 捕捉选项...
模式：高级配置
```

只开启铁路图层捕捉：

```text
china_railwayosm__lines：顶点和线段，8 像素
china_railwayosm__multilinestrings：顶点和线段，8 像素
其他图层：关闭捕捉
trip_route：先关闭捕捉
```

重点：单位必须是“像素”，不要用“地图单位”。EPSG:4326 下地图单位是“度”，容差过大会吸到很远的地方。

启用追踪模式：

```text
选中 trip_route
点击铅笔进入编辑模式
选择“添加线要素”或“线段数字化”
在捕捉工具栏点击“启用追踪 / Trace Digitizing”
```

如果工具栏里看不到：

```text
Ctrl + K
搜索：追踪
或搜索：Trace
```

绘制方法：

```text
在线路起点附近点击
沿同一条铁路移动到终点附近点击
QGIS 会沿已有铁路生成中间线
右键结束这一段
填写 seq、segment、mode
保存编辑
```

如果追踪跳到远处：

```text
确认捕捉单位是像素
确认只开启铁路 lines / multilinestrings
把长段拆成短段
在铁路枢纽、并行线、断点处手动多点几下
```

## 10. 其他交通方式

汽车、轮渡、步行不要使用黑白铁轨样式，另建图层：

```text
trip_bus
trip_ferry
trip_walk
```

建议样式：

```text
汽车线：灰色虚线，0.5-0.7 mm
轮渡线：蓝灰色虚线，0.6-0.8 mm
步行线：棕灰色点线，0.4-0.6 mm
```

旅行顺序箭头可以用行程线的“标记线”符号层添加三角箭头，或另建 `trip_arrow` 图层手动画短箭头。

## 11. 导出图片

先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(Xmin, Ymin, Xmax, Ymax)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

使用打印布局导出：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

导出建议：

```text
格式：PNG
DPI：300
```

如果边缘城市名显示不全，把经纬度范围四周外扩 `0.1-0.3` 度，或让地图框四周留 `5-8 mm` 空白。

署名：

```text
地图数据 © OpenStreetMap contributors
行政区边界 DataV GeoAtlas
```
