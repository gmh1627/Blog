'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

function contentVersion(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

hexo.extend.filter.register('after_generate', async function () {
  const sourceRoot = path.join(hexo.base_dir, 'Map', 'web');
  const outputRoot = path.join(hexo.public_dir, 'map');

  try {
    await fs.access(sourceRoot);
  } catch {
    throw new Error(`Map web source is missing: ${sourceRoot}`);
  }

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  const dataRoot = path.join(sourceRoot, 'data');
  const dataNames = (await fs.readdir(dataRoot)).filter((name) => name.endsWith('.geojson'));
  const dataContents = await Promise.all(
    dataNames.map((name) => fs.readFile(path.join(dataRoot, name)))
  );
  const dataVersion = contentVersion(Buffer.concat(dataContents));
  const [indexHtml, appJs, stylesCss] = await Promise.all([
    fs.readFile(path.join(sourceRoot, 'index.html'), 'utf8'),
    fs.readFile(path.join(sourceRoot, 'app.js'), 'utf8'),
    fs.readFile(path.join(sourceRoot, 'styles.css'), 'utf8'),
  ]);
  const publishedApp = appJs.replace(
    /geojson\?v=[0-9-]+/,
    `geojson?v=${dataVersion}`
  );
  const publishedIndex = indexHtml
    .replace(/styles\.css\?v=[^"]+/, `styles.css?v=${contentVersion(stylesCss)}`)
    .replace(/app\.js\?v=[^"]+/, `app.js?v=${contentVersion(publishedApp)}`);

  await Promise.all([
    fs.writeFile(path.join(outputRoot, 'index.html'), publishedIndex, 'utf8'),
    fs.writeFile(path.join(outputRoot, 'app.js'), publishedApp, 'utf8'),
    fs.writeFile(path.join(outputRoot, 'styles.css'), stylesCss, 'utf8'),
    ...entries
      .filter((entry) => !['README.md', 'index.html', 'app.js', 'styles.css'].includes(entry.name))
      .map((entry) =>
        fs.cp(
          path.join(sourceRoot, entry.name),
          path.join(outputRoot, entry.name),
          { recursive: entry.isDirectory() }
        )
      ),
  ]);
  hexo.log.info('[铁路地图] 已发布到 /map/');
});
