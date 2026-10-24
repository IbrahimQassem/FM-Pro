import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertCounterAdjustment } from '../../functions/lib/admin-content-relations.js';
void test('relationship count changes reject underflow, malformed values and overflow', () => {
  assert.doesNotThrow(() => assertCounterAdjustment(1, -1));
  assert.doesNotThrow(() => assertCounterAdjustment(0, 1));
  for (const value of [undefined, null, '1', -1, 0.5, NaN, Infinity]) {
    assert.throws(() => assertCounterAdjustment(value, 1), {
      code: 'failed-precondition',
    });
    assert.throws(() => assertCounterAdjustment(value, -1), {
      code: 'failed-precondition',
    });
  }
  assert.throws(() => assertCounterAdjustment(0, -1), { code: 'failed-precondition' });
  assert.throws(() => assertCounterAdjustment(Number.MAX_SAFE_INTEGER, 1), {
    code: 'failed-precondition',
  });
});
