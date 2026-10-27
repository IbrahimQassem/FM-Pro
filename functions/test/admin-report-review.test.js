import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validReportPath, reviewAdminReport } from '../lib/admin-report-review.js';

test('report paths cannot escape the selected root or approved report layouts', () => {
  const path = 'HudHudDev/users/users/reporter/commentReportEpisodes/episode/moderationReports/comment';
  assert.equal(validReportPath('HudHudDev', path), true);
  assert.equal(validReportPath('HudHudOfficial', path), false);
  assert.equal(validReportPath('HudHudDev', path.replace('commentReportEpisodes', 'unexpected')), false);
  assert.equal(validReportPath('HudHudDev', path + '/extra'), false);
});
test('station-scoped reviewers cannot disable accounts, and listener claims do not grant moderation', async () => {
  const base = { firestore: { doc: () => assert.fail('Denied request reached storage') }, callerUid: 'reviewer',
    callerRole: 'station_admin', callerClaims: { role: 'station_admin', allStations: true },
    data: { root: 'HudHudDev', path: 'HudHudDev/users/users/reporter/commentReportEpisodes/e/moderationReports/c', resolution: 'userDisabled' } };
  await assert.rejects(reviewAdminReport(base), { code: 'permission-denied' });
  await assert.rejects(reviewAdminReport({ ...base, callerRole: 'listener', callerClaims: { allStations: true }, data: { ...base.data, resolution: 'noAction' } }), { code: 'permission-denied' });
});

test('paused root manual review cannot commit a report decision or comment mutation', async () => {
  const { MemoryFirestore } = await import('./support/comment-count-fixture.js'), db = new MemoryFirestore(), root = 'HudHudDev';
  const path = `${root}/users/users/reporter/commentReportEpisodes/e/moderationReports/c`;
  db.seed(`${root}/commentCountContributions`, { version: 1, writerProtocol: 1, state: 'paused', generation: 1, owner: 'unit', planHash: 'a'.repeat(64), leaseUntil: 0 });
  db.seed(path, { status: 'open', reportedAuthorId: 'author', episodeId: 'e', commentId: 'c' });
  db.seed(`${root}/episodes/episodes/e`, { stationId: 'station', stats: { commentsCount: 1 } });
  db.seed(`${root}/episodes/episodes/e/comments/c`, { authorId: 'author', status: 'published' });
  await assert.rejects(reviewAdminReport({ firestore: db, callerUid: 'super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' },
    data: { root, path, resolution: 'commentHidden' } }), error => error.retryable && error.details.reason === 'comment-count-maintenance');
  assert.equal(db.writes.length, 0); assert.equal(db.snapshot(path).get('status'), 'open');
});
