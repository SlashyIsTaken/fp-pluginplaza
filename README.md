# Flarepoint Plugin Plaza

The **fp** marketplace, hosted at
[`SlashyIsTaken/fp-pluginplaza`](https://github.com/SlashyIsTaken/fp-pluginplaza).

A plaza of small, **behavioural** Claude Code plugins: tools that make the AI's
epistemic state explicit and persistent, without ever steering what it decides.

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

<details open>
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

<details>
<summary><b>fp-bump</b>: size the version bump to the change, applied when you release</summary>

[fp-bump](./plugins/fp-bump) keeps a project's version in step with the size of
its changes. It separates two things most tools combine: sizing a change, which
happens as you commit, and bumping the version, which happens once, when you
release.

- **Sizes each commit.** When you commit, fp-bump asks the model to read the
  staged diff and rate it patch, minor, or major. This only records the rating;
  it does not change the version yet.
- **Keeps a running level.** Ratings add up and the largest one wins, so ten
  small commits still come to a single pending bump, not ten of them.
- **Bumps once, at release.** When you run `/fp-bump:release` (or say "cut a
  release"), the pending level becomes one version change and the ledger resets.
- **Finds the version anywhere:** `package.json`, `pyproject.toml`, `Cargo.toml`,
  `VERSION`, or `version.txt`.
- **Modes:** `suggest` (propose and confirm, the default), `auto` (apply
  directly), `off`. Control with `/fp-bump:mode`. It works on commits made
  through Claude Code.

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
