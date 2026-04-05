#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(cmd, cwd = root) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function copyEnvExample() {
  const src = path.join(root, '.env.example');
  const dest = path.join(root, '.env');

  if (fs.existsSync(dest)) {
    console.log('\n.env already exists, skipping copy');
  } else if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('\nCopied .env.example -> .env');
  } else {
    console.log('\nNo .env.example found, skipping');
  }
}

function installDeps() {
  console.log('\nInstalling dependencies...');
  run('npm install');
}

function setupHusky() {
  console.log('\nSetting up husky hooks...');
  run('npm run prepare');
}

function main() {
  console.log('=== StudyPilot Setup ===');

  copyEnvExample();
  installDeps();
  setupHusky();

  console.log('\n=== Setup complete! ===');
}

main();
