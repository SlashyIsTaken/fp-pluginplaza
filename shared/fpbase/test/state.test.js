'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sandbox } = require('./helpers');
const state = require('../src/state');

test('write/read round-trips a fact with provenance', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  state.write('memory', {
    name: 'Tabs not spaces',
    type: 'preference',
    provenance: 'verified',
    description: 'indentation',
    body: 'This repo uses tabs.',
  }, { start: sb.start });

  const got = state.read('memory', 'tabs-not-spaces', { start: sb.start });
  assert.equal(got.body, 'This repo uses tabs.');
  assert.equal(got.provenance, 'verified');
  assert.equal(got.type, 'preference');
  assert.equal(got.hits, 0);
});

test('personal store is self-gitignored, committed store is not', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  state.write('memory', { name: 'p', body: 'personal' }, { start: sb.start });
  state.write('memory', { name: 'c', sharing: 'committed', body: 'shared' }, { start: sb.start });

  const personalGi = path.join(state.storeDir('memory', { sharing: 'personal', start: sb.start }), '.gitignore');
  const committedGi = path.join(state.storeDir('memory', { sharing: 'committed', start: sb.start }), '.gitignore');
  assert.equal(fs.readFileSync(personalGi, 'utf8').trim(), '*');
  assert.equal(fs.existsSync(committedGi), false);
});

test('personal shadows committed on read; list spans both', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  state.write('memory', { name: 'x', sharing: 'committed', body: 'team' }, { start: sb.start });
  state.write('memory', { name: 'x', sharing: 'personal', body: 'mine' }, { start: sb.start });
  state.write('memory', { name: 'y', sharing: 'committed', body: 'team-y' }, { start: sb.start });

  assert.equal(state.read('memory', 'x', { start: sb.start }).body, 'mine');
  assert.equal(state.list('memory', { start: sb.start }).length, 3);
});

test('touch bumps hits and writes an index', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  state.write('memory', { name: 'z', body: 'thing', description: 'a thing' }, { start: sb.start });
  state.touch('memory', 'z', { start: sb.start });
  assert.equal(state.read('memory', 'z', { start: sb.start }).hits, 1);

  const index = path.join(state.storeDir('memory', { sharing: 'personal', start: sb.start }), 'INDEX.md');
  assert.match(fs.readFileSync(index, 'utf8'), /a thing/);
});

test('remove deletes a fact', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  state.write('memory', { name: 'gone', body: 'soon' }, { start: sb.start });
  assert.equal(state.remove('memory', 'gone', { start: sb.start }), true);
  assert.equal(state.read('memory', 'gone', { start: sb.start }), null);
});
