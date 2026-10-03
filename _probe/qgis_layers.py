from qgis.core import QgsApplication, QgsProject

QgsApplication.setPrefixPath(r"E:\QGIS 3.44.8\apps\qgis-ltr", True)
app = QgsApplication([], False)
app.initQgis()
project = QgsProject.instance()
project.read(r"F:\Desktop\Blog\Map\地图输出\区域线路图\东北漫游\东北漫游.qgz")
print("project layers", [layer.name() for layer in project.mapLayers().values()])
for layout in project.layoutManager().layouts():
    print("layout", layout.name())
    for item in layout.items():
        if hasattr(item, "layers"):
            print("map", item.id(), [(layer.name(), layer.id()) for layer in item.layers()])
app.exitQgis()
