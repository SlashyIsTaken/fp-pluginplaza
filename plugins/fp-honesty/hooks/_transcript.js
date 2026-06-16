'use strict';

// Host adapter: turns a Claude Code Stop-hook payload into the
// normalized shape audit.js needs — the last assistant turn's text and the
// tools it used. PROVISIONAL: the exact transcript JSONL schema is [inferred],
// not verified against a live install; this is the single place to fix when we
// confirm it. Everything is wrapped so a parse miss degrades to a silent no-op,
// never a broken session.

const fs = require('fs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parseStopPayload(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function stringifyInput(input) {
  if (!input || typeof input !== 'object') return '';
  return String(
    input.file_path || input.path || input.pattern || input.command ||
    input.query || input.url || JSON.stringify(input),
  );
}

// A user entry is a real human turn (a boundary) only if it carries actual text,
// not solely tool_result blocks.
function isHumanTurn(entry) {
  const content = entry && entry.message && entry.message.content;
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) return content.some((b) => b && b.type === 'text');
  return false;
}

// Extract the latest turn: text + tools since the last human prompt.
function extract(transcriptPath) {
  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  } catch {
    return { assistantText: '', toolLog: [] };
  }
  let text = [];
  let tools = [];
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const role = entry.type || (entry.message && entry.message.role);
    if (role === 'user' && isHumanTurn(entry)) {
      text = [];
      tools = [];
    } else if (role === 'assistant') {
      const content = (entry.message && entry.message.content) || [];
      for (const block of Array.isArray(content) ? content : []) {
        if (block.type === 'text' && block.text) text.push(block.text);
        else if (block.type === 'tool_use') {
          tools.push({ tool: block.name || '', target: stringifyInput(block.input) });
        }
      }
    }
  }
  return { assistantText: text.join('\n'), toolLog: tools };
}

module.exports = { readStdin, parseStopPayload, extract, stringifyInput, isHumanTurn };
