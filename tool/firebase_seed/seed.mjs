import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const expectedProjectId = 'sanadev-fm';
const seedFile = fileURLToPath(
  new URL('./development_seed.json', import.meta.url),
);
const args = process.argv.slice(2);
const projectIndex = args.indexOf('--project');
const projectId = projectIndex >= 0 ? args[projectIndex + 1] : '';
const shouldApply = args.includes('--apply');
const contentOnly = args.includes('--content-only');

if (projectId !== expectedProjectId) {
  throw new Error(
    `Refusing to seed project "${projectId || '(missing)'}". ` +
      `Expected "${expectedProjectId}".`,
  );
}

const seed = JSON.parse(await readFile(seedFile, 'utf8'));
if (seed.projectId !== projectId || seed.root !== 'HudHudDev') {
  throw new Error('Seed metadata does not match the Development target.');
}

const discoveryEntries = [
  ...seed.locations.map((entry) => ({
    path: `${seed.root}/locations/locations/${entry.id}`,
    data: entry.data,
  })),
  ...seed.stations.map((entry) => ({
    path: `${seed.root}/stations/stations/${entry.id}`,
    data: entry.data,
  })),
  ...seed.banners.map((entry) => ({
    path: `${seed.root}/banners/banners/${entry.id}`,
    data: entry.data,
  })),
];
const contentEntries = [
  ...seed.programs.map((entry) => ({
    path: `${seed.root}/programs/programs/${entry.id}`,
    data: entry.data,
  })),
  ...seed.episodes.map((entry) => ({
    path: `${seed.root}/episodes/episodes/${entry.id}`,
    data: {
      ...entry.data,
      broadcastAt: new Date(entry.data.broadcastAt),
      publishedAt: entry.data.publishedAt
        ? new Date(entry.data.publishedAt)
        : null,
    },
  })),
];
const entries = contentOnly
  ? contentEntries
  : [...discoveryEntries, ...contentEntries];
const stationCountUpdates = contentOnly
  ? [
      {
        path: `${seed.root}/stations/stations/sanaa-radio`,
        count: 2,
      },
      {
        path: `${seed.root}/stations/stations/huna-aden-fm`,
        count: 1,
      },
    ]
  : [];

console.log(
  `Seed plan: mode=${contentOnly ? 'content-only' : 'full'}, ` +
    `project=${projectId}, root=${seed.root}, ` +
    `locations=${seed.locations.length}, stations=${seed.stations.length}, ` +
    `programs=${seed.programs.length}, episodes=${seed.episodes.length}, ` +
    `banners=${seed.banners.length}.`,
);

if (!shouldApply) {
  console.log('Dry run only. Re-run with --apply after reviewing the plan.');
  process.exit(0);
}

const { Firestore } = await import('@google-cloud/firestore');
const firestore = new Firestore({ projectId });
const batch = firestore.batch();
for (const entry of entries) {
  batch.create(firestore.doc(entry.path), entry.data);
}
for (const update of stationCountUpdates) {
  batch.update(firestore.doc(update.path), {
    'stats.programsCount': update.count,
  });
}

await batch.commit();
console.log(
  `Created ${entries.length} documents and updated ` +
    `${stationCountUpdates.length} station counters atomically.`,
);
