'use strict';

// Emit Claude Code manifests from a single plugin descriptor.
//   <out>/.claude-plugin/plugin.json
//   <out>/hooks/hooks.json
//
// Skills and commands are auto-discovered by Claude Code from skills/ and
// commands/, so we only generate the plugin manifest and the hook wiring.

const path = require('path');
const { atomicWrite } = require('../util');

const PLUGIN_ROOT = '${CLAUDE_PLUGIN_ROOT}';

function hooksJson(descriptor) {
  const byEvent = {};
  for (const h of descriptor.hooks || []) {
    const win = h.script.split('/').join('\\');
    (byEvent[h.event] = byEvent[h.event] || []).push({
      hooks: [{
        type: 'command',
        // Guard on node so a machine without it degrades quietly instead of
        // erroring every turn; quote the path so spaces never break it.
        command: `command -v node >/dev/null 2>&1 && node "${PLUGIN_ROOT}/${h.script}" || exit 0`,
        commandWindows: `if (Get-Command node -ErrorAction SilentlyContinue) { node "$env:CLAUDE_PLUGIN_ROOT\\${win}" }`,
        timeout: 5,
      }],
    });
  }
  return { hooks: byEvent };
}

// The marketplace manifest is what `/plugin marketplace add <owner/repo>` reads.
// We make each plugin its own single-plugin marketplace (source "./"), so a user
// installs straight from the plugin's GitHub repo.
function marketplaceJson(descriptor) {
  return {
    $schema: 'https://anthropic.com/claude-code/marketplace.schema.json',
    name: descriptor.name,
    description: descriptor.description || '',
    owner: descriptor.author || { name: 'Flarepoint' },
    plugins: [
      {
        name: descriptor.name,
        description: descriptor.description || '',
        source: './',
        category: descriptor.category || 'productivity',
      },
    ],
  };
}

function pluginJson(descriptor) {
  // Only fields Claude Code recognizes. (There is no plugin-level statusline
  // field today, so we don't emit one; the combined statusline is deferred.)
  return {
    name: descriptor.name,
    description: descriptor.description || '',
    version: descriptor.version || '0.0.0',
    author: descriptor.author || { name: 'Flarepoint' },
  };
}

function emit(descriptor, outDir) {
  atomicWrite(
    path.join(outDir, '.claude-plugin', 'plugin.json'),
    `${JSON.stringify(pluginJson(descriptor), null, 2)}\n`,
  );
  atomicWrite(
    path.join(outDir, '.claude-plugin', 'marketplace.json'),
    `${JSON.stringify(marketplaceJson(descriptor), null, 2)}\n`,
  );
  if ((descriptor.hooks || []).length) {
    atomicWrite(
      path.join(outDir, 'hooks', 'hooks.json'),
      `${JSON.stringify(hooksJson(descriptor), null, 2)}\n`,
    );
  }
  return outDir;
}

module.exports = { emit, hooksJson, pluginJson, marketplaceJson };
