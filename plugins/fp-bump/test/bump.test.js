'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const bump = require('../hooks/bump');

// --- version readers -------------------------------------------------------

test('version readers parse each supported format', () => {
  assert.equal(bump.readPkgJson('{"version":"1.2.3"}'), '1.2.3');
  assert.equal(bump.readPkgJson('{"name":"x"}'), null);
  assert.equal(bump.readPkgJson('not json'), null);
  assert.equal(bump.readTomlVersion('[package]\nversion = "0.4.0"\n'), '0.4.0');
  assert.equal(bump.readTomlVersion("version = '9.9.9'"), '9.9.9');
  assert.equal(bump.readPlain('2.0.0\n'), '2.0.0');
});

test('detectVersionFile picks the first present file with a version', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-'));
  assert.equal(bump.detectVersionFile(dir), null);
  fs.writeFileSync(path.join(dir, 'Cargo.toml'), '[package]\nversion = "3.1.4"\n');
  let vf = bump.detectVersionFile(dir);
  assert.equal(vf.name, 'Cargo.toml');
  assert.equal(vf.version, '3.1.4');
  // package.json takes precedence (earlier in the ordered list)
  fs.writeFileSync(path.join(dir, 'package.json'), '{"version":"1.0.0"}');
  vf = bump.detectVersionFile(dir);
  assert.equal(vf.name, 'package.json');
  assert.equal(vf.version, '1.0.0');
  fs.rmSync(dir, { recursive: true, force: true });
});

// --- commit detection ------------------------------------------------------

test('isGitCommit matches real commits, ignores look-alikes', () => {
  assert.ok(bump.isGitCommit('git commit -m "x"'));
  assert.ok(bump.isGitCommit('git add . && git commit -m "x"'));
  assert.ok(bump.isGitCommit('git -C /repo commit -m "x"'));
  assert.equal(bump.isGitCommit('git commit -h'), false);
  assert.equal(bump.isGitCommit('git commit --help'), false);
  assert.equal(bump.isGitCommit('git log --grep commit'), false);
  assert.equal(bump.isGitCommit('npm run commitlint'), false);
  assert.equal(bump.isGitCommit(''), false);
});

// --- ratchet & SemVer math -------------------------------------------------

test('ratchet keeps the highest level and floors unknown input to none', () => {
  assert.equal(bump.ratchet('none', 'patch'), 'patch');
  assert.equal(bump.ratchet('minor', 'patch'), 'minor'); // can't climb down
  assert.equal(bump.ratchet('patch', 'major'), 'major');
  assert.equal(bump.ratchet('major', 'minor'), 'major');
  assert.equal(bump.ratchet('bogus', 'patch'), 'patch'); // unknown treated as none
  assert.equal(bump.ratchet('minor', 'bogus'), 'minor');
  assert.equal(bump.ratchet('none', 'none'), 'none');
});

test('nextVersion bumps one level and rejects non-SemVer', () => {
  assert.equal(bump.nextVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(bump.nextVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bump.nextVersion('1.2.3', 'major'), '2.0.0');
  assert.equal(bump.nextVersion('0.1.0', 'minor'), '0.2.0');
  assert.equal(bump.nextVersion('v2.3.4', 'patch'), '2.3.5'); // v-prefix tolerated
  assert.equal(bump.nextVersion('1.2.3', 'none'), null);
  assert.equal(bump.nextVersion('nope', 'patch'), null);
});

// --- pure commit gate ------------------------------------------------------

const gateCase = {
  command: 'git commit -m "x"',
  mode: 'suggest',
  hasVersionFile: true,
  hasStagedChanges: true,
  hasHead: true,
  pending: 'none',
  stagedTree: 'tree-abc',
  assessedTree: '',
  cliPath: '/p/cli.js',
};

test('decide denies a commit whose staged changes are not sized yet', () => {
  const r = bump.decide(gateCase);
  assert.equal(r.decision, 'deny');
  assert.match(r.reason, /fp-bump:/);
  assert.match(r.reason, /assess <level>/);
  assert.match(r.reason, /\/p\/cli\.js/); // the resolved cli path is handed to the model
});

test('decide allows once this exact staged content has been sized', () => {
  const r = bump.decide({ ...gateCase, assessedTree: 'tree-abc' });
  assert.equal(r.decision, 'allow');
});

test('decide allows when off, non-commit, no staged, no version file, first commit, or maxed', () => {
  assert.equal(bump.decide({ ...gateCase, mode: 'off' }).decision, 'allow');
  assert.equal(bump.decide({ ...gateCase, command: 'git status' }).decision, 'allow');
  assert.equal(bump.decide({ ...gateCase, hasStagedChanges: false }).decision, 'allow');
  assert.equal(bump.decide({ ...gateCase, hasVersionFile: false }).decision, 'allow');
  assert.equal(bump.decide({ ...gateCase, hasHead: false }).decision, 'allow');
  assert.equal(bump.decide({ ...gateCase, pending: 'major' }).decision, 'allow'); // can't climb higher
});

// --- cli: assess, release, reset -------------------------------------------

function withProject(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-home-'));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-proj-'));
  const prevHome = process.env.FLAREPOINT_CONFIG_HOME;
  const prevCwd = process.cwd();
  process.env.FLAREPOINT_CONFIG_HOME = home;
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  fs.writeFileSync(path.join(project, 'package.json'), '{\n  "version": "1.0.0"\n}\n');
  process.chdir(project);
  delete require.cache[require.resolve('../hooks/cli')];
  const cli = require('../hooks/cli');
  try {
    fn(cli);
  } finally {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.FLAREPOINT_CONFIG_HOME;
    else process.env.FLAREPOINT_CONFIG_HOME = prevHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
}

test('cli mode switches and reports', () => {
  withProject((cli) => {
    assert.equal(cli.run('status'), 'fp-bump: suggest · nothing pending'); // default
    assert.equal(cli.run('auto'), 'fp-bump: auto');
    assert.equal(cli.run('off'), 'fp-bump: off');
    assert.equal(cli.run('on'), 'fp-bump: suggest');
    assert.match(cli.run('help'), /\/fp-bump:release/);
  });
});

test('cli assess ratchets the pending level and never lowers it', () => {
  withProject((cli) => {
    assert.match(cli.run('assess', 'patch'), /pending release is now patch/);
    assert.match(cli.run('assess', 'minor'), /pending release is now minor/);
    assert.match(cli.run('assess', 'patch'), /pending release is now minor/); // stays minor
    assert.equal(cli.run('status'), 'fp-bump: suggest · minor pending');
    assert.match(cli.run('assess', 'sideways'), /needs a level/);
  });
});

test('cli release sizes one bump from the pending level, reset clears it', () => {
  withProject((cli) => {
    assert.match(cli.run('release'), /nothing pending/);
    cli.run('assess', 'minor');
    const out = cli.run('release');
    assert.match(out, /1\.0\.0 -> 1\.1\.0/);
    assert.match(out, /Propose this to the user/); // suggest mode waits
    cli.run('auto');
    assert.match(cli.run('release'), /Set "version" to 1\.1\.0/); // auto applies
    assert.equal(cli.run('reset').includes('cleared'), true);
    assert.match(cli.run('release'), /nothing pending/);
  });
});

// --- integration: real git repo, real precommit.js -------------------------

function hasGit() {
  return spawnSync('git', ['--version'], { encoding: 'utf8' }).status === 0;
}

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

function runPrecommit(repo, command, home) {
  const r = spawnSync('node', [path.join(__dirname, '..', 'hooks', 'precommit.js')], {
    cwd: repo,
    encoding: 'utf8',
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: repo }),
    env: { ...process.env, FLAREPOINT_CONFIG_HOME: home },
  });
  return r.stdout || '';
}

function runCli(repo, args, home) {
  const r = spawnSync('node', [path.join(__dirname, '..', 'hooks', 'cli.js'), ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, FLAREPOINT_CONFIG_HOME: home },
  });
  return (r.stdout || '').trim();
}

test('precommit denies until the staged changes are sized, then allows', { skip: !hasGit() }, () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-git-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-h-'));
  try {
    git(['init', '-q'], repo);
    git(['config', 'user.email', 't@t.t'], repo);
    git(['config', 'user.name', 't'], repo);
    fs.writeFileSync(path.join(repo, 'package.json'), '{\n  "version": "1.0.0"\n}\n');
    fs.writeFileSync(path.join(repo, 'a.js'), 'module.exports = 1;\n');
    git(['add', '.'], repo);
    git(['commit', '-q', '-m', 'initial'], repo);

    // a code change, staged, not sized yet -> deny with an assess instruction
    fs.writeFileSync(path.join(repo, 'a.js'), 'module.exports = 2;\n');
    git(['add', 'a.js'], repo);
    const denied = runPrecommit(repo, 'git commit -m "feature"', home);
    assert.match(denied, /"permissionDecision":"deny"/);
    assert.match(denied, /assess <level>/);

    // size it, and the version file stays untouched (no bump at commit time)
    assert.match(runCli(repo, ['assess', 'minor'], home), /pending release is now minor/);
    assert.match(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'), /"version": "1\.0\.0"/);

    // same staged content, now sized -> allow (empty output)
    assert.equal(runPrecommit(repo, 'git commit -m "feature"', home).trim(), '');

    // stage a further change -> the new content isn't sized, so deny again
    fs.writeFileSync(path.join(repo, 'b.js'), 'module.exports = 3;\n');
    git(['add', 'b.js'], repo);
    assert.match(runPrecommit(repo, 'git commit -m "more"', home), /"permissionDecision":"deny"/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('precommit ignores non-commit bash and off mode', { skip: !hasGit() }, () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-git2-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-h2-'));
  try {
    git(['init', '-q'], repo);
    git(['config', 'user.email', 't@t.t'], repo);
    git(['config', 'user.name', 't'], repo);
    fs.writeFileSync(path.join(repo, 'package.json'), '{\n  "version": "1.0.0"\n}\n');
    fs.writeFileSync(path.join(repo, 'a.js'), 'x\n');
    git(['add', '.'], repo);
    git(['commit', '-q', '-m', 'initial'], repo);
    fs.writeFileSync(path.join(repo, 'a.js'), 'y\n');
    git(['add', 'a.js'], repo);

    assert.equal(runPrecommit(repo, 'git status', home).trim(), ''); // not a commit
    // off mode: write project config disabling bump
    fs.mkdirSync(path.join(repo, '.flarepoint'), { recursive: true });
    fs.writeFileSync(
      path.join(repo, '.flarepoint', 'config.json'),
      JSON.stringify({ bump: { mode: 'off' } }),
    );
    assert.equal(runPrecommit(repo, 'git commit -m "x"', home).trim(), '');
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});
