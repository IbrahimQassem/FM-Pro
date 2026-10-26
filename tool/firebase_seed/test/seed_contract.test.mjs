import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { buildSeedPlan, validateSeed } from '../seed_contract.mjs';

const seed = JSON.parse(
  await readFile(new URL('../development_seed.json', import.meta.url), 'utf8'),
);
const notificationPayload = JSON.parse(
  await readFile(
    new URL('../fcm_announcement.example.json', import.meta.url),
    'utf8',
  ),
);

test('validates the complete relational demo graph', () => {
  assert.deepEqual(validateSeed(seed), {
    locations: 24,
    stations: 4,
    banners: 1,
    users: 3,
    programs: 5,
    episodes: 6,
    comments: 12,
    favorites: 6,
    subscriptions: 4,
  });

  for (const station of seed.stations) {
    assert.ok(
      seed.programs.some((program) => program.data.stationId === station.id),
      `${station.id} must demonstrate its programs`,
    );
  }
  for (const program of seed.programs) {
    assert.ok(
      seed.episodes.some((episode) => episode.data.programId === program.id),
      `${program.id} must demonstrate its episodes`,
    );
  }
  for (const episode of seed.episodes) {
    assert.ok(
      seed.comments.some((comment) => comment.data.episodeId === episode.id),
      `${episode.id} must demonstrate its comments`,
    );
  }
});

test('builds canonical paths and converts timestamps', () => {
  const plan = buildSeedPlan(seed);
  assert.equal(plan.entries.length, 65);
  assert.equal(plan.stationCountUpdates.length, 0);

  const comment = plan.entries.find((entry) =>
    entry.path.endsWith('/comments/comment-education-amal')
  );
  assert.equal(
    comment.path,
    'HudHudDev/episodes/episodes/sanaa-morning-education/comments/comment-education-amal',
  );
  assert.ok(comment.data.createdAt instanceof Date);

  const episode = plan.entries.find((entry) =>
    entry.path.endsWith('/episodes/sanaa-morning-education')
  );
  assert.ok(episode.data.broadcastAt instanceof Date);
  assert.ok(episode.data.publishedAt instanceof Date);
});

test('content-only derives station counter updates from program relations', () => {
  const plan = buildSeedPlan(seed, { contentOnly: true });
  assert.equal(plan.entries.length, 36);
  assert.deepEqual(plan.stationCountUpdates, [
    { path: 'HudHudDev/stations/stations/sanaa-radio', count: 2 },
    { path: 'HudHudDev/stations/stations/quran-radio-sanaa', count: 1 },
    { path: 'HudHudDev/stations/stations/huna-aden-fm', count: 1 },
    { path: 'HudHudDev/stations/stations/ibn-alqayyim-radio', count: 1 },
  ]);
});

test('builds an engagement-only plan under each user', () => {
  const plan = buildSeedPlan(seed, { engagementOnly: true });
  assert.equal(plan.entries.length, 10);
  assert.equal(plan.stationCountUpdates.length, 0);
  assert.ok(
    plan.entries.some(
      (entry) =>
        entry.path ===
        'HudHudDev/users/users/demo-listener-amal/favorites/favorite-amal-sanaa',
    ),
  );
  assert.ok(plan.entries.every((entry) => entry.data.createdAt instanceof Date));
});

test('rejects orphaned relations and mismatched counters before Firestore', () => {
  const broken = structuredClone(seed);
  broken.episodes[0].data.programId = 'missing-program';
  broken.stations[0].data.stats.programsCount = 99;
  broken.comments[0].data.authorName = 'Forged name';

  assert.throws(() => validateSeed(broken), (error) => {
    assert.match(error.message, /missing program/);
    assert.match(error.message, /programsCount=99/);
    assert.match(error.message, /authorName does not match/);
    return true;
  });
});

test('rejects a parent that cannot demonstrate its child feature', () => {
  const broken = structuredClone(seed);
  broken.comments = broken.comments.filter(
    (comment) => comment.data.episodeId !== 'ibn-provisions-demo',
  );
  broken.episodes.find(
    (episode) => episode.id === 'ibn-provisions-demo',
  ).data.stats.commentsCount = 0;

  assert.throws(
    () => validateSeed(broken),
    /episode ibn-provisions-demo must have at least one comment/,
  );
});

test('keeps the notification example on the allowlisted topic and text only', () => {
  assert.equal(
    notificationPayload.message.topic,
    'hudhud_fm_announcements',
  );
  assert.equal(typeof notificationPayload.message.notification.title, 'string');
  assert.equal(typeof notificationPayload.message.notification.body, 'string');
  assert.equal('data' in notificationPayload.message, false);
  assert.equal('token' in notificationPayload.message, false);
});

const stationPrivateFields = 'owner address contactPerson contactPhone contactEmail streamType audioCodec bitrateKbps sampleRateHz transmitterPower transmitterLocation coverageArea rds'.split(' ');
for (const field of [...stationPrivateFields, 'unexpectedStationField']) {
  test(`station seed rejects non-public ${field} before validation or planning`, () => {
    const invalid = structuredClone(seed);
    invalid.stations[0].data[field] = 'synthetic-private-value';
    assert.throws(() => validateSeed(invalid), /public station/i);
    assert.throws(() => buildSeedPlan(invalid), /public station/i);
  });
}

for (const [field, value] of [
  ['streamUrl', { contactEmail: 'synthetic-private' }],
  ['stats', { programsCount: 2, subscribersCount: 0, totalPlays: 0, owner: 'synthetic-private' }],
  ['stats', { programsCount: 2, subscribersCount: -1, totalPlays: 0 }],
  ['stats', { programsCount: 2, totalPlays: 0 }],
  ['tags', [{ owner: 'synthetic-private' }]],
  ['tags', 'not-an-array'], ['isLive', 'true'], ['priority', 1.5],
  ['consecutiveFailures', -1], ['createdAt', { owner: 'synthetic-private' }],
  ['updatedAt', new Date('invalid')],
]) {
  test(`station seed rejects malformed public ${field} values`, () => {
    const invalid = structuredClone(seed);
    invalid.stations[0].data[field] = value;
    assert.throws(() => validateSeed(invalid), /public station/i);
    assert.throws(() => buildSeedPlan(invalid), /public station/i);
  });
}


test('public station types retain valid dates, tags, counters and signed integer priority', () => {
  const valid = structuredClone(seed);
  Object.assign(valid.stations[0].data, {
    createdAt: new Date('2026-01-01T00:00:00Z'), tags: ['Synthetic'],
    consecutiveFailures: 0, priority: -1,
  });
  assert.doesNotThrow(() => validateSeed(valid));
  assert.doesNotThrow(() => buildSeedPlan(valid));
});
