#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function main() {
  const turbo = spawn('./node_modules/.bin/turbo', ['run', 'dev', '--ui', 'tui'], {
    cwd: root,
    stdio: 'inherit',
  });

  turbo.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    turbo.kill('SIGINT');
  });
}

main();
