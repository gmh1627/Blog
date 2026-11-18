"""Refresh word statistics through one local Hexo build (legacy command)."""
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    root = Path(__file__).resolve().parents[1]
    node = shutil.which('node')
    if not node:
        print('Node.js was not found. Install the blog dependencies first.', file=sys.stderr)
        return 1
    print('Word statistics now run during one local Hexo build.', flush=True)
    return subprocess.call([node, str(root / 'node_modules/hexo/bin/hexo'), 'generate'], cwd=root)


if __name__ == '__main__':
    raise SystemExit(main())
