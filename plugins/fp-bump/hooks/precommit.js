'use strict';

// PreToolUse(Bash) hook. When the model is about to `git commit`, make sure the
// commit's magnitude gets recorded before it lands: if this exact staged
// content hasn't been sized yet, DENY once and hand the model an instruction to
// size it and run `cli.js assess <level>`. Recording only ratchets the pending
// release level — it never touches the version file. Once sized, the same
// commit re-runs and goes straight through. The version itself changes only at
// /fp-bump:release.
//
// Fail-open everywhere: any error, non-repo, or odd state allows the commit. A
// version helper must never block real work — same spirit as fp-honesty's
// "stay quiet if anything's off".

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  base,
  PLUGIN,
  isGitCommit,
  detectVersionFile,
  stagedTree,
  getPending,
  getAssessedTree,
  decide,
} = require('./bump');

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
  const hasStagedChanges = git(['diff', '--cached', '--quiet'], root).status === 1;
  const hasHead = git(['rev-parse', '--verify', 'HEAD'], root).status === 0;

  const { decision, reason } = decide({
    command,
    mode: base.mode.get(PLUGIN, { start: cwd }),
    hasVersionFile: !!versionFile,
    hasStagedChanges,
    hasHead,
    pending: getPending({ start: cwd }),
    stagedTree: stagedTree(root),
    assessedTree: getAssessedTree({ start: cwd }),
    cliPath: path.join(__dirname, 'cli.js'),
  });

  return decision === 'deny' ? deny(reason) : allow();
}

try {
  main();
} catch {
  allow();
}
