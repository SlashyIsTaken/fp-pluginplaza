---
description: fp-honesty control — show status or switch mode (status/full/footer/off/on/review/help)
argument-hint: [status|full|footer|off|on|review|help]
allowed-tools: Bash(node:*)
---

The line below is the deterministic result of the fp-honesty control CLI (the
mode, if changed, is **already applied** — this ran before you were invoked).
Relay it to the user in one short line. Do not run any other command.

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" $ARGUMENTS`
