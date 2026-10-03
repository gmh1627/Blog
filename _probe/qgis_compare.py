from qgis.core import QgsApplication, QgsVectorLayer, QgsWkbTypes, QgsGeometry

QgsApplication.setPrefixPath(r"E:\QGIS 3.44.8\apps\qgis-ltr", True)
app = QgsApplication([], False)
app.initQgis()
city_path = r"F:\Desktop\Railway\city\city.json"
county_path = r"F:\Desktop\Blog\Map\制图工具\数据源\GeoPackage\china_counties_simplified.geojson"
for path, name in ((city_path, "city"), (county_path, "county")):
    layer = QgsVectorLayer(path, name, "ogr")
    print(name, layer.isValid(), layer.featureCount(), layer.crs().authid())
    for f in layer.getFeatures():
        attrs = f.attributes()
        if name == "city" and str(f["adcode"]) != "232700":
            continue
        if name == "county" and str(f["shapeName"]) != "Mohexian":
            continue
        g = f.geometry()
        parts = g.asMultiPolygon() if g.isMultipart() else [g.asPolygon()]
        print(name, attrs[:5], "area", g.area(), "length", g.length(), "bbox", g.boundingBox().toString(), "parts", len(parts), "rings", [len(p) for p in parts], "valid", g.isGeosValid())
app.exitQgis()
