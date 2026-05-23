# QGIS 地图绘制：扬州、镇江

对应文章：`source\_posts\江南江北送君归：从扬州到镇江.md`

本篇专用 GeoPackage 文件名：

```text
travel_map_yangzhou_zhenjiang.gpkg
```

本篇 `.gpkg` 只保存铁路 OSM 图层、车站图层和自绘路线。DataV 行政区 GeoJSON 直接导入使用，不需要导出为 `.gpkg`。

## 1. 地图范围

建议范围：

```text
X 最小值：117.0
Y 最小值：31.5
X 最大值：120.0
Y 最大值：33.3
```

如果只做扬州、镇江局部图：

```text
X 最小值：119.0
Y 最小值：31.7
X 最大值：119.8
Y 最大值：32.8
```

## 2. 行政区数据

```text
安徽地级市：https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json
江苏地级市：https://geo.datav.aliyun.com/areas_v3/bound/320000_full.json
扬州县区：https://geo.datav.aliyun.com/areas_v3/bound/321000_full.json
镇江县区：https://geo.datav.aliyun.com/areas_v3/bound/321100_full.json
```

推荐图层名：

```text
datav_anhui_prefecture
datav_jiangsu_prefecture
datav_yangzhou_county
datav_zhenjiang_county
```

省份底图颜色：

```text
安徽：#E6F0D8
江苏：#E8E0F2
```

## 3. 高亮区域

江苏去过城市：

```sql
SELECT *
FROM "datav_jiangsu_prefecture"
WHERE "name" IN (
'扬州市',
'镇江市'
)
```

合肥作为起点可弱化或单独高亮：

```sql
SELECT *
FROM "datav_anhui_prefecture"
WHERE "name" = '合肥市'
```

县级重点建议标高邮：

```sql
SELECT *
FROM "datav_yangzhou_county"
WHERE "name" = '高邮市'
```

瓜洲属于扬州内部的镇级地点，DataV 县区图层里通常不会直接有 `瓜洲镇`，建议用点标注，不要为它单独找镇级边界。

## 4. 车站图层

从 `china_railwayosm__points` 搜索并导出为：

```text
station_yangzhou_zhenjiang
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'合肥南',
'高邮',
'扬州东',
'扬州',
'镇江'
)
GROUP BY "name"
```

扬州市区实际到达站按票面选择 `扬州东` 或 `扬州`。

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
渡轮线：蓝灰色虚线，0.6-0.8 mm
车站点：粉色圆点 #E88AA5，描边 #7A2E42，大小 2.2-2.8 mm
OpenStreetMap 底图：不透明度 35-55%
```

图层顺序从上到下：

```text
station_yangzhou_zhenjiang
各类 label 图层
trip_route_yangzhou_zhenjiang
trip_ferry_zhenyang
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

## 6. 铁路与行程线

把 `china_railway.osm.pbf` 拖入 QGIS，只把铁路相关子图层导出到本篇 `.gpkg`：

```text
china_railwayosm__lines
china_railwayosm__multilinestrings
```

车站点按第 4 节查询后导出为：

```text
station_yangzhou_zhenjiang
```

铁路图层：

```text
trip_route_yangzhou_zhenjiang
```

启用捕捉与追踪：

```text
视图 -> 工具栏 -> 捕捉工具栏
工程 -> 捕捉选项...
模式：高级配置
china_railwayosm__lines：顶点和线段，8 像素
china_railwayosm__multilinestrings：顶点和线段，8 像素
其他图层：关闭捕捉
trip_route_yangzhou_zhenjiang：先关闭捕捉
```

然后：

```text
选中 trip_route_yangzhou_zhenjiang
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

追踪绘制：

```text
合肥南 -> 高邮
高邮 -> 扬州东/扬州
镇江 -> 合肥南
```

渡江段另建线图层：

```text
trip_ferry_zhenyang
```

绘制：

```text
扬州瓜洲 -> 镇扬汽渡 -> 镇江
```

渡轮不是铁路，不要使用黑白铁轨样式。建议用深蓝或蓝灰色虚线，线宽约 `0.6-0.8 mm`，标签写 `镇扬汽渡`。

遇到铁路枢纽、并行铁路或追踪跳远时，把长段拆成短段，在转折点附近多点几次。

## 7. 导出图片

主图先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(117.0, 31.5, 120.0, 33.3)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_yangzhou_zhenjiang
页面尺寸：300 mm x 180 mm
地图框：铺满页面
导出文件：map_yangzhou_zhenjiang.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：300 mm x 180 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

扬州、镇江局部图可使用范围 `119.0, 31.7, 119.8, 32.8`，页面尺寸建议 `200 mm x 275 mm`。如果边缘标签显示不全，先外扩范围，不要直接截图。
