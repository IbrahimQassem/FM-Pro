import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeLocationText,
  computeSnapshotFingerprint,
  matchStationToLocation,
  analyzeStations,
  parseArgs,
  runMigration,
} from '../migrate_station_locations.mjs';

const mockCanonical = [
  { id: 'sanaa', cityCode: 'sanaa', cityNameAr: 'صنعاء', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 10, isActive: true },
  { id: 'aden', cityCode: 'aden', cityNameAr: 'عدن', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 20, isActive: true },
  { id: 'taiz', cityCode: 'taiz', cityNameAr: 'تعز', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 30, isActive: true },
  { id: 'yemen', cityCode: 'yemen', cityNameAr: 'الجمهورية اليمنية (إذاعات وطنية)', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'national', sortOrder: 1, isActive: true },
];

test('normalizeLocationText normalizes Unicode NFKC and collapses spaces', () => {
  assert.equal(normalizeLocationText('  صنعاء   '), 'صنعاء');
  assert.equal(normalizeLocationText('تعز\u200E'), 'تعز');
});

test('computeSnapshotFingerprint is deterministic and detects content changes', () => {
  const stationsA = [
    { id: 'st-1', data: { cityCode: 'sanaa', cityNameAr: 'صنعاء', updatedAt: 100 } },
    { id: 'st-2', data: { cityCode: 'aden', cityNameAr: 'عدن', updatedAt: 200 } },
  ];
  const stationsReordered = [stationsA[1], stationsA[0]];

  const fpA = computeSnapshotFingerprint(stationsA);
  const fpReordered = computeSnapshotFingerprint(stationsReordered);
  assert.equal(fpA, fpReordered, 'Order in array must not alter fingerprint');

  const stationsModified = [
    { id: 'st-1', data: { cityCode: 'taiz', cityNameAr: 'تعز', updatedAt: 100 } },
    stationsA[1],
  ];
  const fpModified = computeSnapshotFingerprint(stationsModified);
  assert.notEqual(fpA, fpModified, 'Content change must change fingerprint');
});

test('matchStationToLocation deterministic rules', () => {
  // 1. Direct code match
  const match1 = matchStationToLocation({ cityCode: 'sanaa', cityNameAr: 'صنعاء' }, mockCanonical);
  assert.equal(match1.status, 'matched');
  assert.equal(match1.targetLocation.id, 'sanaa');

  // 2. Conflict between cityCode and cityNameAr -> ambiguous
  const conflict = matchStationToLocation({ cityCode: 'sanaa', cityNameAr: 'عدن' }, mockCanonical);
  assert.equal(conflict.status, 'ambiguous');
  assert.equal(conflict.reason, 'code_and_name_conflict');

  // 3. Exact name match when cityCode is missing or legacy
  const byName = matchStationToLocation({ cityCode: 'legacy-999', cityNameAr: 'تعز' }, mockCanonical);
  assert.equal(byName.status, 'matched');
  assert.equal(byName.targetLocation.id, 'taiz');

  // 4. Inferred from station title
  const byTitle = matchStationToLocation({ cityCode: '', cityNameAr: '', name: 'إذاعة صنعاء المحلية' }, mockCanonical);
  assert.equal(byTitle.status, 'matched');
  assert.equal(byTitle.targetLocation.id, 'sanaa');

  // 5. No candidate -> ambiguous
  const noMatch = matchStationToLocation({ cityCode: 'unknown', cityNameAr: 'مكان غير معروف' }, mockCanonical);
  assert.equal(noMatch.status, 'ambiguous');
});

test('analyzeStations classifies unchanged, update, and ambiguous', () => {
  const stations = [
    // Already canonical
    {
      id: 'st-1',
      data: {
        cityCode: 'sanaa',
        cityNameAr: 'صنعاء',
        countryCode: 'YE',
        countryNameAr: 'اليمن',
        locationType: 'governorate',
      },
    },
    // Needs locationType and country fields
    {
      id: 'st-2',
      data: {
        cityCode: 'aden',
        cityNameAr: 'عدن',
      },
    },
    // Ambiguous
    {
      id: 'st-3',
      data: {
        cityCode: 'unrecognized',
        name: 'إذاعة غير محددة',
      },
    },
  ];

  const analysis = analyzeStations(stations, mockCanonical);
  assert.equal(analysis.counts.total, 3);
  assert.equal(analysis.counts.unchanged, 1);
  assert.equal(analysis.counts.proposed_update, 1);
  assert.equal(analysis.counts.ambiguous, 1);
  assert.equal(analysis.decisions[0].status, 'unchanged');
  assert.equal(analysis.decisions[1].status, 'proposed_update');
  assert.equal(analysis.decisions[2].status, 'ambiguous');
});

test('parseArgs enforces root safety and report requirements', () => {
  assert.throws(
    () => parseArgs(['node', 'migrate.mjs']),
    /--root is required/,
  );

  assert.throws(
    () => parseArgs(['node', 'migrate.mjs', '--root', 'HudHudDev', '--apply']),
    /Refusing --apply without --report/,
  );

  const parsed = parseArgs(['node', 'migrate.mjs', '--root', 'HudHudDev']);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.shouldApply, false);
  assert.equal(parsed.root, 'HudHudDev');
});

test('runMigration dry-run does not write and apply validates fingerprint and ambiguities', async () => {
  const mockDocs = [
    {
      id: 'st-1',
      data: () => ({ cityCode: 'sanaa', cityNameAr: 'صنعاء' }),
    },
  ];

  let batchWrites = 0;
  const mockFirestore = {
    collection: (_path) => ({
      get: async () => ({ docs: mockDocs }),
      doc: (_id) => ({}),
    }),
    doc: (_path) => ({
      get: async () => ({ exists: true }),
      set: async () => {},
    }),
    batch: () => ({
      update: () => { batchWrites++; },
      commit: async () => {},
    }),
  };

  // Dry run
  const dryOutcome = await runMigration(
    {
      shouldApply: false,
      dryRun: true,
      root: 'HudHudDev',
      projectId: 'demo-test',
    },
    mockFirestore,
  );

  assert.equal(dryOutcome.applied, false);
  assert.equal(batchWrites, 0);
  assert.equal(dryOutcome.report.counts.proposed_update, 1);

  // Apply with mismatching fingerprint should reject
  await assert.rejects(
    runMigration(
      {
        shouldApply: true,
        dryRun: false,
        root: 'HudHudDev',
        reportPath: '/tmp/nonexistent-report.json',
        projectId: 'demo-test',
      },
      mockFirestore,
    ),
  );
});
