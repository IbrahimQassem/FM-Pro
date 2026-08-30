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
    locations: 2,
    stations: 4,
    banners: 1,
    users: 3,
    programs: 5,
    episodes: 6,
    comments: 12,
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
  assert.equal(plan.entries.length, 33);
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
  assert.equal(plan.entries.length, 26);
  assert.deepEqual(plan.stationCountUpdates, [
    { path: 'HudHudDev/stations/stations/sanaa-radio', count: 2 },
    { path: 'HudHudDev/stations/stations/quran-radio-sanaa', count: 1 },
    { path: 'HudHudDev/stations/stations/huna-aden-fm', count: 1 },
    { path: 'HudHudDev/stations/stations/ibn-alqayyim-radio', count: 1 },
  ]);
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
