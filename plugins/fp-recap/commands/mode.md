---
description: fp-recap control — show status, switch mode, or print the stored recap (status/on/verbose/off/show/help)
argument-hint: [status|on|verbose|off|show|help]
allowed-tools: Bash(node:*)
---

The block below is the deterministic result of the fp-recap control CLI (the
mode, if changed, is **already applied** — this ran before you were invoked).
Relay it to the user. For `show` it is the stored recap; print it as-is. Do not
run any other command.

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" $ARGUMENTS`
