'use strict';

// Contributes the bump segment to the combined, opt-in fp statusline. Enabled
// via the shared `statusline.enabled` config; silent otherwise. Shows the
// pending release level when one is building, so the accumulating magnitude is
// always visible without acting on it. Example: "fp · bump:minor pending".

const { base, PLUGIN, getPending } = require('./bump');

function segment() {
  const mode = base.mode.get(PLUGIN);
  if (mode === base.mode.OFF) return { label: PLUGIN, value: mode, active: false };
  const pending = getPending();
  const value = pending === 'none' ? mode : `${pending} pending`;
  return { label: PLUGIN, value, active: true };
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
