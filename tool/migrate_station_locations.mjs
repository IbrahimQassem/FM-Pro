#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import { ALL_CANONICAL_LOCATIONS } from './firebase_seed/canonical_locations.mjs';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const VALID_ROOTS = ['HudHudDev', 'HudHudOfficial'];

export function normalizeLocationText(text) {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFKC')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function computeSnapshotFingerprint(stations) {
  const sorted = [...stations].sort((a, b) => a.id.localeCompare(b.id));
  const hash = createHash('sha256');
  for (const s of sorted) {
    const data = s.data || {};
    hash.update(`${s.id}|${data.cityCode || ''}|${data.cityNameAr || ''}|${data.updatedAt || ''}\n`);
  }
  return hash.digest('hex');
}

export function matchStationToLocation(stationData, canonicalLocations = ALL_CANONICAL_LOCATIONS) {
  const cityCode = normalizeLocationText(stationData.cityCode);
  const cityNameAr = normalizeLocationText(stationData.cityNameAr);
  const stationName = normalizeLocationText(stationData.name);
  const stationNameEn = normalizeLocationText(stationData.nameEn);

  // 1. Direct code lookup
  const byCode = canonicalLocations.find((loc) => loc.cityCode === cityCode || loc.id === cityCode);

  // 2. Direct name lookup
  const byName = canonicalLocations.filter((loc) => {
    const canonName = normalizeLocationText(loc.cityNameAr);
    return cityNameAr && (canonName === cityNameAr || canonName.includes(cityNameAr) || cityNameAr.includes(canonName));
  });

  if (byCode) {
    if (byName.length > 0 && !byName.some((loc) => loc.id === byCode.id)) {
      return {
        status: 'ambiguous',
        reason: 'code_and_name_conflict',
        details: `cityCode "${cityCode}" maps to ${byCode.id}, but cityNameAr "${cityNameAr}" matches ${byName.map((l) => l.id).join(', ')}`,
      };
    }
    return {
      status: 'matched',
      targetLocation: byCode,
      reason: 'direct_code_match',
    };
  }

  if (byName.length === 1) {
    return {
      status: 'matched',
      targetLocation: byName[0],
      reason: 'exact_name_match',
    };
  }

  if (byName.length > 1) {
    return {
      status: 'ambiguous',
      reason: 'multiple_name_matches',
      candidates: byName.map((l) => l.id),
    };
  }

  // 3. Fallback: check if station title mentions a known governorate
  const byStationTitle = canonicalLocations.filter((loc) => {
    const canonName = normalizeLocationText(loc.cityNameAr);
    return stationName.includes(canonName) || stationNameEn.toLowerCase().includes(loc.id.toLowerCase());
  });

  if (byStationTitle.length === 1) {
    return {
      status: 'matched',
      targetLocation: byStationTitle[0],
      reason: 'inferred_from_station_name',
    };
  }

  if (byStationTitle.length > 1) {
    return {
      status: 'ambiguous',
      reason: 'multiple_candidates_in_station_name',
      candidates: byStationTitle.map((l) => l.id),
    };
  }

  return {
    status: 'ambiguous',
    reason: 'no_location_candidate_found',
  };
}

export function analyzeStations(stations, canonicalLocations = ALL_CANONICAL_LOCATIONS) {
  const decisions = [];
  const counts = {
    total: stations.length,
    unchanged: 0,
    proposed_update: 0,
    ambiguous: 0,
  };

  for (const station of stations) {
    const data = station.data || {};
    const match = matchStationToLocation(data, canonicalLocations);

    if (match.status === 'ambiguous') {
      counts.ambiguous++;
      decisions.push({
        id: station.id,
        status: 'ambiguous',
        current: {
          cityCode: data.cityCode ?? '',
          cityNameAr: data.cityNameAr ?? '',
          countryCode: data.countryCode ?? '',
          countryNameAr: data.countryNameAr ?? '',
        },
        reason: match.reason,
        candidates: match.candidates,
        details: match.details,
      });
      continue;
    }

    const target = match.targetLocation;
    const isIdentical =
      data.cityCode === target.cityCode &&
      data.cityNameAr === target.cityNameAr &&
      data.countryCode === target.countryCode &&
      data.countryNameAr === target.countryNameAr &&
      data.locationType === target.locationType;

    if (isIdentical) {
      counts.unchanged++;
      decisions.push({
        id: station.id,
        status: 'unchanged',
        targetLocationId: target.id,
        reason: 'already_canonical',
      });
    } else {
      counts.proposed_update++;
      decisions.push({
        id: station.id,
        status: 'proposed_update',
        reason: match.reason,
        targetLocationId: target.id,
        current: {
          cityCode: data.cityCode ?? '',
          cityNameAr: data.cityNameAr ?? '',
          countryCode: data.countryCode ?? '',
          countryNameAr: data.countryNameAr ?? '',
          locationType: data.locationType ?? '',
        },
        proposed: {
          cityCode: target.cityCode,
          cityNameAr: target.cityNameAr,
          countryCode: target.countryCode,
          countryNameAr: target.countryNameAr,
          locationType: target.locationType,
        },
      });
    }
  }

  return { counts, decisions };
}

export function parseArgs(argv) {
  const args = argv.slice(2);
  const shouldApply = args.includes('--apply');
  const dryRun = !shouldApply || args.includes('--dry-run');

  const rootIndex = args.indexOf('--root');
  const root = rootIndex >= 0 ? args[rootIndex + 1] : '';

  if (!root || !VALID_ROOTS.includes(root)) {
    throw new Error(`--root is required and must be one of: ${VALID_ROOTS.join(', ')}`);
  }

  const reportIndex = args.indexOf('--report');
  const reportPath = reportIndex >= 0 ? resolve(process.cwd(), args[reportIndex + 1]) : '';

  if (shouldApply && !reportPath) {
    throw new Error('Refusing --apply without --report <path>. A verified dry-run report is mandatory before applying.');
  }

  const backupIndex = args.indexOf('--backup');
  const backupPath = backupIndex >= 0 ? resolve(process.cwd(), args[backupIndex + 1]) : '';

  const projectIndex = args.indexOf('--project');
  const projectId = projectIndex >= 0 ? args[projectIndex + 1] : process.env.GCLOUD_PROJECT || 'demo-hudhud-fm-rules-test';

  return {
    shouldApply,
    dryRun,
    root,
    reportPath,
    backupPath,
    projectId,
  };
}

export async function runMigration(options, firestoreClient = null) {
  const { shouldApply, dryRun, root, reportPath, backupPath, projectId } = options;

  let firestore = firestoreClient;
  if (!firestore) {
    let FirestoreModule;
    try {
      FirestoreModule = await import('@google-cloud/firestore');
    } catch {
      FirestoreModule = await import('../functions/node_modules/@google-cloud/firestore/build/src/index.js');
    }
    const { Firestore } = FirestoreModule;
    firestore = new Firestore({ projectId });
  }

  const stationsCol = firestore.collection(`${root}/stations/stations`);
  const snapshot = await stationsCol.get();
  const stations = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));

  const fingerprint = computeSnapshotFingerprint(stations);
  const { counts, decisions } = analyzeStations(stations);

  const report = {
    generatedAt: new Date().toISOString(),
    root,
    projectId,
    snapshotFingerprint: fingerprint,
    counts,
    decisions,
  };

  if (dryRun) {
    console.log(`\n=== Migration Dry-Run Report [Root: ${root}] ===`);
    console.log(`Total stations: ${counts.total}`);
    console.log(`Unchanged: ${counts.unchanged}`);
    console.log(`Proposed updates: ${counts.proposed_update}`);
    console.log(`Ambiguous (needs manual review): ${counts.ambiguous}`);

    if (reportPath) {
      await mkdir(dirname(reportPath), { recursive: true });
      await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`Dry-run report saved to ${reportPath}`);
    }

    return { report, applied: false };
  }

  // Apply mode
  console.log(`\n=== Applying Migration [Root: ${root}] ===`);
  const existingReportRaw = await readFile(reportPath, 'utf8');
  const existingReport = JSON.parse(existingReportRaw);

  if (existingReport.root !== root) {
    throw new Error(`Report root "${existingReport.root}" does not match target root "${root}".`);
  }

  if (existingReport.snapshotFingerprint !== fingerprint) {
    throw new Error(
      `Snapshot fingerprint mismatch! Database changed since dry-run report was generated.\n` +
      `Report fingerprint: ${existingReport.snapshotFingerprint}\n` +
      `Current DB fingerprint: ${fingerprint}\n` +
      `Please re-run in dry-run mode to generate an up-to-date report.`,
    );
  }

  if (existingReport.counts.ambiguous > 0) {
    throw new Error(
      `Cannot apply migration with ${existingReport.counts.ambiguous} ambiguous station records. Resolve ambiguities first.`,
    );
  }

  // Backup current state
  const backupFile = backupPath || resolve(process.cwd(), `tool/backups/stations_backup_${root}_${Date.now()}.json`);
  await mkdir(dirname(backupFile), { recursive: true });
  await writeFile(backupFile, JSON.stringify(stations, null, 2), 'utf8');
  console.log(`Backup saved to ${backupFile}`);

  const updates = decisions.filter((d) => d.status === 'proposed_update');
  console.log(`Applying updates to ${updates.length} stations in batches...`);

  let FieldValue;
  try {
    const firestorePkg = await import('@google-cloud/firestore');
    FieldValue = firestorePkg.FieldValue;
  } catch {
    const firestorePkg = await import('../functions/node_modules/@google-cloud/firestore/build/src/index.js');
    FieldValue = firestorePkg.FieldValue;
  }
  const batchSize = 25;
  const affectedCityCodes = new Set();

  for (let i = 0; i < updates.length; i += batchSize) {
    const chunk = updates.slice(i, i + batchSize);
    const batch = firestore.batch();
    for (const item of chunk) {
      const docRef = stationsCol.doc(item.id);
      batch.update(docRef, {
        ...item.proposed,
        updatedAt: FieldValue.serverTimestamp(),
      });
      affectedCityCodes.add(item.proposed.cityCode);
    }
    await batch.commit();
  }

  // Update adminRelationRevision on affected locations
  for (const cityCode of affectedCityCodes) {
    const locRef = firestore.doc(`${root}/locations/locations/${cityCode}`);
    const locSnap = await locRef.get();
    if (locSnap.exists) {
      await locRef.set(
        { adminRelationRevision: FieldValue.increment(1) },
        { merge: true },
      );
    }
  }

  console.log(`Successfully migrated ${updates.length} stations.`);
  return { report, applied: true, updatedCount: updates.length };
}

async function main() {
  try {
    const options = parseArgs(process.argv);
    await runMigration(options);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  void main();
}
