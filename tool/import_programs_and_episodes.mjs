import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readCommentCountFence, CommentCountMaintenanceError } from '../functions/lib/comment-count-maintenance.js';
import { prepareNewEpisodeCountBaseline } from '../functions/lib/comment-counts.js';

async function main() {
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const require = createRequire(path.join(rootDir, 'functions', 'package.json'));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

// Parse CLI flags
const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const projectId = projectIdx >= 0 ? args[projectIdx + 1] : 'sanadev-fm';

const rootIdx = args.indexOf('--root');
const root = rootIdx >= 0 ? args[rootIdx + 1] : 'HudHudOfficial';

const shouldApply = args.includes('--apply');
const createMissingStations = args.includes('--create-missing-stations');
const mapToOfficial = args.includes('--map-to-official');
const stationsOnly = args.includes('--stations-only');

if (!['HudHudDev', 'HudHudOfficial'].includes(root)) {
  console.error(`Error: Unknown root "${root}". Must be HudHudDev or HudHudOfficial.`);
  process.exit(1);
}

// Station Name Mapping for s1_1 to s1_24
const STATION_METADATA = {
  s1_1: { name: 'إذاعة المكلا', nameEn: 'Mukalla Radio', city: 'المكلا', cityCode: 'mukalla', officialId: 'h2_44' },
  s1_2: { name: 'إذاعة سيئون', nameEn: 'Seiyun Radio', city: 'سيئون', cityCode: 'seiyun', officialId: 'h1_43' },
  s1_3: { name: 'إذاعة الأحقاف', nameEn: 'Al-Ahqaf Radio', city: 'المكلا', cityCode: 'mukalla', officialId: null },
  s1_4: { name: 'إذاعة سلامتك', nameEn: 'Salamtak Radio', city: 'المكلا', cityCode: 'mukalla', officialId: 'h6_48' },
  s1_5: { name: 'إذاعة عدن', nameEn: 'Aden Radio', city: 'عدن', cityCode: 'aden', officialId: 'a11_42' },
  s1_6: { name: 'إذاعة لنا إف إم', nameEn: 'Lana FM', city: 'عدن', cityCode: 'aden', officialId: 'xPATj2tF6CMGA6oLavBE' },
  s1_7: { name: 'إذاعة بندر عدن', nameEn: 'Bandar Aden Radio', city: 'عدن', cityCode: 'aden', officialId: 'a5_36' },
  s1_8: { name: 'إذاعة صنعاء', nameEn: "Sana'a Radio", city: 'صنعاء', cityCode: 'sanaa', officialId: 's9_9' },
  s1_9: { name: 'سام إف إم', nameEn: 'Sam FM', city: 'صنعاء', cityCode: 'sanaa', officialId: 's22_22' },
  s1_10: { name: 'يمن إف إم', nameEn: 'Yemen FM', city: 'صنعاء', cityCode: 'sanaa', officialId: 's24_24' },
  s1_11: { name: 'جراند إف إم', nameEn: 'Grand FM', city: 'صنعاء', cityCode: 'sanaa', officialId: 's12_12' },
  s1_12: { name: 'صوت اليمن', nameEn: 'Voice of Yemen FM', city: 'صنعاء', cityCode: 'sanaa', officialId: 's20_20' },
  s1_13: { name: 'إذاعة تعز', nameEn: 'Taiz Radio', city: 'تعز', cityCode: 'taiz', officialId: 'l1_49' },
  s1_14: { name: 'وطني إف إم', nameEn: 'Watani FM', city: 'تعز', cityCode: 'taiz', officialId: null },
  s1_15: { name: 'إذاعة مأرب', nameEn: 'Marib Radio', city: 'مأرب', cityCode: 'marib', officialId: 'o1_57' },
  s1_16: { name: 'إذاعة الحديدة', nameEn: 'Hudaydah Radio', city: 'الحديدة', cityCode: 'hudaydah', officialId: 'l2_50' },
  s1_17: { name: 'إذاعة إب', nameEn: 'Ibb Radio', city: 'إب', cityCode: 'ibb', officialId: 'l9_82' },
  s1_18: { name: 'إذاعة المهرة', nameEn: 'Al-Mahrah Radio', city: 'المهرة', cityCode: 'al_mahrah', officialId: 'l5_53' },
  s1_19: { name: 'إذاعة شبوة', nameEn: 'Shabwah Radio', city: 'شبوة', cityCode: 'shabwah', officialId: 'l4_52' },
  s1_20: { name: 'إذاعة لحج', nameEn: 'Lahj Radio', city: 'لحج', cityCode: 'lahj', officialId: 'a2_33' },
  s1_21: { name: 'إذاعة أبين', nameEn: 'Abyan Radio', city: 'أبين', cityCode: 'abyan', officialId: 'l6_54' },
  s1_22: { name: 'إذاعة سقطرى', nameEn: 'Socotra Radio', city: 'سقطرى', cityCode: 'socotra', officialId: 'so1_82' },
  s1_23: { name: 'إذاعة ذمار', nameEn: 'Dhamar Radio', city: 'ذمار', cityCode: 'dhamar', officialId: null },
  s1_24: { name: 'الإذاعات المحلية', nameEn: 'Local Radio Network', city: 'اليمن', cityCode: 'yemen', officialId: null },
};

// Load data files
const dataDir = path.join(rootDir, 'docs', 'data', 'batch_import_2026_10');
const { parseBatchImportWorkbook, normalizeProgramRow, normalizeEpisodeRow } = await import('../web_admin/lib/batch-import.ts');

const descriptiveXlsxPath = path.join(dataDir, 'hudhud-official-programs-and-episodes-2026-10-19.xlsx');
const xlsxPath = fs.existsSync(descriptiveXlsxPath)
  ? descriptiveXlsxPath
  : path.join(dataDir, 'hudhud_programs_and_episodes.xlsx');
const buffer = fs.readFileSync(xlsxPath);
const parsed = parseBatchImportWorkbook(buffer);

console.log('==================================================');
console.log(`HudHud FM — Content Batch Importer`);
console.log(`Target: Project="${projectId}", Root="${root}"`);
console.log(`Mode: ${shouldApply ? 'APPLY (Write to Firestore)' : 'DRY RUN (Preview only)'}`);
console.log(`Stations Strategy: ${mapToOfficial ? 'Map to existing official IDs' : createMissingStations ? 'Create missing stations (s1_1..s1_24)' : 'Validate stations must already exist'}`);
console.log(`Programs Count: ${parsed.programsRaw.length}`);
console.log(`Episodes Count: ${parsed.episodesRaw.length}`);
console.log('==================================================\n');

// Initialize Firebase
const app = initializeApp({ projectId }, `importer-${Date.now()}`);
const db = getFirestore(app);

// Check stations in Firestore
const stationDocRef = (id) => db.collection(root).doc('stations').collection('stations').doc(id);
const programDocRef = (id) => db.collection(root).doc('programs').collection('programs').doc(id);
const episodeDocRef = (id) => db.collection(root).doc('episodes').collection('episodes').doc(id);

// Pre-fetch all stations
const existingStationsSnap = await db.collection(root).doc('stations').collection('stations').get();
const existingStationIds = new Set(existingStationsSnap.docs.map(d => d.id));
console.log(`Found ${existingStationIds.size} existing stations in ${root}.`);

// Determine station resolution
const resolvedPrograms = [];
const missingStations = new Set();
const stationsToCreate = new Map();

for (const raw of parsed.programsRaw) {
  const norm = normalizeProgramRow(raw.data, raw.rowNumber);
  if (Object.keys(norm.errors).length > 0) {
    console.error(`Validation error in program ${raw.data.programId}:`, norm.errors);
    process.exit(1);
  }

  let targetStationId = norm.normalized.stationId;
  if (mapToOfficial) {
    const meta = STATION_METADATA[targetStationId];
    if (meta && meta.officialId && existingStationIds.has(meta.officialId)) {
      targetStationId = meta.officialId;
    }
  }

  if (!existingStationIds.has(targetStationId)) {
    missingStations.add(targetStationId);
    if (createMissingStations && STATION_METADATA[targetStationId]) {
      const meta = STATION_METADATA[targetStationId];
      stationsToCreate.set(targetStationId, {
        name: meta.name,
        nameEn: meta.nameEn,
        tagline: `${meta.name} - اليمن`,
        description: `إذاعة ${meta.name} - بث إذاعي محلي.`,
        countryCode: 'YE',
        countryNameAr: 'اليمن',
        cityCode: meta.cityCode,
        cityNameAr: meta.city,
        frequency: 'بث محلي',
        streamUrl: 'https://edge.mixlr.com/channel/hudhud_live',
        priority: 50,
        isActive: true,
        isLive: true,
        isFeatured: false,
        isVerified: true,
        stats: {
          programsCount: 0,
          subscribersCount: 0,
          totalPlays: 0,
        },
      });
    }
  }

  resolvedPrograms.push({
    id: norm.id,
    targetStationId,
    data: {
      ...norm.normalized,
      stationId: targetStationId,
      stats: {
        episodesCount: 0,
        subscribersCount: 0,
        totalPlays: 0,
      },
    },
  });
}

// Check if any missing stations remain unhandled
const unhandledStations = [...missingStations].filter(s => !stationsToCreate.has(s));
if (unhandledStations.length > 0 && !createMissingStations) {
  console.error(`\n❌ Error: The following ${unhandledStations.length} station IDs do not exist in "${root}":`);
  console.error(unhandledStations.join(', '));
  console.error('\nTo automatically create missing station documents (s1_1..s1_24), pass: --create-missing-stations');
  console.error('To map to existing official station IDs (where available), pass: --map-to-official');
  process.exit(1);
}

// Group programs by station to compute counts
const stationProgramsCount = new Map();
for (const p of resolvedPrograms) {
  stationProgramsCount.set(p.targetStationId, (stationProgramsCount.get(p.targetStationId) || 0) + 1);
}

// Resolve episodes
const resolvedEpisodes = [];
const programEpisodesCount = new Map();

for (const raw of parsed.episodesRaw) {
  const norm = normalizeEpisodeRow(raw.data, raw.rowNumber);
  if (Object.keys(norm.errors).length > 0) {
    console.error(`Validation error in episode ${raw.data.episodeId}:`, norm.errors);
    process.exit(1);
  }

  // Find parent program to inherit stationId
  const parentProg = resolvedPrograms.find(p => p.id === norm.normalized.programId);
  if (!parentProg) {
    console.error(`Episode ${norm.id} references unknown program ${norm.normalized.programId}`);
    process.exit(1);
  }

  programEpisodesCount.set(parentProg.id, (programEpisodesCount.get(parentProg.id) || 0) + 1);

  const broadcastTimestamp = Timestamp.fromDate(new Date(norm.normalized.broadcastAt));
  const publishedTimestamp = norm.normalized.publishedAt
    ? Timestamp.fromDate(new Date(norm.normalized.publishedAt))
    : null;

  resolvedEpisodes.push({
    id: norm.id,
    programId: parentProg.id,
    stationId: parentProg.targetStationId,
    data: {
      ...norm.normalized,
      stationId: parentProg.targetStationId,
      broadcastAt: broadcastTimestamp,
      publishedAt: publishedTimestamp,
      stats: {
        playsCount: 0,
        likesCount: 0,
        commentsCount: 0,
      },
    },
  });
}

// Update episode counts on programs
for (const p of resolvedPrograms) {
  p.data.stats.episodesCount = programEpisodesCount.get(p.id) || 0;
}

console.log(`\nImport Plan Summary:`);
console.log(`- Stations to create: ${stationsToCreate.size}`);
console.log(`- Programs to write: ${resolvedPrograms.length}`);
console.log(`- Episodes to write: ${resolvedEpisodes.length}`);
console.log(`- Stations with counter updates: ${stationProgramsCount.size}`);

if (!shouldApply) {
  console.log('\nDry run completed successfully. No changes were made.');
  console.log('To apply these changes to Firestore, run with: --apply');
  process.exit(0);
}

console.log('\nApplying changes to Firestore in atomic batches...');

await applyProgramEpisodeImportPlan({ firestore: db, root, stationsToCreate, stationProgramsCount, resolvedPrograms, resolvedEpisodes, stationsOnly, FieldValue });
if (stationsOnly) process.exit(0);
}

export async function applyProgramEpisodeImportPlan({ firestore: db, root, stationsToCreate, stationProgramsCount, resolvedPrograms, resolvedEpisodes, stationsOnly = false, FieldValue, log = console.log }) {
  const operations = [];
  const push = (kind, resource, id, data) => operations.push({ kind, resource, id, data });
  for (const [id, data] of stationsToCreate) push('set', 'stations', id, { ...data,
    stats: { ...data.stats, programsCount: stationsOnly ? 0 : (stationProgramsCount.get(id) || 0) } });
  if (!stationsOnly) {
    for (const [id, count] of stationProgramsCount) if (!stationsToCreate.has(id)) push('update', 'stations', id, { 'stats.programsCount': FieldValue.increment(count) });
    for (const entry of resolvedPrograms) push('set', 'programs', entry.id, entry.data);
    for (const entry of resolvedEpisodes) push('set', 'episodes', entry.id, entry.data);
  }
  // Reserve an extra write for each possible native episode birth, within450.
  for (let cursor = 0; cursor < operations.length;) {
    const chunk = []; let budget = 0;
    while (cursor < operations.length && budget + (operations[cursor].resource === 'episodes' ? 2 : 1) <= 450) {
      const entry = operations[cursor++]; chunk.push(entry); budget += entry.resource === 'episodes' ? 2 : 1;
    }
    const committed = await db.runTransaction(async tx => {
      if (!stationsOnly && resolvedEpisodes.length) await readCommentCountFence(tx, db, root);
      const writes = [];
      for (const entry of chunk) {
        const ref = db.doc(`${root}/${entry.resource}/${entry.resource}/${entry.id}`);
        let data = entry.data;
        if (entry.resource === 'episodes') {
          const current = await tx.get(ref);
          if (current.exists) {
            if (current.get('adminDeletionToken')) throw new CommentCountMaintenanceError();
            const { commentsCount: ignored, ...stats } = data.stats ?? {}; void ignored;
            if (Object.hasOwn(current.data().stats ?? {}, 'commentsCount')) stats.commentsCount = current.get('stats.commentsCount');
            data = { ...data, stats };
          } else {
            const birth = await prepareNewEpisodeCountBaseline(tx, db, { root, episodeId: entry.id });
            if (birth.mode === 'active') data = { ...data, stats: { ...data.stats, commentsCount: 0 } };
            writes.push(...birth.writes);
          }
        }
        writes.push(() => entry.kind === 'update' ? tx.update(ref, data) : tx.set(ref, data, { merge: true }));
      }
      for (const write of writes) write();
      return writes.length;
    });
    log(`  Committed batch of ${committed} operations.`);
  }
  if (stationsOnly) {
    log('\n🎉 Stations provisioned successfully!');
    log(`- ${stationsToCreate.size} stations created in "${root}".`);
    log('You can now upload hudhud_programs_and_episodes.xlsx via the Web Admin batch import modal with zero errors!');
    return;
  }
  log('\n🎉 Import completed successfully!');
  log(`- ${resolvedPrograms.length} programs created/updated.`);
  log(`- ${resolvedEpisodes.length} episodes created/updated.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
