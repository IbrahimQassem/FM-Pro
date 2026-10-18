import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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

// Write in batches (Firestore max 500 operations per batch)
let batch = db.batch();
let opCount = 0;

async function commitBatchIfNeeded(force = false) {
  if (opCount >= 450 || (force && opCount > 0)) {
    await batch.commit();
    console.log(`  Committed batch of ${opCount} operations.`);
    batch = db.batch();
    opCount = 0;
  }
}

// 1. Create missing stations
for (const [stId, stData] of stationsToCreate.entries()) {
  const initialProgramsCount = stationsOnly ? 0 : (stationProgramsCount.get(stId) || 0);
  batch.set(stationDocRef(stId), {
    ...stData,
    stats: { ...stData.stats, programsCount: initialProgramsCount },
  }, { merge: true });
  opCount++;
  await commitBatchIfNeeded();
}

if (stationsOnly) {
  await commitBatchIfNeeded(true);
  console.log('\n🎉 Stations provisioned successfully!');
  console.log(`- ${stationsToCreate.size} stations created in "${root}".`);
  console.log('You can now upload hudhud_programs_and_episodes.xlsx via the Web Admin batch import modal with zero errors!');
  process.exit(0);
}

// 2. Update existing stations' programsCount
for (const [stId, addCount] of stationProgramsCount.entries()) {
  if (!stationsToCreate.has(stId)) {
    batch.update(stationDocRef(stId), {
      'stats.programsCount': FieldValue.increment(addCount),
    });
    opCount++;
    await commitBatchIfNeeded();
  }
}

// 3. Write Programs
for (const p of resolvedPrograms) {
  batch.set(programDocRef(p.id), p.data, { merge: true });
  opCount++;
  await commitBatchIfNeeded();
}

// 4. Write Episodes
for (const ep of resolvedEpisodes) {
  batch.set(episodeDocRef(ep.id), ep.data, { merge: true });
  opCount++;
  await commitBatchIfNeeded();
}

await commitBatchIfNeeded(true);

console.log('\n🎉 Import completed successfully!');
console.log(`- ${resolvedPrograms.length} programs created/updated.`);
console.log(`- ${resolvedEpisodes.length} episodes created/updated.`);
