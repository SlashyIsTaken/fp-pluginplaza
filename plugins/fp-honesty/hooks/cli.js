'use strict';

// Backs the /fp-honesty:mode command: set the mode or report status. Output is
// deterministic (no model round-trip) — the command surfaces this line directly.
//   node cli.js [status | show | off | footer | full | on | review | help]

const { base, PLUGIN, flagFile } = require('./honesty');

const HELP = [
  'fp-honesty control (/fp-honesty:mode <arg>):',
  '  status        show the current mode',
  '  full          inline tags + footer tally (default)',
  '  footer        footer tally only, no inline tags',
  '  off           disable annotation',
  '  on            alias for full',
  '  review        show any pending backstop disclosure',
  '  help          this list',
].join('\n');

function run(arg) {
  const cmd = (arg || 'status').toLowerCase();
  switch (cmd) {
    case 'status':
    case 'show':
      return `fp-honesty: ${base.mode.get(PLUGIN)}`;
    case 'off':
    case 'footer':
    case 'full':
      base.mode.set(PLUGIN, cmd);
      return `fp-honesty: ${cmd}`;
    case 'on':
      base.mode.set(PLUGIN, 'full');
      return 'fp-honesty: full';
    case 'review': {
      const data = base.util.readJSON(flagFile(), null);
      return data ? data.disclosure : 'fp-honesty: nothing pending.';
    }
    case 'help':
      return HELP;
    default:
      return `fp-honesty: unknown "${cmd}" (use status|full|footer|off|on|review|help)`;
  }
}

if (require.main === module) {
  process.stdout.write(`${run(process.argv[2])}\n`);
}

module.exports = { run, flagFile };
