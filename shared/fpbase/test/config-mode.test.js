'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sandbox } = require('./helpers');
const config = require('../src/config');
const mode = require('../src/mode');

test('project overrides global overrides default', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const opts = { start: sb.start };

  assert.equal(config.get('honesty', 'mode', 'full', opts), 'full'); // default
  config.set('honesty', 'mode', 'footer', { scope: 'global', start: sb.start });
  assert.equal(config.get('honesty', 'mode', 'full', opts), 'footer'); // global wins over default
  config.set('honesty', 'mode', 'off', { scope: 'project', start: sb.start });
  assert.equal(config.get('honesty', 'mode', 'full', opts), 'off'); // project wins over global
});

test('env override beats files', (t) => {
  const sb = sandbox();
  t.after(() => { delete process.env.FLAREPOINT_HONESTY_MODE; sb.cleanup(); });
  config.set('honesty', 'mode', 'footer', { scope: 'project', start: sb.start });
  process.env.FLAREPOINT_HONESTY_MODE = 'full';
  assert.equal(config.get('honesty', 'mode', 'off', { start: sb.start }), 'full');
});

test('mode validates against declared levels', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  mode.define('honesty', { levels: ['footer', 'full'], default: 'full' });

  assert.equal(mode.get('honesty', { start: sb.start }), 'full');
  assert.equal(mode.isActive('honesty', { start: sb.start }), true);

  mode.set('honesty', 'off', { start: sb.start });
  assert.equal(mode.isActive('honesty', { start: sb.start }), false);

  assert.throws(() => mode.set('honesty', 'bogus', { start: sb.start }));

  // a stale/invalid persisted value resolves back to the default
  config.set('honesty', 'mode', 'legacyvalue', { scope: 'project', start: sb.start });
  assert.equal(mode.get('honesty', { start: sb.start }), 'full');
});
