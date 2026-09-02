import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasRecentAuthentication,
  mergeEpisodeIds,
} from '../lib/account-deletion.js';

test('requires authentication within the five minute window', () => {
  assert.equal(hasRecentAuthentication(700, 1000), true);
  assert.equal(hasRecentAuthentication(699, 1000), false);
  assert.equal(hasRecentAuthentication(1001, 1000), false);
  assert.equal(hasRecentAuthentication(undefined, 1000), false);
});

test('preserves affected episode ids across idempotent retries', () => {
  const documents = [
    { get: () => 'episode-b' },
    { get: () => 'episode-a' },
    { get: () => 'episode-b' },
  ];
  assert.deepEqual(mergeEpisodeIds(['episode-c'], documents), [
    'episode-a',
    'episode-b',
    'episode-c',
  ]);
});
