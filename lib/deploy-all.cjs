'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function deployAll(root, execute = spawnSync) {
  // Keep this outside public/ so both hexo clean calls preserve the calendar.
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-journey-'));
  const env = { ...process.env, BLOG_JOURNEY_CALENDAR_CACHE: path.join(temporary, 'calendar.json') };
  const hexo = require.resolve('hexo/bin/hexo');
  const steps = [
    [process.execPath, [hexo, 'clean']],
    [process.execPath, [hexo, 'generate']],
    [process.execPath, [hexo, 'deploy']],
    ['python', [path.join(root, '统计/blog_stat.py')]],
    [process.execPath, [hexo, 'clean']],
    [process.execPath, [hexo, 'generate']],
    [process.execPath, [hexo, 'deploy']],
    ['git', ['add', '.']],
    ['git', ['commit', '-m', 'commit']],
    ['git', ['push', 'origin', 'main']],
  ];
  try {
    for (const [command, args] of steps) {
      const result = execute(command, args, { cwd: root, env, stdio: 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0) return result.status || 1;
    }
    return 0;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    process.exitCode = deployAll(path.resolve(__dirname, '..'));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { deployAll };
