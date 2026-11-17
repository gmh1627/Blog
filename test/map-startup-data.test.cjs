const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { unpack } = require('../Map/web/data-codec.js');
const root = path.resolve(__dirname, '../Map/web/data');

test('compressed startup preserves every feature, property and coordinate exactly', () => {
  const bytes = fs.readFileSync(path.join(root,'startup.json.gz'));
  const data = unpack(JSON.parse(zlib.gunzipSync(bytes)));
  let sourceBytes=0;
  for (const [name, collection] of Object.entries(data)) {
    const original=fs.readFileSync(path.join(root,name+'.geojson'));
    assert.deepEqual(collection,JSON.parse(original),name);
    sourceBytes+=original.length;
  }
  assert.ok(bytes.length < sourceBytes/4);
  const originalRoutes=JSON.parse(fs.readFileSync(path.join(root,'visited_routes.geojson'))).features;
  assert.equal(data.visited_routes.features.length,originalRoutes.length);
  assert.equal(data.visited_routes.features.reduce((sum,f)=>sum+f.properties.table_km,0),originalRoutes.reduce((sum,f)=>sum+f.properties.table_km,0));
});
