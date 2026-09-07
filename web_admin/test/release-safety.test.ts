import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveFirestoreRoot,
  resolveAdminEmulators,
  belongsToRoot,
} from '../lib/firestore-environment.ts';
import { completeAccountDeletion } from '../lib/account-deletion.ts';

void test('build roots fail closed, development alone can default', () => {
  assert.equal(resolveFirestoreRoot(undefined, true), 'HudHudDev');
  for (const value of [undefined, '', 'legacy', 'HudHudOfficial/users']) {
    assert.throws(() => resolveFirestoreRoot(value, false));
  }
  assert.throws(() => resolveFirestoreRoot('legacy', true));
  for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
    assert.equal(resolveFirestoreRoot(root, false), root);
    assert.equal(
      belongsToRoot(`${root}/users/users/example/favorites/station`, root),
      true,
    );
    assert.equal(
      belongsToRoot(`${root}Other/users/users/example`, root),
      false,
    );
    assert.equal(belongsToRoot('Legacy/users/users/example', root), false);
  }
  assert.equal(
    belongsToRoot(
      'HudHudDev/episodes/episodes/one/comments/two',
      'HudHudOfficial',
    ),
    false,
  );
});

void test('provider revocation failure prevents data deletion', async () => {
  let deleted = false;
  await assert.rejects(
    completeAccountDeletion({
      revokeProvider: async () => {
        throw new Error('revocation unavailable');
      },
      deleteData: async () => {
        deleted = true;
      },
      signOut: async () => {},
    }),
  );
  assert.equal(deleted, false);
});

void test('incomplete cleanup fails without signing out, permitting retry', async () => {
  let signedOut = false;
  await assert.rejects(
    completeAccountDeletion({
      revokeProvider: async () => {},
      deleteData: async () => {
        throw new Error('partial cleanup');
      },
      signOut: async () => {
        signedOut = true;
      },
    }),
  );
  assert.equal(signedOut, false);
});

void test('successful remote deletion remains successful when local sign-out fails', async () => {
  const steps: string[] = [];
  await completeAccountDeletion({
    revokeProvider: async () => {
      steps.push('revoke');
    },
    deleteData: async () => {
      steps.push('delete');
    },
    signOut: async () => {
      steps.push('signOut');
      throw new Error('local failure');
    },
  });
  assert.deepEqual(steps, ['revoke', 'delete', 'signOut']);
});

void test('emulator mode cannot target production or enter a build artifact', () => {
  assert.equal(
    resolveAdminEmulators(
      true,
      'serve',
      'development',
      'demo-preview',
      'HudHudDev',
    ),
    true,
  );
  for (const args of [
    ['build', 'development', 'demo-preview', 'HudHudDev'],
    ['serve', 'production', 'demo-preview', 'HudHudDev'],
    ['serve', 'development', 'live-project', 'HudHudDev'],
    ['serve', 'development', 'demo-preview', 'HudHudOfficial'],
  ] as const)
    assert.throws(() =>
      resolveAdminEmulators(true, args[0], args[1], args[2], args[3]),
    );
  assert.equal(
    resolveAdminEmulators(
      false,
      'build',
      'production',
      'live-project',
      'HudHudOfficial',
    ),
    false,
  );
});
