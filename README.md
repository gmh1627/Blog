# Blog

这是 Maohang Gao's Blog（[kangaroogao.com](https://kangaroogao.com)）的源代码与内容仓库。站点使用 Hexo 构建，主要收录游记、读书笔记、随笔和个人整理的专题资料；仓库同时保留生成文章配图、统计内容和维护专题数据所需的工具。

## 主要内容

- `source/_posts`：博客文章源文件。
- `source`：页面、文章图片及其他站点资源。
- `themes` 与 `_config*.yml`：主题文件和 Hexo 配置。
- `heritage`：全国重点文物保护单位资料的浏览、校订与发布工具。
- `scripts`、`blog_stat.py`：内容处理和站点统计脚本。
- `Map`：旅行地图与铁路地图工程，以 Git 子模块单独维护；Hexo 生成时会发布到 `/map/`。

## 本地预览

需要先安装 Node.js 和 npm。首次克隆时建议同时拉取地图子模块：

```powershell
git clone --recurse-submodules https://github.com/gmh1627/Blog.git
cd Blog
npm install
npm run server
```

Hexo 本地服务启动后，按照终端提示在浏览器中打开预览地址。生成静态站点可执行 `npm run build`，清理生成结果可执行 `npm run clean`。

如果已经克隆了 Blog 仓库，但 `Map` 目录尚未初始化，可执行：

```powershell
git submodule update --init --recursive
```

## 专题工具

国保资料编辑器可通过 `npm run heritage` 启动，具体数据结构和维护方式见 `heritage/README.md`。

铁路交互图位于 `Map/web`，入口文件为 `Map/web/index.html`。直接在地图目录中预览时需要通过本地静态服务器运行，启动方式和图层说明见 `Map/web/README.md`；执行 Hexo 生成时，`scripts/map_publish.js` 会像国保页面一样把它发布到博客的 `/map/` 路径。地图工程在独立仓库中提交后，还需在本仓库更新并提交子模块指针。
