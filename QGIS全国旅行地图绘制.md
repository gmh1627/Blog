# QGIS 全国旅行地图绘制

目标：制作两张相互独立的全国地图。

```text
地图 1：全国铁路路线图
地图 2：全国到访城市与省份图
```

这里的“独立”指：分别保存为两个 QGIS 工程、两个 GeoPackage、两个导出图片。它们可以使用同一批原始 `.json` 和 `.osm.pbf` 数据，但后续图层、样式、导出互不影响。

```text
地图 1 工程：china_rail_route.qgz
地图 1 数据包：travel_map_china_rail_route.gpkg

地图 2 工程：china_visited_city.qgz
地图 2 数据包：travel_map_china_visited_city.gpkg
```

数据来源：

```text
到访省市：source/_posts/行旅杂记.md 第 140 行后
火车站：source/_posts/行旅杂记.md 第 297 行后
铁路记录：source/_posts/行旅杂记.md “铁路记录如下”表格
```

## 1. 共同底图

两张地图都使用同样的全国行政区底图：

```text
省界、省名：https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json
市名、市界数据：https://geo.datav.aliyun.com/areas_v3/bound/100000_full_city.json
```

导入 `100000_full.json`，命名为：

```text
china_province
```

用途：

```text
作为省份底图
显示未去过省份的淡色铺底
```

再复制一份 `china_province`，命名为：

```text
china_province_label
```

用途：

```text
只显示省界、省名、直辖市名
放在铁路路线和高亮区域上方
避免省名和省界被铁路压住
```

导入 `100000_full_city.json`，命名为：

```text
china_city_label
```

用途：

```text
只显示市名
不显示普通市界
```

`china_city_label` 样式：

```text
填充不透明度：0%
边界不透明度：0%
标签字段："name"
```

如果不想显示北京、上海、天津、重庆、香港、澳门的区县名，给 `china_city_label` 过滤：

```sql
SELECT *
FROM "china_city_label"
WHERE "adcode" NOT LIKE '11%'
AND "adcode" NOT LIKE '12%'
AND "adcode" NOT LIKE '31%'
AND "adcode" NOT LIKE '50%'
AND "adcode" NOT LIKE '81%'
AND "adcode" NOT LIKE '82%'
```

这样全国图能显示：

```text
省界
省名
市名
```

但不会显示普通市界。到过的城市需要另外建 `visited_city_area`，只让它们显示市界和高亮面。

## 2. 地图 1：全国铁路路线图

工程文件：

```text
china_rail_route.qgz
```

数据包：

```text
travel_map_china_rail_route.gpkg
```

这张图重点是“走过哪些铁路”。省界、省名、市名作为背景。

## 2.0 地图 1 的省界、省名、市名

铁路路线图也要保留全国行政阅读信息：

```text
china_province：只做省份淡色底图
china_province_label：显示省界、省名
china_city_label：只显示市名，不显示市界
```

`china_province` 省份底图样式：

```text
填充：#ECE8D8
填充不透明度：100%
边界：#C8C1AC
线宽：0.15-0.25 mm
标签：关闭
```

`china_province_label` 样式：

```text
填充不透明度：0%
边界：#5F5A50
线宽：0.45-0.65 mm
标签字段："name"
标签字体：华文隶书
标签字号：12-14 pt
标签颜色：#2E2A24
白色描边：0.8 mm
```

如果电脑没有 `华文隶书`，可改用：

```text
华文新魏
等线
微软雅黑
```

`china_city_label` 样式：

```text
填充不透明度：0%
边界不透明度：0%
标签字段："name"
标签字体：华文新魏
标签字号：7-8 pt
标签颜色：#4D4D4D
白色描边：0.5 mm
```

`china_city_label` 如果显示直辖市、香港、澳门区县名，使用过滤：

```sql
SELECT *
FROM "china_city_label"
WHERE "adcode" NOT LIKE '11%'
AND "adcode" NOT LIKE '12%'
AND "adcode" NOT LIKE '31%'
AND "adcode" NOT LIKE '50%'
AND "adcode" NOT LIKE '81%'
AND "adcode" NOT LIKE '82%'
```

全国图市名会很密。可以先全部显示，如果压住铁路路线，再改成：

```text
省名始终显示
市名只显示重点城市，或调小到 7 pt
```

## 2.1 铁路 OSM 图层

把 `china_railway.osm.pbf` 拖入 QGIS，导出到 `travel_map_china_rail_route.gpkg`：

```text
china_railwayosm__lines
china_railwayosm__multilinestrings
```

普通铁路样式：

```text
颜色：#C8C8C8
不透明度：60-80%
线宽：0.15-0.25 mm
```

如果全国铁路太密，可以关闭普通铁路，只保留自己走过的路线。

## 2.2 火车站图层

从 `china_railway.osm.pbf` 的 `points` 子图层查询。车站来自 `行旅杂记.md` 第 297 行后的表格。

导出为：

```text
travelled_station
```

SQL：

```sql
SELECT *
FROM "points"
WHERE "name" IN (
'湛江',
'湛江西',
'桂林北',
'北京西',
'北京南',
'北京丰台',
'清河',
'古北口',
'北京',
'大兴机场',
'北京北',
'贵阳',
'广州南',
'广州白云',
'广州东',
'合肥南',
'合肥',
'合肥北城',
'合肥西',
'小榄',
'佛山西',
'汉口',
'武汉',
'岳阳东',
'黄山北',
'高邮',
'扬州东',
'镇江',
'西安北',
'永济北',
'杭州东',
'南昌西',
'南昌',
'郴州',
'郴州西',
'韶关',
'郑州',
'巩义',
'巩义南',
'郑州东',
'洛阳',
'芜湖',
'宣城',
'泾县',
'安庆',
'铜陵',
'虎门',
'东莞',
'深圳',
'深圳东',
'深圳北',
'枣庄',
'徐州',
'上海南',
'上海虹桥',
'上海',
'六安',
'福州',
'古田会址',
'长汀南',
'瑞金',
'于都',
'赣州',
'赣州西',
'全椒',
'滁州北',
'马鞍山',
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
'天津',
'天津西',
'雄安',
'白洋淀',
'山海关',
'新乡',
'卫辉',
'新乡东',
'祁阳',
'永州',
'零陵',
'柳州',
'来宾北',
'来宾',
'贵港',
'玉林',
'太原',
'蔡家崖',
'神木',
'府谷',
'岢岚',
'宁武',
'大同',
'大同南'
)
GROUP BY "name"
```

车站样式：

```text
点：#E88AA5
描边：#7A2E42
大小：1.8-2.4 mm
标签：全国图可关闭；局部图再打开
```

## 2.3 走过的铁路路线

新建线图层：

```text
travelled_rail_route
```

保存到：

```text
travel_map_china_rail_route.gpkg
```

字段：

```text
seq      整数
segment  文本
year     整数
note     文本
```

路线来源：

```text
source/_posts/行旅杂记.md “铁路记录如下”表格
```

逐条按表格里的出发地、目的地追踪铁路。

开启捕捉与追踪：

```text
视图 -> 工具栏 -> 捕捉工具栏
工程 -> 捕捉选项...
模式：高级配置
china_railwayosm__lines：顶点和线段，8 像素
china_railwayosm__multilinestrings：顶点和线段，8 像素
其他图层：关闭捕捉
travelled_rail_route：先关闭捕捉
```

绘制：

```text
选中 travelled_rail_route
点击铅笔进入编辑模式
选择“添加线要素”或“线段数字化”
点击“启用追踪 / Trace Digitizing”
从出发站附近点击，到目的站附近点击
右键结束该段
填写 seq、segment、year
保存编辑
```

如果找不到追踪按钮：

```text
Ctrl + K
搜索：追踪
或搜索：Trace
```

行程线样式：

```text
底层简单线：黑色，1.2 mm
上层简单线：白色，1.0 mm
上层线使用自定义虚线图型：短横 2.0 mm，空格 4.5 mm
端点样式：平端或方角
```

全国图路线很多时，也可以改成简洁样式：

```text
走过路线：#111111，0.7-0.9 mm
重复经过路线：#D94841，0.7-0.9 mm
```

## 2.4 地图 1 图层顺序

从上到下：

```text
travelled_station
china_province_label
china_city_label
travelled_rail_route
china_railwayosm__lines
china_railwayosm__multilinestrings
china_province
OpenStreetMap 可选
```

`china_province_label` 必须放在铁路上方，用来保证省界和省名清楚。`china_city_label` 也建议放在铁路上方；如果市名压住路线太多，再把它放到 `travelled_rail_route` 下方。最终以阅读路线为主。

## 3. 地图 2：全国到访城市与省份图

工程文件：

```text
china_visited_city.qgz
```

数据包：

```text
travel_map_china_visited_city.gpkg
```

这张图重点是“去过哪些省份、哪些城市”。不显示普通市界，只显示到过城市的市界和高亮面。

## 3.1 省份高亮

复制 `china_province`，命名为：

```text
visited_province
```

到访省级行政区来自 `行旅杂记.md` 第 140 行后。

SQL：

```sql
SELECT *
FROM "china_province"
WHERE "name" IN (
'广东省',
'贵州省',
'安徽省',
'湖北省',
'湖南省',
'江苏省',
'陕西省',
'山西省',
'江西省',
'浙江省',
'河南省',
'山东省',
'福建省',
'河北省',
'辽宁省',
'甘肃省',
'北京市',
'上海市',
'天津市',
'广西壮族自治区',
'内蒙古自治区'
)
```

样式不要统一绿色，改用“分类”或“规则”渲染，让去过的省份使用不同浅色。操作：

```text
右键 visited_province -> 属性 -> 符号系统
类型：分类
值：name
分类
```

推荐浅色配色：

```text
广东省：#F7D7D0
贵州省：#E6D8F2
安徽省：#DDECCF
湖北省：#D6E8F5
湖南省：#F3E0C2
江苏省：#E2D9F3
陕西省：#E9E0C7
山西省：#F2E6CE
江西省：#F2D9C8
浙江省：#D6EEF0
河南省：#F4E3BF
山东省：#F3D9E0
福建省：#D8EFE4
河北省：#DDEAF2
辽宁省：#D8E2F3
甘肃省：#EFE0C8
北京市：#F4C95D
上海市：#F6D5A8
天津市：#D4E5F6
广西壮族自治区：#E4EED2
内蒙古自治区：#DCE8D1
```

每个分类统一设置：

```text
填充不透明度：65-80%
边界：#666666
线宽：0.45-0.6 mm
```

未去过省份不要放进 `visited_province`。它们只由底层 `china_province` 显示：

```text
填充：#ECE8D8
边界：#C8C1AC
线宽：0.25-0.35 mm
```

这样效果是：

```text
去过省份：不同浅色高亮
没去过省份：普通淡灰底，不高亮
```

## 3.2 到过城市高亮

复制 `china_city_label`，命名为：

```text
visited_city_area
```

这个图层只显示到过城市的市界和高亮面。

SQL：

```sql
SELECT *
FROM "china_city_label"
WHERE "name" IN (
'湛江市',
'广州市',
'茂名市',
'东莞市',
'河源市',
'惠州市',
'阳江市',
'江门市',
'佛山市',
'中山市',
'珠海市',
'韶关市',
'揭阳市',
'潮州市',
'深圳市',
'贵阳市',
'黔南布依族苗族自治州',
'黔东南苗族侗族自治州',
'安顺市',
'铜仁市',
'合肥市',
'池州市',
'黄山市',
'芜湖市',
'宣城市',
'安庆市',
'铜陵市',
'淮北市',
'六安市',
'滁州市',
'马鞍山市',
'淮南市',
'阜阳市',
'武汉市',
'孝感市',
'岳阳市',
'郴州市',
'永州市',
'扬州市',
'镇江市',
'徐州市',
'咸阳市',
'西安市',
'榆林市',
'运城市',
'太原市',
'吕梁市',
'忻州市',
'大同市',
'南昌市',
'赣州市',
'杭州市',
'宁波市',
'洛阳市',
'郑州市',
'周口市',
'漯河市',
'驻马店市',
'信阳市',
'新乡市',
'枣庄市',
'福州市',
'龙岩市',
'承德市',
'保定市',
'秦皇岛市',
'葫芦岛市',
'嘉峪关市',
'酒泉市',
'北海市',
'桂林市',
'柳州市',
'来宾市',
'贵港市',
'玉林市',
'阿拉善盟'
)
```

到过的直辖市不要从 `china_city_label` 里取区县，另从 `china_province` 复制一个图层：

```text
visited_municipality_area
```

SQL：

```sql
SELECT *
FROM "china_province"
WHERE "name" IN (
'北京市',
'上海市',
'天津市'
)
```

到过城市样式：

```text
填充：#A8E6A1
填充不透明度：45-55%
边界：#2E7D4F
线宽：0.35-0.5 mm
```

直辖市样式同 `visited_city_area`。香港、澳门虽然也要从 `china_city_label` 里过滤区名，但只有实际去过时才加入这个图层。

## 3.3 城市名与省名

`china_province_label` 标签：

```text
字段："name"
字体：华文隶书
字号：12-14 pt
颜色：#2E2A24
白色描边：0.8 mm
```

`china_province` 面样式：

```text
未高亮省份填充：#ECE8D8
省界：#C8C1AC
线宽：0.15-0.25 mm
标签：关闭
```

`china_province_label` 省名和省界样式：

```text
填充不透明度：0%
省界：#5F5A50
线宽：0.45-0.65 mm
字体：华文隶书
字号：12-14 pt
颜色：#2E2A24
白色描边：0.8 mm
```

`china_city_label` 标签：

```text
字段："name"
字体：华文新魏
字号：7-8 pt
颜色：#555555
白色描边：0.5 mm
```

全国图市名会很密，可以设置比例尺可见性：

```text
全国总览：只显示省名
放大到局部：显示市名
```

如果一定要全国同时显示市名，建议把字号控制在 `7 pt` 左右，并给标签加白色描边。

## 3.4 地图 2 图层顺序

从上到下：

```text
visited_municipality_area
visited_city_area
visited_province
china_province_label
china_city_label
china_province
OpenStreetMap 可选
```

这样效果是：

```text
全国都有省界、省名、市名
普通城市没有市界
到过城市显示市界和高亮面
到过省份整体高亮
```

## 4. 全国导出范围

两张地图都可使用同一个全国范围：

```text
X 最小值：73
Y 最小值：18
X 最大值：135
Y 最大值：54
```

设置画布：

```python
from qgis.core import QgsRectangle

rect = QgsRectangle(73, 18, 135, 54)
iface.mapCanvas().setExtent(rect)
iface.mapCanvas().refresh()
```

打印布局建议：

```text
页面尺寸：320 mm x 220 mm
格式：PNG
DPI：300
```

地图 1 导出：

```text
布局名：layout_china_rail_route
导出文件：map_china_rail_route.png
```

地图 2 导出：

```text
布局名：layout_china_visited_city
导出文件：map_china_visited_city.png
```

如果东北、海南、台湾、南海诸岛或边缘标签被裁掉，把范围四周外扩，或让地图框四周留 `5-8 mm` 空白。

## 5. 建议工作流

先做地图 2，再做地图 1：

```text
地图 2 只需要省份和城市高亮，最快能看到总体旅行版图
地图 1 需要逐段追踪铁路，工作量更大，可以慢慢补
```

每次更新 `行旅杂记.md` 后：

```text
1. 根据第 140 行后的清单更新 visited_province 和 visited_city_area
2. 根据第 297 行后的清单更新 travelled_station
3. 根据铁路记录表更新 travelled_rail_route
4. 分别打开两个独立工程重新导出
```
