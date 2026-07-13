# Flarepoint Plugin Plaza

Small, single-purpose Claude Code plugins. Each one fixes *one* thing the model
does that gets in your way, cleanly, at the **edges** of a task, never
mid-reason. Install only the ones you want.

| Plugin | What it does | Control |
|---|---|---|
| **[fp-barbeque](./plugins/fp-barbeque)** | Grills you toward mutual understanding *before* it writes code on fuzzy-scope tasks | `/fp-barbeque:mode` |
| **[fp-honesty](./plugins/fp-honesty)** | Tags each claim with how grounded it is: 🟢 verified · 🟡 inferred · 🟠 recalled · 🔴 guess | `/fp-honesty:mode` |
| **[fp-sicem](./plugins/fp-sicem)** | Rewrites the em-dash (and its hard-to-read cousins) into punctuation anyone can read at speed | `/fp-sicem:mode` |
| **[fp-minify](./plugins/fp-minify)** | Trims comments that just restate the code; keeps the ones that earn their place | `/fp-minify:mode` |



## Install

```text
/plugin marketplace add SlashyIsTaken/fp-pluginplaza
/plugin install fp-sicem@flarepoint
```

The only requirement is `node` on your PATH. If `node` is missing, the plugins
stay quiet instead of erroring.

## See it

**fp-barbeque** — one focused question at the task edge, instead of building the
wrong thing fast:

```text
you › add caching to the API layer

  without  →  starts wiring Redis across eight files.

  with     →  "Before I build: in-memory per-process, or shared across
              instances? And cache the HTTP responses or the DB queries?
              Those have different blast radii — which did you mean?"
```

**fp-honesty** — each claim carries its basis, with a tally to close:

```text
Config loads from ~/.config 🟢, falls back to env vars 🟡, and the request
timeout defaults to 30s 🔴.

basis: 🟢 verified 1 · 🟡 inferred 1 · 🔴 guess 1
```

**fp-sicem** — the em-dash and its cousins rewritten into marks you don't
re-parse, across ordinary sentences:

```diff
- The cache is warm on boot — so the first request is fast — and it refreshes
- every 60s; stale reads are effectively impossible.
+ The cache is warm on boot, so the first request is fast, and it refreshes
+ every 60s. Stale reads are effectively impossible.
```

**fp-minify** — a comment must earn its place: the essay collapses to the one
*why* that matters, and the comment that just narrates the code goes:

```diff
- // We loop over every pending job and try to process each one. If processing
- // throws, we catch it and push the job onto the retry list so it gets another
- // attempt on the next tick instead of being dropped.
+ // failed jobs go to retryList, reprocessed next tick, never dropped
  for (const job of queue) {
-   // increment the counter
    processed++;
    try { run(job); } catch { retryList.push(job); }
  }
```

## The plugins

### fp-barbeque — get grilled toward mutual understanding before code is written

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
  
### fp-honesty — see how much of an answer is grounded vs. guessed

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

### fp-sicem — prose that reads clearly for everyone, em-dash first on the block

The model writes excellent English, and that is exactly the problem. The em-dash,
used well, is a great mark, but it is one that many capable readers (especially
non-native English speakers) have to slow down and re-parse.
[fp-sicem](./plugins/fp-sicem) ("sic 'em-dash") sets a prior so the prose the
model writes connects its sentences in ways almost anyone can read at speed. It
does this without lowering the level of the English. The target is clearer and
cleaner, but never simpler.

- **The em-dash is the flagship, not the whole job.** The model
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

### fp-minify — comments that earn their place, kept short

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

## The idea behind the plaza

Every plugin here is **behavioural** and intervenes only at the *edges* of a task,
before it or after it, never mid-reasoning. They come in two families:

- **Behavioral.** Surface and persist the AI's state, changing nothing about
  what it decides (`fp-honesty`).
- **Influential.** Shape *how* the model approaches a task, but only by setting
  a prior at the task edge that you've consented to (`fp-barbeque`, `fp-minify`,
  `fp-sicem`).

The invariant the whole plaza keeps: **never steer the model mid-reason.**

The whole plaza installs as one Claude Code marketplace. Every plugin carries the
`fp-` prefix (for **F**lare**p**oint) and lives in its own directory under
[`plugins/`](./plugins). They all share one substrate
([`shared/fpbase`](./shared/fpbase)), so they look and behave the same way and
reuse the same tested code.

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
</content>
</invoke>
