# QGIS 地图绘制：枣庄、徐州、淮北

对应文章：`source\_posts\清明游记：枣庄、徐州、淮北.md`

本文写明本篇地图的范围、数据、SQL、样式和行程线，可按本文独立操作。

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

省份底图颜色：

```text
山东：#F2DDE2
江苏：#E8E0F2
安徽：#E6F0D8
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

## 5. 样式与图层顺序

普通地级市底图：

```text
山东：#F2DDE2
江苏：#E8E0F2
安徽：#E6F0D8
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
station_zaozhuang_xuzhou_huaibei
各类 label 图层
trip_route_zaozhuang_xuzhou_huaibei
trip_bus_taierzhuang
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

## 6. 行程线

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

## 7. 导出图片

局部主图先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(116.4, 33.3, 118.8, 35.4)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_zaozhuang_xuzhou_huaibei
页面尺寸：240 mm x 210 mm
地图框：铺满页面
导出文件：map_zaozhuang_xuzhou_huaibei.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：240 mm x 210 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

若要画合肥出发和返程，需另建完整行程布局，并把 `Y 最小值` 放到约 `31.5`。如果边缘城市名被裁掉，把范围四周外扩 `0.1-0.3` 度。
