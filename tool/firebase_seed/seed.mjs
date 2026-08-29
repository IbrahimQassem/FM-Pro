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

const entries = [
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

console.log(
  `Seed plan: project=${projectId}, root=${seed.root}, ` +
    `locations=${seed.locations.length}, stations=${seed.stations.length}, ` +
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

await batch.commit();
console.log(`Created ${entries.length} Development documents atomically.`);
