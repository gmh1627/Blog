# QGIS 地图绘制：回家路上3，湘桂粤段

对应文章：`source\_posts\回家路上3：永州、柳州、来宾、贵港、玉林.md`

本图只画湖南、广西、广东部分，不画北京到武汉段。通用图层顺序、字体、路线样式按 `QGIS旅行铁路地图制图流程.md` 执行。

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

## 5. 行程线

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
