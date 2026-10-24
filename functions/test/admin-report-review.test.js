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
