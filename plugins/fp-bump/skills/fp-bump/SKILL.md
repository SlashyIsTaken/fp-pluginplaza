---
name: fp-bump
description: >
  Keeps a project's version in step with the size of its changes, using an
  unreleased ledger. At each commit you size that commit's staged diff
  (patch/minor/major) and record it; recording only raises a pending level and
  never changes the version. When you ask for a release, the highest pending
  level is applied as exactly one version bump. Use when a commit is blocked
  with an "fp-bump:" instruction to size it, when the user says "cut a release",
  "release this", "bump the version", or runs /fp-bump:release. Modes (govern the
  release, not the commit): off, suggest (default), auto. Switch with
  "/fp-bump:mode suggest|auto|off".
license: MIT
---

# fp-bump

fp-bump separates two things that version tooling usually jams together:

- **Sizing** a change is continuous — it happens as you commit.
- **Bumping** the version is discrete — it should happen once, at a release.

A single edit is not a release, so fp-bump never bumps the version per commit.
Instead it keeps an **unreleased ledger**: a pending level that climbs
`none -> patch -> minor -> major` as you commit, and is flushed into one version
bump when you release.

## The two moments

### 1. Assess (at each commit)

A `PreToolUse` hook watches for `git commit`. If this exact set of staged
changes has not been sized yet, the hook **denies the commit once** and asks you
to size it. This is your cue to:

1. Read the staged diff: `git diff --cached`.
2. Pick the smallest SemVer level that honestly fits (see below).
3. Record it: `node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" assess <level>`.
4. Re-run the same commit. With this commit now sized, the hook lets it through.

Recording **only raises the pending level** (highest wins). It does **not** edit
the version file. Commits keep flowing; the magnitude just accumulates. Once the
pending level reaches `major` it can't climb higher, so further commits are not
gated until the next release.

### 2. Flush (at release)

When the user asks to release — `/fp-bump:release`, or phrases like "cut a
release", "release this", "ship it", or tagging a release — apply the accumulated
level as one bump:

1. `node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" release` works out the single
   version change (e.g. pending `minor`: `1.3.0 -> 1.4.0`).
2. In **suggest** mode, propose it in one line and wait for the user's OK. In
   **auto** mode, apply it directly.
3. Set the `version` field in the version file to the new value and stage it.
4. Clear the ledger: `node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" reset`.

One release, one bump, no matter how many commits happened in between.

## Sizing the level (SemVer)

Choose the smallest level that honestly fits the staged diff:

- **major** — a breaking change: removed or renamed public API, changed function
  signatures or CLI flags, altered output contracts, migrations users must do.
- **minor** — a backward-compatible new capability: a new feature, command,
  export, or option.
- **patch** — a fix or internal-only change: bug fixes, refactors, docs, tests,
  formatting, dependency bumps with no API impact.

When a commit spans levels, the **highest** level present wins. Commit messages
are useful hints (`feat:` / `fix:` / `BREAKING CHANGE`, if the project uses
them), but the diff is the source of truth.

## What the version file can be

fp-bump finds the version in the first of these it sees: `package.json`,
`pyproject.toml`, `Cargo.toml`, `VERSION`, or `version.txt`.

## Boundaries

- **Sizing is required at commit; bumping is not.** The commit hook only asks you
  to size the change. The version never moves until a release.
- **Never bump silently in suggest mode.** Same non-interference spirit as
  fp-honesty: at release, surface and confirm; don't act unasked. `auto` mode is
  the opt-in to skip the prompt.
- Only active where a version file exists, and the commit hook only fires for
  commits made **through Claude Code** — a `git commit` run in a plain terminal
  bypasses it, so its changes aren't sized. The user can size those by hand or
  ask you to before releasing.
- `/fp-bump:mode off` disables the plugin completely.
