# QGIS 地图绘制：回家路上3，湘桂粤段

对应文章：`source\_posts\回家路上3：永州、柳州、来宾、贵港、玉林.md`

本图只画湖南、广西、广东部分，不画北京到武汉段。本文已写入本图所需的数据、SQL、样式和行程线，可按本文独立操作。

本篇专用 GeoPackage 文件名：

```text
travel_map_home3_xiang_gui_yue.gpkg
```

本文所有 DataV、OSM 导出的正式制图图层都保存到这个文件，不再使用通用的 `travel_map.gpkg`。

## 1. 地图范围

建议范围：

```text
X 最小值：108.7
Y 最小值：20.8
X 最大值：112.5
Y 最大值：27.0
```

这张图南北很长，导出版式时建议使用竖幅，或裁成“永州-柳州”和“柳州-湛江”两张局部图。

## 2. 行政区数据

```text
湖南地级市：https://geo.datav.aliyun.com/areas_v3/bound/430000_full.json
广西地级市：https://geo.datav.aliyun.com/areas_v3/bound/450000_full.json
广东地级市：https://geo.datav.aliyun.com/areas_v3/bound/440000_full.json
永州县区：https://geo.datav.aliyun.com/areas_v3/bound/431100_full.json
柳州县区：https://geo.datav.aliyun.com/areas_v3/bound/450200_full.json
来宾县区：https://geo.datav.aliyun.com/areas_v3/bound/451300_full.json
贵港县区：https://geo.datav.aliyun.com/areas_v3/bound/450800_full.json
玉林县区：https://geo.datav.aliyun.com/areas_v3/bound/450900_full.json
湛江县区：https://geo.datav.aliyun.com/areas_v3/bound/440800_full.json
```

推荐图层名：

```text
datav_hunan_prefecture
datav_guangxi_prefecture
datav_guangdong_prefecture
datav_yongzhou_county
datav_liuzhou_county
datav_laibin_county
datav_guigang_county
datav_yulin_county
datav_zhanjiang_county
```

省份底图颜色：

```text
湖南：#F1E4C8
广西：#E4EED2
广东：#D9E4F5
```

## 3. 高亮区域

去过地级市：

```sql
SELECT *
FROM "datav_hunan_prefecture"
WHERE "name" = '永州市'
```

```sql
SELECT *
FROM "datav_guangxi_prefecture"
WHERE "name" IN (
'柳州市',
'来宾市',
'贵港市',
'玉林市'
)
```

```sql
SELECT *
FROM "datav_guangdong_prefecture"
WHERE "name" = '湛江市'
```

县级重点建议只标永州内部两个点：

```sql
SELECT *
FROM "datav_yongzhou_county"
WHERE "name" IN (
'祁阳市',
'零陵区'
)
```

广西部分城市较多，除非文章要展开当地县区，否则不建议再高亮县区；用地级市高亮和车站标注已经足够清楚。

## 4. 车站图层

从 `china_railwayosm__points` 搜索并导出为：

```text
station_home3_xiang_gui_yue
```

车站查询语句统一使用不带“站”的名称：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'祁阳',
'永州',
'零陵',
'柳州',
'来宾北',
'来宾',
'贵港',
'玉林',
'湛江'
)
GROUP BY "name"
```

`来宾北` 和 `来宾` 都可能出现，按实际乘车段保留；如果两者都用到，就都显示。

## 5. 样式与图层顺序

普通地级市底图：

```text
湖南：#F1E4C8
广西：#E4EED2
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
station_home3_xiang_gui_yue
各类 label 图层
trip_route_home3_xiang_gui_yue
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
trip_route_home3_xiang_gui_yue
```

只绘制湘桂粤段：

```text
祁阳 -> 永州
永州 -> 零陵
零陵/永州 -> 柳州
柳州 -> 来宾北/来宾
来宾 -> 贵港
贵港 -> 玉林
玉林 -> 湛江
```

如果从武汉进入湖南的方向需要体现，可在祁阳北侧加一小段淡灰虚线箭头，不纳入主高亮路线。

## 7. 导出图片

本图南北较长，使用竖幅。先在主画布设置范围：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(108.7, 20.8, 112.5, 27.0)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
布局名：layout_home3_xiang_gui_yue
页面尺寸：180 mm x 294 mm
地图框：铺满页面
导出文件：map_home3_xiang_gui_yue.png
格式：PNG
DPI：300
```

操作：

```text
项目 -> 新建打印布局
页面属性 -> 自定义页面大小：180 mm x 294 mm
添加项目 -> 添加地图
把地图框拉满页面
选中地图框 -> 项目属性 -> 范围 -> 设置为地图画布范围
布局 -> 导出为图像
```

如果地名贴边或被裁掉，把范围四周外扩 `0.1-0.3` 度。若完整图过长，可另导出 `永州-柳州`、`柳州-湛江` 两张局部图。
