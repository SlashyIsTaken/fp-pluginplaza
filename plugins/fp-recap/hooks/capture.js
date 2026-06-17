'use strict';

// Stop hook. After a response finishes, read the whole session's tool log,
// build a structured recap, and persist it (overwriting the previous one) so
// the NEXT session can open with "here's where you left off". Stop fires every
// turn, so the stored recap always reflects the session as it stands; tagging
// it with the session id is what lets inject.js show it once, in the next
// session only.
//
// Capture only — it never edits the user's code and never blocks the turn.
// Fail-open: any error leaves the previous recap untouched.

const { base, PLUGIN, buildRecap, saveRecap } = require('./recap');
const session = require('./_session');

function run() {
  try {
    const mode = base.mode.get(PLUGIN);
    if (mode === base.mode.OFF) return;
    const payload = session.parseStopPayload(session.readStdin());
    if (!payload.transcript_path) return;
    const activity = session.extractActivity(payload.transcript_path);
    if (!activity) return;
    const text = buildRecap(activity, { verbose: mode === 'verbose' });
    if (!text) return; // nothing worth remembering -> leave any prior recap alone
    saveRecap(text, payload.session_id || '');
  } catch {
    // A capture step must never break the session.
  }
}

if (require.main === module) run();

module.exports = { run };
