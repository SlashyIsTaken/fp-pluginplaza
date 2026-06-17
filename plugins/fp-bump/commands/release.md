---
description: fp-bump release — flush the pending bump into one version change
argument-hint: (no arguments)
allowed-tools: Bash(node:*), Edit
---

The line below is the deterministic result of the fp-bump release CLI: it reads
the pending release level the commits have accumulated and works out the single
version change to make.

!`node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" release`

Act on that line:

- If it says nothing is pending, tell the user in one short line and stop.
- In **suggest** mode, propose the change in one line and wait for the user's OK
  before editing anything.
- In **auto** mode, or once the user approves, set the `version` field in the
  named file to the new value, stage it, then run
  `node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" reset` to clear the ledger.

Do not invent a different version than the one the line gives you.
