import assert from 'node:assert/strict';
import test from 'node:test';
import { relationTarget, reportCommentPath } from '../lib/admin-relations.ts';
void test('relationship lookups are derived only from supported content targets', () => {
  assert.deepEqual(relationTarget('programs', { stationId: 'one' }), {
    kind: 'stations',
    id: 'one',
  });
  assert.deepEqual(
    relationTarget('favorites', { targetType: 'episode', targetId: 'one' }),
    { kind: 'episodes', id: 'one' },
  );
  assert.deepEqual(relationTarget('reports', { episodeId: 'episode-1' }), {
    kind: 'episodes',
    id: 'episode-1',
  });
  assert.equal(relationTarget('reports', { episodeId: 'bad/path' }), null);
  assert.equal(relationTarget('episodes', { programId: 'bad/path' }), null);
  assert.equal(
    relationTarget('subscriptions', { targetType: 'users', targetId: 'one' }),
    null,
  );
  assert.equal(
    relationTarget('users', { targetType: 'station', targetId: 'one' }),
    null,
  );
});

void test('report comment references cannot escape the selected episode root', () => {
  assert.equal(
    reportCommentPath('HudHudOfficial', {
      episodeId: 'ep',
      commentId: 'comment',
    }),
    'HudHudOfficial/episodes/episodes/ep/comments/comment',
  );
  for (const value of [undefined, null, '', '.', '..', 'other/path', 42]) {
    assert.equal(
      reportCommentPath('HudHudDev', { episodeId: value, commentId: 'valid' }),
      null,
    );
    assert.equal(
      reportCommentPath('HudHudDev', { episodeId: 'valid', commentId: value }),
      null,
    );
  }
});
