---
description: fp-minify strip — a deliberate pass that removes redundant comments from a target
argument-hint: [file, dir, or empty for the current focus]
---

This is the **task-based stripper**, not the always-on prior: a deliberate
cleanup pass you asked for. Apply the fp-minify doctrine to the target and remove
or compress comments that don't earn their place.

**Target:** $ARGUMENTS — if empty, the file or block currently in focus. If that's
unclear, ask which before touching anything.

**Rules** (the same the `/fp-minify` skill uses):

- **Keep** comments that carry a non-obvious *why*, or meaning a name can't hold
  (config values, magic numbers, units, ranges, invariants, constraints).
- **Keep** API doc comments — JSDoc/TSDoc, docstrings, godoc — they're caller
  contracts.
- **Cut or shorten** comments that restate what the code plainly does, narrate the
  happy path, or tell a story that belongs in a commit, PR, or ticket. Compress an
  earned-but-bloated comment to 1–2 self-contained lines.
- **Change comments only.** Never alter what the code does.

Before deleting a lot at once, show the user what you'll remove and let them hold
parts back. When unsure whether a comment is earned, shorten it rather than drop
it.
