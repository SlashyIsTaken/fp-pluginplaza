'use strict';

// Backs the /fp-barbeque:mode command: set the mode or report status. Output is
// deterministic (no model round-trip) — the command surfaces this line directly.
//   node cli.js [status | show | on | off | help]

const { base, PLUGIN } = require('./barbeque');

const HELP = [
  'fp-barbeque control (/fp-barbeque:mode <arg>):',
  '  status        show the current mode',
  '  on            grill toward mutual understanding before building (default)',
  '  off           disable; build straight away',
  '  help          this list',
].join('\n');

function run(arg) {
  const cmd = (arg || 'status').toLowerCase();
  switch (cmd) {
    case 'status':
    case 'show':
      return `fp-barbeque: ${base.mode.get(PLUGIN)}`;
    case 'on':
    case 'off':
      base.mode.set(PLUGIN, cmd);
      return `fp-barbeque: ${cmd}`;
    case 'help':
      return HELP;
    default:
      return `fp-barbeque: unknown "${cmd}" (use status|on|off|help)`;
  }
}

if (require.main === module) {
  process.stdout.write(`${run(process.argv[2])}\n`);
}

module.exports = { run };
