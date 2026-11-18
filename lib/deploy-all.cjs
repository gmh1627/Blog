'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

function deployAll(root, execute = spawnSync) {
  const hexo = require.resolve('hexo/bin/hexo');
  const steps = [
    [process.execPath, [hexo, 'clean']],
    [process.execPath, [hexo, 'generate']],
    [process.execPath, [hexo, 'deploy']],
    ['git', ['add', '.']],
    ['git', ['commit', '-m', 'commit']],
    ['git', ['push', 'origin', 'main']],
  ];
  for (const [command, args] of steps) {
    const result = execute(command, args, { cwd: root, env: process.env, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status || 1;
  }
  return 0;
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
