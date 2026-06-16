'use strict';

// Stop-hook backstop. After a response finishes, check every claim the model
// tagged [verified] against the tools it actually used this turn. Anything that
// wasn't grounded gets recorded; inject.js discloses it next turn.
//
// This never rewrites the past answer (that would violate non-interference) and
// never blocks the turn — it only surfaces a correction going forward. The
// grounding check is the tested fp-base audit; the fuzzy part (pulling refs out
// of prose) is a heuristic, marked as such.

const { base, PLUGIN } = require('./honesty');
const transcript = require('./_transcript');
const fs = require('fs');
const path = require('path');

function flagFile() {
  const dir = base.state.storeDir(PLUGIN, { scope: 'project', sharing: 'personal' });
  return path.join(dir, 'audit-flag.json');
}

// The model is instructed to emit the emoji tag form `[🟢 verified]`; an older
// plain `[verified]` is still honored. Match either: an optional run of
// non-`]` chars (the emoji + space) before the word inside the brackets.
const VERIFIED_TAG = /\[(?:[^\]]*\s)?verified\]/;

// Heuristic: a load-bearing claim's references are its backticked tokens and
// file-like words (foo.js, src/auth.py).
function extractRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(/`([^`]+)`/g)) refs.add(m[1].trim());
  for (const m of text.matchAll(/\b[\w./-]+\.[A-Za-z]{1,6}\b/g)) refs.add(m[0]);
  return [...refs].filter((r) => r.length > 1);
}

// Pure: given the turn's text + tools, return the [verified] claims that no tool
// grounded.
function analyze(assistantText, toolLog) {
  const claims = [];
  for (const line of String(assistantText || '').split('\n')) {
    if (!VERIFIED_TAG.test(line)) continue;
    const refs = extractRefs(line);
    // No concrete reference -> we can't assess grounding, so we don't nag.
    if (refs.length === 0) continue;
    claims.push({ provenance: 'verified', refs, text: line.trim() });
  }
  const capped = base.audit.capClaims(claims, toolLog || []);
  return { ungrounded: capped.filter((c) => !c.grounded) };
}

function run() {
  try {
    if (!base.mode.isActive(PLUGIN)) return;
    const payload = transcript.parseStopPayload(transcript.readStdin());
    if (!payload.transcript_path) return;
    const { assistantText, toolLog } = transcript.extract(payload.transcript_path);
    const { ungrounded } = analyze(assistantText, toolLog);
    const file = flagFile();
    if (ungrounded.length === 0) {
      fs.rmSync(file, { force: true });
      return;
    }
    const refs = [...new Set(ungrounded.flatMap((c) => c.refs))].slice(0, 5);
    const subject = refs.length ? ` on ${refs.map((r) => `\`${r}\``).join(', ')}` : '';
    const disclosure =
      `fp-honesty backstop: your last response tagged [🟢 verified]${subject} but no tool call this turn grounded it — treat as [🟡 inferred] going forward, or re-check before re-asserting.`;
    base.util.atomicWrite(file, `${JSON.stringify({ disclosure, at: new Date().toISOString() }, null, 2)}\n`);
  } catch {
    // A backstop must never break the session.
  }
}

if (require.main === module) run();

module.exports = { analyze, extractRefs, run, flagFile };
