'use strict';

// Shared setup for every fp-bump hook: load the (symlinked or dev) base, declare
// the apply modes once, and hold the deterministic pieces — version-file
// detection, the commit detector, and the pure allow/deny decision. Keeping the
// decision pure (no IO) is what makes it testable without git or a live commit.
//
// Modes:  off (never interfere) · suggest (propose, confirm before writing,
// default) · auto (size and apply the bump without asking). The model does the
// magnitude judgment; this module only decides whether a commit needs one.

function loadBase() {
  try {
    return require('./_fpbase'); // production: symlinked base, copied in at install
  } catch {
    return require('@flarepoint/base'); // dev/test fallback
  }
}

const fs = require('fs');
const path = require('path');

const base = loadBase();
const PLUGIN = 'bump';

base.mode.define(PLUGIN, { levels: ['suggest', 'auto'], default: 'suggest' });

// Ordered detection — first file that yields a version wins. Each reader only
// needs to READ the version string (writing the bump is the model's job), so a
// regex is enough for the TOML/plain formats; no YAML/TOML dependency.
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

// Pure decision. All IO-derived facts are passed in:
//   mode             'off' | 'suggest' | 'auto'
//   versionFile      { name, version } | null   (version that WOULD be committed)
//   headVersion      string | null              (version currently at HEAD)
//   hasStagedChanges boolean
//   hasHead          boolean                     (false on the very first commit)
// Returns { decision: 'allow' | 'deny', reason? }.
function decide({ command, mode, versionFile, headVersion, hasStagedChanges, hasHead }) {
  if (!isGitCommit(command)) return { decision: 'allow' };
  if (mode === base.mode.OFF) return { decision: 'allow' };
  if (!versionFile) return { decision: 'allow' }; // nothing to version
  if (!hasStagedChanges) return { decision: 'allow' }; // empty / amend-only
  if (!hasHead) return { decision: 'allow' }; // initial commit: no baseline to bump from
  if (headVersion && versionFile.version && versionFile.version !== headVersion) {
    return { decision: 'allow' }; // already bumped for this release
  }
  return { decision: 'deny', reason: bumpInstruction(mode, versionFile, headVersion) };
}

function bumpInstruction(mode, versionFile, headVersion) {
  const cur = (versionFile && versionFile.version) || headVersion || '0.0.0';
  const act =
    mode === 'auto'
      ? 'Apply the chosen bump directly (auto mode), stage the file, then re-run the commit.'
      : 'Propose the bump to the user in one line and wait for confirmation; on approval edit and stage the file, then re-run the commit.';
  return [
    `fp-bump: this commit has staged changes but ${versionFile.name} is still ${cur} (unchanged since HEAD).`,
    'Size a SemVer bump to the magnitude of the staged diff (`git diff --cached`):',
    'breaking change → major · new feature → minor · fix or internal-only → patch.',
    `Set "version" in ${versionFile.name} accordingly. ${act}`,
    '(Disable with /fp-bump:mode off.)',
  ].join(' ');
}

module.exports = {
  base,
  PLUGIN,
  loadBase,
  VERSION_FILES,
  readPkgJson,
  readTomlVersion,
  readPlain,
  detectVersionFile,
  isGitCommit,
  decide,
  bumpInstruction,
};
