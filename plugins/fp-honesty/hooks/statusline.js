'use strict';

// Contributes the honesty segment to the combined, opt-in fp statusline.
// Enabled via the shared `statusline.enabled` config; silent otherwise.

const { base, PLUGIN } = require('./honesty');

function segment() {
  const mode = base.mode.get(PLUGIN);
  return { label: PLUGIN, value: mode, active: mode !== base.mode.OFF };
}

function run() {
  try {
    const enabled = base.config.get('statusline', 'enabled', false);
    const out = base.statusline.render([segment()], { enabled });
    if (out) process.stdout.write(out);
  } catch {
    // never break the statusline
  }
}

if (require.main === module) run();

module.exports = { segment, run };
