'use strict';

// Small dependency-free helpers shared across fp-base modules.
// No external packages: just node built-ins, so the vendored copy runs anywhere
// `node` is on PATH.

const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Write via a temp file + rename so a crashed/interrupted write never leaves a
// half-written fact or config on disk.
function atomicWrite(file, contents) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, file);
  return file;
}

function readJSON(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, value) {
  return atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled';
}

// Deep-ish merge for plain config objects: later sources win, nested objects
// merge, everything else is replaced. Good enough for our flat-ish config trees.
function mergeConfig(...sources) {
  const out = {};
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === 'object' && !Array.isArray(v) &&
          out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = mergeConfig(out[k], v);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

// --- Frontmatter ---------------------------------------------------------
// We own the schema (flat key: value, string/number values), so a tiny parser
// beats pulling in a YAML dependency. Values are stored and read back as
// strings unless they parse cleanly as a number.

function parseFrontmatter(text) {
  const data = {};
  let body = text;
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (match) {
    for (const line of match[1].split('\n')) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (!key) continue;
      if (/^-?\d+$/.test(value)) value = Number(value);
      data[key] = value;
    }
    body = match[2];
  }
  return { data, body: body.trim() };
}

function serializeFrontmatter(data, body) {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n\n${(body || '').trim()}\n`;
}

module.exports = {
  ensureDir,
  atomicWrite,
  readJSON,
  writeJSON,
  slugify,
  mergeConfig,
  parseFrontmatter,
  serializeFrontmatter,
};
