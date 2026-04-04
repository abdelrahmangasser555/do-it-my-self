#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const cdkRoot = path.join(repoRoot, 'infrastructure', 'cdk');
const statePath = path.join(repoRoot, 'node_modules', '.dropout-install-state.json');

const manifestPaths = [
  path.join(repoRoot, 'package.json'),
  path.join(repoRoot, 'pnpm-lock.yaml'),
  path.join(cdkRoot, 'package.json'),
];

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

function print(color, message) {
  console.log(`${color}[DropOut]${RESET} ${message}`);
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveFrom(basedir, request) {
  try {
    require.resolve(request, { paths: [basedir] });
    return true;
  } catch {
    return false;
  }
}

function computeInstallHash() {
  const hash = crypto.createHash('sha256');

  for (const manifestPath of manifestPaths) {
    if (!fileExists(manifestPath)) {
      continue;
    }

    hash.update(path.relative(repoRoot, manifestPath));
    hash.update('\n');
    hash.update(fs.readFileSync(manifestPath));
    hash.update('\n');
  }

  return hash.digest('hex');
}

function readState() {
  if (!fileExists(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(installHash, packageManager) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        installHash,
        packageManager,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

function dependenciesInstalled() {
  return rootDependenciesInstalled() && cdkDependenciesInstalled();
}

function rootDependenciesInstalled() {
  return resolveFrom(repoRoot, 'next/package.json');
}

function cdkDependenciesInstalled() {
  return resolveFrom(cdkRoot, 'aws-cdk-lib/package.json');
}

function commandExists(command) {
  const executable = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(executable, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  const execPath = process.env.npm_execpath || '';

  if (userAgent.includes('pnpm') || execPath.includes('pnpm')) {
    return 'pnpm';
  }

  if (userAgent.includes('npm') || execPath.includes('npm')) {
    return 'npm';
  }

  if (commandExists('pnpm')) {
    return 'pnpm';
  }

  return 'npm';
}

function runCommand(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function runInstall(packageManager) {
  const isWindows = process.platform === 'win32';
  const pnpmCommand = isWindows ? 'pnpm.cmd' : 'pnpm';
  const npmCommand = isWindows ? 'npm.cmd' : 'npm';

  if (packageManager === 'pnpm') {
    print(CYAN, 'Installing project dependencies with pnpm...');
    runCommand(pnpmCommand, ['install']);
    return;
  }

  print(CYAN, 'Installing project dependencies with npm...');
  runCommand(npmCommand, ['install', '--no-fund', '--no-audit']);
}

function main() {
  const stampOnly = process.argv.includes('--stamp-only');
  const forceInstall = process.argv.includes('--force');

  const packageManager = detectPackageManager();
  const installHash = computeInstallHash();
  const state = readState();
  const installed = dependenciesInstalled();

  if (stampOnly) {
    writeState(installHash, packageManager);
    return;
  }

  if (!forceInstall && installed && state && state.installHash === installHash) {
    print(GREEN, 'Workspace dependencies are ready.');
    return;
  }

  if (!forceInstall && installed && !state) {
    writeState(installHash, packageManager);
    print(GREEN, 'Workspace dependencies are ready.');
    return;
  }

  if (!forceInstall && installed && state && state.installHash !== installHash) {
    print(YELLOW, 'Dependency manifests changed. Refreshing the workspace install...');
  }

  if (forceInstall) {
    print(CYAN, 'Forcing a fresh workspace install...');
  }

  runInstall(packageManager);

  if (!dependenciesInstalled()) {
    print(RED, 'Dependencies are still missing after install.');
    process.exit(1);
  }

  writeState(installHash, packageManager);
  print(GREEN, 'Workspace dependencies installed successfully.');
}

main();
