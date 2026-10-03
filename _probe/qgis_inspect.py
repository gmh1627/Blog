from qgis.core import QgsApplication, QgsVectorLayer, QgsWkbTypes

QgsApplication.setPrefixPath(r"E:\QGIS 3.44.8\apps\qgis-ltr", True)
app = QgsApplication([], False)
app.initQgis()
path = r"F:\Desktop\Blog\Map\地图输出\区域线路图\东北漫游\东北漫游_数据.gpkg"
for name in ("focus_area_1", "focus_internal_border", "province_boundaries", "highlighted_city_boundaries"):
    layer = QgsVectorLayer(f"{path}|layername={name}", name, "ogr")
    print(name, "valid", layer.isValid(), "count", layer.featureCount(), "crs", layer.crs().authid())
    for feature in layer.getFeatures():
        geometry = feature.geometry()
        valid = geometry.isGeosValid() if QgsWkbTypes.geometryType(geometry.wkbType()) == QgsWkbTypes.PolygonGeometry else "n/a"
        print(" geomtype", geometry.wkbType(), "multipart", geometry.isMultipart(), "area", geometry.area(), "length", geometry.length(), "valid", valid, "bbox", geometry.boundingBox().toString())
        if QgsWkbTypes.geometryType(geometry.wkbType()) == QgsWkbTypes.PolygonGeometry:
            multi = geometry.asMultiPolygon() if geometry.isMultipart() else [geometry.asPolygon()]
            print(" polygons", len(multi), "rings", [len(polygon) for polygon in multi], "holes", sum(max(0, len(polygon) - 1) for polygon in multi))
app.exitQgis()
