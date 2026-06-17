'use strict';

// Host adapter: reads a Claude Code transcript and accumulates the WHOLE
// session's activity (not just the last turn, the way the honesty backstop
// does) into the shape recap.js needs — the opening intent, the latest
// request, every file changed or read, and every command run.
//
// PROVISIONAL: the exact transcript JSONL schema is [inferred], not verified
// against a live install; this is the single place to fix when we confirm it.
// Everything is wrapped so a parse miss degrades to a silent no-op, never a
// broken session.

const fs = require('fs');
const { classifyTool } = require('./recap');

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

// The most descriptive single string for a tool input (file path, command, etc.).
function stringifyInput(input) {
  if (!input || typeof input !== 'object') return '';
  return String(
    input.file_path || input.path || input.pattern || input.command ||
    input.query || input.url || JSON.stringify(input),
  );
}

// A user entry is a real human turn (intent / a request) only if it carries
// actual text, not solely tool_result blocks.
function isHumanTurn(entry) {
  const content = entry && entry.message && entry.message.content;
  if (typeof content === 'string') return content.trim().length > 0;
  if (Array.isArray(content)) return content.some((b) => b && b.type === 'text');
  return false;
}

function humanText(entry) {
  const content = entry && entry.message && entry.message.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.filter((b) => b && b.type === 'text').map((b) => b.text || '').join(' ').trim();
  }
  return '';
}

// Accumulate the full session: first prompt as intent, last as the latest
// request, plus the running sets of edits, reads, and commands.
function extractActivity(transcriptPath) {
  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  } catch {
    return null;
  }
  const prompts = [];
  const edited = [];
  const read = [];
  const commands = [];
  let lastAssistant = ''; // the final assistant prose — where the next steps usually live
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const role = entry.type || (entry.message && entry.message.role);
    if (role === 'user' && isHumanTurn(entry)) {
      prompts.push(humanText(entry));
    } else if (role === 'assistant') {
      const content = (entry.message && entry.message.content) || [];
      for (const block of Array.isArray(content) ? content : []) {
        if (block.type === 'text' && block.text && block.text.trim()) {
          lastAssistant = block.text.trim();
        } else if (block.type === 'tool_use') {
          const kind = classifyTool(block.name);
          const target = stringifyInput(block.input);
          if (!target) continue;
          if (kind === 'edit') edited.push(target);
          else if (kind === 'read') read.push(target);
          else if (kind === 'command') commands.push(target);
        }
      }
    }
  }
  return {
    intent: prompts[0] || '',
    lastPrompt: prompts[prompts.length - 1] || '',
    turns: prompts.length,
    edited,
    read,
    commands,
    lastAssistant,
  };
}

module.exports = { readStdin, parseStopPayload, stringifyInput, isHumanTurn, humanText, extractActivity };
