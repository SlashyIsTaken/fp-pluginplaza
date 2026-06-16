'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sandbox } = require('./helpers');
const queue = require('../src/queue');

function strong(summary) {
  return { plugin: 'memory', kind: 'correction', summary, confidence: 'strong' };
}

test('confidence gate: weak candidates are dropped', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const weak = { plugin: 'memory', kind: 'note', summary: 'maybe', confidence: 'weak' };
  assert.equal(queue.enqueue(weak, { start: sb.start }), null);
  assert.equal(queue.pending('memory', { start: sb.start }).length, 0);
});

test('strong candidates enqueue and de-dup', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  assert.ok(queue.enqueue(strong('use tabs'), { start: sb.start }));
  assert.equal(queue.enqueue(strong('use tabs'), { start: sb.start }), null); // dup
  assert.ok(queue.enqueue(strong('prefer fetch'), { start: sb.start }));
  assert.equal(queue.pending('memory', { start: sb.start }).length, 2);
});

test('nextSuggestion surfaces one per call and is not repeated', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  queue.enqueue(strong('use tabs'), { start: sb.start });
  queue.enqueue(strong('prefer fetch'), { start: sb.start });

  const first = queue.nextSuggestion('memory', { start: sb.start });
  assert.match(first.line, /use tabs|prefer fetch/);
  const second = queue.nextSuggestion('memory', { start: sb.start });
  assert.notEqual(second.id, first.id);
  // both now surfaced -> nothing left pending to surface
  assert.equal(queue.nextSuggestion('memory', { start: sb.start }), null);
});

test('resolve + compact clear the queue', (t) => {
  const sb = sandbox();
  t.after(sb.cleanup);
  const item = queue.enqueue(strong('use tabs'), { start: sb.start });
  queue.resolve('memory', item.id, true, { start: sb.start });
  assert.equal(queue.compact('memory', { start: sb.start }), 0);
});
