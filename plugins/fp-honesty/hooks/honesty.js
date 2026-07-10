'use strict';

// Shared setup for every fp-honesty hook: load the (vendored or dev) base,
// declare the mode levels once, and hold the compact always-on ruleset that the
// inject hook pushes each turn. The detailed authoritative version lives in
// skills/fp-honesty/SKILL.md; this is the terse enforcement copy.

const os = require('os');
const path = require('path');
const crypto = require('crypto');

function loadBase() {
  try {
    return require('./_fpbase'); // production: bundled into the plugin
  } catch {
    return require('@flarepoint/base'); // dev/test: the file: devDependency
  }
}

const base = loadBase();
const PLUGIN = 'honesty';

// Cross-turn backstop flag, kept OUT of the user's repo. It once lived in
// <repo>/.flarepoint and got accidentally committed; a per-project file under
// the OS temp dir avoids the working tree entirely. One-turn signal, so losing
// it on reboot is harmless.
function flagFile(start) {
  const root = base.config.paths(start).projectRoot;
  const key = crypto.createHash('sha256').update(root).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), 'flarepoint-honesty', `${key}-audit-flag.json`);
}

base.mode.define(PLUGIN, { levels: ['footer', 'full'], default: 'full' });

const COMMON = `Tag the BASIS of every load-bearing factual claim — an assertion that costs the user if it is wrong: claims about this codebase, how an API/library behaves, version numbers or limits, "X is unused/safe/already handled", or facts about the outside world.
Levels (use the exact colored tag, including the emoji and the word): [🟢 verified] you confirmed it with a tool THIS turn (not a past turn, not "I'm fairly sure"); [🟡 inferred] your reasoning, unchecked; [🟠 recalled] training knowledge, may be stale; [🔴 guess] a hunch.
Do NOT tag opinions, plans, questions, or code you are writing (code is the artifact, not a claim). Keep ordinary prose clean.
NON-INTERFERENCE (critical): the tag changes NOTHING you do — never add caveats, fallbacks, extra caution, or hedging because a claim is only inferred. Surface status; never steer.`;

const RULES = {
  full: `fp-honesty (full). Active this response.
${COMMON}
Put a colored inline tag right after each load-bearing claim, then end the response with one footer line: "basis: 🟢 N verified · 🟡 M inferred · …" (only the levels you used, each with its emoji). No load-bearing claims → no footer.`,
  footer: `fp-honesty (footer). Active this response.
${COMMON}
Do NOT add inline tags. Instead, end the response with one footer line tallying the basis of the load-bearing claims you made: "basis: 🟢 N verified · 🟡 M inferred · …" (each level with its emoji). No load-bearing claims → no footer.`,
};

module.exports = { base, PLUGIN, RULES, loadBase, flagFile };
