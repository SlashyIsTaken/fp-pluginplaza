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

// --- pure decision ---------------------------------------------------------

const baseCase = {
  command: 'git commit -m "x"',
  mode: 'suggest',
  versionFile: { name: 'package.json', version: '1.0.0' },
  headVersion: '1.0.0',
  hasStagedChanges: true,
  hasHead: true,
};

test('decide denies a staged commit with an unchanged version', () => {
  const r = bump.decide(baseCase);
  assert.equal(r.decision, 'deny');
  assert.match(r.reason, /fp-bump:/);
  assert.match(r.reason, /package\.json/);
});

test('decide allows once the version has moved past HEAD', () => {
  const r = bump.decide({ ...baseCase, versionFile: { name: 'package.json', version: '1.1.0' } });
  assert.equal(r.decision, 'allow');
});

test('decide allows when off, non-commit, no staged changes, no version file, or first commit', () => {
  assert.equal(bump.decide({ ...baseCase, mode: 'off' }).decision, 'allow');
  assert.equal(bump.decide({ ...baseCase, command: 'git status' }).decision, 'allow');
  assert.equal(bump.decide({ ...baseCase, hasStagedChanges: false }).decision, 'allow');
  assert.equal(bump.decide({ ...baseCase, versionFile: null }).decision, 'allow');
  assert.equal(bump.decide({ ...baseCase, hasHead: false }).decision, 'allow');
});

test('decide reason reflects the mode (auto applies, suggest confirms)', () => {
  assert.match(bump.decide({ ...baseCase, mode: 'auto' }).reason, /auto mode/);
  assert.match(bump.decide(baseCase).reason, /wait for confirmation/);
});

// --- cli -------------------------------------------------------------------

test('cli switches and reports mode in an isolated config home', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-home-'));
  const prevHome = process.env.FLAREPOINT_CONFIG_HOME;
  const prevCwd = process.cwd();
  process.env.FLAREPOINT_CONFIG_HOME = home;
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'fpb-proj-'));
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  process.chdir(project);
  try {
    delete require.cache[require.resolve('../hooks/cli')];
    const cli = require('../hooks/cli');
    assert.equal(cli.run('status'), 'fp-bump: suggest'); // default
    assert.equal(cli.run('auto'), 'fp-bump: auto');
    assert.equal(cli.run('status'), 'fp-bump: auto');
    assert.equal(cli.run('off'), 'fp-bump: off');
    assert.equal(cli.run('on'), 'fp-bump: suggest');
    assert.match(cli.run('help'), /\/fp-bump:mode/);
  } finally {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.FLAREPOINT_CONFIG_HOME;
    else process.env.FLAREPOINT_CONFIG_HOME = prevHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
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

test('precommit denies an un-bumped commit, allows once bumped', { skip: !hasGit() }, () => {
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

    // a code change, staged, version untouched -> deny
    fs.writeFileSync(path.join(repo, 'a.js'), 'module.exports = 2;\n');
    git(['add', 'a.js'], repo);
    const denied = runPrecommit(repo, 'git commit -m "change"', home);
    assert.match(denied, /"permissionDecision":"deny"/);
    assert.match(denied, /fp-bump:/);

    // now bump the version and stage it -> allow (empty output)
    fs.writeFileSync(path.join(repo, 'package.json'), '{\n  "version": "1.1.0"\n}\n');
    git(['add', 'package.json'], repo);
    const allowed = runPrecommit(repo, 'git commit -m "change"', home);
    assert.equal(allowed.trim(), '');
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
