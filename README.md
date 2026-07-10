# Flarepoint Plugin Plaza

The **fp** marketplace, hosted at
[`SlashyIsTaken/fp-pluginplaza`](https://github.com/SlashyIsTaken/fp-pluginplaza).

A plaza of small, **behavioural** Claude Code plugins. They come in two families,
and both intervene only at the *edges* of a task — before it or after it, never
mid-reasoning:

- **Behavioral** — surface and persist the AI's state, changing nothing about
  what it decides (`fp-honesty`).
- **Influential** — shape *how* the model approaches a task, but only by setting
  a prior at the task edge that you've consented to (`fp-barbeque`).

The invariant the whole plaza keeps: **never steer the model mid-reason.**

The whole plaza installs as one Claude Code marketplace. Every plugin carries the
`fp-` prefix (for **F**lare**p**oint) and lives in its own directory under
[`plugins/`](./plugins); they all share one substrate
([`shared/fpbase`](./shared/fpbase)) so they look and behave the same way and
reuse the same tested code.

## Install

```text
/plugin marketplace add SlashyIsTaken/fp-pluginplaza
/plugin install fp-honesty@flarepoint
```

The only requirement is `node` on your PATH. If `node` is missing, the plugins
stay quiet instead of erroring.

## Plugins

### Behavioral: Surface, never steer

<details>
<summary><b>fp-honesty</b>: see how much of an answer is grounded vs. guessed</summary>

Models state guesses and facts in the same confident tone.
[fp-honesty](./plugins/fp-honesty) tags every load-bearing claim with its basis,
so you can tell at a glance how much of an answer is actually grounded.

- **Four levels:** 🟢 verified · 🟡 inferred · 🟠 recalled · 🔴 guess. Each tag
  sits inline next to the claim it applies to, and the response ends with a
  one-line `basis:` tally.
- **A backstop hook** checks each `verified` tag against the tools the model
  actually used that turn, so the grade can't be inflated.
- **Pure annotation.** It reports how grounded a claim is and changes nothing
  else. It never adds caveats, hedging, or extra caution because of a tag.
- **Modes:** `full` (inline tags and a tally), `footer` (tally only), `off`.
  Control with `/fp-honesty:mode`.

</details>

### Influential: Shape how a task is approached, at its edge

<details>
<summary><b>fp-barbeque</b>: get grilled toward mutual understanding before code is written</summary>

Used to its fullest, AI writes code faster than you can absorb it — and code you
can't reason about, debug, or defend is close to useless.
[fp-barbeque](./plugins/fp-barbeque) keeps you in the loop on the tasks where
that matters: on exploratory work it has the model grill you toward mutual
understanding *before* it builds, so the scope is yours to check or hold back and
the result is yours to own.

- **Fires on exploratory tasks.** Refactors, design and architecture decisions,
  features with fuzzy scope, anything ambiguous. The model decides whether a task
  qualifies; trivial, mechanical, or already-specified work is built straight away.
- **Grills toward *your* understanding.** It surfaces the real forks and
  tradeoffs, states the scope explicitly, and prefers the option-dialog over
  open-ended questions — aiming for you to understand the approach well enough to
  debug and own it, not just for the model to feel confident.
- **The model judges convergence.** When understanding is mutual it recaps the
  agreed scope in one line and proceeds. The recap is the handshake; push back on
  it and it keeps grilling.
- **An edge prior, not a gate.** Its whole footprint is one prior set at the
  start of a task. It never blocks a tool, never interjects mid-solve, never
  watches the conversation after.
- **Modes:** `on` (grill first, the default — installing it is the opt-in),
  `off` (build straight away). Control with `/fp-barbeque:mode`.

</details>

<details>
<summary><b>fp-minify</b>: comments that earn their place, kept short</summary>

Model-written code is often excellent but over-commented — inline essays that
restate what the code plainly does, or paragraph backstories that belong in a
commit message. [fp-minify](./plugins/fp-minify) sets a prior so comments **earn
their place**, and only ever touches comments — never what the code does.

- **A comment must carry what the code can't.** A non-obvious *why* (so a reader
  won't "fix" it back), or meaning a name can't hold (config values, magic
  numbers, units, invariants, constraints). Earned comments stay self-contained
  and short; deep backstory goes to the commit message, not the code.
- **Docstrings are exempt.** JSDoc/TSDoc, Python docstrings, and godoc are caller
  contracts and stay — but a doc-*position* essay that's really inline narration
  still gets trimmed.
- **Modes:** `tidy` (the default — shape new comments *and* tidy comments inside a
  block being edited, never a drive-by rewrite elsewhere), `new` (only
  newly-written comments; leave existing ones alone), `off`. Control with
  `/fp-minify:mode`.
- **Bulk cleanup on demand.** `/fp-minify:strip [target]` runs a deliberate pass
  over a file, dir, or the current focus — showing what it'll remove before
  deleting a lot at once.

</details>

## How it's built

```
fp-pluginplaza/
├── .claude-plugin/marketplace.json   the hub manifest — lists every plugin
├── shared/fpbase/                    the substrate (ONE canonical copy)
│   ├── src/   provenance · state · mode · audit · queue · inject · statusline
│   └── test/  31 tests, no dependencies
└── plugins/
    └── fp-honesty/
        ├── .claude-plugin/plugin.json
        ├── hooks/
        │   ├── _fpbase  →  symlink to ../../../shared/fpbase/src
        │   └── inject.js · audit.js · honesty.js · ...
        ├── skills/fp-honesty/SKILL.md
        └── commands/mode.md
```

**Base sharing is a symlink, not a build step.** Each plugin symlinks
`shared/fpbase/src` into its own `hooks/_fpbase`. When Claude Code installs a
plugin from this repo it dereferences that symlink and copies the base content
into the plugin's cache, so an installed plugin is fully self-contained. There
is no build, no vendoring, and no chance of a stale copy. The filesystem is the
single source of truth.

## Adding a plugin

A new plugin is mostly behaviour, not plumbing:

1. `plugins/<name>/` with a `.claude-plugin/plugin.json`, a `skills/<name>/SKILL.md`,
   and whatever `hooks/` it needs.
2. `ln -s ../../../shared/fpbase/src plugins/<name>/hooks/_fpbase` if it uses the base.
3. Add an entry to `.claude-plugin/marketplace.json`.

## Develop & test

```bash
npm test    # runs the base suite + every plugin's suite, via node --test
```

No install step is required to run the tests — everything uses Node built-ins.

## License

MIT
