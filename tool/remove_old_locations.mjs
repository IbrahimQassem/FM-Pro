#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import { ALL_CANONICAL_LOCATIONS } from './firebase_seed/canonical_locations.mjs';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const canonicalIds = new Set(ALL_CANONICAL_LOCATIONS.map((l) => l.id));
const roots = ['HudHudOfficial', 'HudHudDev'];
const projectId = process.env.GCLOUD_PROJECT || 'sanadev-fm';

let FirestoreModule;
try {
  FirestoreModule = await import('@google-cloud/firestore');
} catch {
  FirestoreModule = await import('../functions/node_modules/@google-cloud/firestore/build/src/index.js');
}
const { Firestore, FieldValue } = FirestoreModule;
const db = new Firestore({ projectId });

async function main() {
  const backupData = {
    timestamp: new Date().toISOString(),
    projectId,
    roots: {},
  };

  for (const root of roots) {
    console.log(`\n=== Scanning ${root} for old locations ===`);
    const colRef = db.collection(`${root}/locations/locations`);
    const snap = await colRef.get();

    const oldDocs = snap.docs.filter((d) => !canonicalIds.has(d.id));
    console.log(`Found ${oldDocs.length} old location documents in ${root}:`);
    oldDocs.forEach((d) => {
      console.log(`  - [${d.id}] cityCode="${d.data().cityCode}" cityNameAr="${d.data().cityNameAr}"`);
    });

    backupData.roots[root] = oldDocs.map((d) => ({
      id: d.id,
      data: d.data(),
    }));

    if (oldDocs.length > 0) {
      console.log(`Deleting ${oldDocs.length} old documents from ${root}...`);
      const batch = db.batch();
      for (const d of oldDocs) {
        batch.delete(d.ref);
      }
      await batch.commit();

      // Bump revision on root locations doc
      const rootCatalogRef = db.doc(`${root}/locations`);
      await rootCatalogRef.set(
        { adminIdentityRevision: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      console.log(`Successfully deleted old locations and bumped revision in ${root}.`);
    } else {
      console.log(`No old locations to delete in ${root}.`);
    }
  }

  const backupPath = resolve(process.cwd(), `tool/backups/old_locations_backup_${Date.now()}.json`);
  await mkdir(dirname(backupPath), { recursive: true });
  await writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\nBackup safely written to: ${backupPath}`);
  console.log('Done!');
}

main().catch((err) => {
  console.error('Error removing old locations:', err);
  process.exit(1);
});
