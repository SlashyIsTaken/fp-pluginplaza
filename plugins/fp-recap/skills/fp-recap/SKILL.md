---
name: fp-recap
description: >
  Resume a previous session and lay out the steps ahead. After each response a
  Stop hook reads the whole session's tool log and saves a structured resume note
  (goal, files changed, commands run) plus the likely next steps; at the first
  prompt of the next session it is surfaced so you can open with "here's where we
  left off, here's what comes next" and continue without re-explaining. Use when
  the user asks "where was I", "what was I doing", "where do we resume", "what's
  next", "recap", "catch me up", or runs /fp-recap:mode show. It proposes and
  waits; it never starts work on its own. Modes: off, on (default), verbose.
  Switch with "/fp-recap:mode on|verbose|off".
license: MIT
---

# fp-recap

fp-recap is about **picking a session back up**. Claude's built-in summary is
one-shot prose that disappears at the end of the turn; fp-recap saves a resume
note that survives, so the next session opens with where you left off **and the
steps ahead**, not a blank slate.

Every resume note has two halves:

- **Where you left off** — the goal you set, the files changed, the commands run,
  pulled from the session's tool log rather than free-form prose.
- **Steps ahead** — the likely next moves, taken from what you said you'd do next
  (offers, TODOs, open questions in the last reply) or, failing that, the last
  unfinished request as the anchor to continue from.

It is an edge tool: it captures *after* the work and proposes *before* the next
one. It never nudges the model mid-task.

## How it works

- **Capture (Stop hook).** After every response, fp-recap reads the whole
  session's tool log, builds the two-part resume note, and saves it to the
  project's personal store (`.flarepoint/recap/personal/last-session.md`, which
  is git-ignored). It only records activity; it never edits your code.
- **Resume (UserPromptSubmit hook).** At the first prompt of a new session, the
  previous note is surfaced once. The session id does the deduping, so it shows
  up at the start of the next session and not again.

## What you do

Capture is automatic. The resume is where you act:

- **When the note is surfaced** at the start of a session, open with a short
  "here's where we left off, and here's what I think comes next" drawn from it,
  then **wait for the user's go-ahead.** It is a proposal, not a green light:
  don't start editing or running things until they say so.
- **When the user asks** "where was I" / "what's next" / "catch me up", show the
  stored note. Run `node "${CLAUDE_PLUGIN_ROOT}/hooks/cli.js" show` (or
  `/fp-recap:mode show`) and relay it. If nothing is stored yet, summarize the
  current session and the next steps from what you've done so far.

## Modes

- **on** (default) — save a concise resume note each turn; surface it next session.
- **verbose** — save a fuller note: more files and commands, plus files read.
- **off** — stop capturing and surfacing.

Switch with `/fp-recap:mode on|verbose|off`.

## Boundaries

- **Propose, never start.** The resume note tells the user where things stood and
  what likely comes next; acting on it is their call. Surfacing it must not change
  what you do unasked. Same non-interference spirit as fp-honesty and fp-bump.
- **Local by default.** The note lives in the project's personal, git-ignored
  store — it is your working state, not something committed for the team.
- **Fail quiet.** No `node`, no transcript, or any error means no note that turn;
  it never blocks a prompt or a response.
