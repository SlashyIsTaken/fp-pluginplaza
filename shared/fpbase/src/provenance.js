'use strict';

// The shared epistemic-status primitive. Used two ways:
//   1. fp-honesty tags load-bearing claims and renders a per-response footer.
//   2. fp-memory stamps every stored fact with the level it was learned at.
//
// Ordered strongest -> weakest. "verified" is the only level that asserts the
// claim was grounded in an action taken *this session* (see audit.js); every
// other level is, by definition, not checked.

const LEVELS = ['verified', 'inferred', 'recalled', 'guess'];
const DEFAULT = 'inferred';

const LABELS = {
  verified: 'verified',
  inferred: 'inferred',
  recalled: 'recalled',
  guess: 'guess',
};

function normalize(level) {
  const l = String(level || '').toLowerCase().trim();
  return LEVELS.includes(l) ? l : DEFAULT;
}

// 0 = strongest. Lower rank is a stronger claim.
function rank(level) {
  const i = LEVELS.indexOf(normalize(level));
  return i === -1 ? LEVELS.indexOf(DEFAULT) : i;
}

// Never let a claim sit above its provable ceiling. audit.js calls this to pull
// an over-confident "verified" down to whatever the evidence actually supports.
function cap(level, ceiling) {
  return rank(level) < rank(ceiling) ? normalize(ceiling) : normalize(level);
}

// Inline tag for a single load-bearing claim, e.g. "[verified]".
function render(level) {
  return `[${normalize(level)}]`;
}

// Per-response footer tally, e.g. "basis: 3 verified, 1 inferred".
// Returns '' for an empty list so honesty can stay fully silent when there were
// no load-bearing claims.
function tally(levels) {
  const counts = new Map();
  for (const raw of levels || []) {
    const l = normalize(raw);
    counts.set(l, (counts.get(l) || 0) + 1);
  }
  if (counts.size === 0) return '';
  const parts = LEVELS
    .filter((l) => counts.has(l))
    .map((l) => `${counts.get(l)} ${LABELS[l]}`);
  return `basis: ${parts.join(', ')}`;
}

module.exports = { LEVELS, DEFAULT, normalize, rank, cap, render, tally };
