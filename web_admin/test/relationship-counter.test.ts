import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertCounterAdjustment } from '../lib/relationship-counter.ts';
void test('relationship count changes reject underflow, malformed values and overflow', () => {
  assert.doesNotThrow(() => assertCounterAdjustment(1, -1));
  assert.doesNotThrow(() => assertCounterAdjustment(0, 1));
  for (const value of [undefined, null, '1', -1, 0.5, NaN, Infinity]) {
    assert.throws(() => assertCounterAdjustment(value, 1), {
      name: 'ContentError',
    });
    assert.throws(() => assertCounterAdjustment(value, -1), {
      name: 'ContentError',
    });
  }
  assert.throws(() => assertCounterAdjustment(0, -1), { name: 'ContentError' });
  assert.throws(() => assertCounterAdjustment(Number.MAX_SAFE_INTEGER, 1), {
    name: 'ContentError',
  });
});
