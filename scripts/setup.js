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
  let existingStat = null;

  try {
    existingStat = fs.lstatSync(beEnvDest);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (existingStat) {
    if (existingStat.isSymbolicLink()) {
      const existing = path.resolve(path.dirname(beEnvDest), fs.readlinkSync(beEnvDest));
      if (existing === beEnvSrc) {
        console.log('\nbackend/.env already symlinked to root .env, skipping');
      } else {
        console.log('\nbackend/.env exists and points elsewhere, skipping');
      }
    } else {
      if (fs.existsSync(beEnvSrc)) {
        const rootEnv = fs.readFileSync(beEnvSrc, 'utf8');
        const backendEnv = fs.readFileSync(beEnvDest, 'utf8');

        if (backendEnv === rootEnv) {
          console.log('\nbackend/.env already exists as a regular file matching root .env');
        } else {
          console.log('\nbackend/.env exists as a regular file and differs from root .env');
          console.log('Keeping backend/.env unchanged; make sure its DATABASE_URL matches Docker');
        }
      } else {
        console.log('\nbackend/.env already exists as a regular file, skipping symlink');
      }
    }
  } else if (fs.existsSync(beEnvSrc)) {
    try {
      fs.symlinkSync(beEnvSrc, beEnvDest, 'file');
      console.log('\nSymlinked backend/.env -> root .env');
    } catch (error) {
      if (error.code !== 'EPERM') {
        throw error;
      }

      fs.copyFileSync(beEnvSrc, beEnvDest);
      console.log('\nCopied root .env -> backend/.env because symlinks are not permitted');
    }
  } else {
    console.log('\nroot .env not found, skipping backend env setup');
  }
}

function installDeps() {
  console.log('\nInstalling dependencies...');
  run('npm install');
}

function startServices() {
  console.log('\nStarting local services...');
  run('docker compose up -d postgres minio');
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
  startServices();
  runMigrations();
  setupHusky();

  console.log('\n=== Setup complete! ===');
}

main();
