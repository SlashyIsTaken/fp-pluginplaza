'use strict';

// Assembles the context block a plugin's UserPromptSubmit hook injects each
// turn, at the current mode. One consistent, clearly-marked envelope for all
// three plugins, so the host (and a curious user) can always see what fp added.
//
// Pieces a plugin may pass:
//   rules      the active ruleset string for this mode (the behavioral overlay)
//   recall     task-relevant facts to surface (kept small — never the whole store)
//   suggestion at most one inline "confirm?" line from queue.nextSuggestion()
//
// Returns '' when there is nothing to inject (mode off, no pieces), so an
// inactive plugin stays completely silent.

const MARKER = 'fp';

function formatRecall(recall = []) {
  if (!recall.length) return '';
  const lines = recall.map((f) => {
    const tag = f.provenance ? ` (${f.provenance})` : '';
    return `- ${f.body || f.summary || f.name}${tag}`;
  });
  return `Relevant remembered context:\n${lines.join('\n')}`;
}

function build(plugin, { mode = 'on', rules = '', recall = [], suggestion = null, note = null } = {}) {
  const sections = [];
  // A note (e.g. "mode switched to off") is shown even when the plugin is off,
  // so a deterministic mode change can still be confirmed to the model.
  if (note) sections.push(String(note).trim());
  if (mode !== 'off' && rules) sections.push(rules.trim());
  const recallBlock = mode !== 'off' ? formatRecall(recall) : '';
  if (recallBlock) sections.push(recallBlock);
  if (suggestion) {
    const line = typeof suggestion === 'string' ? suggestion : suggestion.line;
    if (line) sections.push(line.trim());
  }
  if (sections.length === 0) return '';
  const open = `<${MARKER}:${plugin} mode=${mode}>`;
  const close = `</${MARKER}:${plugin}>`;
  return `${open}\n${sections.join('\n\n')}\n${close}`;
}

module.exports = { MARKER, build };
