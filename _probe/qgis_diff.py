from qgis.core import QgsApplication, QgsVectorLayer, QgsGeometry

QgsApplication.setPrefixPath(r"E:\QGIS 3.44.8\apps\qgis-ltr", True)
app = QgsApplication([], False)
app.initQgis()
county = QgsVectorLayer(r"F:\Desktop\Blog\Map\制图工具\数据源\GeoPackage\china_counties_simplified.geojson", "county", "ogr")
out = QgsVectorLayer(r"F:\Desktop\Blog\Map\地图输出\区域线路图\东北漫游\东北漫游_数据.gpkg|layername=focus_area_1", "out", "ogr")
cg = next(f.geometry() for f in county.getFeatures() if f["shapeName"] == "Mohexian")
og = next(f.geometry() for f in out.getFeatures())
for label, g in (("source_minus_out", cg.difference(og)), ("out_minus_source", og.difference(cg)), ("source_union_out", cg.combine(og))):
    print(label, "area", g.area(), "len", g.length(), "bbox", g.boundingBox().toString(), "empty", g.isEmpty())
    if g.isMultipart():
        print(" parts", [(part.area(), part.boundingBox().toString()) for part in g.asGeometryCollection()])
app.exitQgis()
