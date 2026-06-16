'use strict';

// UserPromptSubmit hook. Two jobs each turn:
//   1. If the prompt is a mode directive ("fp-honesty off", "stop fp-honesty",
//      etc.), flip the saved mode right here, deterministically, before the
//      model does anything. This is why switching is instant and reliable: the
//      config is already changed by the time the model replies, with no tool
//      call. (Same approach as ponytail's mode tracker.)
//   2. Inject the active-mode ruleset, plus any disclosure the Stop-hook
//      backstop left from last turn.
// Output goes to stdout, which Claude Code adds to the prompt context.

const { base, PLUGIN, RULES } = require('./honesty');
const fs = require('fs');
const path = require('path');

function flagFile() {
  const dir = base.state.storeDir(PLUGIN, { scope: 'project', sharing: 'personal' });
  return path.join(dir, 'audit-flag.json');
}

// Matches an explicit directive at the START of the prompt, so a passing mention
// of "fp-honesty" mid-sentence never flips the mode. The "/", "@" or "$" prefix
// is optional, and ":fp-honesty" (the plugin:skill form) is allowed.
const DIRECTIVE = /^\s*[/@$]?fp-honesty(?::fp-honesty)?\s+(off|on|full|footer|show)\b/i;

function detectDirective(prompt) {
  const m = DIRECTIVE.exec(prompt || '');
  if (m) return m[1].toLowerCase();
  if (/\bstop fp-honesty\b/i.test(prompt || '')) return 'off';
  return null;
}

function readPrompt() {
  try {
    const raw = fs.readFileSync(0, 'utf8').replace(/^﻿/, ''); // strip BOM some shells add
    return JSON.parse(raw).prompt || '';
  } catch {
    return '';
  }
}

// Pure builder so tests don't touch stdin/stdout.
function buildContext(mode, { suggestion = null, note = null } = {}) {
  return base.inject.build(PLUGIN, { mode, rules: RULES[mode] || '', suggestion, note });
}

function takeDisclosure() {
  const file = flagFile();
  const data = base.util.readJSON(file, null);
  if (!data) return null;
  fs.rmSync(file, { force: true });
  return data.disclosure || null;
}

// Apply a directive and return a one-line note for the model, or null.
function applyDirective(directive) {
  if (!directive) return null;
  if (directive === 'show') {
    return `fp-honesty mode is currently "${base.mode.get(PLUGIN)}". Tell the user in one short line; do not run anything.`;
  }
  const target = directive === 'on' ? 'full' : directive;
  base.mode.set(PLUGIN, target);
  return `fp-honesty switched to "${target}" (already applied). Confirm to the user in one short line; do not run any command.`;
}

function run() {
  try {
    const note = applyDirective(detectDirective(readPrompt()));
    const mode = base.mode.get(PLUGIN);
    const out = buildContext(mode, { suggestion: takeDisclosure(), note });
    if (out) process.stdout.write(out);
  } catch {
    // Injection is best-effort; never block a prompt.
  }
}

if (require.main === module) run();

module.exports = { buildContext, detectDirective, applyDirective, run, flagFile };
