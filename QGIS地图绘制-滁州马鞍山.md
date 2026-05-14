# QGIS 地图绘制：滁州、马鞍山

对应文章：`source\_posts\小城小记2：滁州、马鞍山.md`

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

省份底图颜色：

```text
安徽：#E6F0D8
江苏：#E8E0F2
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

## 5. 样式与图层顺序

普通地级市底图：

```text
安徽：#E6F0D8
江苏：#E8E0F2
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
汽车线：灰色虚线，0.5-0.7 mm
车站点：粉色圆点 #E88AA5，描边 #7A2E42，大小 2.2-2.8 mm
OpenStreetMap 底图：不透明度 35-55%
```

图层顺序从上到下：

```text
station_chuzhou_maanshan
各类 label 图层
trip_route_chuzhou_maanshan
trip_bus_chuzhou
china_railwayosm__lines
china_railwayosm__multilinestrings
start_city
end_city
各省 visited 图层
各县区重点图层
province_boundary
datav_anhui_prefecture / datav_jiangsu_prefecture
OpenStreetMap
```

## 6. 行程线

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

## 7. 导出图片

先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(117.0, 30.7, 119.4, 33.0)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_chuzhou_maanshan
页面尺寸：220 mm x 210 mm
地图框：铺满页面
导出文件：map_chuzhou_maanshan.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：220 mm x 210 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

如果边缘城市名显示不全，把范围四周外扩 `0.1-0.3` 度，或让地图框四周留 `5-8 mm` 空白后再导出。
