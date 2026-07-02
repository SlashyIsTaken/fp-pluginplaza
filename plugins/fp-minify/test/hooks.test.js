'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const inject = require('../hooks/inject');
const cli = require('../hooks/cli');
const statusline = require('../hooks/statusline');

// Isolated config home + project cwd (with a .git marker so the project root
// anchors here). cli/statusline read mode from cwd, so we chdir.
function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fpmin-'));
  const project = path.join(root, 'project');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  process.env.FLAREPOINT_CONFIG_HOME = path.join(root, 'global');
  const prev = process.cwd();
  process.chdir(project);
  return { cleanup() { process.chdir(prev); fs.rmSync(root, { recursive: true, force: true }); } };
}

test('inject is silent off, framed and substantive on tidy', () => {
  assert.equal(inject.buildContext('off'), '');

  const tidy = inject.buildContext('tidy');
  assert.match(tidy, /^<fp:minify mode=tidy>/);
  assert.match(tidy, /keep code comments concise/i);
  assert.match(tidy, /Why, not what/);
  assert.match(tidy, /self-contained and short/);
  assert.match(tidy, /commit message/);
  assert.match(tidy, /JSDoc\/TSDoc, docstrings, godoc/);
  assert.match(tidy, /never changes what the code does/);
  // tidy reaches into edited blocks; new does not
  assert.match(tidy, /already inside any block you edit/);
});

test('new mode shapes only fresh comments and spares existing ones', () => {
  const out = inject.buildContext('new');
  assert.match(out, /^<fp:minify mode=new>/);
  assert.match(out, /Why, not what/); // same doctrine
  assert.match(out, /leave existing comments as they are/);
  assert.doesNotMatch(out, /already inside any block you edit/); // the tidy-only clause
});

test('a mode note shows even when off', () => {
  const out = inject.buildContext('off', { note: 'fp-minify switched to "off"' });
  assert.match(out, /switched to "off"/);
  assert.match(out, /mode=off/);
});

test('detectDirective parses switches and ignores mid-sentence mentions', () => {
  assert.equal(inject.detectDirective('/fp-minify off'), 'off');
  assert.equal(inject.detectDirective('fp-minify new'), 'new');
  assert.equal(inject.detectDirective('fp-minify tidy'), 'tidy');
  assert.equal(inject.detectDirective('fp-minify on'), 'on');
  assert.equal(inject.detectDirective('/fp-minify:fp-minify tidy'), 'tidy');
  assert.equal(inject.detectDirective('fp-minify show'), 'show');
  assert.equal(inject.detectDirective('stop fp-minify please'), 'off');
  assert.equal(inject.detectDirective('I like fp-minify a lot'), null);
  assert.equal(inject.detectDirective('what is the weather'), null);
});

test('applyDirective flips the saved mode, mapping on -> tidy', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  inject.applyDirective('new');
  assert.equal(require('../hooks/minify').base.mode.get('minify'), 'new');
  inject.applyDirective('off');
  assert.equal(require('../hooks/minify').base.mode.get('minify'), 'off');
  inject.applyDirective('on');
  assert.equal(require('../hooks/minify').base.mode.get('minify'), 'tidy');
});

test('applyDirective show reports without changing the mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const note = inject.applyDirective('show');
  assert.match(note, /currently "tidy"/); // default
  assert.equal(require('../hooks/minify').base.mode.get('minify'), 'tidy');
});

test('cli round-trips the mode and defaults tidy', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  assert.equal(cli.run('show'), 'fp-minify: tidy'); // default
  assert.equal(cli.run('new'), 'fp-minify: new');
  assert.equal(cli.run('show'), 'fp-minify: new');
  assert.equal(cli.run('off'), 'fp-minify: off');
  assert.equal(cli.run('on'), 'fp-minify: tidy'); // on maps to the default
});

test('statusline segment reflects mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const seg = statusline.segment();
  assert.equal(seg.label, 'minify');
  assert.equal(seg.value, 'tidy');
  assert.equal(seg.active, true);
});
