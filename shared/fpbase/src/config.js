'use strict';

// Settings resolution for every fp plugin.
//
// Precedence (highest wins):  env  >  project  >  global  >  plugin default
//
//   global   ~/.config/flarepoint/config.json     (or $FLAREPOINT_CONFIG_HOME)
//   project  <repo>/.flarepoint/config.json
//   env      FLAREPOINT_<PLUGIN>_<KEY>=value
//
// Config files are namespaced per plugin: { "honesty": {...}, "memory": {...} }.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJSON, writeJSON, mergeConfig } = require('./util');

function globalDir() {
  return process.env.FLAREPOINT_CONFIG_HOME ||
    path.join(os.homedir(), '.config', 'flarepoint');
}

// Walk up from cwd for the nearest project marker. We anchor on the repo so a
// plugin's state lands beside the code it's about, not wherever the agent was
// launched from.
function projectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, '.flarepoint')) ||
        fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

function paths(start) {
  const root = projectRoot(start);
  return {
    globalDir: globalDir(),
    projectRoot: root,
    projectDir: path.join(root, '.flarepoint'),
  };
}

function globalConfigFile() {
  return path.join(globalDir(), 'config.json');
}

function projectConfigFile(start) {
  return path.join(paths(start).projectDir, 'config.json');
}

// Pull every FLAREPOINT_<PLUGIN>_<KEY> override into a config object.
function envOverrides(plugin) {
  const prefix = `FLAREPOINT_${plugin.toUpperCase()}_`;
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith(prefix)) continue;
    const key = k.slice(prefix.length).toLowerCase();
    out[key] = /^-?\d+$/.test(v) ? Number(v) : v;
  }
  return out;
}

// Merged config for one plugin, defaults lowest.
function load(plugin, { defaults = {}, start } = {}) {
  const g = readJSON(globalConfigFile(), {})[plugin] || {};
  const p = readJSON(projectConfigFile(start), {})[plugin] || {};
  return mergeConfig(defaults, g, p, envOverrides(plugin));
}

function get(plugin, key, fallback, opts = {}) {
  const cfg = load(plugin, opts);
  return key in cfg ? cfg[key] : fallback;
}

// Persist a single key. scope 'project' (default) or 'global'. env-level
// overrides are intentionally read-only here — they belong to the shell.
function set(plugin, key, value, { scope = 'project', start } = {}) {
  const file = scope === 'global' ? globalConfigFile() : projectConfigFile(start);
  const all = readJSON(file, {});
  all[plugin] = all[plugin] || {};
  all[plugin][key] = value;
  writeJSON(file, all);
  return value;
}

module.exports = {
  paths,
  globalConfigFile,
  projectConfigFile,
  load,
  get,
  set,
};
