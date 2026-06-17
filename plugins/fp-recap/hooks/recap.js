'use strict';

// Shared setup for fp-recap: load the base, declare the modes, and hold the
// deterministic pieces — classifying a tool use, turning a session's activity
// into a structured recap, and the small read/write helpers over state +
// config. The IO (reading the transcript) lives in _session.js; everything
// here is pure or a thin store wrapper, so the recap shape is testable without
// a live session.
//
// What fp-recap is: an upgrade over the built-in end-of-turn summary. It is
// persistent (survives across sessions), structured (files, commands, threads
// pulled from the tool log, not free-form prose), and resumable (it opens the
// next session with "here's where you left off"). It only ever captures and
// reports; it never steers the model mid-task.
//
// Modes:  off (do nothing) · on (persist a concise recap, default) · verbose
// (persist a fuller recap: more files, more commands, files read too).

function loadBase() {
  try {
    return require('./_fpbase'); // production: symlinked base, copied in at install
  } catch {
    return require('@flarepoint/base'); // dev/test fallback
  }
}

const base = loadBase();
const PLUGIN = 'recap';
const RECAP_FACT = 'last-session';

base.mode.define(PLUGIN, { levels: ['on', 'verbose'], default: 'on' });

// --- tool classification ---------------------------------------------------

// Map a tool name to the kind of activity it represents, or null to ignore it.
// Names are matched case-insensitively so host casing differences don't matter.
const EDIT_TOOLS = new Set(['edit', 'write', 'multiedit', 'notebookedit', 'update']);
const READ_TOOLS = new Set(['read', 'notebookread']);
const COMMAND_TOOLS = new Set(['bash']);

function classifyTool(name) {
  const n = String(name || '').toLowerCase();
  if (EDIT_TOOLS.has(n)) return 'edit';
  if (READ_TOOLS.has(n)) return 'read';
  if (COMMAND_TOOLS.has(n)) return 'command';
  return null;
}

// --- recap rendering (pure) ------------------------------------------------

function squish(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function truncate(s, n) {
  const t = squish(s);
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

// Keep paths readable: show the last two segments, so two files with the same
// basename in different dirs stay distinguishable.
function shortPath(p) {
  const parts = squish(p).split('/').filter(Boolean);
  return parts.slice(-2).join('/') || squish(p);
}

function fmtList(items, max, { code = true } = {}) {
  const uniq = [...new Set(items)];
  const shown = uniq.slice(0, max).map((x) => (code ? `\`${x}\`` : x));
  const more = uniq.length > max ? ` (+${uniq.length - max} more)` : '';
  return shown.join(', ') + more;
}

// Forward-looking cues a line might carry: an offer, a TODO, a "next" plan.
const NEXT_CUE =
  /\b(next|to-?dos?|remaining|still (?:need|to)|left to do|follow[- ]?ups?|want me to|should i|shall i|i can|i'?ll|we (?:could|should)|then (?:we|i))\b/i;

// Heuristic (marked as such): pull the "what comes next" lines out of the final
// assistant message — offers, TODOs, and questions are where the next step
// almost always lives. Bullet / heading / quote markers are stripped first.
function extractNextSteps(text, max = 3) {
  const out = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.replace(/^[\s>*+\-#]+/, '').replace(/^\d+[.)]\s*/, '').trim();
    if (line.length < 6) continue;
    if (NEXT_CUE.test(line) || /\?\s*$/.test(line)) {
      const t = truncate(line, 140);
      if (!out.includes(t)) out.push(t);
    }
    if (out.length >= max) break;
  }
  return out;
}

// The "Steps ahead" items: the model's own stated next steps if we can find
// them, otherwise the last unfinished request as the anchor to resume from.
function nextSteps(activity, { verbose = false } = {}) {
  const extracted = extractNextSteps(activity.lastAssistant, verbose ? 5 : 3);
  if (extracted.length) return extracted;
  const last = squish(activity.lastPrompt);
  if (last && last !== squish(activity.intent)) {
    return [`Continue from your last request: "${truncate(last, 160)}"`];
  }
  return [];
}

// Turn accumulated activity into a short, structured resume note: where you
// left off, then the steps ahead. Returns '' when there is nothing worth
// remembering, so an empty session leaves no trace.
//   activity = { intent, lastPrompt, turns, edited[], read[], commands[], lastAssistant }
function buildRecap(activity, { verbose = false } = {}) {
  if (!activity) return '';
  const edited = activity.edited || [];
  const commands = activity.commands || [];
  const read = activity.read || [];
  const intent = squish(activity.intent);
  if (!edited.length && !commands.length && !intent) return '';

  const maxFiles = verbose ? 20 : 6;
  const maxCmds = verbose ? 12 : 4;
  const turns = activity.turns || 0;

  const where = [];
  if (intent) where.push(`- Goal: "${truncate(intent, 160)}"`);
  if (edited.length) where.push(`- Files changed: ${fmtList(edited.map(shortPath), maxFiles)}`);
  if (verbose && read.length) where.push(`- Files read: ${fmtList(read.map(shortPath), maxFiles)}`);
  if (commands.length) {
    const recent = commands.slice(-maxCmds).map((c) => truncate(c, 48));
    const earlier = commands.length > maxCmds ? ` (+${commands.length - maxCmds} earlier)` : '';
    where.push(`- Recent commands: ${recent.map((c) => `\`${c}\``).join(', ')}${earlier}`);
  }

  const lines = [`Resuming your last session (${turns} turn${turns === 1 ? '' : 's'}).`, '', 'Where you left off:', ...where];
  const steps = nextSteps(activity, { verbose });
  if (steps.length) lines.push('', 'Steps ahead:', ...steps.map((s) => `- ${s}`));
  return lines.join('\n');
}

// The context block injected at the next session's first prompt. It is a resume
// prompt: tell the user where things stood and propose the next steps, then WAIT
// for their go-ahead. Surfacing a recap must not start work on its own.
function frame(recapText) {
  return [
    'You are resuming a previous session in this project. Below is where things',
    'stood and the likely steps ahead. Open with a brief "here is where we left',
    'off, and here is what I think comes next" for the user, then wait for their',
    'go-ahead before acting. This is a resume note, not a mandate to start',
    `working:\n\n${recapText}`,
  ].join(' ');
}

// --- store helpers (state for the readable recap, config for bookkeeping) ---

function saveRecap(text, sessionId, opts = {}) {
  base.state.write(
    PLUGIN,
    { name: RECAP_FACT, type: 'recap', sharing: 'personal', body: text },
    { scope: 'project', start: opts.start },
  );
  base.config.set(PLUGIN, 'recapSession', sessionId || '', opts);
}

function loadRecap(opts = {}) {
  const fact = base.state.read(PLUGIN, RECAP_FACT, {
    scope: 'project',
    sharing: 'personal',
    start: opts.start,
  });
  return fact ? fact.body.trim() : '';
}

function recapSession(opts) {
  return base.config.get(PLUGIN, 'recapSession', '', opts);
}

function shownSession(opts) {
  return base.config.get(PLUGIN, 'shownSession', '', opts);
}

function markShown(sessionId, opts) {
  return base.config.set(PLUGIN, 'shownSession', sessionId || '', opts);
}

// Should the stored recap be surfaced for this prompt? Yes only when there is a
// recap, we know the session, it came from a DIFFERENT (earlier) session, and
// we haven't already shown it this session. Pure so the gate is testable.
function shouldSurface({ hasRecap, sessionId, recapSession: rs, shownSession: ss }) {
  if (!hasRecap) return false;
  if (!sessionId) return false; // can't dedupe safely -> stay quiet
  if (rs === sessionId) return false; // recap is from this same session
  if (ss === sessionId) return false; // already surfaced this session
  return true;
}

module.exports = {
  base,
  PLUGIN,
  RECAP_FACT,
  loadBase,
  classifyTool,
  extractNextSteps,
  nextSteps,
  buildRecap,
  frame,
  shortPath,
  truncate,
  fmtList,
  saveRecap,
  loadRecap,
  recapSession,
  shownSession,
  markShown,
  shouldSurface,
};
