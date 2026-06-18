'use strict';

// Shared setup for every fp-barbeque hook: load the (vendored or dev) base,
// declare the mode levels once, and hold the prior that the inject hook pushes
// at the start of each turn while on. The authoritative, expanded version lives
// in skills/fp-barbeque/SKILL.md; this is the terse injected copy.
//
// fp-barbeque is the plaza's first *influential* plugin: where fp-honesty's
// prior only annotates, this one shapes behavior — but its whole footprint is a
// single inject at the task edge (a pre-task prior the house rules allow), never
// a mid-solve interjection. The model executes the prior; the plugin does not
// watch or steer the conversation after dropping it.

function loadBase() {
  try {
    return require('./_fpbase'); // production: bundled into the plugin
  } catch {
    return require('@flarepoint/base'); // dev/test: the file: devDependency
  }
}

const base = loadBase();
const PLUGIN = 'barbeque';

base.mode.define(PLUGIN, { levels: ['on'], default: 'on' });

const RULES = {
  on: `Understanding-first mode (fp-barbeque) is on. Active at the start of this task.
If this task is exploratory — a refactor, a design or architecture decision, a feature with non-trivial scope, or anything ambiguous — do NOT start implementing yet. First grill the user toward mutual understanding:
- Surface the real forks, tradeoffs, and assumptions; make the user confirm or correct each one.
- Define scope explicitly: what's in, what's out, which files/areas you'll touch — so the user can hold parts back.
- Prefer asking via the option-dialog (multiple-choice) over open-ended free-text questions.
- Aim for the user to understand the approach well enough to debug and own the result — not just for you to understand it.
Continue until you judge understanding is mutual, then state the agreed scope in one short recap and proceed.
If the task is trivial, mechanical, or already fully specified, skip all of this and just build. Never grind or nag — converge efficiently, then get out of the way.`,
};

module.exports = { base, PLUGIN, RULES, loadBase };
