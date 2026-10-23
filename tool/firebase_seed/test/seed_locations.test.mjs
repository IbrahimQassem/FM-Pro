import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CANONICAL_GOVERNORATES,
  CANONICAL_NATIONAL_LOCATION,
  ALL_CANONICAL_LOCATIONS,
  CANONICAL_GOVERNORATE_IDS,
} from '../canonical_locations.mjs';
import {
  parseArgs,
  computeLocationDiff,
  buildRootSeedPlan,
  runLocationsSeeding,
} from '../seed_locations.mjs';

test('canonical governorates and national location adhere to PKG-01 requirements', () => {
  assert.equal(CANONICAL_GOVERNORATES.length, 22, 'Must have exactly 22 governorates');
  assert.equal(ALL_CANONICAL_LOCATIONS.length, 23, 'Must have 22 governorates + 1 national location');

  // Verify national location
  assert.equal(CANONICAL_NATIONAL_LOCATION.id, 'yemen');
  assert.equal(CANONICAL_NATIONAL_LOCATION.locationType, 'national');
  assert.equal(CANONICAL_NATIONAL_LOCATION.countryCode, 'YE');
  assert.equal(CANONICAL_NATIONAL_LOCATION.countryNameAr, 'اليمن');
  assert.ok(CANONICAL_NATIONAL_LOCATION.isActive);

  // Verify all 22 canonical IDs exist
  const expectedGovIds = [
    'sanaa', 'aden', 'taiz', 'mukalla', 'seiyun', 'hudaydah',
    'ibb', 'marib', 'dhamar', 'shabwah', 'al_mahrah', 'lahj',
    'abyan', 'socotra', 'saadah', 'amran', 'hajjah', 'al_mahwit',
    'raymah', 'al_jawf', 'al_bayda', 'al_dhalee',
  ];

  for (const id of expectedGovIds) {
    assert.ok(CANONICAL_GOVERNORATE_IDS.has(id), `Governorate ${id} must be present`);
  }

  for (const loc of ALL_CANONICAL_LOCATIONS) {
    assert.equal(loc.countryCode, 'YE');
    assert.equal(loc.countryNameAr, 'اليمن');
    assert.ok(typeof loc.sortOrder === 'number' && loc.sortOrder >= 0);
    assert.equal(loc.isActive, true);
    assert.ok(['governorate', 'national'].includes(loc.locationType));
    assert.equal(loc.id, loc.cityCode);
  }
});

test('parseArgs defaults to dry-run and parses explicit flags', () => {
  const defaultOpts = parseArgs(['node', 'seed_locations.mjs']);
  assert.equal(defaultOpts.dryRun, true);
  assert.equal(defaultOpts.shouldApply, false);
  assert.deepEqual(defaultOpts.roots, ['HudHudDev']);

  const applyOpts = parseArgs([
    'node', 'seed_locations.mjs',
    '--apply',
    '--roots', 'HudHudDev,HudHudOfficial',
    '--manifest', 'tmp_manifest.json',
  ]);
  assert.equal(applyOpts.dryRun, false);
  assert.equal(applyOpts.shouldApply, true);
  assert.deepEqual(applyOpts.roots, ['HudHudDev', 'HudHudOfficial']);
  assert.ok(applyOpts.manifestPath.endsWith('tmp_manifest.json'));

  assert.throws(
    () => parseArgs(['node', 'seed_locations.mjs', '--root', 'ProductionRoot']),
    /Unsupported root/,
  );
});

test('computeLocationDiff detects differences and unchanged fields', () => {
  const canonical = {
    id: 'sanaa',
    cityCode: 'sanaa',
    cityNameAr: 'صنعاء',
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    locationType: 'governorate',
    sortOrder: 10,
    isActive: true,
  };

  const identical = { ...canonical };
  const sameRes = computeLocationDiff(identical, canonical);
  assert.equal(sameRes.changed, false);
  assert.deepEqual(sameRes.diff, {});

  const modified = { ...canonical, cityNameAr: 'صنعاء القديمة', sortOrder: 99 };
  const diffRes = computeLocationDiff(modified, canonical);
  assert.equal(diffRes.changed, true);
  assert.equal(diffRes.diff.cityNameAr.before, 'صنعاء القديمة');
  assert.equal(diffRes.diff.cityNameAr.after, 'صنعاء');
  assert.equal(diffRes.diff.sortOrder.before, 99);
  assert.equal(diffRes.diff.sortOrder.after, 10);
});

test('buildRootSeedPlan plans creation, update, and unchanged idempotently', () => {
  const existingMap = new Map();
  // sanaa exists and is identical
  existingMap.set('sanaa', {
    cityCode: 'sanaa',
    cityNameAr: 'صنعاء',
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    locationType: 'governorate',
    sortOrder: 10,
    isActive: true,
  });
  // aden exists but has outdated sortOrder
  existingMap.set('aden', {
    cityCode: 'aden',
    cityNameAr: 'عدن',
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    locationType: 'governorate',
    sortOrder: 999,
    isActive: true,
  });
  // other 21 locations do not exist yet

  const plan = buildRootSeedPlan(existingMap);
  assert.equal(plan.unchanged.length, 1);
  assert.equal(plan.unchanged[0], 'sanaa');
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].id, 'aden');
  assert.equal(plan.toCreate.length, 21);

  // If we simulate an already fully-seeded database:
  const fullySeededMap = new Map();
  for (const loc of ALL_CANONICAL_LOCATIONS) {
    fullySeededMap.set(loc.id, { ...loc });
  }

  const idempotentPlan = buildRootSeedPlan(fullySeededMap);
  assert.equal(idempotentPlan.toCreate.length, 0);
  assert.equal(idempotentPlan.toUpdate.length, 0);
  assert.equal(idempotentPlan.unchanged.length, 23);
});

test('runLocationsSeeding works in dry-run with mock firestore and does not commit writes', async () => {
  let writesCount = 0;
  const mockCollectionDocs = [
    {
      id: 'sanaa',
      data: () => ({
        cityCode: 'sanaa',
        cityNameAr: 'صنعاء',
        countryCode: 'YE',
        countryNameAr: 'اليمن',
        locationType: 'governorate',
        sortOrder: 10,
        isActive: true,
      }),
    },
  ];

  const mockFirestore = {
    collection: (_path) => ({
      get: async () => ({ docs: mockCollectionDocs }),
      doc: (_id) => ({}),
    }),
    doc: (_path) => ({
      set: async () => { writesCount++; },
    }),
    batch: () => ({
      set: () => { writesCount++; },
      commit: async () => {},
    }),
  };

  const outcome = await runLocationsSeeding(
    {
      shouldApply: false,
      dryRun: true,
      roots: ['HudHudDev'],
      projectId: 'demo-test',
    },
    mockFirestore,
  );

  assert.equal(writesCount, 0, 'Dry-run must not write any documents');
  assert.equal(outcome.results.HudHudDev.created, 22);
  assert.equal(outcome.results.HudHudDev.unchanged, 1);
  assert.equal(outcome.results.HudHudDev.updated, 0);
});
