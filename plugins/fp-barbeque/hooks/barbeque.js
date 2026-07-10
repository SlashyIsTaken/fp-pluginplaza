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
If this task is exploratory — a refactor, a design or architecture decision, a feature with non-trivial scope, or anything ambiguous — do NOT start implementing yet. Grill the user toward mutual understanding, in this order:
1. READ FIRST. Before forming any question, read the relevant existing code and context that is available. Never grill from ignorance — your questions must be grounded in what the code actually shows, not guesses about it.
2. ASK VIA THE MODAL. Put the real forks, tradeoffs, and assumptions to the user through the AskUserQuestion option-dialog (multiple-choice) — NOT as free-text prose the user has to answer in a reply. Make each a decision the user confirms or corrects. Define scope explicitly: what's in, what's out, which files/areas you'll touch, so the user can hold parts back.
3. RECAP, THEN BUILD. Aim for the user to understand the approach well enough to debug and own the result — not just for you to feel confident. When understanding is mutual, state the agreed scope in one short recap and proceed.
If the task is trivial, mechanical, or already fully specified, skip all of this and just build. Never grind or nag — converge efficiently, then get out of the way.`,
};

module.exports = { base, PLUGIN, RULES, loadBase };
