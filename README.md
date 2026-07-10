# Flarepoint Plugin Plaza

The **fp** marketplace, hosted at
[`SlashyIsTaken/fp-pluginplaza`](https://github.com/SlashyIsTaken/fp-pluginplaza).

A plaza of small, **behavioural** Claude Code plugins. They come in two families,
and both intervene only at the *edges* of a task, before it or after it, never
mid-reasoning:

- **Behavioral.** Surface and persist the AI's state, changing nothing about
  what it decides (`fp-honesty`).
- **Influential.** Shape *how* the model approaches a task, but only by setting
  a prior at the task edge that you've consented to (`fp-barbeque`).

The invariant the whole plaza keeps: **never steer the model mid-reason.**

The whole plaza installs as one Claude Code marketplace. Every plugin carries the
`fp-` prefix (for **F**lare**p**oint) and lives in its own directory under
[`plugins/`](./plugins). They all share one substrate
([`shared/fpbase`](./shared/fpbase)), so they look and behave the same way and
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

Used to its fullest, AI writes code faster than you can absorb it, and code you
can't reason about, debug, or defend is close to useless.
[fp-barbeque](./plugins/fp-barbeque) keeps you in the loop on the tasks where
that matters. On exploratory work it has the model grill you toward mutual
understanding *before* it builds, so the scope is yours to check or hold back and
the result is yours to own.

- **Fires on exploratory tasks.** Refactors, design and architecture decisions,
  features with fuzzy scope, anything ambiguous. The model decides whether a task
  qualifies. Trivial, mechanical, or already-specified work is built straight away.
- **Grills toward *your* understanding.** It surfaces the real forks and
  tradeoffs, states the scope explicitly, and prefers the option-dialog over
  open-ended questions. The aim is for you to understand the approach well enough
  to debug and own it, not just for the model to feel confident.
- **The model judges convergence.** When understanding is mutual it recaps the
  agreed scope in one line and proceeds. The recap is the handshake. Push back on
  it and it keeps grilling.
- **An edge prior, not a gate.** Its whole footprint is one prior set at the
  start of a task. It never blocks a tool, never interjects mid-solve, never
  watches the conversation after.
- **Modes:** `on` (grill first, the default, since installing it is the opt-in),
  `off` (build straight away). Control with `/fp-barbeque:mode`.

</details>

<details>
<summary><b>fp-minify</b>: comments that earn their place, kept short</summary>

Model-written code is often excellent but over-commented, with inline essays that
restate what the code plainly does, or paragraph backstories that belong in a
commit message. [fp-minify](./plugins/fp-minify) sets a prior so comments **earn
their place**, and only ever touches comments, never what the code does.

- **A comment must carry what the code can't.** A non-obvious *why* (so a reader
  won't "fix" it back), or meaning a name can't hold (config values, magic
  numbers, units, invariants, constraints). Earned comments stay self-contained
  and short. Deep backstory goes to the commit message, not the code.
- **Docstrings are exempt.** JSDoc/TSDoc, Python docstrings, and godoc are caller
  contracts and stay, but a doc-*position* essay that's really inline narration
  still gets trimmed.
- **Modes:** `tidy` (the default, which shapes new comments *and* tidies comments
  inside a block being edited, never a drive-by rewrite elsewhere), `new` (only
  newly-written comments, leaving existing ones alone), `off`. Control with
  `/fp-minify:mode`.
- **Bulk cleanup on demand.** `/fp-minify:strip [target]` runs a deliberate pass
  over a file, dir, or the current focus, and shows what it'll remove before
  deleting a lot at once.

</details>

<details>
<summary><b>fp-sicem</b>: prose that reads clearly for everyone, em-dash first on the block</summary>

The model writes excellent English, and that is exactly the problem. The em-dash,
used well, is a great mark, but it is one that many capable readers (especially
non-native English speakers) have to slow down and re-parse.
[fp-sicem](./plugins/fp-sicem) ("sic 'em-dash") sets a prior so the prose the
model writes connects its sentences in ways almost anyone can read at speed. It
does this without lowering the level of the English. The target is clearer and
cleaner, never simpler.

- **The em-dash is the flagship, not the whole job.** Near-total: the model
  defaults the em-dash out of existence and rewrites it into the connector that
  actually fits, a period, a comma, parentheses, a colon for a real list, or a
  plain "so", "but", or "and". Its cousins that trip the same readers get the same
  treatment: the semicolon, the colon used for drama, and the long
  dash-parenthetical.
- **Clearer, not dumbed down.** It never swaps a precise word for a simpler one.
  It changes how sentences connect, not how smart they are. A soft nudge toward
  shorter, less-nested sentences rides behind the punctuation rule, but never at
  the cost of real nuance.
- **Prose artifacts only.** It governs the prose the model authors or revises
  (READMEs, docs, markdown, PR and commit bodies) and leaves three things alone:
  its chat replies to you, its code, and its code comments (those belong to
  fp-minify).
- **Modes:** `on` (the default, so installing it is the opt-in), `off` (write
  prose as usual). Control with `/fp-sicem:mode`.

</details>

## How it's built

```
fp-pluginplaza/
├── .claude-plugin/marketplace.json   the hub manifest (lists every plugin)
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

No install step is required to run the tests. Everything uses Node built-ins.

## License

MIT
