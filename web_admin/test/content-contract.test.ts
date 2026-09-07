import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  contentPayload,
  validateContent,
  type ContentKind,
} from '../lib/content-form.ts';
void test('shared Flutter fixtures round-trip through the guided admin payload', () => {
  const fixtures = JSON.parse(
    readFileSync(
      new URL(
        '../../test/fixtures/admin-content-contract.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  for (const [kind, data] of Object.entries(fixtures) as [
    ContentKind,
    Record<string, unknown>,
  ][]) {
    assert.deepEqual(validateContent(kind, data), {}, kind);
    const payload = contentPayload(kind, data);
    assert.equal(Object.hasOwn(payload, 'stats'), false);
    assert.deepEqual(
      data.stats ? { ...payload, stats: data.stats } : payload,
      data,
      kind,
    );
  }
});
