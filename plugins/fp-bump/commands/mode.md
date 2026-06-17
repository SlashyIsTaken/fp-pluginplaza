---
description: fp-bump control — show mode and pending release, or switch mode (status/suggest/auto/off/help)
argument-hint: [status|suggest|auto|off|help]
allowed-tools: Bash(node:*)
---

The line below is the deterministic result of the fp-bump control CLI (the mode,
if changed, is **already applied** — this ran before you were invoked). Relay it
to the user in one short line. Do not run any other command.

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" $ARGUMENTS`
