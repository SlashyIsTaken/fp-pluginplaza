---
name: fp-sicem
description: >
  Readable-prose mode ("sic 'em-dash"). In the prose you write or revise
  (READMEs, docs, markdown, PR and commit bodies) it defaults the em-dash out of
  existence, replacing it and its cousins (the semicolon, the colon used for
  drama, and long dash-parentheticals) with the connector that actually fits: a
  period, a comma, parentheses, a colon for a real list, or a plain "so", "but",
  or "and". The aim is prose that reads clearly for every English reader,
  non-native ones included, without lowering the vocabulary. Clearer and cleaner,
  never dumbed down. Prose artifacts only; it leaves your chat replies, your code,
  and your code comments (fp-minify's turf) alone. Sets a prior at the task edge;
  never steers mid-solve. Use whenever the user says "fp-sicem", "sic 'em-dash",
  "no em-dashes", "kill the em-dashes", or asks for cleaner, more readable prose.
  Levels: off, on (default). Switch by typing "fp-sicem on" / "fp-sicem off" /
  "stop fp-sicem".
license: MIT
---

# fp-sicem — sic 'em-dash

You write excellent English. That is the problem this fixes. The em-dash, used
well, is a great mark, but it is a mark many capable readers (especially
non-native English speakers) have to slow down and re-parse. fp-sicem sets a
prior so the prose you write connects its sentences in ways almost anyone can
read at speed. It does this without lowering the level of the English. The target
is clearer and cleaner, never simpler.

## Persistence

ACTIVE while on. Default: **on**, so installing the plugin is itself the opt-in.
Off via `/fp-sicem:mode off` or "stop fp-sicem". Switch by typing `fp-sicem on`
/ `fp-sicem off` (the plugin's hook applies it instantly, before the model
replies).

## What it governs

**Prose artifacts you author or revise.** READMEs, docs, markdown, and prose
bodies like PR or commit descriptions. It fires on the prose you write into a
document, not on everything you type.

It deliberately leaves three things alone:

- **Your chat replies to the user.** Conversation is not a shipped artifact, so
  it stays in your natural voice.
- **Code.** fp-sicem never touches program text.
- **Code comments.** Those belong to fp-minify. fp-sicem stops at the comment.

## The hard target: the em-dash and its cousins

Near-total. Default the em-dash out of existence and rewrite it into the
connector that carries the same meaning:

- A **period** when it joins two full thoughts. Let them be two sentences.
- A **comma** for a light aside or a short pause.
- **Parentheses** for a true aside the sentence could drop.
- A **colon** only for a real list or a genuine definition, never for drama.
- A plain **"so"**, **"but"**, or **"and"** when the link is logical (cause,
  contrast, addition). This is often the clearest fix of all.

Reserve the em-dash for the rare case where nothing else carries the meaning. It
is not banned outright, but it should be the exception you can justify, not the
default reach.

Give the same treatment to the marks that trip the same readers: the
**semicolon**, the **colon used for effect**, and the **long dash-parenthetical**
that buries a clause mid-sentence.

## The soft nudge: shorter, less nested

Where it reads naturally, prefer shorter sentences and fewer nested clauses. This
is a nudge, not a mandate. Never restructure an argument, drop a qualification,
or flatten real nuance just to hit it. If the clearest version of a thought is
one longer sentence, write the longer sentence.

## What this is not

- **Not a vocabulary filter.** It never swaps a precise word for a simpler one,
  never dumbs the writing down. It changes how sentences connect, not how smart
  they are.
- **Not a code or comment tool.** It shapes prose only. Comments are fp-minify's
  job; code it never touches.
- **Not a gate, not mid-solve steering.** It fires once, at the task edge, like
  the rest of the plaza. The model honors the prior; the plugin does not watch or
  rewrite after.

## Boundaries

fp-sicem governs the readability of the prose you write, nothing else. "stop
fp-sicem" / "off": write prose as usual. The mode persists until changed or
session end.
