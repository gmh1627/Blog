# QGIS 地图绘制：小城小记3

对应文章：`source\_posts\小城小记3：寿县、阜阳、周口、漯河、驻马店、信阳、孝感.md`

路线：合肥南 -> 寿县 -> 颍上北 / 颍上 -> 阜阳 / 阜阳西 -> 周口东 / 周口 -> 漯河 / 漯河西 -> 驻马店西 / 驻马店 -> 信阳 / 信阳东 -> 孝感北 / 孝感东 -> 汉口 -> 合肥南

本篇专用 GeoPackage 文件名：

```text
travel_map_xiaocheng3.gpkg
```

注意：只有铁路 OSM 图层和自绘路线需要保存到这个 `.gpkg`。DataV 行政区 GeoJSON 直接导入使用，不需要导出为 `.gpkg`。

## 1. 地图范围

建议范围：

```text
X 最小值：112.436
Y 最小值：29.734
X 最大值：119.064
Y 最大值：34.766
```

比例尺可用 `1:1600000` 左右，最终以打印布局中的画面疏密为准。

## 2. OpenStreetMap 底图

加入在线 OSM 底图：

```text
视图 -> 面板 -> 浏览器
浏览器面板 -> XYZ Tiles -> OpenStreetMap
双击 OpenStreetMap
```

如果没有 `OpenStreetMap`，新建 XYZ 连接：

```text
名称：OpenStreetMap
URL：https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

把 `OpenStreetMap` 放到最底层，不透明度设为 `35-55%`。

## 3. 行政区数据

DataV GeoJSON 直接拖入 QGIS，不要导出到 `.gpkg`：

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
河南地级市：https://geo.datav.aliyun.com/areas_v3/bound/410000_full.json
湖北地级市：https://geo.datav.aliyun.com/areas_v3/bound/420000_full.json
淮南县区：https://geo.datav.aliyun.com/areas_v3/bound/340400_full.json
阜阳县区：https://geo.datav.aliyun.com/areas_v3/bound/341200_full.json
```

推荐图层名：

```text
datav_anhui_prefecture
datav_henan_prefecture
datav_hubei_prefecture
datav_huainan_county
datav_fuyang_county
```

省份底图颜色：

```text
安徽：#E6F0D8
河南：#F1E4C8
湖北：#D8EAF2
```

## 4. 高亮区域

安徽去过城市：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" IN (
'合肥市',
'淮南市',
'阜阳市'
)
```

河南去过城市：

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

湖北去过城市，不要武汉市：

```sql
SELECT *
FROM "datav_hubei_prefecture"
WHERE "name" = '孝感市'
```

县级重点：

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

起点和终点都在合肥，可单独建 `start_end_city`：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" = '合肥市'
```

## 5. 铁路 OSM 导出

把 `china_railway.osm.pbf` 拖入 QGIS，只导出铁路相关子图层到：

```text
travel_map_xiaocheng3.gpkg
```

导出图层名：

```text
china_railwayosm__lines
china_railwayosm__multilinestrings
my_station
trip_route
```

如果 `lines`、`multilinestrings` 的 `railway` 字段只有 `rail`，不需要再过滤。

## 6. 车站图层

从 `china_railway.osm.pbf` 的 `points` 子图层查询，统一使用不带“站”的名称：

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

查到后导出为：

```text
my_station
```

## 7. 样式与标签

普通地级市底图：

```text
安徽：#E6F0D8
河南：#F1E4C8
湖北：#D8EAF2
填充不透明度：100%
边界：#333333
线宽：0.26 mm
```

高亮区域：

```text
经过地级市：填充 #A8E6A1，不透明度 50%，边界 #2E7D4F，线宽 0.7-0.9 mm
起终点城市：填充 #F4C95D，不透明度 65%，边界 #A65F00，线宽 0.8-1.0 mm
经过县区：填充 #5FBF72，不透明度 50%，边界 #4F7F55，线宽 0.15-0.25 mm
省界：无填充，边界 #222222，线宽 0.8-1.0 mm
```

标签：

```text
市名：华文新魏，13 pt，#333333，白色描边 0.8 mm
县名：华文楷体，10 pt，#0E3D22，白色描边 0.5 mm
车站名：宋体，9 pt，#111111，白色描边 0.6-0.8 mm
```

`*_visited` 图层不要开启标签；复制行政区图层作为 `*_label` 专用标签层，标签层无填充、无边线。

## 8. 行程线与追踪

新建线图层：

```text
trip_route
```

字段：

```text
seq      整数
segment  文本
mode     文本
note     文本
```

显示捕捉工具栏：

```text
视图 -> 工具栏 -> 捕捉工具栏
```

设置捕捉：

```text
工程 -> 捕捉选项...
模式：高级配置
china_railwayosm__lines：顶点和线段，8 像素
china_railwayosm__multilinestrings：顶点和线段，8 像素
其他图层：关闭捕捉
trip_route：先关闭捕捉
```

启用追踪：

```text
选中 trip_route
点击铅笔进入编辑模式
选择“添加线要素”或“线段数字化”
在捕捉工具栏点击“启用追踪 / Trace Digitizing”
```

如果找不到追踪按钮：

```text
Ctrl + K
搜索：追踪
或搜索：Trace
```

绘制分段：

```text
1 合肥南 -> 寿县 -> 颍上北
2 颍上 -> 阜阳
3 阜阳西 -> 周口东
4 周口 -> 漯河
5 漯河西 -> 驻马店西
6 驻马店 -> 信阳
7 信阳东 -> 孝感北
8 孝感东 -> 汉口
9 汉口 -> 合肥南
```

每段在线路起点点击，再沿铁路移动到终点点击，让 QGIS 自动沿已有铁路追踪。遇到枢纽、并行铁路或跳到远处时，把长段拆成短段。

行程线样式：

```text
底层简单线：黑色，1.2 mm
上层简单线：白色，1.0 mm
上层线使用自定义虚线图型：短横 2.0 mm，空格 4.5 mm
端点样式：平端或方角
```

普通铁路：

```text
颜色：#B8B8B8
不透明度：80-100%
线宽：0.2-0.3 mm
```

## 9. 图层顺序

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
start_end_city
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

## 10. 导出图片

先设置主画布范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(112.436, 29.734, 119.064, 34.766)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_xiaocheng3
页面尺寸：320 mm x 240 mm
地图框：铺满页面
导出文件：map_xiaocheng3.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：320 mm x 240 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

如果边缘城市名被裁掉，把范围四周外扩 `0.1-0.3` 度，或让地图框四周留 `5-8 mm` 空白。
