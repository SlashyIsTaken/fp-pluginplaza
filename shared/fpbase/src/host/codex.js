'use strict';

// Emit Codex manifests from the same descriptor used for Claude.
//   <out>/.codex-plugin/plugin.json
//
// ⚠ PROVISIONAL: Codex's exact lifecycle-hook schema and its equivalent of
// UserPromptSubmit injection are not yet verified against a live Codex install.
// This emitter mirrors the Claude shape and records the hook
// intent under `hooks`; the per-host shim is finalized when we test on Codex.
// Until then, treat Codex hook wiring as "inferred", not "verified".

const path = require('path');
const { atomicWrite } = require('../util');

const PLUGIN_ROOT = '${CODEX_PLUGIN_ROOT}';

function pluginJson(descriptor) {
  return {
    name: descriptor.name,
    description: descriptor.description || '',
    version: descriptor.version || '0.0.0',
    author: descriptor.author || { name: 'Flarepoint' },
    // Carried for the shim to translate once the real schema is confirmed.
    hooks: (descriptor.hooks || []).map((h) => ({
      event: h.event,
      command: `node ${PLUGIN_ROOT}/${h.script}`,
    })),
  };
}

function emit(descriptor, outDir) {
  atomicWrite(
    path.join(outDir, '.codex-plugin', 'plugin.json'),
    `${JSON.stringify(pluginJson(descriptor), null, 2)}\n`,
  );
  return outDir;
}

module.exports = { emit, pluginJson, PROVISIONAL: true };
