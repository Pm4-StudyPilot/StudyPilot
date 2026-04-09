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

function symlinkBeEnv() {
  const beEnvSrc = path.join(root, '.env');
  const beEnvDest = path.join(root, 'backend', '.env');

  if (fs.existsSync(beEnvDest) || fs.statSync(beEnvDest).isSymbolicLink()) {
    const existing = fs.readlinkSync(beEnvDest);
    if (existing === beEnvSrc) {
      console.log('\nbackend/.env already symlinked to root .env, skipping');
    } else {
      console.log('\nbackend/.env exists and points elsewhere, skipping');
    }
  } else if (fs.existsSync(beEnvSrc)) {
    fs.symlinkSync(beEnvSrc, beEnvDest);
    console.log('\nSymlinked backend/.env -> root .env');
  } else {
    console.log('\nroot .env not found, skipping backend symlink');
  }
}

function installDeps() {
  console.log('\nInstalling dependencies...');
  run('npm install');
}

function runMigrations() {
  console.log('\nRunning database migrations...');
  run('npm run db:migrate');
  run('npm run db:generate');
}

function setupHusky() {
  console.log('\nSetting up husky hooks...');
  run('npm run prepare');
}

function main() {
  console.log('=== StudyPilot Setup ===');

  copyEnvExample();
  symlinkBeEnv();
  installDeps();
  runMigrations();
  setupHusky();

  console.log('\n=== Setup complete! ===');
}

main();
