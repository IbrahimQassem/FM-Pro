#!/usr/bin/env node

import { writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import { ALL_CANONICAL_LOCATIONS } from './canonical_locations.mjs';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const SUPPORTED_ROOTS = ['HudHudDev', 'HudHudOfficial'];

export function parseArgs(argv) {
  const args = argv.slice(2);
  const shouldApply = args.includes('--apply');
  const dryRun = !shouldApply || args.includes('--dry-run');

  let roots = ['HudHudDev'];
  const rootIndex = args.indexOf('--root');
  const rootsIndex = args.indexOf('--roots');
  if (rootIndex >= 0 && args[rootIndex + 1]) {
    roots = [args[rootIndex + 1]];
  } else if (rootsIndex >= 0 && args[rootsIndex + 1]) {
    roots = args[rootsIndex + 1].split(',').map((r) => r.trim()).filter(Boolean);
  }

  for (const r of roots) {
    if (!SUPPORTED_ROOTS.includes(r)) {
      throw new Error(`Unsupported root "${r}". Allowed roots: ${SUPPORTED_ROOTS.join(', ')}`);
    }
  }

  let manifestPath = '';
  const manifestIndex = args.indexOf('--manifest');
  if (manifestIndex >= 0 && args[manifestIndex + 1]) {
    manifestPath = resolve(process.cwd(), args[manifestIndex + 1]);
  }

  const projectIndex = args.indexOf('--project');
  const projectId = projectIndex >= 0 ? args[projectIndex + 1] : process.env.GCLOUD_PROJECT || 'demo-hudhud-fm-rules-test';

  return {
    shouldApply,
    dryRun,
    roots,
    manifestPath,
    projectId,
  };
}

export function computeLocationDiff(existingData, canonical) {
  const fields = ['cityCode', 'cityNameAr', 'countryCode', 'countryNameAr', 'locationType', 'sortOrder', 'isActive'];
  const diff = {};
  let changed = false;

  for (const field of fields) {
    if (existingData[field] !== canonical[field]) {
      diff[field] = {
        before: existingData[field],
        after: canonical[field],
      };
      changed = true;
    }
  }

  return { changed, diff };
}

export function buildRootSeedPlan(existingMap, canonicalList = ALL_CANONICAL_LOCATIONS) {
  const toCreate = [];
  const toUpdate = [];
  const unchanged = [];

  for (const loc of canonicalList) {
    const existing = existingMap.get(loc.id);
    if (!existing) {
      toCreate.push({ id: loc.id, data: { ...loc } });
    } else {
      const { changed, diff } = computeLocationDiff(existing, loc);
      if (changed) {
        toUpdate.push({ id: loc.id, updates: { ...loc }, diff });
      } else {
        unchanged.push(loc.id);
      }
    }
  }

  return {
    toCreate,
    toUpdate,
    unchanged,
    totalPlanned: toCreate.length + toUpdate.length + unchanged.length,
  };
}

export async function runLocationsSeeding(options, firestoreClient = null) {
  const { shouldApply, dryRun, roots, manifestPath, projectId } = options;

  let firestore = firestoreClient;
  if (!firestore) {
    let FirestoreModule;
    try {
      FirestoreModule = await import('@google-cloud/firestore');
    } catch {
      FirestoreModule = await import('../../functions/node_modules/@google-cloud/firestore/build/src/index.js');
    }
    const { Firestore } = FirestoreModule;
    firestore = new Firestore({ projectId });
  }

  const overallResults = {};
  const manifest = {
    timestamp: new Date().toISOString(),
    projectId,
    dryRun,
    roots: {},
  };

  for (const root of roots) {
    console.log(`\n--- Evaluating Root: ${root} ---`);
    const locationsRef = firestore.collection(`${root}/locations/locations`);
    const snapshot = await locationsRef.get();

    const existingMap = new Map();
    for (const doc of snapshot.docs) {
      existingMap.set(doc.id, doc.data());
    }

    const plan = buildRootSeedPlan(existingMap);
    console.log(`Root ${root} plan: create=${plan.toCreate.length}, update=${plan.toUpdate.length}, unchanged=${plan.unchanged.length}`);

    if (plan.toCreate.length > 0) {
      console.log(`  New locations to create: ${plan.toCreate.map((e) => e.id).join(', ')}`);
    }
    if (plan.toUpdate.length > 0) {
      console.log(`  Locations to update: ${plan.toUpdate.map((e) => e.id).join(', ')}`);
    }

    const rootResult = {
      status: 'evaluated',
      created: plan.toCreate.length,
      updated: plan.toUpdate.length,
      unchanged: plan.unchanged.length,
      details: {
        createdIds: plan.toCreate.map((e) => e.id),
        updatedIds: plan.toUpdate.map((e) => e.id),
      },
    };

    if (shouldApply && !dryRun && plan.toUpdate.some(item => item.id === 'global-ar')) {
      throw new Error('Regional reference updates require tool/migrate_regional_location.mjs so station projections and audit remain atomic.');
    }
    if (shouldApply && !dryRun) {
      console.log(`Applying changes to root ${root}...`);
      let FieldValue;
      try {
        const firestorePkg = await import('@google-cloud/firestore');
        FieldValue = firestorePkg.FieldValue;
      } catch {
        const firestorePkg = await import('../../functions/node_modules/@google-cloud/firestore/build/src/index.js');
        FieldValue = firestorePkg.FieldValue;
      }

      const batchSize = 25;
      const allOps = [
        ...plan.toCreate.map((item) => ({ type: 'set', id: item.id, data: item.data })),
        ...plan.toUpdate.map((item) => ({ type: 'update', id: item.id, data: item.updates })),
      ];

      for (let i = 0; i < allOps.length; i += batchSize) {
        const chunk = allOps.slice(i, i + batchSize);
        const batch = firestore.batch();
        for (const op of chunk) {
          const docRef = locationsRef.doc(op.id);
          if (op.type === 'set') {
            batch.set(docRef, op.data);
          } else {
            batch.set(docRef, op.data, { merge: true });
          }
        }
        await batch.commit();
      }

      // Bump revision on root locations doc
      const rootCatalogRef = firestore.doc(`${root}/locations`);
      await rootCatalogRef.set(
        { adminIdentityRevision: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

      rootResult.status = 'applied';
      console.log(`Successfully applied ${allOps.length} writes to ${root}.`);
    }

    overallResults[root] = rootResult;
    manifest.roots[root] = rootResult;
  }

  if (manifestPath) {
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to ${manifestPath}`);
  }

  return { results: overallResults, manifest };
}

async function main() {
  try {
    const options = parseArgs(process.argv);
    console.log(`Running locations seed tool (dryRun=${options.dryRun}, roots=[${options.roots.join(', ')}])`);
    const outcome = await runLocationsSeeding(options);
    if (options.dryRun) {
      console.log('\n[Dry-run completed]: No changes written to database. Review plan and use --apply to write.');
    } else {
      console.log('\n[Apply completed]: Canonical locations seeded successfully.');
    }
  } catch (err) {
    console.error('Seed tool failed:', err);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  void main();
}
