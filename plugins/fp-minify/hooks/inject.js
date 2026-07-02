'use strict';

// UserPromptSubmit hook. Two jobs each turn:
//   1. If the prompt is a mode directive ("fp-minify new", "stop fp-minify",
//      etc.), flip the saved mode right here, deterministically, before the model
//      does anything — so switching is instant and reliable, with no tool call.
//      (Same approach as fp-honesty and fp-barbeque.)
//   2. While active, inject the comment-concision prior so the model writes and
//      tidies comments to the doctrine.
// Output goes to stdout, which Claude Code adds to the prompt context. Silent
// when off (the prior carries no rules) so an inactive plugin stays quiet.

const { base, PLUGIN, RULES } = require('./minify');
const fs = require('fs');

// Matches an explicit directive at the START of the prompt, so a passing mention
// of "fp-minify" mid-sentence never flips the mode. The "/", "@" or "$" prefix is
// optional, and ":fp-minify" (the plugin:skill form) is allowed.
const DIRECTIVE = /^\s*[/@$]?fp-minify(?::fp-minify)?\s+(off|on|new|tidy|show)\b/i;

function detectDirective(prompt) {
  const m = DIRECTIVE.exec(prompt || '');
  if (m) return m[1].toLowerCase();
  if (/\bstop fp-minify\b/i.test(prompt || '')) return 'off';
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
function buildContext(mode, { note = null } = {}) {
  return base.inject.build(PLUGIN, { mode, rules: RULES[mode] || '', note });
}

// Apply a directive and return a one-line note for the model, or null.
function applyDirective(directive) {
  if (!directive) return null;
  if (directive === 'show') {
    return `fp-minify mode is currently "${base.mode.get(PLUGIN)}". Tell the user in one short line; do not run anything.`;
  }
  const target = directive === 'on' ? 'tidy' : directive;
  base.mode.set(PLUGIN, target);
  return `fp-minify switched to "${target}" (already applied). Confirm to the user in one short line; do not run any command.`;
}

function run() {
  try {
    const note = applyDirective(detectDirective(readPrompt()));
    const mode = base.mode.get(PLUGIN);
    const out = buildContext(mode, { note });
    if (out) process.stdout.write(out);
  } catch {
    // Injection is best-effort; never block a prompt.
  }
}

if (require.main === module) run();

module.exports = { buildContext, detectDirective, applyDirective, run };
