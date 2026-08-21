'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

hexo.extend.filter.register('after_generate', async function () {
  const appRoot = path.join(hexo.base_dir, 'heritage');
  const outputRoot = path.join(hexo.public_dir, 'heritage');
  const outputData = path.join(outputRoot, 'data');
  const privateRecordsPath = path.join(appRoot, 'data', 'visits.private.json');

  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputData, { recursive: true });
  await Promise.all([
    fs.copyFile(path.join(appRoot, 'index.html'), path.join(outputRoot, 'index.html')),
    fs.copyFile(path.join(appRoot, 'app.js'), path.join(outputRoot, 'app.js')),
    fs.copyFile(path.join(appRoot, 'styles.css'), path.join(outputRoot, 'styles.css')),
    fs.copyFile(path.join(appRoot, 'data', 'units.js'), path.join(outputData, 'units.js')),
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
    };
  }
  const runtime = `window.HERITAGE_RUNTIME = ${JSON.stringify({ readOnly: true, records: publicRecords })};\n`;
  await fs.writeFile(path.join(outputData, 'runtime.js'), runtime, 'utf8');
  hexo.log.info(`[国保足迹] 已发布 ${Object.keys(publicRecords).length} 条到访记录到 /heritage/`);
});
