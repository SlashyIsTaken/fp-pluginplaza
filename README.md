# Flarepoint

A hub of small, **behavioural** Claude Code plugins: tools that make the AI's
epistemic state explicit and persistent, without ever steering what it decides.

The whole hub installs as one Claude Code marketplace. Each plugin is a directory
under [`plugins/`](./plugins); they all share one substrate
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

| Plugin | What it does |
|---|---|
| [**fp-honesty**](./plugins/fp-honesty) | Tags load-bearing claims with their basis — verified / inferred / recalled / guess — and ends each response with a one-line tally. Pure annotation to give the user an idea of how many claims are actually grounded, because AI will always represent its findings with a confident tone. It never changes what the model does. |
| [**fp-bump**](./plugins/fp-bump) | Sizes a SemVer version bump to the magnitude of your changes at commit time — the model judges major / minor / patch, you confirm. Suggests by default; never bumps silently unless you set `auto`. Control with `/fp-bump:mode`. |

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
