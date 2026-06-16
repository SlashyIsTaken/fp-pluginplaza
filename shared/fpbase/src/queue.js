'use strict';

// The human-in-the-loop queue. Hooks drop candidates here; the next prompt
// surfaces at most one as an inline "I noticed X — confirm?" line.
//
// Two gates:
//   - confidence: only "strong" candidates (explicit "no/actually", a clear
//     revert) are ever enqueued. Weak hunches are dropped, not stored.
//   - one-per-turn: nextSuggestion() hands back a single candidate per call, so
//     a turn never gets buried in confirmations.
//
// Stored as JSON inside the personal (gitignored) store, so pending
// confirmations never leak into a repo.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const state = require('./state');
const { ensureDir, readJSON, writeJSON } = require('./util');

function queueFile(plugin, start) {
  const dir = state.storeDir(plugin, { scope: 'project', sharing: 'personal', start });
  ensureDir(dir);
  const gi = path.join(dir, '.gitignore');
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, '*\n');
  return path.join(dir, 'queue.json');
}

function loadQueue(plugin, start) {
  return readJSON(queueFile(plugin, start), { items: [] });
}

function saveQueue(plugin, q, start) {
  return writeJSON(queueFile(plugin, start), q);
}

function fingerprint(candidate) {
  return crypto
    .createHash('sha1')
    .update(`${candidate.plugin}:${candidate.kind}:${candidate.summary}`)
    .digest('hex')
    .slice(0, 12);
}

// Enqueue iff strong and not already present. Returns the stored item, or null
// when the confidence gate or de-dup rejects it.
function enqueue(candidate, { start } = {}) {
  if (candidate.confidence !== 'strong') return null;
  const plugin = candidate.plugin;
  const q = loadQueue(plugin, start);
  const id = fingerprint(candidate);
  if (q.items.some((it) => it.id === id && it.status !== 'rejected')) return null;
  const item = {
    id,
    plugin,
    kind: candidate.kind || 'note',
    summary: candidate.summary,
    payload: candidate.payload || null,
    signals: candidate.signals || [],
    status: 'pending',
    created: new Date().toISOString(),
  };
  q.items.push(item);
  saveQueue(plugin, q, start);
  return item;
}

function pending(plugin, { start } = {}) {
  return loadQueue(plugin, start).items.filter(
    (it) => it.status === 'pending' || it.status === 'surfaced',
  );
}

// One candidate to surface this turn. Marks it 'surfaced' so it isn't repeated,
// and returns the inline line for inject.js to fold into the next prompt.
function nextSuggestion(plugin, { start } = {}) {
  const q = loadQueue(plugin, start);
  const item = q.items.find((it) => it.status === 'pending');
  if (!item) return null;
  item.status = 'surfaced';
  saveQueue(plugin, q, start);
  return {
    id: item.id,
    line: `I noticed: ${item.summary} — keep it? (/fp-${plugin} review)`,
  };
}

function resolve(plugin, id, accept, { start } = {}) {
  const q = loadQueue(plugin, start);
  const item = q.items.find((it) => it.id === id);
  if (!item) return null;
  item.status = accept ? 'accepted' : 'rejected';
  item.resolved = new Date().toISOString();
  saveQueue(plugin, q, start);
  return item;
}

// Drop resolved items so the queue file doesn't grow forever.
function compact(plugin, { start } = {}) {
  const q = loadQueue(plugin, start);
  q.items = q.items.filter((it) => it.status === 'pending' || it.status === 'surfaced');
  saveQueue(plugin, q, start);
  return q.items.length;
}

module.exports = { enqueue, pending, nextSuggestion, resolve, compact };
