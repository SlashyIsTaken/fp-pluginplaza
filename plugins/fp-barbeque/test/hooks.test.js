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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fpbq-'));
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
  assert.match(on, /^<fp:barbeque mode=on>/);
  assert.match(on, /Understanding-first mode/);
  assert.match(on, /do NOT start implementing yet/);
  assert.match(on, /option-dialog/);
  assert.match(on, /debug and own the result/);
  assert.match(on, /just build/); // the skip-trivial escape hatch survives
});

test('a mode note shows even when off', () => {
  const out = inject.buildContext('off', { note: 'fp-barbeque switched to "off"' });
  assert.match(out, /switched to "off"/);
  assert.match(out, /mode=off/);
});

test('detectDirective parses switches and ignores mid-sentence mentions', () => {
  assert.equal(inject.detectDirective('/fp-barbeque off'), 'off');
  assert.equal(inject.detectDirective('fp-barbeque on'), 'on');
  assert.equal(inject.detectDirective('/fp-barbeque:fp-barbeque on'), 'on');
  assert.equal(inject.detectDirective('fp-barbeque show'), 'show');
  assert.equal(inject.detectDirective('stop fp-barbeque please'), 'off');
  assert.equal(inject.detectDirective('I really like fp-barbeque'), null);
  assert.equal(inject.detectDirective('what is the weather'), null);
});

test('applyDirective flips the saved mode deterministically', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  inject.applyDirective('off');
  assert.equal(require('../hooks/barbeque').base.mode.get('barbeque'), 'off');
  inject.applyDirective('on');
  assert.equal(require('../hooks/barbeque').base.mode.get('barbeque'), 'on');
});

test('applyDirective show reports without changing the mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const note = inject.applyDirective('show');
  assert.match(note, /currently "on"/); // default
  assert.equal(require('../hooks/barbeque').base.mode.get('barbeque'), 'on');
});

test('cli round-trips the mode and defaults on', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  assert.equal(cli.run('show'), 'fp-barbeque: on'); // default
  assert.equal(cli.run('off'), 'fp-barbeque: off');
  assert.equal(cli.run('show'), 'fp-barbeque: off');
  assert.equal(cli.run('on'), 'fp-barbeque: on');
});

test('statusline segment reflects mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const seg = statusline.segment();
  assert.equal(seg.label, 'barbeque');
  assert.equal(seg.value, 'on');
  assert.equal(seg.active, true);
});
