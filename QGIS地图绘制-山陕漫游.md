# QGIS 地图绘制：山西陕西漫游

路线：北京丰台 -> 太原 -> 蔡家崖 -> 保德 -> 府谷 -> 神木 -> 岢岚 -> 大同 -> 大同南 -> 北京北

本篇专用 GeoPackage 文件名：

```text
travel_map_shanxi_shaanxi.gpkg
```

## 1. 地图范围

建议范围：

```text
X 最小值：109.8
Y 最小值：37.3
X 最大值：117.0
Y 最大值：40.6
```

主图适合横幅。北京、河北作为出入背景，山西、陕西为主要漫游区域。

## 2. OpenStreetMap 底图

先加入 OSM 在线底图：

```text
视图 -> 面板 -> 浏览器
浏览器面板 -> XYZ Tiles -> OpenStreetMap
双击 OpenStreetMap
```

如果没有 `OpenStreetMap`，手动新建 XYZ 连接：

```text
名称：OpenStreetMap
URL：https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

把 `OpenStreetMap` 放在最底层，最终不透明度设为 `35-55%`。

## 3. 行政区数据

DataV GeoJSON：

```text
北京轮廓：https://geo.datav.aliyun.com/areas_v3/bound/110000.json
北京区县：https://geo.datav.aliyun.com/areas_v3/bound/110000_full.json
河北地级市：https://geo.datav.aliyun.com/areas_v3/bound/130000_full.json
山西地级市：https://geo.datav.aliyun.com/areas_v3/bound/140000_full.json
陕西地级市：https://geo.datav.aliyun.com/areas_v3/bound/610000_full.json
吕梁县区：https://geo.datav.aliyun.com/areas_v3/bound/141100_full.json
忻州县区：https://geo.datav.aliyun.com/areas_v3/bound/140900_full.json
榆林县区：https://geo.datav.aliyun.com/areas_v3/bound/610800_full.json
```

导出到 `travel_map_shanxi_shaanxi.gpkg`，推荐图层名：

```text
datav_beijing_city
datav_beijing_district
datav_hebei_prefecture
datav_shanxi_prefecture
datav_shaanxi_prefecture
datav_lvliang_county
datav_xinzhou_county
datav_yulin_county
province_boundary
```

省界建议从北京、河北、山西、陕西边界复制/融合得到，只显示边界，不填充。

## 4. 高亮区域

山西去过地级市：

```sql
SELECT *
FROM "datav_shanxi_prefecture"
WHERE "name" IN (
'太原市',
'吕梁市',
'忻州市',
'大同市'
)
```

陕西去过地级市：

```sql
SELECT *
FROM "datav_shaanxi_prefecture"
WHERE "name" = '榆林市'
```

起点/终点城市。北京既是起点也是终点，建议只建一个 `start_city` 或 `start_end_city` 图层：

```sql
SELECT *
FROM "datav_beijing_city"
WHERE "name" = '北京市'
```

县级重点：

```sql
SELECT *
FROM "datav_lvliang_county"
WHERE "name" = '兴县'
```

```sql
SELECT *
FROM "datav_xinzhou_county"
WHERE "name" IN (
'保德县',
'岢岚县'
)
```

```sql
SELECT *
FROM "datav_yulin_county"
WHERE "name" IN (
'府谷县',
'神木市'
)
```

## 5. 车站图层

从 `china_railwayosm__points` 搜索并导出为：

```text
station_shanxi_shaanxi
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'北京丰台',
'太原',
'蔡家崖',
'岢岚',
'大同',
'府谷',
'宁武',
'神木',
'大同南',
'北京北'
)
GROUP BY "name"
```

如果个别站点查不到，用模糊查询单独确认：

```sql
SELECT *
FROM "points"
WHERE "name" LIKE '%蔡家崖%'
```

车站标签表达式：

```qgis
regexp_replace("name", '站$', '')
```

## 6. 样式与图层顺序

普通地级市底图：

```text
北京：#E8E0F2
河北：#DDEAF2
山西：#F1E4C8
陕西：#E4EED2
填充不透明度：100%
边界：#333333
线宽：0.26 mm
```

高亮区域：

```text
经过地级市：填充 #A8E6A1，不透明度 50%，边界 #2E7D4F，线宽 0.7-0.9 mm
起点城市：填充 #F4C95D，不透明度 65%，边界 #A65F00，线宽 0.8-1.0 mm
终点城市：填充 #D8B4F8，不透明度 65%，边界 #6D3F99，线宽 0.8-1.0 mm
起终点同城：北京可只用起点颜色，或建 start_end_city 使用 #F4C95D
经过县区：填充 #5FBF72，不透明度 50%，边界 #4F7F55，线宽 0.15-0.25 mm
省界：无填充，边界 #222222，线宽 0.8-1.0 mm
边界层级：省界 > 起点/终点城市 > 经过地级市 > 普通地级市 > 经过县区
```

标签：

```text
市名：华文新魏，13 pt，#333333，白色描边 0.8 mm
县名：华文楷体，10 pt，#0E3D22，白色描边 0.5 mm
车站名：宋体，9 pt，#111111，白色描边 0.6-0.8 mm
```

铁路与底图：

```text
普通铁路：#B8B8B8，不透明度 80-100%，线宽 0.2-0.3 mm
行程线底层：黑色简单线，1.2 mm
行程线上层：白色简单线，1.0 mm，自定义虚线，短横 2.0 mm，空格 4.5 mm，端点平端或方角
汽车线：灰色虚线，0.5-0.7 mm
车站点：粉色圆点 #E88AA5，描边 #7A2E42，大小 2.2-2.8 mm
OpenStreetMap 底图：不透明度 35-55%
```

图层顺序从上到下：

```text
station_shanxi_shaanxi
各类 label 图层
trip_route_shanxi_shaanxi
trip_bus_shanxi_shaanxi
china_railwayosm__lines
china_railwayosm__multilinestrings
start_city / start_end_city
end_city
shanxi_visited
shaanxi_visited
重点县区图层
province_boundary
datav_beijing_city
datav_hebei_prefecture
datav_shanxi_prefecture
datav_shaanxi_prefecture
OpenStreetMap
```

`*_visited` 和县区高亮图层不要开启标签；标签统一放在复制出来的 `*_label` 图层。

## 7. 行程线

新建铁路行程线：

```text
trip_route_shanxi_shaanxi
```

字段：

```text
seq      整数
segment  文本
mode     文本
note     文本
```

建议铁路段：

```text
1 北京丰台 -> 太原
2 太原 -> 蔡家崖
3 府谷 -> 神木
4 岢岚 -> 大同
5 大同南 -> 北京北
```

保德县以及保德到府谷、神木到岢岚之间若不是铁路到达，另建汽车线：

```text
trip_bus_shanxi_shaanxi
```

建议汽车/道路段：

```text
蔡家崖 -> 保德县
保德县 -> 府谷
神木 -> 岢岚
大同 -> 大同南
```

如果实际行程中 `保德县 -> 府谷`、`神木 -> 岢岚` 或 `大同 -> 大同南` 是汽车/大巴/市内交通，就画到 `trip_bus_shanxi_shaanxi`，不要使用黑白铁轨样式。

## 8. 导出图片

先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(109.8, 37.3, 117.0, 40.6)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_shanxi_shaanxi
页面尺寸：330 mm x 150 mm
地图框：铺满页面
导出文件：map_shanxi_shaanxi.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：330 mm x 150 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

如果北京或神木一侧的标签被裁掉，把范围四周外扩 `0.1-0.3` 度，或让地图框四周留 `5-8 mm` 空白后再导出。
