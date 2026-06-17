'use strict';

// Shared setup for every fp-bump hook. Two ideas drive the design:
//
//   1. ASSESS (continuous, cheap). Each commit is a natural checkpoint, so the
//      commit hook asks the model to size THAT commit's staged changes and
//      record the level. Recording only raises a flag; it never writes the
//      version. Ten commits in a row leave one pending level, not ten bumps.
//
//   2. FLUSH (discrete). The accumulated level is applied as exactly one bump
//      only when you ask for a release (/fp-bump:release). One release, one
//      bump, no matter how many commits happened in between.
//
// The "pending" level is a ratchet: none -> patch -> minor -> major, climbing
// only, until a release resets it. The model judges magnitude; this module
// holds the deterministic, testable pieces (version-file detection, the commit
// detector, the ratchet, the SemVer math, and the pure gate decision).
//
// Modes govern the FLUSH, not the commit:
//   off      do nothing
//   suggest  propose the release bump and wait for confirmation (default)
//   auto     size and apply the release bump without asking

function loadBase() {
  try {
    return require('./_fpbase'); // production: symlinked base, copied in at install
  } catch {
    return require('@flarepoint/base'); // dev/test fallback
  }
}

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const base = loadBase();
const PLUGIN = 'bump';

base.mode.define(PLUGIN, { levels: ['suggest', 'auto'], default: 'suggest' });

// --- pending level (the ratchet) ------------------------------------------

const LEVELS = ['none', 'patch', 'minor', 'major'];
const RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const TOP = 'major';

// Highest of two levels wins. Unknown input is treated as 'none' so a bad value
// can never silently lower a real pending level.
function ratchet(a, b) {
  const ra = RANK[a] || 0;
  const rb = RANK[b] || 0;
  return ra >= rb ? (LEVELS[ra] || 'none') : (LEVELS[rb] || 'none');
}

function getPending(opts) {
  const v = base.config.get(PLUGIN, 'pending', 'none', opts);
  return LEVELS.includes(v) ? v : 'none';
}

function setPending(level, opts) {
  return base.config.set(PLUGIN, 'pending', LEVELS.includes(level) ? level : 'none', opts);
}

function getAssessedTree(opts) {
  return base.config.get(PLUGIN, 'assessedTree', '', opts) || '';
}

function setAssessedTree(tree, opts) {
  return base.config.set(PLUGIN, 'assessedTree', tree || '', opts);
}

// Clear the ledger after a release: nothing pending, nothing assessed.
function clearPending(opts) {
  base.config.set(PLUGIN, 'pending', 'none', opts);
  base.config.set(PLUGIN, 'assessedTree', '', opts);
}

// --- SemVer math ----------------------------------------------------------

// Bump the core x.y.z by one level. Any pre-release / build suffix is dropped,
// which is the conventional result of a release bump. Returns null when the
// current value isn't a recognizable SemVer core.
function nextVersion(current, level) {
  const m = /^\s*v?(\d+)\.(\d+)\.(\d+)/.exec(String(current || ''));
  if (!m) return null;
  let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`;
  return null;
}

// --- version-file detection (read-only; writing the bump is the model's job)

function readPkgJson(text) {
  try {
    const v = JSON.parse(text).version;
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

function readTomlVersion(text) {
  const m = /^\s*version\s*=\s*["']([^"']+)["']/m.exec(text);
  return m ? m[1] : null;
}

function readPlain(text) {
  const v = String(text).trim().split(/\s+/)[0];
  return v || null;
}

const VERSION_FILES = [
  { name: 'package.json', read: readPkgJson },
  { name: 'pyproject.toml', read: readTomlVersion },
  { name: 'Cargo.toml', read: readTomlVersion },
  { name: 'VERSION', read: readPlain },
  { name: 'version.txt', read: readPlain },
];

// The project's version file, read from the working tree. Returns
// { name, file, version, read } or null when the project carries no version.
function detectVersionFile(root) {
  for (const vf of VERSION_FILES) {
    const file = path.join(root, vf.name);
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const version = vf.read(text);
    if (version) return { name: vf.name, file, version, read: vf.read };
  }
  return null;
}

// Is this Bash command a real `git commit` (any segment), not `git commit -h`?
function isGitCommit(command) {
  if (!command) return false;
  if (/--help\b|(?:^|\s)-h\b/.test(command)) return false;
  return command
    .split(/&&|\|\||;/)
    .some((seg) => /\bgit\b(?:\s+-\S+(?:\s+\S+)?)*\s+commit\b/.test(seg));
}

// Stable hash of the staged content (the index tree). Same staged files ->
// same hash, so we can tell "already assessed this exact commit" from "new
// changes, judge again". Returns null outside a repo or on any git error.
function stagedTree(root) {
  const r = spawnSync('git', ['write-tree'], { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : null;
}

// --- the pure commit gate -------------------------------------------------

// All IO-derived facts are passed in, so this is testable without git:
//   mode             'off' | 'suggest' | 'auto'
//   hasVersionFile   boolean
//   hasStagedChanges boolean
//   hasHead          boolean   (false on the very first commit)
//   pending          'none' | 'patch' | 'minor' | 'major'
//   stagedTree       string | null   (hash of the current staged content)
//   assessedTree     string          (hash we last sized; '' if never)
//   cliPath          absolute path to cli.js, for the instruction text
// Returns { decision: 'allow' | 'deny', reason? }. A deny asks the model to
// size this commit and record the level; it never asks to change the version.
function decide({
  command,
  mode,
  hasVersionFile,
  hasStagedChanges,
  hasHead,
  pending = 'none',
  stagedTree: tree = null,
  assessedTree = '',
  cliPath = 'cli.js',
}) {
  if (!isGitCommit(command)) return { decision: 'allow' };
  if (mode === base.mode.OFF) return { decision: 'allow' };
  if (!hasVersionFile) return { decision: 'allow' }; // nothing to version
  if (!hasStagedChanges) return { decision: 'allow' }; // empty / amend-only
  if (!hasHead) return { decision: 'allow' }; // initial commit: no baseline yet
  if (pending === TOP) return { decision: 'allow' }; // already maxed; can't climb higher
  if (tree && assessedTree && assessedTree === tree) {
    return { decision: 'allow' }; // this exact commit was already sized
  }
  return { decision: 'deny', reason: assessInstruction(pending, cliPath) };
}

function assessInstruction(pending, cliPath) {
  return [
    'fp-bump: before this commit lands, size its staged changes so the next',
    'release can be the right size. This does NOT change the version now.',
    'Read the staged diff (`git diff --cached`) and pick the level that fits:',
    'breaking change -> major, new feature -> minor, fix or internal-only -> patch.',
    `Record it with:  node "${cliPath}" assess <level>`,
    'Then re-run the same commit and it will go through.',
    `(Pending release so far: ${pending}. The version only changes when you run /fp-bump:release.)`,
    '(Disable with /fp-bump:mode off.)',
  ].join(' ');
}

module.exports = {
  base,
  PLUGIN,
  loadBase,
  LEVELS,
  RANK,
  TOP,
  ratchet,
  getPending,
  setPending,
  getAssessedTree,
  setAssessedTree,
  clearPending,
  nextVersion,
  VERSION_FILES,
  readPkgJson,
  readTomlVersion,
  readPlain,
  detectVersionFile,
  isGitCommit,
  stagedTree,
  decide,
  assessInstruction,
};
