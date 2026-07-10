'use strict';

// Generic on/off/level tracker, specialized per plugin:
//   honesty -> off | footer | full
//   memory  -> off | on
//   profile -> off | <archetype names...>
//
// A plugin declares its levels once with define(); get/set then validate and
// persist through config. "off" is reserved everywhere and always means
// inactive, so isActive() is uniform across plugins.

const config = require('./config');

const OFF = 'off';
const registry = new Map(); // plugin -> { levels:Set, default }

function define(plugin, { levels, default: def }) {
  const set = new Set(levels);
  set.add(OFF);
  if (!set.has(def)) {
    throw new Error(`mode.define(${plugin}): default "${def}" not in levels`);
  }
  registry.set(plugin, { levels: set, default: def });
  return module.exports;
}

function levels(plugin) {
  const reg = registry.get(plugin);
  return reg ? [...reg.levels] : [OFF];
}

function get(plugin, opts) {
  const reg = registry.get(plugin);
  const def = reg ? reg.default : OFF;
  const current = config.get(plugin, 'mode', def, opts);
  if (reg && !reg.levels.has(current)) return def; // ignore stale/invalid values
  return current;
}

// A mode is a durable user preference, so it persists to the global config by
// default — never the repo's .flarepoint, which would land in the working tree.
// The read precedence (env > project > global) still honors an explicit
// per-repo override, so passing scope:'project' remains available.
function set(plugin, level, opts = {}) {
  const reg = registry.get(plugin);
  if (reg && !reg.levels.has(level)) {
    throw new Error(
      `mode.set(${plugin}): "${level}" not a known level (${[...reg.levels].join(', ')})`,
    );
  }
  return config.set(plugin, 'mode', level, { scope: 'global', ...opts });
}

function isActive(plugin, opts) {
  return get(plugin, opts) !== OFF;
}

module.exports = { OFF, define, levels, get, set, isActive };
