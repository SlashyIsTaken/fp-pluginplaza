'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const inject = require('../hooks/inject');
const audit = require('../hooks/audit');
const cli = require('../hooks/cli');
const statusline = require('../hooks/statusline');

// Isolated config home + project cwd (with a .git marker so the project root
// anchors here). cli/statusline read mode from cwd, so we chdir.
function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fph-'));
  const project = path.join(root, 'project');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  process.env.FLAREPOINT_CONFIG_HOME = path.join(root, 'global');
  const prev = process.cwd();
  process.chdir(project);
  return { cleanup() { process.chdir(prev); fs.rmSync(root, { recursive: true, force: true }); } };
}

test('inject is silent off, framed in full and footer', () => {
  assert.equal(inject.buildContext('off'), '');

  const full = inject.buildContext('full');
  assert.match(full, /^<fp:honesty mode=full>/);
  assert.match(full, /inline tag/);
  assert.match(full, /NON-INTERFERENCE/);
  assert.match(full, /basis: 🟢 N verified/);

  const footer = inject.buildContext('footer');
  assert.match(footer, /Do NOT add inline tags/);
});

test('inject appends a backstop disclosure when present', () => {
  const out = inject.buildContext('full', { suggestion: 'fp-honesty backstop: ungrounded [verified]' });
  assert.match(out, /backstop: ungrounded/);
});

test('a mode note shows even when off', () => {
  const out = inject.buildContext('off', { note: 'fp-honesty switched to "off"' });
  assert.match(out, /switched to "off"/);
  assert.match(out, /mode=off/);
});

test('detectDirective parses switches and ignores mid-sentence mentions', () => {
  assert.equal(inject.detectDirective('/fp-honesty off'), 'off');
  assert.equal(inject.detectDirective('fp-honesty footer'), 'footer');
  assert.equal(inject.detectDirective('/fp-honesty:fp-honesty full'), 'full');
  assert.equal(inject.detectDirective('stop fp-honesty please'), 'off');
  assert.equal(inject.detectDirective('I really like fp-honesty'), null);
  assert.equal(inject.detectDirective('what is the weather'), null);
});

test('applyDirective flips the saved mode deterministically', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  inject.applyDirective('off');
  assert.equal(require('../hooks/honesty').base.mode.get('honesty'), 'off');
  inject.applyDirective('on'); // alias for full
  assert.equal(require('../hooks/honesty').base.mode.get('honesty'), 'full');
});

test('audit flags an ungrounded [verified] but spares a grounded one', () => {
  const grounded = audit.analyze(
    '`auth.js` exports verify [verified].',
    [{ tool: 'read', target: 'src/auth.js' }],
  );
  assert.equal(grounded.ungrounded.length, 0);

  const ungrounded = audit.analyze(
    '`limiter.py` uses a fixed window [verified].',
    [],
  );
  assert.equal(ungrounded.ungrounded.length, 1);
  assert.deepEqual(ungrounded.ungrounded[0].refs.includes('limiter.py'), true);
});

test('audit grounds the emoji [🟢 verified] tag the model actually emits', () => {
  // Regression: the injected ruleset/SKILL tell the model to write the emoji
  // form, so the backstop must match it (a plain-text-only match was inert).
  const ungrounded = audit.analyze(
    '`limiter.py` uses a fixed window [🟢 verified].',
    [],
  );
  assert.equal(ungrounded.ungrounded.length, 1);
  assert.ok(ungrounded.ungrounded[0].refs.includes('limiter.py'));

  const grounded = audit.analyze(
    '`auth.js` exports verify [🟢 verified].',
    [{ tool: 'read', target: 'src/auth.js' }],
  );
  assert.equal(grounded.ungrounded.length, 0);
});

test('audit ignores a [verified] claim with no concrete reference', () => {
  const r = audit.analyze('The tests pass [verified].', []);
  assert.equal(r.ungrounded.length, 0);
});

test('extractRefs picks backticks and file-like tokens', () => {
  const refs = audit.extractRefs('`config.js` reads src/state.js first [verified]');
  assert.ok(refs.includes('config.js'));
  assert.ok(refs.includes('src/state.js'));
});

test('cli round-trips the mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  assert.equal(cli.run('show'), 'fp-honesty: full'); // default
  assert.equal(cli.run('off'), 'fp-honesty: off');
  assert.equal(cli.run('show'), 'fp-honesty: off');
  assert.equal(cli.run('on'), 'fp-honesty: full');
  assert.equal(cli.run('footer'), 'fp-honesty: footer');
});

test('statusline segment reflects mode', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const seg = statusline.segment();
  assert.equal(seg.label, 'honesty');
  assert.equal(seg.value, 'full');
  assert.equal(seg.active, true);
});
