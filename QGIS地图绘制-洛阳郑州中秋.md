# QGIS 地图绘制：洛阳、郑州中秋

对应文章：`source\_posts\“人生短短几个秋啊，不醉不罢休”——在洛阳、郑州的中秋.md`

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

省份底图颜色：

```text
安徽：#E6F0D8
河南：#F1E4C8
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

## 5. 样式与图层顺序

普通地级市底图：

```text
安徽：#E6F0D8
河南：#F1E4C8
填充不透明度：100%
边界：#333333
线宽：0.26 mm
```

高亮区域：

```text
经过地级市：填充 #A8E6A1，不透明度 50%，边界 #2E7D4F，线宽 0.7-0.9 mm
起点地级市：填充 #F4C95D，不透明度 65%，边界 #A65F00，线宽 0.8-1.0 mm
终点地级市：填充 #D8B4F8，不透明度 65%，边界 #6D3F99，线宽 0.8-1.0 mm
经过县区：填充 #5FBF72，不透明度 50%，边界 #4F7F55，线宽 0.15-0.25 mm
省界：无填充，边界 #222222，线宽 0.8-1.0 mm
边界层级：省界 > 起点/终点地级市 > 经过地级市 > 普通地级市 > 经过县区
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
车站点：粉色圆点 #E88AA5，描边 #7A2E42，大小 2.2-2.8 mm
OpenStreetMap 底图：不透明度 35-55%
```

图层顺序从上到下：

```text
station_luoyang_zhengzhou
各类 label 图层
trip_route_luoyang_zhengzhou
china_railwayosm__lines
china_railwayosm__multilinestrings
start_city
end_city
各省 visited 图层
各县区重点图层
province_boundary
datav_anhui_prefecture / datav_henan_prefecture
OpenStreetMap
```

## 6. 行程线

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

## 7. 导出图片

完整主图先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(111.0, 31.3, 117.8, 35.2)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_luoyang_zhengzhou
页面尺寸：320 mm x 184 mm
地图框：铺满页面
导出文件：map_luoyang_zhengzhou.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：320 mm x 184 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

河南局部放大图可使用范围 `111.0, 33.6, 114.6, 35.1`，页面尺寸建议 `336 mm x 140 mm`。如果边缘标签被裁掉，优先外扩范围或给地图框留白。
