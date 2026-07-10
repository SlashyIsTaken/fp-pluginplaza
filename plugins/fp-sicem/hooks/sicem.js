'use strict';

// Shared setup for every fp-sicem hook: load the (symlinked or dev) base,
// declare the mode levels once, and hold the prior the inject hook pushes at the
// start of each turn while on. The authoritative, expanded version lives in
// skills/fp-sicem/SKILL.md; this is the terse injected copy.
//
// fp-sicem is an *influential* plugin, like fp-barbeque and fp-minify: its prior
// shapes what the model writes (readable prose, em-dash first on the block)
// rather than only annotating. Its whole footprint is a single inject at the
// task edge, never a mid-solve interjection, and it only ever touches prose
// artifacts the model authors — never chat replies, code, or code comments
// (comments are fp-minify's turf).

function loadBase() {
  try {
    return require('./_fpbase'); // production: the symlinked base
  } catch {
    return require('@flarepoint/base'); // dev/test fallback
  }
}

const base = loadBase();
const PLUGIN = 'sicem';

base.mode.define(PLUGIN, { levels: ['on'], default: 'on' });

const RULES = {
  on: `sic 'em-dash (fp-sicem) is on. Active this turn while you write or edit PROSE ARTIFACTS: documents you author or revise, such as READMEs, docs, markdown, and prose bodies like PR or commit descriptions. It does NOT touch your chat replies to the user, your code, or your code comments (comments are fp-minify's job).
Goal: prose that reads clearly for every English reader, non-native ones included, without lowering the vocabulary or dumbing anything down. Clearer and cleaner, not simpler.
HARD target, near-total. Default the em-dash out of existence. Rewrite almost every em-dash into the connector that actually fits: a period for two full thoughts, a comma for a light aside, parentheses for a true aside, a colon only for a real list or definition, or a plain "so", "but", or "and" for the logical link. Reserve the em-dash for the rare case where nothing else carries the meaning. Give the same treatment to its cousins that trip non-native readers: the semicolon, the colon used for drama, and the long dash-parenthetical.
SOFT nudge. Where it reads naturally, prefer shorter sentences and fewer nested clauses. This is a nudge, not a mandate. Never restructure an argument or flatten nuance to reach it.
This shapes prose style only. It never changes the meaning, the facts, or the vocabulary level, and it never touches code or your conversation with the user.`,
};

module.exports = { base, PLUGIN, RULES, loadBase };
