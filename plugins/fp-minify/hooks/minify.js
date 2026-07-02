'use strict';

// Shared setup for every fp-minify hook: load the (symlinked or dev) base,
// declare the mode levels once, and hold the prior the inject hook pushes at the
// start of each turn while active. The authoritative, expanded version lives in
// skills/fp-minify/SKILL.md; this is the terse injected copy.
//
// fp-minify is an *influential* plugin, like fp-barbeque: its prior shapes what
// the model writes (comment concision) rather than only annotating. But its whole
// footprint is a single inject at the task edge — never a mid-solve interjection,
// and it only ever touches comments, never the code's behavior.

function loadBase() {
  try {
    return require('./_fpbase'); // production: the symlinked base
  } catch {
    return require('@flarepoint/base'); // dev/test fallback
  }
}

const base = loadBase();
const PLUGIN = 'minify';

// off is added automatically. "on" is not a level — the inject/cli map it to the
// default (tidy), the same way fp-honesty maps "on" to "full".
base.mode.define(PLUGIN, { levels: ['new', 'tidy'], default: 'tidy' });

const DOCTRINE = `A comment earns its place only by carrying what the code cannot:
- Why, not what — the reason for something non-obvious or deliberately odd, so a later reader won't "fix" it back.
- Meaning a name can't hold — config values, magic numbers, units, ranges, invariants, constraints.
Write earned comments self-contained and short (1–2 lines). Keep the why in the comment; send deep backstory (investigations, ticket narratives) to the commit message, not the code.
Cut or compress anything that restates what the code plainly does, narrates the happy path, or tells a story that belongs in a commit, PR, or ticket.
Exempt: API doc comments — JSDoc/TSDoc, docstrings, godoc — are contracts for callers; keep them. But a doc-position block that is really inline narration still gets trimmed.`;

const CLOSER = `This shapes comments only: it never changes what the code does, and never drops a comment that carries real information. Unsure a comment is earned? Make it short rather than delete it.`;

const RULES = {
  tidy: `fp-minify (tidy) — keep code comments concise. Active while you write or edit code.
${DOCTRINE}
Also tidy comments already inside any block you edit — tighten the over-long, drop the redundant — but never touch comments in code you are not otherwise changing.
${CLOSER}`,

  new: `fp-minify (new) — keep code comments concise. Active while you write code.
${DOCTRINE}
Govern only the comments you write fresh; leave existing comments as they are.
${CLOSER}`,
};

module.exports = { base, PLUGIN, RULES, loadBase };
