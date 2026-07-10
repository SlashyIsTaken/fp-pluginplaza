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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fpsic-'));
  const project = path.join(root, 'project');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  process.env.FLAREPOINT_CONFIG_HOME = path.join(root, 'global');
  const prev = process.cwd();
  process.chdir(project);
  return { cleanup() { process.chdir(prev); fs.rmSync(root, { recursive: true, force: true }); } };
}

test('inject is silent off, framed and substantive on', () => {
  assert.equal(inject.buildContext('off'), '');

  const on = inject.buildContext('on');
  assert.match(on, /^<fp:sicem mode=on>/);
  assert.match(on, /PROSE ARTIFACTS/);
  assert.match(on, /Default the em-dash out of existence/);
  assert.match(on, /semicolon/);
  assert.match(on, /without lowering the vocabulary/i);
  // it explicitly spares chat, code, and code comments
  assert.match(on, /NOT touch your chat replies/);
  assert.match(on, /comments are fp-minify's job/);
});

test('a mode note shows even when off', () => {
  const out = inject.buildContext('off', { note: 'fp-sicem switched to "off"' });
  assert.match(out, /switched to "off"/);
  assert.match(out, /mode=off/);
});

test('detectDirective parses switches and ignores mid-sentence mentions', () => {
  assert.equal(inject.detectDirective('/fp-sicem off'), 'off');
  assert.equal(inject.detectDirective('fp-sicem on'), 'on');
  assert.equal(inject.detectDirective('/fp-sicem:fp-sicem on'), 'on');
  assert.equal(inject.detectDirective('fp-sicem show'), 'show');
  assert.equal(inject.detectDirective('stop fp-sicem please'), 'off');
  assert.equal(inject.detectDirective('I like fp-sicem a lot'), null);
  assert.equal(inject.detectDirective('what is the weather'), null);
});

test('applyDirective flips the saved mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  inject.applyDirective('off');
  assert.equal(require('../hooks/sicem').base.mode.get('sicem'), 'off');
  inject.applyDirective('on');
  assert.equal(require('../hooks/sicem').base.mode.get('sicem'), 'on');
});

test('applyDirective show reports without changing the mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const note = inject.applyDirective('show');
  assert.match(note, /currently "on"/); // default
  assert.equal(require('../hooks/sicem').base.mode.get('sicem'), 'on');
});

test('cli round-trips the mode and defaults on', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  assert.equal(cli.run('show'), 'fp-sicem: on'); // default
  assert.equal(cli.run('off'), 'fp-sicem: off');
  assert.equal(cli.run('show'), 'fp-sicem: off');
  assert.equal(cli.run('on'), 'fp-sicem: on');
});

test('statusline segment reflects mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const seg = statusline.segment();
  assert.equal(seg.label, 'sicem');
  assert.equal(seg.value, 'on');
  assert.equal(seg.active, true);
});
