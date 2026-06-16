'use strict';

// Backs the /fp-bump:mode command: report or switch the apply mode. Output is
// deterministic (no model round-trip) — the command surfaces this line directly.
//   node cli.js [status | suggest | auto | off | on | help]

const { base, PLUGIN } = require('./bump');

const HELP = [
  'fp-bump control (/fp-bump:mode <arg>):',
  '  status     show the current mode',
  '  suggest    propose a bump at commit, confirm before writing (default)',
  '  auto       size and apply the bump automatically at commit',
  '  off        never interfere with commits',
  '  on         alias for suggest',
  '  help       this list',
].join('\n');

function run(arg) {
  const cmd = (arg || 'status').toLowerCase();
  switch (cmd) {
    case 'status':
    case 'show':
      return `fp-bump: ${base.mode.get(PLUGIN)}`;
    case 'suggest':
    case 'auto':
    case 'off':
      base.mode.set(PLUGIN, cmd);
      return `fp-bump: ${cmd}`;
    case 'on':
      base.mode.set(PLUGIN, 'suggest');
      return 'fp-bump: suggest';
    case 'help':
      return HELP;
    default:
      return `fp-bump: unknown "${cmd}" (use status|suggest|auto|off|help)`;
  }
}

if (require.main === module) {
  process.stdout.write(`${run(process.argv[2])}\n`);
}

module.exports = { run };
