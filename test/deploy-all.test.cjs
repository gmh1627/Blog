const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { deployAll } = require('../lib/deploy-all.cjs');
const { calendarForBuild } = require('../lib/journey-calendar.cjs');

const root = path.resolve(__dirname, '..');

test('two blog builds share one calendar and never invoke map construction', () => {
  const calls = [];
  let cache;
  let calendar;
  let builds = 0;
  const status = deployAll(root, (command, args, options) => {
    calls.push([path.basename(command), ...args.map((arg) => path.basename(arg))]);
    cache = options.env.BLOG_JOURNEY_CALENDAR_CACHE;
    if (args[1] === 'generate') {
      builds++;
      const data = calendarForBuild(builds === 1 ? root : path.join(root, 'nonexistent'), {}, cache);
      if (builds === 1) calendar = data;
      else assert.equal(data, calendar);
    }
    return { status: 0 };
  });
  assert.equal(status, 0);
  assert.equal(builds, 2);
  assert.deepEqual(calls.map((call) => call.slice(1)), [
    ['hexo', 'clean'], ['hexo', 'generate'], ['hexo', 'deploy'], ['blog_stat.py'],
    ['hexo', 'clean'], ['hexo', 'generate'], ['hexo', 'deploy'],
    ['add', '.'], ['commit', '-m', 'commit'], ['push', 'origin', 'main'],
  ]);
  assert.equal(fs.existsSync(cache), false);
});

test('a failed blog build stops deployment and removes its temporary calendar', () => {
  let calls = 0;
  let cache;
  const status = deployAll(root, (command, args, options) => {
    calls++;
    cache = options.env.BLOG_JOURNEY_CALENDAR_CACHE;
    return { status: args[1] === 'generate' ? 7 : 0 };
  });
  assert.equal(status, 7);
  assert.equal(calls, 2);
  assert.equal(fs.existsSync(path.dirname(cache)), false);
});
