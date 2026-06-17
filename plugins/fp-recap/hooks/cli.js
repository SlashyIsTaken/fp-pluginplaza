'use strict';

// Backs the /fp-recap:mode command and lets the model print the stored recap on
// demand ("where was I"). Output is deterministic (no model round-trip).
//   node cli.js [status | on | off | verbose | show | help]

const { base, PLUGIN, loadRecap } = require('./recap');

const HELP = [
  'fp-recap control (/fp-recap:mode <arg>):',
  '  status     show the current mode',
  '  on         persist a concise recap each turn, surface it next session (default)',
  '  verbose    persist a fuller recap (more files and commands, plus files read)',
  '  off        stop capturing and surfacing recaps',
  '  show       print the recap stored for this project',
  '  help       this list',
].join('\n');

function run(arg) {
  const cmd = (arg || 'status').toLowerCase();
  switch (cmd) {
    case 'status':
    case 'show-status':
      return `fp-recap: ${base.mode.get(PLUGIN)}`;
    case 'on':
    case 'verbose':
    case 'off':
      base.mode.set(PLUGIN, cmd);
      return `fp-recap: ${cmd}`;
    case 'show': {
      const recap = loadRecap();
      return recap || 'fp-recap: no recap stored for this project yet.';
    }
    case 'help':
      return HELP;
    default:
      return `fp-recap: unknown "${cmd}" (use status|on|verbose|off|show|help)`;
  }
}

if (require.main === module) {
  process.stdout.write(`${run(process.argv[2])}\n`);
}

module.exports = { run };
