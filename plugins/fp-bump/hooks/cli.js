'use strict';

// Backs the fp-bump commands and the model's own bookkeeping. Every path is
// deterministic (no model round-trip), so a command can surface the line
// directly.
//
//   node cli.js [status | suggest | auto | off | on | help]   apply mode (flush)
//   node cli.js assess <patch|minor|major>                    ratchet pending
//   node cli.js release                                       size the flush
//   node cli.js reset                                         clear the ledger
//
// "Mode" governs the release flush, not the commit: suggest proposes the
// release bump, auto applies it, off does nothing.

const {
  base,
  PLUGIN,
  getPending,
  setPending,
  setAssessedTree,
  clearPending,
  ratchet,
  nextVersion,
  detectVersionFile,
  stagedTree,
} = require('./bump');

const HELP = [
  'fp-bump control:',
  '  /fp-bump:mode status     show mode and pending release level',
  '  /fp-bump:mode suggest    propose the release bump, confirm first (default)',
  '  /fp-bump:mode auto       size and apply the release bump automatically',
  '  /fp-bump:mode off        do nothing',
  '  /fp-bump:release         apply the pending bump as one release',
  '  (the model records each commit with: cli.js assess <patch|minor|major>)',
].join('\n');

function root() {
  return base.config.paths().projectRoot;
}

// Ratchet the pending release level up by this commit's size, and remember the
// staged content we sized so the commit hook lets the re-run through.
function assess(level) {
  const lvl = String(level || '').toLowerCase();
  if (!['patch', 'minor', 'major'].includes(lvl)) {
    return 'fp-bump: assess needs a level — patch, minor, or major.';
  }
  const next = ratchet(getPending(), lvl);
  setPending(next);
  const tree = stagedTree(root());
  if (tree) setAssessedTree(tree);
  return `fp-bump: sized this commit as ${lvl}; pending release is now ${next}.`;
}

// Turn the accumulated level into one concrete bump for the model to apply.
function release() {
  const pending = getPending();
  if (pending === 'none') {
    return 'fp-bump: nothing pending — no release-worthy changes since the last version.';
  }
  const vf = detectVersionFile(root());
  if (!vf) return 'fp-bump: no version file found, so there is nothing to bump.';
  const next = nextVersion(vf.version, pending);
  if (!next) {
    return `fp-bump: can't read "${vf.version}" in ${vf.name} as a SemVer version; bump it by hand, then run /fp-bump:reset.`;
  }
  const mode = base.mode.get(PLUGIN);
  const head = `fp-bump: pending release is ${pending}: ${vf.name} ${vf.version} -> ${next}.`;
  const act =
    mode === 'auto'
      ? `Set "version" to ${next} in ${vf.name}, stage it, then run \`node cli.js reset\` to clear the ledger.`
      : `Propose this to the user in one line and wait for an OK. On approval, set "version" to ${next} in ${vf.name}, stage it, then run \`node cli.js reset\`.`;
  return `${head} ${act}`;
}

function status() {
  const pending = getPending();
  const mode = base.mode.get(PLUGIN);
  return pending === 'none'
    ? `fp-bump: ${mode} · nothing pending`
    : `fp-bump: ${mode} · ${pending} pending`;
}

function run(arg, rest) {
  const cmd = (arg || 'status').toLowerCase();
  switch (cmd) {
    case 'status':
    case 'show':
      return status();
    case 'suggest':
    case 'auto':
    case 'off':
      base.mode.set(PLUGIN, cmd);
      return `fp-bump: ${cmd}`;
    case 'on':
      base.mode.set(PLUGIN, 'suggest');
      return 'fp-bump: suggest';
    case 'assess':
      return assess(rest);
    case 'release':
      return release();
    case 'reset':
      clearPending();
      return 'fp-bump: ledger cleared — nothing pending.';
    case 'help':
      return HELP;
    default:
      return `fp-bump: unknown "${cmd}" (use status|suggest|auto|off|assess|release|reset|help)`;
  }
}

if (require.main === module) {
  process.stdout.write(`${run(process.argv[2], process.argv[3])}\n`);
}

module.exports = { run, assess, release, status };
