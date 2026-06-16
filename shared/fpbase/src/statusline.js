'use strict';

// One combined statusline for all installed fp plugins. There's a single
// statusline slot, so the base owns rendering and each plugin contributes a
// segment. Off by default (config 'statusline.enabled'); only active plugins
// appear.
//
// Example: "fp · honesty:full · mem:5 · prod"

const SEP = ' · ';
const BRAND = 'fp';

// segments: [{ label, value, active }]
//   label ''  -> bare value (e.g. a profile name "prod")
//   active     -> include only when true
function render(segments = [], { enabled = false } = {}) {
  if (!enabled) return '';
  const parts = segments
    .filter((s) => s && s.active && s.value !== undefined && s.value !== null && s.value !== '')
    .map((s) => (s.label ? `${s.label}:${s.value}` : `${s.value}`));
  if (parts.length === 0) return '';
  return `${BRAND}${SEP}${parts.join(SEP)}`;
}

module.exports = { BRAND, SEP, render };
