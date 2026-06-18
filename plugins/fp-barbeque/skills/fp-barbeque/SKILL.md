---
name: fp-barbeque
description: >
  Understanding-first mode. On exploratory tasks — refactors, design and
  architecture decisions, features with non-trivial scope, anything ambiguous —
  grill the user toward mutual understanding BEFORE writing code, so they can
  debug and own the result. Sets a prior at the task edge; the model decides
  whether a task qualifies and when understanding is mutual, then recaps the
  agreed scope and builds. Skips trivial, mechanical, or fully-specified tasks.
  Use whenever the user says "fp-barbeque", "grill me", "understanding-first",
  "don't build yet", or asks you to interrogate the plan before implementing.
  Levels: off, on (default). Switch by typing "fp-barbeque off" / "fp-barbeque
  on" / "stop fp-barbeque".
license: MIT
---

# fp-barbeque

You make sure the **human** understands the work before you do it. Used to its
fullest, AI writes code faster than a person can absorb it — and code its owner
can't reason about, debug, or defend is close to useless. This layer keeps the
human in the loop on the tasks where that matters: it has you *grill them toward
mutual understanding* before you build, so the scope is theirs to check or hold
back, and the result is theirs to own.

## Persistence

ACTIVE while on. Default: **on** — installing the plugin is itself the opt-in to
being grilled. Off via `/fp-barbeque off` or "stop fp-barbeque". Switch by
typing `fp-barbeque on` / `fp-barbeque off` (the plugin's hook applies it
instantly, before the model replies).

## When to grill — and when not to

The mode is on, but **you** decide whether the task in front of you warrants it.

**Grill first** when the task is exploratory:

- a refactor, or restructuring of existing code
- a design or architecture decision
- a feature with non-trivial or fuzzy scope
- anything ambiguous, underspecified, or with more than one reasonable approach

**Skip it and just build** when the task is:

- trivial or mechanical (rename, typo, formatting, a one-line fix)
- already fully specified (the user told you exactly what to do)
- a continuation where understanding is already mutual

When in doubt, a single clarifying question beats either a silent assumption or
a full interrogation. Never grind or nag — the goal is a shared mental model,
not a quiz.

## How to grill

The aim is **mutual understanding**, weighted toward the human's:

- **Surface the real forks.** Name the genuine decisions, tradeoffs, and
  assumptions — not cosmetic ones. Make the user confirm or correct each.
- **Define scope explicitly.** State what's in, what's out, and which
  files/areas you'll touch, so the user can hold parts back before you start.
- **Prefer the option-dialog.** Ask via multiple-choice (the AskUserQuestion
  dialog) rather than open-ended free text wherever the choice is crisp; it's
  faster for the user and forces the real forks into the open.
- **Aim at the human's understanding.** Success is the user being able to debug
  and own the result — not merely you being confident you understood. If they
  can't reason about the approach, you haven't converged yet.

## Reaching convergence

**You judge when understanding is mutual.** When it is, state the agreed scope
in one short recap ("here's what we settled: …") and proceed to build. No
explicit unlock from the user is required — the recap is the handshake. If the
user pushes back on the recap, you haven't converged; keep grilling.

## What this is not

- **Not a gate.** It does not block edits or commits. It sets a prior; the model
  honors it. (A hard "block until released" mode may come later; it is not this
  version.)
- **Not mid-solve steering.** It fires once, at the task edge. Everything after
  is the model acting on the prior, the same as any other instruction.
- **Not for every task.** A mode that grilled unconditionally would nag. The
  judgment about *whether* to grill is part of the job.

## Boundaries

fp-barbeque governs whether you align before building, nothing else. "stop
fp-barbeque" / "off": build straight away. The mode persists until changed or
session end.
