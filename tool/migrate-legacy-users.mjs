#!/usr/bin/env node
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultSourcePath = 'HudHudFmGooglePlay/Users/Users';
const knownRoots = ['HudHudDev', 'HudHudOfficial'];

function validateScope({ projectId, targetRoot, sourcePath, shouldApply }) {
  if (typeof projectId !== 'string' || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId) ||
      !knownRoots.includes(targetRoot) || typeof shouldApply !== 'boolean') {
    throw new Error('An explicit project, known target root and valid execution mode are required.');
  }
  const parts = typeof sourcePath === 'string' ? sourcePath.split('/') : [];
  if (!parts.length || parts.length % 2 !== 1 || parts.some(part => !part || part === '.' || part === '..' || /[\x00-\x1f]/.test(part)) ||
      sourcePath === `${targetRoot}/users/users`) {
    throw new Error('A valid distinct legacy source collection is required.');
  }
}

// Importing this module never initializes Firebase or starts a migration.
// This producer is not the station/profile cleanup tool and does not remove any
// existing email. It must remain quiesced during that separately approved cleanup.
export async function runLegacyUsersMigration({
  firestore, projectId, targetRoot, sourcePath = defaultSourcePath,
  shouldApply = false, force = false, timestamp, log = () => {},
}) {
  validateScope({ projectId, targetRoot, sourcePath, shouldApply });
  if (typeof timestamp !== 'function') throw new Error('A timestamp provider is required.');
  const migrationRef = firestore.doc(`${targetRoot}/system/migrations/migration_legacy_users`);
  const migrationDoc = await migrationRef.get();
  if (migrationDoc.exists && migrationDoc.data()?.status === 'completed' && !force) {
    log('Legacy user migration skipped: completed barrier exists.');
    return { status: 'already-completed', migratedCount: 0, skippedCount: 0 };
  }

  let sourceRef = firestore.collection(sourcePath);
  let snapshot = await sourceRef.get();
  if (snapshot.empty && sourcePath === defaultSourcePath) {
    const alternative = firestore.collection('HudHudFmGooglePlay/users/users');
    const alternateSnapshot = await alternative.get();
    if (!alternateSnapshot.empty) {
      sourceRef = alternative;
      snapshot = alternateSnapshot;
    }
  }
  if (snapshot.empty) {
    log('Legacy user migration: no source records.');
    return { status: 'empty', migratedCount: 0, skippedCount: 0 };
  }

  let migratedCount = 0;
  let skippedCount = 0;
  const batches = [];
  let currentBatch = shouldApply ? firestore.batch() : null;
  let opCount = 0;
  for (const document of snapshot.docs) {
    const legacy = document.data() || {};
    const targetRef = firestore.doc(`${targetRoot}/users/users/${document.id}`);
    const targetSnapshot = await targetRef.get();
    if (targetSnapshot.exists) {
      const target = targetSnapshot.data() || {};
      const backfill = {};
      if (!target.displayName && (legacy.displayName || legacy.name || legacy.username)) {
        backfill.displayName = legacy.displayName || legacy.name || legacy.username;
      }
      if (Object.keys(backfill).length) {
        if (shouldApply) {
          currentBatch.update(targetRef, { ...backfill, updatedAt: timestamp() });
          opCount++;
        }
        migratedCount++;
      } else {
        skippedCount++;
      }
    } else {
      const canonical = {
        displayName: legacy.displayName || legacy.name || legacy.username || legacy.userName || 'Listener',
        username: legacy.username || legacy.userName || '',
        avatarUrl: legacy.avatarUrl || legacy.photoUrl || legacy.photoURL || legacy.image || '',
        isActive: legacy.isActive !== false && legacy.disabled !== true,
        role: legacy.role || 'listener',
        createdAt: legacy.createdAt || legacy.timestamp || timestamp(),
        updatedAt: timestamp(),
        migratedFrom: sourceRef.path || sourcePath,
        migratedAt: timestamp(),
      };
      if (shouldApply) {
        currentBatch.set(targetRef, canonical);
        opCount++;
      }
      migratedCount++;
    }
    if (shouldApply && opCount >= 400) {
      batches.push(currentBatch.commit());
      currentBatch = firestore.batch();
      opCount = 0;
    }
  }
  if (shouldApply) {
    if (opCount) batches.push(currentBatch.commit());
    await Promise.all(batches);
    await migrationRef.set({
      completedAt: timestamp(), completedBy: 'cli-script', sourcePath: sourceRef.path || sourcePath,
      targetRoot, totalSource: snapshot.size, migratedCount, skippedCount, status: 'completed',
    });
  }
  log(`Legacy user migration ${shouldApply ? 'applied' : 'dry-run'}: source=${snapshot.size}, changed=${migratedCount}, skipped=${skippedCount}.`);
  return { status: shouldApply ? 'completed' : 'dry-run', migratedCount, skippedCount };
}

export function parseLegacyUserOptions(argv, env = {}) {
  const options = { projectId: env.GCLOUD_PROJECT, targetRoot: env.TARGET_ROOT,
    sourcePath: env.SOURCE_PATH || defaultSourcePath, shouldApply: false, force: false };
  for (const argument of argv) {
    if (argument === '--apply') options.shouldApply = true;
    else if (argument === '--dry-run') continue;
    else if (argument === '--force') options.force = true;
    else if (argument.startsWith('--project=')) options.projectId = argument.slice(10);
    else if (argument.startsWith('--root=')) options.targetRoot = argument.slice(7);
    else if (argument.startsWith('--source=')) options.sourcePath = argument.slice(9);
    else if (argument.startsWith('--credentials=')) options.credentials = argument.slice(14);
    else throw new Error('Unknown legacy migration option.');
  }
  if (argv.includes('--apply') && argv.includes('--dry-run')) throw new Error('Choose one execution mode.');
  validateScope(options);
  return options;
}

async function main() {
  // Scope validation happens before SDK loading, credential reads or network IO.
  const options = parseLegacyUserOptions(process.argv.slice(2), process.env);
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore, FieldValue } = require('firebase-admin/firestore');
  let credential;
  if (options.credentials) {
    const serviceAccount = JSON.parse(await readFile(options.credentials, 'utf8'));
    if (serviceAccount.project_id !== options.projectId) throw new Error('Credential project does not match explicit project.');
    credential = cert(serviceAccount);
  }
  const app = initializeApp({ projectId: options.projectId, ...(credential ? { credential } : {}) });
  await runLegacyUsersMigration({ ...options, firestore: getFirestore(app), timestamp: () => FieldValue.serverTimestamp(), log: console.log });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    // Raw SDK errors can contain account values, identifiers or credential paths.
    console.error('Legacy user migration stopped. Check explicit scope, authorization and SDK availability.');
    process.exitCode = 1;
  });
}
