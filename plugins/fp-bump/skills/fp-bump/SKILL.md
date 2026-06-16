---
name: fp-bump
description: >
  Sizes a SemVer version bump to the magnitude of the changes being committed.
  When a git commit is gated by fp-bump (the precommit hook denies it because the
  version is unchanged since HEAD), assess the staged diff, pick major/minor/patch,
  and — in suggest mode propose-and-confirm, in auto mode apply directly — set the
  version, stage it, and re-run the commit. Use whenever a commit is blocked with
  an "fp-bump:" reason, or when the user says "bump the version", "what version
  should this be", "cut a release". Modes: off, suggest (default), auto. Switch by
  typing "/fp-bump:mode suggest|auto|off".
license: MIT
---

# fp-bump

fp-bump keeps a project's version in step with the size of its changes. It does
not version on its own schedule — it acts **at commit time**, so the bump rides
in the same commit as the work it describes.

## When it fires

A `PreToolUse` hook watches for `git commit`. If there are staged changes but the
detected version file is unchanged since `HEAD`, the hook **denies** the commit
and returns an `fp-bump:` instruction. That denial is your cue to act — the
commit will not go through until the version question is settled (or the mode is
`off`).

The hook only judges *whether* a bump is needed. **You judge the magnitude.**

## Sizing the bump (SemVer)

Read the staged diff (`git diff --cached`) and choose the smallest level that
honestly fits:

- **major** — a breaking change: removed/renamed public API, changed function
  signatures or CLI flags, altered output contracts, migrations users must do.
- **minor** — backward-compatible new capability: a new feature, command, export,
  or option.
- **patch** — a fix or internal-only change: bug fixes, refactors, docs, tests,
  formatting, dependency bumps with no API impact.

When the change set spans levels, the **highest** level present wins. Use commit
messages as hints (a `feat:`/`fix:`/`BREAKING CHANGE` convention, if present), but
the diff is the source of truth.

## What to do on a denial

1. Determine the current version from the version file (`package.json`,
   `pyproject.toml`, `Cargo.toml`, `VERSION`, or `version.txt`).
2. Size the bump from the staged diff as above.
3. **suggest mode (default):** propose it in one line — e.g. *"fp-bump: minor →
   1.4.0 (new `--watch` flag). Apply?"* — and wait for the user's OK. Do not edit
   the file until they confirm.
   **auto mode:** apply it directly, no prompt.
4. Edit the `version` field in the version file, `git add` it, then re-run the
   original `git commit`. With the version now changed since `HEAD`, the hook
   allows it through.

## Boundaries

- **Never bump silently in suggest mode.** Same non-interference spirit as
  fp-honesty: surface and confirm; don't act unasked.
- Only active where a version file exists, and only for commits made **through
  Claude Code** — a `git commit` run in a plain terminal bypasses the hook
  entirely. For those, the user can bump manually or ask you to.
- `/fp-bump:mode off` disables gating completely.
