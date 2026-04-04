#!/usr/bin/env node
/**
 * pull-latest.js
 *
 * Runs before `pnpm dev` / `npm run dev` to pull the latest changes from
 * origin/master. Designed to keep a local DropOut installation always up
 * to date as the project evolves.
 *
 * Behaviour:
 *  - Checks that git is available and the repo has a remote named "origin"
 *  - Fetches and fast-forward merges from origin/master
 *  - If the working tree is dirty (uncommitted changes), it stashes them,
 *    pulls, then pops the stash so local work is never lost
 *  - Skips silently when offline or when the remote is unreachable
 *  - Never blocks the dev server — all errors are caught and printed as
 *    warnings so `pnpm dev` still starts
 */

const { execSync, spawnSync } = require('child_process');

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

function run(cmd, { silent = false } = {}) {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf-8' });
  if (!silent && result.stderr && result.status !== 0) {
    throw new Error(result.stderr.trim() || `Command failed: ${cmd}`);
  }
  return (result.stdout || '').trim();
}

function print(color, prefix, msg) {
  console.log(`${color}${prefix}${RESET} ${msg}`);
}

async function main() {
  print(CYAN, '[DropOut]', 'Checking for updates from origin/master…');

  // ── 1. Verify git is available ───────────────────────────────────────────
  try {
    run('git --version', { silent: true });
  } catch {
    print(YELLOW, '[DropOut]', 'git not found — skipping auto-update.');
    return;
  }

  // ── 2. Verify we're inside a git repo ───────────────────────────────────
  try {
    run('git rev-parse --git-dir', { silent: true });
  } catch {
    print(YELLOW, '[DropOut]', 'Not a git repository — skipping auto-update.');
    return;
  }

  // ── 3. Check that "origin" remote exists ────────────────────────────────
  const remotes = run('git remote', { silent: true });
  if (!remotes.split('\n').includes('origin')) {
    print(YELLOW, '[DropOut]', 'No "origin" remote found — skipping auto-update.');
    return;
  }

  // ── 4. Fetch from origin (non-fatal if offline) ──────────────────────────
  try {
    run('git fetch origin master --quiet', { silent: false });
  } catch (err) {
    print(YELLOW, '[DropOut]', `Could not reach origin — running offline. (${err.message})`);
    return;
  }

  // ── 5. Compare local HEAD with origin/master ────────────────────────────
  let localHash, remoteHash;
  try {
    localHash = run('git rev-parse HEAD', { silent: true });
    remoteHash = run('git rev-parse origin/master', { silent: true });
  } catch {
    print(YELLOW, '[DropOut]', 'Could not compare commits — skipping auto-update.');
    return;
  }

  if (localHash === remoteHash) {
    print(GREEN, '[DropOut]', `Already up to date. ${DIM}(${localHash.slice(0, 7)})${RESET}`);
    return;
  }

  // ── 6. Check for uncommitted local changes ────────────────────────────────
  const isDirty = run('git status --porcelain', { silent: true }).length > 0;
  let stashed = false;

  if (isDirty) {
    print(YELLOW, '[DropOut]', 'Uncommitted changes detected — stashing before pull…');
    try {
      run('git stash push --include-untracked -m "dropout-auto-stash"');
      stashed = true;
    } catch (err) {
      print(
        YELLOW,
        '[DropOut]',
        `Stash failed — skipping auto-update to protect your work. (${err.message})`,
      );
      return;
    }
  }

  // ── 7. Pull (fast-forward only) ───────────────────────────────────────────
  try {
    const output = run('git merge --ff-only origin/master');
    print(GREEN, '[DropOut]', `Updated to latest. ${DIM}${output || ''}${RESET}`);
  } catch (err) {
    print(
      RED,
      '[DropOut]',
      `Auto-update failed (non-fast-forward?). Run \`git pull\` manually. (${err.message})`,
    );
  } finally {
    // ── 8. Restore stash ─────────────────────────────────────────────────────
    if (stashed) {
      try {
        run('git stash pop');
        print(GREEN, '[DropOut]', 'Local changes restored from stash.');
      } catch (err) {
        print(
          RED,
          '[DropOut]',
          `Could not pop stash — run \`git stash pop\` manually. (${err.message})`,
        );
      }
    }
  }

  // ── 9. Remind user to reinstall deps if package.json changed ─────────────
  try {
    const changed = run(`git diff ${localHash} HEAD --name-only`, { silent: true });
    if (changed.includes('package.json') || changed.includes('pnpm-lock.yaml')) {
      print(
        YELLOW,
        '[DropOut]',
        'package.json or lockfile changed — workspace dependencies will be refreshed before the dev server starts.',
      );
    }
  } catch {
    // non-critical
  }
}

main().catch((err) => {
  // Never crash the dev server
  console.warn(`${YELLOW}[DropOut]${RESET} Auto-update check failed: ${err.message}`);
});
