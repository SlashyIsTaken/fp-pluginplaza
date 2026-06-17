'use strict';

// UserPromptSubmit hook. At the first prompt of a NEW session, surface the
// recap the previous session left behind, exactly once. The session id does the
// deduping: the stored recap carries the session it was written in, so once
// this session's own Stop overwrites it (or once we've shown it), it stops
// appearing. The recap is injected as context, clearly framed as "do not act on
// this" — surfacing must never steer the model.
//
// Output goes to stdout, which Claude Code adds to the prompt context. Silent
// whenever there is nothing to resume or the plugin is off.

const { base, PLUGIN, loadRecap, frame, recapSession, shownSession, markShown, shouldSurface } =
  require('./recap');
const fs = require('fs');

function readPayload() {
  try {
    const raw = fs.readFileSync(0, 'utf8').replace(/^﻿/, ''); // strip BOM some shells add
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function run() {
  try {
    if (!base.mode.isActive(PLUGIN)) return;
    const sessionId = readPayload().session_id || '';
    const text = loadRecap();
    const surface = shouldSurface({
      hasRecap: !!text,
      sessionId,
      recapSession: recapSession(),
      shownSession: shownSession(),
    });
    if (!surface) return;
    markShown(sessionId);
    const out = base.inject.build(PLUGIN, { mode: base.mode.get(PLUGIN), rules: frame(text) });
    if (out) process.stdout.write(out);
  } catch {
    // Injection is best-effort; never block a prompt.
  }
}

if (require.main === module) run();

module.exports = { run };
