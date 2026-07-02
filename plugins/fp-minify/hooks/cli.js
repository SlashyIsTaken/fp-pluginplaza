'use strict';

// Backs the /fp-minify:mode command: set the mode or report status. Output is
// deterministic (no model round-trip) — the command surfaces this line directly.
//   node cli.js [status | show | new | tidy | on | off | help]

const { base, PLUGIN } = require('./minify');

const HELP = [
  'fp-minify control (/fp-minify:mode <arg>):',
  '  status        show the current mode',
  '  tidy          shape new comments + tidy comments in blocks you edit (default)',
  '  new           shape only newly-written comments; leave existing ones alone',
  '  off           disable',
  '  help          this list',
].join('\n');

function run(arg) {
  const cmd = (arg || 'status').toLowerCase();
  switch (cmd) {
    case 'status':
    case 'show':
      return `fp-minify: ${base.mode.get(PLUGIN)}`;
    case 'on':
      base.mode.set(PLUGIN, 'tidy');
      return 'fp-minify: tidy';
    case 'new':
    case 'tidy':
    case 'off':
      base.mode.set(PLUGIN, cmd);
      return `fp-minify: ${cmd}`;
    case 'help':
      return HELP;
    default:
      return `fp-minify: unknown "${cmd}" (use status|new|tidy|off|help)`;
  }
}

if (require.main === module) {
  process.stdout.write(`${run(process.argv[2])}\n`);
}

module.exports = { run };
