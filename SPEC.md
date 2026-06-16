# Flarepoint plugin base — design spec

Canonical reference for `fp-base` and the three plugins built on it
(`fp-honesty`, `fp-memory`, `fp-profile`). All three repos point at this file.

Status: **design agreed, not yet built.** Build order: `fp-base` → `fp-honesty`
(smallest, proves the substrate end-to-end) → `fp-memory` → `fp-profile`.

---

## 1. Why these three exist

They are not three unrelated tools. They collapse onto one primitive: **make the
AI's epistemic state explicit and persistent.**

- **fp-honesty** — the *sensor*: the status of a claim right now (verified / inferred / recalled / guess).
- **fp-memory** — the *store*: what's been learned, each fact stamped with that same provenance scale.
- **fp-profile** — the *prior*: coarse, per-project defaults the other two refine.

Shared design principle (the lesson from ponytail): **constrain the artifact or
the workflow, never the model's reasoning.** Intervene at the edges of a task —
before (lock intent / set prior) and after (annotate, capture, verify) — not
during the solve.

---

## 2. Locked decisions

| Axis | Decision |
|---|---|
| Code sharing | Base is its own repo/package; **bundled into each plugin at build** → shipped plugins have zero runtime deps (just `node` on PATH). Git-tag dependency, not npm-publish, to start. |
| Hosts | **Claude Code + Codex.** One hook runtime; host manifests generated from a single source. |
| State scope | **Global + project, project overrides global.** `~/.config/flarepoint/` + in-repo dir. |
| State privacy | Per-project `sharing: personal \| committed`. **Default personal (gitignored);** one setting flips to a committed team file. |
| Activation | **Honesty + memory ambient-on; profiles opt-in.** |
| Statusline | Base owns **one combined renderer**, off by default, enabled with a command. |
| Confirm flow | **Inline suggestion next turn,** confidence-gated — only strong signals (explicit "no/actually", clear revert) become a candidate. |
| Provenance | **Four levels: verified / inferred / recalled / guess.** Shared by honesty output and stamped on every memory fact. |
| Honesty format | **Footer tally + inline tag only on load-bearing claims.** |
| Commands | **Per-plugin `/fp-<name>` + shared `/fp` umbrella** (status/on/off/help). |

---

## 3. Base repo (`fp-base`)

```
fp-base/
  src/
    config.js       # resolve env → project → global; precedence + mode storage
    state.js        # frontmattered-md fact store, index, atomic writes, scope+sharing tags
    mode.js         # generic on/off/level tracker (specialized per plugin)
    provenance.js   # the 4-level tag: parse, validate, stamp, render
    audit.js        # read session tool log → confirm a "verified" claim against a real action
    queue.js        # candidate queue; confidence gate; emits the inline "confirm?" line
    inject.js       # build the UserPromptSubmit context string at current mode
    statusline.js   # one combined renderer across active fp plugins
    host/
      claude.js     # .claude-plugin manifest + hooks.json emit
      codex.js      # .codex-plugin manifest + Codex hook emit   ⚠ verify injection hook
  build/
    bundle.js       # inline fp-base into a plugin's runnable layout; emit both host manifests
    check-sync.js   # CI guard: vendored copy in a plugin matches the pinned fp-base version
  test/             # shared harness
  package.json      # name: @flarepoint/base
```

---

## 4. How each plugin specializes the base

- **fp-honesty** — `provenance` + `audit` + `inject`. SKILL.md: tag load-bearing
  claims, emit a footer tally, **never act on the tag** (strict non-interference).
  Default-on. `audit.js` downgrades a "verified" claim with no matching tool action.
- **fp-memory** — `state` + `queue` + `audit` + `inject`. Stop-hook classifier →
  strong-signal candidates → inline confirm next turn → write fact (stamped with
  provenance + scope + sharing). Selective, task-relevant recall via `inject`.
  Default-on. `/fp-memory review|list`.
- **fp-profile** — `mode` + `config` + `inject`. Archetypes as mode presets;
  per-axis override; binds per-project; suggests on first encounter
  (confidence-gated). Opt-in. `/fp-profile set|show`.

---

## 5. Shared conventions

- **Fact schema** (frontmatter): `name, type, scope (global|project),
  sharing (personal|committed), provenance, last-confirmed, hits`. An index file
  lists one line each.
- **Config resolution:** explicit instruction > project config > global config > plugin default.
- **Cross-plugin precedence:** user instruction > memory > profile > plugin default.
- **Statusline:** `fp · honesty:on · mem:5 · prod` style; only active plugins shown.
- **Recall economy:** memory injects only task-relevant facts, never the whole
  store (avoids the always-on tax).
- **Commands:** `/fp-honesty`, `/fp-memory`, `/fp-profile` for plugin actions;
  `/fp` (status/on/off/help) as the cross-plugin control surface.

---

## 6. Build & merge workflow

The base is the **single source of truth**. A plugin never hand-copies base code;
its build step vendors the base into a runnable, committed layout so that an
installed plugin needs nothing but `node` on PATH.

### Repo relationship

```
fp-base  ──(git-tag devDependency)──►  fp-honesty
                                       fp-memory
                                       fp-profile

build step: fp-base/build/bundle.js  inlines base →  fp-<name>/hooks/_fpbase/  (committed)
```

`@flarepoint/base` is a **devDependency** only — it disappears from the shipped
artifact because `bundle.js` inlines what it needs into `hooks/_fpbase/`.

### Day-to-day dev loop (editing a plugin, base stable)

```bash
git clone https://github.com/flarepoint/fp-honesty && cd fp-honesty
npm install                 # dev tooling only (bundler, test, lint)
npm run build               # re-vendor pinned fp-base → hooks/_fpbase/
npm test
# try it live:
/plugin marketplace add ./fp-honesty     # in Claude Code, points at the repo
```

### Cross-cutting dev loop (changing base + a plugin together)

```bash
git clone https://github.com/flarepoint/fp-base && cd fp-base && npm link
cd ../fp-honesty && npm link @flarepoint/base   # live edits to base flow through
npm run build && npm test
```

### Release loop

```bash
# 1. cut a base version
cd fp-base && git tag v0.2.0 && git push --tags

# 2. adopt it in a plugin, re-vendor, commit the runnable output
cd ../fp-honesty
npm install @flarepoint/base@v0.2.0
npm run build               # updates hooks/_fpbase/
npm test && node hooks/_fpbase/check-sync.js   # CI guard: vendored == pinned
git add hooks/_fpbase hooks package.json && git commit -m "base v0.2.0"
git tag v0.1.1 && git push --tags
```

Installers always get a fully runnable plugin from the repo — **no build, no
`npm install`, no registry**. `check-sync.js` runs in CI so a stale vendored copy
can never ship.

---

## 7. Impact on people building this themselves

Three audiences, three very different experiences:

**A. Just want to use a plugin** — *zero impact.* Install via the marketplace
(`/plugin marketplace add …`). The only requirement is `node` on PATH, exactly
like ponytail. No build, no dependencies, no base awareness. If `node` is missing,
the always-on injection just stays quiet instead of erroring.

**B. Want to fork/contribute to one plugin** — *small, standard impact.* Clone the
plugin repo, `npm install` (dev tooling only), edit, `npm run build` to re-vendor
the base, `npm test`. They never need the base repo unless they want to change
base behavior. The vendored `hooks/_fpbase/` is readable in-tree, so even without
building they can see exactly what runs.

**C. Want to fork the whole stack or build a new fp-plugin on the base** —
*one extra concept: the base is a dependency, not copy-paste.* Clone `fp-base` +
their plugin, `npm link` for live editing, build. A new plugin is a thin
SKILL.md + a few glue hooks that import from `_fpbase/` + a `plugin.json`. The
base carries provenance/state/mode/queue/statusline so a new plugin is mostly
behavior, not plumbing.

Net: the bundle-at-build choice keeps end users on the simplest possible path
(ponytail-level: "just need node") while giving contributors real code reuse. The
only cost is that contributors touching the base run a build step and a sync check
— which CI enforces so nothing stale ever ships.

---

## 8. To verify during build (not blockers)

1. Codex's `UserPromptSubmit` equivalent — if it differs, the inline-suggestion
   flow gets a per-host shim in `host/codex.js`.
2. Codex statusline support — may degrade gracefully to "Claude-only" if absent.
3. Session tool-log accessibility for `audit.js` on both hosts.

---

## 9. Deferred (explicitly out of scope for v1)

- Full 13-agent portability (ponytail-style).
- npm registry publish of the base.
- Team-sync conflict resolution for committed memory.
- Auto-detecting a profile from repo signals (suggest-only for now).
</content>
</invoke>
