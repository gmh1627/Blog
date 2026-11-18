const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { deployAll } = require('../lib/deploy-all.cjs');

const root = path.resolve(__dirname, '..');

test('one blog build includes statistics and is deployed once without map construction', () => {
  const calls = [];
  let builds = 0;
  const status = deployAll(root, (command, args, options) => {
    calls.push([path.basename(command), ...args.map((arg) => path.basename(arg))]);
    if (args[1] === 'generate') builds++;
    return { status: 0 };
  });
  assert.equal(status, 0);
  assert.equal(builds, 1);
  assert.deepEqual(calls.map((call) => call.slice(1)), [
    ['hexo', 'clean'], ['hexo', 'generate'], ['hexo', 'deploy'],
    ['add', '.'], ['commit', '-m', 'commit'], ['push', 'origin', 'main'],
  ]);
});

test('a failed blog build stops before deployment or Git changes', () => {
  let calls = 0;
  const status = deployAll(root, (command, args, options) => {
    calls++;
    return { status: args[1] === 'generate' ? 7 : 0 };
  });
  assert.equal(status, 7);
  assert.equal(calls, 2);
});
