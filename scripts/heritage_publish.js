'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

function contentVersion(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

hexo.extend.filter.register('after_generate', async function () {
  const appRoot = path.join(hexo.base_dir, 'heritage');
  const outputRoot = path.join(hexo.public_dir, 'heritage');
  const outputData = path.join(outputRoot, 'data');
  const privateRecordsPath = path.join(appRoot, 'data', 'visits.private.json');

  const [indexHtml, appJs, stylesCss, unitsJs, divisionsJs] = await Promise.all([
    fs.readFile(path.join(appRoot, 'index.html'), 'utf8'),
    fs.readFile(path.join(appRoot, 'app.js'), 'utf8'),
    fs.readFile(path.join(appRoot, 'styles.css'), 'utf8'),
    fs.readFile(path.join(appRoot, 'data', 'units.js'), 'utf8'),
    fs.readFile(path.join(appRoot, 'data', 'divisions.js'), 'utf8'),
  ]);

  let privateRecords = {};
  try {
    const payload = JSON.parse(await fs.readFile(privateRecordsPath, 'utf8'));
    privateRecords = payload && typeof payload.records === 'object' ? payload.records : payload;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const publicRecords = {};
  for (const [id, record] of Object.entries(privateRecords || {})) {
    if (!record || typeof record !== 'object' || !record.visited) continue;
    publicRecords[id] = {
      visited: true,
      time: String(record.time || '').trim(),
      notes: String(record.notes || '').trim(),
    };
  }
  const unitsPrefix = 'window.HERITAGE_UNITS=';
  const trimmedUnits = unitsJs.trim();
  if (!trimmedUnits.startsWith(unitsPrefix) || !trimmedUnits.endsWith(';')) {
    throw new Error('heritage/data/units.js format is invalid');
  }
  const localUnits = JSON.parse(trimmedUnits.slice(unitsPrefix.length, -1));
  const publicUnits = localUnits.map(({ location, ...unit }) => unit);
  const publicUnitsJs = `${unitsPrefix}${JSON.stringify(publicUnits)};\n`;
  const runtime = `window.HERITAGE_RUNTIME = ${JSON.stringify({ readOnly: true, records: publicRecords })};\n`;
  const publishedIndex = indexHtml
    .replace('href="./styles.css"', `href="./styles.css?v=${contentVersion(stylesCss)}"`)
    .replace('src="./data/runtime.js"', `src="./data/runtime.js?v=${contentVersion(runtime)}"`)
    .replace('src="./data/divisions.js"', `src="./data/divisions.js?v=${contentVersion(divisionsJs)}"`)
    .replace('src="./data/units.js"', `src="./data/units.js?v=${contentVersion(publicUnitsJs)}"`)
    .replace('src="./app.js"', `src="./app.js?v=${contentVersion(appJs)}"`);

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputData, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputRoot, 'index.html'), publishedIndex, 'utf8'),
    fs.writeFile(path.join(outputRoot, 'app.js'), appJs, 'utf8'),
    fs.writeFile(path.join(outputRoot, 'styles.css'), stylesCss, 'utf8'),
    fs.writeFile(path.join(outputData, 'units.js'), publicUnitsJs, 'utf8'),
    fs.writeFile(path.join(outputData, 'divisions.js'), divisionsJs, 'utf8'),
    fs.writeFile(path.join(outputData, 'runtime.js'), runtime, 'utf8'),
  ]);
  hexo.log.info(`[国保足迹] 已发布 ${Object.keys(publicRecords).length} 条到访记录到 /heritage/`);
});
