import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createAdminSessionGuard,
  type AdminSessionState,
} from '../lib/admin-session.ts';

void test('late token result cannot restore a signed-out or disposed session', async () => {
  for (const action of ['signOut', 'dispose']) {
    let resolve!: (value: boolean) => void;
    const states: AdminSessionState<string>[] = [];
    const guard = createAdminSessionGuard<string>({
      isAdmin: () =>
        new Promise<boolean>((r) => {
          resolve = r;
        }),
      signOut: async () => {},
      emit: (s) => states.push(s),
    });
    const pending = guard.changed('admin');
    if (action === 'signOut') await guard.changed(null);
    else guard.dispose();
    resolve(true);
    await pending;
    assert.deepEqual(
      states,
      action === 'signOut' ? [{ status: 'signed-out', user: null }] : [],
    );
  }
});
void test('refreshed claims revoke access and verification failures fail closed', async () => {
  const states: AdminSessionState<string>[] = [];
  let allowed = true,
    fail = false,
    signOuts = 0;
  const guard = createAdminSessionGuard<string>({
    isAdmin: async () => {
      if (fail) throw new Error('offline');
      return allowed;
    },
    signOut: async () => {
      signOuts++;
    },
    emit: (s) => states.push(s),
  });
  await guard.changed('admin');
  allowed = false;
  await guard.changed('admin');
  fail = true;
  await guard.changed('admin');
  assert.deepEqual(states, [
    { status: 'admin', user: 'admin' },
    { status: 'denied', user: null, reason: 'claims' },
    { status: 'denied', user: null, reason: 'verification' },
  ]);
  assert.equal(signOuts, 1);
});
void test('a stale denied token cannot sign out a newer authorized session', async () => {
  let resolve!: (value: boolean) => void;
  const states: AdminSessionState<string>[] = [];
  let signOuts = 0;
  const guard = createAdminSessionGuard<string>({
    isAdmin: (user) =>
      user === 'old'
        ? new Promise<boolean>((r) => {
            resolve = r;
          })
        : Promise.resolve(true),
    signOut: async () => {
      signOuts++;
    },
    emit: (s) => states.push(s),
  });
  const pending = guard.changed('old');
  await guard.changed('new');
  resolve(false);
  await pending;
  assert.deepEqual(states, [{ status: 'admin', user: 'new' }]);
  assert.equal(signOuts, 0);
});
