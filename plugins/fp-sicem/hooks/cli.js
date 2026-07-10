'use strict';

// Backs the /fp-sicem:mode command: set the mode or report status. Output is
// deterministic (no model round-trip) — the command surfaces this line directly.
//   node cli.js [status | show | on | off | help]

const { base, PLUGIN } = require('./sicem');

const HELP = [
  "fp-sicem control (/fp-sicem:mode <arg>):",
  '  status        show the current mode',
  '  on            connect prose with clear connectors, em-dash first on the block (default)',
  '  off           disable; write prose as usual',
  '  help          this list',
].join('\n');

function run(arg) {
  const cmd = (arg || 'status').toLowerCase();
  switch (cmd) {
    case 'status':
    case 'show':
      return `fp-sicem: ${base.mode.get(PLUGIN)}`;
    case 'on':
    case 'off':
      base.mode.set(PLUGIN, cmd);
      return `fp-sicem: ${cmd}`;
    case 'help':
      return HELP;
    default:
      return `fp-sicem: unknown "${cmd}" (use status|on|off|help)`;
  }
}

if (require.main === module) {
  process.stdout.write(`${run(process.argv[2])}\n`);
}

module.exports = { run };
