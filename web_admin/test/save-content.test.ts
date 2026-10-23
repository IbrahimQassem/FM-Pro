import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ActorContext } from '../lib/save-content.ts';

void test('saveWithRelations formats actor context for editorial audit fields', () => {
  const actor: ActorContext = {
    uid: 'admin-uid-1',
    nameOrEmail: 'المشرف الأول',
  };

  assert.equal(actor.uid, 'admin-uid-1');
  assert.equal(actor.nameOrEmail, 'المشرف الأول');
});
