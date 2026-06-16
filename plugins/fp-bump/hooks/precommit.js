'use strict';

// PreToolUse(Bash) hook. When the model is about to `git commit`, make sure the
// version moves with the release: if there are staged changes but the version
// file is unchanged since HEAD, DENY the commit and hand the model an
// instruction to size a SemVer bump first. The model judges the magnitude; this
// hook only detects the moment and gates the commit.
//
// Fail-open everywhere: any error, non-repo, or odd state allows the commit. A
// version helper must never block real work — same spirit as fp-honesty's
// "stay quiet if anything's off".

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { base, PLUGIN, isGitCommit, detectVersionFile, decide } = require('./bump');

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { status: r.error ? null : r.status, out: (r.stdout || '').trim() };
}

function allow() {
  process.exit(0); // no stdout => commit proceeds
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function main() {
  const input = readStdin();
  if (input.tool_name && input.tool_name !== 'Bash') return allow();

  const command = (input.tool_input && input.tool_input.command) || '';
  if (!isGitCommit(command)) return allow();

  const cwd = input.cwd || process.cwd();
  if (base.mode.get(PLUGIN, { start: cwd }) === base.mode.OFF) return allow();

  const root = base.config.paths(cwd).projectRoot;
  if (git(['rev-parse', '--is-inside-work-tree'], root).out !== 'true') return allow();

  const versionFile = detectVersionFile(root);
  if (!versionFile) return allow();

  const rel = path.relative(root, versionFile.file);
  const head = git(['show', `HEAD:${rel}`], root);
  const headVersion = head.status === 0 ? versionFile.read(head.out) : null;
  const idx = git(['show', `:${rel}`], root);
  const committedVersion = idx.status === 0 ? versionFile.read(idx.out) : versionFile.version;

  const hasStagedChanges = git(['diff', '--cached', '--quiet'], root).status === 1;
  const hasHead = git(['rev-parse', '--verify', 'HEAD'], root).status === 0;

  const { decision, reason } = decide({
    command,
    mode: base.mode.get(PLUGIN, { start: cwd }),
    versionFile: { name: versionFile.name, version: committedVersion },
    headVersion,
    hasStagedChanges,
    hasHead,
  });

  return decision === 'deny' ? deny(reason) : allow();
}

try {
  main();
} catch {
  allow();
}
