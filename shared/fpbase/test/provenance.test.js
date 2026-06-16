'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('../src/provenance');

test('normalize falls back to default on garbage', () => {
  assert.equal(p.normalize('verified'), 'verified');
  assert.equal(p.normalize('VERIFIED'), 'verified');
  assert.equal(p.normalize('nonsense'), p.DEFAULT);
  assert.equal(p.normalize(undefined), p.DEFAULT);
});

test('rank orders strongest first', () => {
  assert.ok(p.rank('verified') < p.rank('inferred'));
  assert.ok(p.rank('inferred') < p.rank('recalled'));
  assert.ok(p.rank('recalled') < p.rank('guess'));
});

test('cap pulls an over-confident claim down to the ceiling', () => {
  assert.equal(p.cap('verified', 'inferred'), 'inferred');
  // already at/below ceiling: unchanged
  assert.equal(p.cap('guess', 'inferred'), 'guess');
  assert.equal(p.cap('inferred', 'inferred'), 'inferred');
});

test('render and tally', () => {
  assert.equal(p.render('verified'), '[verified]');
  assert.equal(p.tally([]), '');
  assert.equal(
    p.tally(['verified', 'verified', 'inferred', 'guess']),
    'basis: 2 verified, 1 inferred, 1 guess',
  );
});
