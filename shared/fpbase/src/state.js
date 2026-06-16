'use strict';

// File-backed fact store. A "fact" is one frontmattered-markdown file; an
// INDEX.md per store lists them one line each (recall reads the index first,
// then opens only what it needs).
//
// Layout:
//   global               <globalDir>/<plugin>/
//   project + personal   <projectDir>/<plugin>/personal/   (self-gitignored)
//   project + committed  <projectDir>/<plugin>/shared/      (tracked by the repo)
//
// `sharing` is the per-project privacy switch: personal facts stay
// out of git for solo devs; committed facts travel with the repo for teams.

const fs = require('fs');
const path = require('path');
const config = require('./config');
const provenance = require('./provenance');
const {
  ensureDir,
  atomicWrite,
  slugify,
  parseFrontmatter,
  serializeFrontmatter,
} = require('./util');

function storeDir(plugin, { scope = 'project', sharing = 'personal', start } = {}) {
  const p = config.paths(start);
  if (scope === 'global') return path.join(p.globalDir, plugin);
  const sub = sharing === 'committed' ? 'shared' : 'personal';
  return path.join(p.projectDir, plugin, sub);
}

// A personal store drops a "*"-gitignore on creation, so a user's repo can never
// accidentally commit facts they meant to keep local.
function ensureStore(dir, { selfIgnore }) {
  ensureDir(dir);
  if (selfIgnore) {
    const gi = path.join(dir, '.gitignore');
    if (!fs.existsSync(gi)) atomicWrite(gi, '*\n');
  }
  return dir;
}

function factFile(dir, name) {
  return path.join(dir, `${slugify(name)}.md`);
}

function toFact(file, parsed) {
  return {
    name: parsed.data.name || path.basename(file, '.md'),
    type: parsed.data.type || 'note',
    scope: parsed.data.scope || 'project',
    sharing: parsed.data.sharing || 'personal',
    provenance: provenance.normalize(parsed.data.provenance),
    description: parsed.data.description || '',
    lastConfirmed: parsed.data['last-confirmed'] || '',
    hits: Number(parsed.data.hits || 0),
    body: parsed.body,
    file,
  };
}

function write(plugin, fact, { scope = 'project', start } = {}) {
  const sharing = fact.sharing || 'personal';
  const dir = ensureStore(storeDir(plugin, { scope, sharing, start }), {
    selfIgnore: scope === 'project' && sharing !== 'committed',
  });
  const name = slugify(fact.name);
  const data = {
    name,
    type: fact.type || 'note',
    scope,
    sharing,
    provenance: provenance.normalize(fact.provenance),
    description: fact.description || '',
    'last-confirmed': fact.lastConfirmed || new Date().toISOString().slice(0, 10),
    hits: Number(fact.hits || 0),
  };
  const file = factFile(dir, name);
  atomicWrite(file, serializeFrontmatter(data, fact.body || ''));
  reindex(plugin, { scope, sharing, start });
  return Object.assign({}, fact, { name, file, scope, sharing });
}

function readFile(file) {
  try {
    return toFact(file, parseFrontmatter(fs.readFileSync(file, 'utf8')));
  } catch {
    return null;
  }
}

// Read one fact by name. Within a project, personal shadows committed (your
// local override wins); pass sharing to target a specific store.
function read(plugin, name, { scope = 'project', sharing, start } = {}) {
  const order = sharing ? [sharing] : ['personal', 'committed'];
  const tries = scope === 'global'
    ? [storeDir(plugin, { scope, start })]
    : order.map((s) => storeDir(plugin, { scope, sharing: s, start }));
  for (const dir of tries) {
    const file = factFile(dir, name);
    if (fs.existsSync(file)) return readFile(file);
  }
  return null;
}

function listDir(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith('.md') && n !== 'INDEX.md')
    .map((n) => readFile(path.join(dir, n)))
    .filter(Boolean);
}

// All facts at a scope. For projects this spans both personal and committed
// stores; for global, the single store.
function list(plugin, { scope = 'project', start } = {}) {
  if (scope === 'global') return listDir(storeDir(plugin, { scope, start }));
  return [
    ...listDir(storeDir(plugin, { scope, sharing: 'personal', start })),
    ...listDir(storeDir(plugin, { scope, sharing: 'committed', start })),
  ];
}

function remove(plugin, name, { scope = 'project', sharing, start } = {}) {
  const fact = read(plugin, name, { scope, sharing, start });
  if (!fact) return false;
  fs.rmSync(fact.file, { force: true });
  reindex(plugin, { scope, sharing: fact.sharing, start });
  return true;
}

// Recall confirms a fact still pays its way: bump the hit count and refresh the
// last-confirmed date. Decay logic (demote unused facts) lives in the plugin.
function touch(plugin, name, { scope = 'project', sharing, start } = {}) {
  const fact = read(plugin, name, { scope, sharing, start });
  if (!fact) return null;
  fact.hits += 1;
  fact.lastConfirmed = new Date().toISOString().slice(0, 10);
  return write(plugin, fact, { scope, start });
}

// Rebuild the human-readable index for one store.
function reindex(plugin, { scope = 'project', sharing = 'personal', start } = {}) {
  const dir = storeDir(plugin, { scope, sharing, start });
  const facts = listDir(dir);
  if (facts.length === 0) return;
  const lines = facts
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => `- [${f.name}](${path.basename(f.file)}) — ${f.description || f.type}`);
  atomicWrite(path.join(dir, 'INDEX.md'), `# ${plugin} facts\n\n${lines.join('\n')}\n`);
}

module.exports = { storeDir, write, read, list, remove, touch, reindex };
