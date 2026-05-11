# QGIS 地图绘制：回家路上2

对应文章：`source\_posts\回家路上2：泾县、福州、龙岩、赣州.md`

本图绘制完整路线：合肥南出发，经泾县、福州、古田会址、长汀、瑞金、于都、赣州，最终到湛江西。本文已写入本图所需的数据、SQL、样式和行程线，可按本文独立操作。

本篇专用 GeoPackage 文件名：

```text
travel_map_home2_full.gpkg
```

## 1. 地图范围

建议范围：

```text
X 最小值：109.5
Y 最小值：20.7
X 最大值：120.2
Y 最大值：32.3
```

这张图南北跨度较大，建议使用竖幅版式；如果线路显得过长，可另做“闽赣段”局部放大图。

## 2. 行政区数据

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
福建地级市：https://geo.datav.aliyun.com/areas_v3/bound/350000_full.json
江西地级市：https://geo.datav.aliyun.com/areas_v3/bound/360000_full.json
广东地级市：https://geo.datav.aliyun.com/areas_v3/bound/440000_full.json
宣城县区：https://geo.datav.aliyun.com/areas_v3/bound/341800_full.json
福州县区：https://geo.datav.aliyun.com/areas_v3/bound/350100_full.json
龙岩县区：https://geo.datav.aliyun.com/areas_v3/bound/350800_full.json
赣州县区：https://geo.datav.aliyun.com/areas_v3/bound/360700_full.json
湛江县区：https://geo.datav.aliyun.com/areas_v3/bound/440800_full.json
```

推荐图层名：

```text
datav_anhui_prefecture
datav_fujian_prefecture
datav_jiangxi_prefecture
datav_guangdong_prefecture
datav_xuancheng_county
datav_longyan_county
datav_ganzhou_county
datav_zhanjiang_county
```

省份底图颜色：

```text
安徽：#E6F0D8
福建：#D8EFE4
江西：#F2DFD0
广东：#D9E4F5
```

## 3. 高亮区域

去过地级市：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" IN (
'合肥市',
'宣城市'
)
```

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

```sql
SELECT *
FROM "datav_guangdong_prefecture"
WHERE "name" = '湛江市'
```

起点城市：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" = '合肥市'
```

终点城市：

```sql
SELECT *
FROM "datav_guangdong_prefecture"
WHERE "name" = '湛江市'
```

县级重点：

```sql
SELECT *
FROM "datav_xuancheng_county"
WHERE "name" = '泾县'
```

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
station_home2_full
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'合肥南',
'泾县',
'福州',
'古田会址',
'长汀南',
'瑞金',
'于都',
'赣州西',
'赣州',
'广州东',
'广州南',
'湛江西'
)
GROUP BY "name"
```

## 5. 样式与图层顺序

普通地级市底图：

```text
安徽：#E6F0D8
福建：#D8EFE4
江西：#F2DFD0
广东：#D9E4F5
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
station_home2_full
各类 label 图层
trip_route_home2_full
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

新建线图层：

```text
trip_route_home2_full
```

绘制完整铁路路线：

```text
合肥南 -> 泾县
泾县 -> 福州/福州南
福州/福州南 -> 古田会址
古田会址 -> 长汀南
长汀南 -> 瑞金
瑞金 -> 于都
于都 -> 赣州西/赣州
赣州西/赣州 -> 湛江西
```

如果完整路线太长，建议导出一张完整竖幅图，再额外导出一张 `福州-赣州` 局部放大图。

## 7. 导出图片

主图使用竖幅。先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(109.5, 20.7, 120.2, 32.3)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_home2_full
页面尺寸：220 mm x 240 mm
地图框：铺满页面
导出文件：map_home2_full.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：220 mm x 240 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

如果边缘城市名被裁掉，把范围四周外扩 `0.1-0.3` 度，或让地图框四周留 `5-8 mm` 空白后再导出。局部放大图可另建布局，例如 `layout_home2_min_gan_detail`。
