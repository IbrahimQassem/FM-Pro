import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Timestamp } from 'firebase/firestore';
import { buildAdminSaveRequest } from '../lib/save-content.ts';

void test('save request uses explicit environment, portable dates and an editable precondition', () => {
  const data = {
    title: 'Episode',
    programId: 'p',
    stationId: 's',
    broadcastAt: Timestamp.fromMillis(123000),
  };
  const request = buildAdminSaveRequest(
    'HudHudDev',
    'episodes',
    'HudHudDev/episodes/episodes',
    'e',
    data,
    {
      reference: { path: 'HudHudDev/episodes/episodes/e' },
      data: { ...data, stats: { playsCount: 42 }, createdBy: 'server' },
    },
  );
  assert.equal(request.root, 'HudHudDev');
  assert.equal(request.content.broadcastAt, '1970-01-01T00:02:03.000Z');
  assert.equal(request.expected?.broadcastAt, request.content.broadcastAt);
  assert.equal('stats' in request.expected!, false);
  assert.equal('createdBy' in request.expected!, false);
});
void test('save request rejects cross-root record and location references', () => {
  assert.throws(() =>
    buildAdminSaveRequest(
      'HudHudDev',
      'stations',
      'HudHudOfficial/stations/stations',
      's',
      {},
      null,
    ),
  );
  assert.throws(() =>
    buildAdminSaveRequest(
      'HudHudDev',
      'stations',
      'HudHudDev/stations/stations',
      's',
      {},
      null,
      { path: 'HudHudOfficial/locations/locations/city', id: 'city' },
    ),
  );
});
void test('new imports carry a null precondition and cannot submit caller attribution or defaults', () => {
  const request = buildAdminSaveRequest(
    'HudHudDev',
    'programs',
    'HudHudDev/programs/programs',
    'p',
    {
      title: 'Program',
      stationId: 's',
      stats: { episodesCount: 99 },
      createdBy: 'forged',
    },
    null,
    undefined,
    'import',
  );
  assert.equal(request.expected, null);
  assert.equal(request.source, 'import');
  assert.equal('stats' in request.content, false);
  assert.equal('createdBy' in request.content, false);
});
