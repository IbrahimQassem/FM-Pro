#!/usr/bin/env node
import { createRequire } from 'node:module';

import fs from 'node:fs';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = process.env.GCLOUD_PROJECT || 'sanadev-fm';
const credArg = process.argv.find((a) => a.startsWith('--credentials='));

console.log('------------------------------------------------------------');
console.log(' HudHud FM — One-Time Legacy Users Migration Script');
console.log('------------------------------------------------------------');
console.log(`Project: ${projectId}`);
console.log(`Emulator Mode: ${isEmulator ? process.env.FIRESTORE_EMULATOR_HOST : 'No (Direct Firebase/GCP)'}`);
if (credArg) console.log(`Credentials:   ${credArg.split('=')[1]}`);

process.on('unhandledRejection', (err) => {
  if (err && String(err.message || err).includes('Could not load the default credentials')) {
    console.error('\n❌ خطأ مصادقة: لم يتم العثور على بيانات اعتماد Google Cloud / Firebase.');
    console.error('يرجى استخدام أحد الخيارات التالية للمصادقة:');
    console.error('1) تشغيل أمر تسجيل الدخول:');
    console.error('   gcloud auth application-default login');
    console.error('2) أو تمرير مفتاح Service Account JSON:');
    console.error('   node tool/migrate-legacy-users.mjs --credentials=/path/to/serviceAccountKey.json');
    console.error('3) أو للتشغيل على المحاكي المحلي (Local Emulator):');
    console.error('   FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 node tool/migrate-legacy-users.mjs\n');
  } else {
    console.error('\n❌ Unhandled error:', err);
  }
  process.exit(1);
});

try {
  if (credArg) {
    const credPath = credArg.split('=')[1];
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  } else {
    initializeApp({ projectId });
  }
} catch {
  // App already initialized
}

const firestore = getFirestore();
const sourcePath = process.env.SOURCE_PATH || 'HudHudFmGooglePlay/Users/Users';
const targetRoot = process.env.TARGET_ROOT || 'HudHudOfficial';
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

console.log(`Source Collection: /${sourcePath}`);
console.log(`Target Collection: /${targetRoot}/users/users`);
console.log(`Execution Mode:    ${dryRun ? 'DRY RUN (No writes)' : 'LIVE MIGRATION'}`);
console.log('------------------------------------------------------------');

async function run() {
  const migrationRef = firestore.doc(`${targetRoot}/system/migrations/migration_legacy_users`);
  const migrationDoc = await migrationRef.get();

  if (migrationDoc.exists && migrationDoc.data()?.status === 'completed' && !force) {
    const info = migrationDoc.data();
    console.log('⚠️ Migration has ALREADY BEEN EXECUTED previously:');
    console.log(`   - Completed At:   ${info.completedAt?.toDate?.() || info.completedAt}`);
    console.log(`   - Completed By:   ${info.completedBy}`);
    console.log(`   - Migrated Count: ${info.migratedCount}`);
    console.log(`   - Skipped Count:  ${info.skippedCount}`);
    console.log('\nTo force re-run, pass the --force flag.');
    process.exit(0);
  }

  let sourceRef = firestore.collection(sourcePath);
  let snapshot = await sourceRef.get();

  // If initial path returned 0, test lowercase variation
  if (snapshot.empty && sourcePath === 'HudHudFmGooglePlay/Users/Users') {
    const altRef = firestore.collection('HudHudFmGooglePlay/users/users');
    const altSnap = await altRef.get();
    if (!altSnap.empty) {
      console.log('Found documents in lowercase path: HudHudFmGooglePlay/users/users');
      sourceRef = altRef;
      snapshot = altSnap;
    }
  }

  if (snapshot.empty) {
    console.log(`❌ No legacy users found in /${sourcePath}.`);
    process.exit(0);
  }

  console.log(`Found ${snapshot.size} legacy user records in source.`);

  let migratedCount = 0;
  let skippedCount = 0;
  const batches = [];
  let currentBatch = firestore.batch();
  let opCount = 0;

  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const legacy = doc.data() || {};
    const targetRef = firestore.doc(`${targetRoot}/users/users/${uid}`);

    const targetSnap = await targetRef.get();
    const targetExists = targetSnap.exists;

    if (targetExists) {
      const targetData = targetSnap.data() || {};
      const backfill = {};

      if (!targetData.email && legacy.email) {
        backfill.email = String(legacy.email).trim().toLowerCase();
      }
      if (!targetData.displayName && (legacy.displayName || legacy.name || legacy.username)) {
        backfill.displayName = legacy.displayName || legacy.name || legacy.username;
      }

      if (Object.keys(backfill).length > 0) {
        console.log(`  [UPDATE] Backfilling existing user ${uid}: ${JSON.stringify(backfill)}`);
        if (!dryRun) {
          backfill.updatedAt = FieldValue.serverTimestamp();
          currentBatch.update(targetRef, backfill);
          opCount++;
        }
        migratedCount++;
      } else {
        console.log(`  [SKIP] User ${uid} already fully exists in canonical root.`);
        skippedCount++;
      }
    } else {
      const email = legacy.email ? String(legacy.email).trim().toLowerCase() : '';
      const displayName = legacy.displayName ||
        legacy.name ||
        legacy.username ||
        legacy.userName ||
        (email ? email.split('@')[0] : 'Listener');

      const canonicalData = {
        displayName,
        email,
        username: legacy.username || legacy.userName || '',
        avatarUrl: legacy.avatarUrl || legacy.photoUrl || legacy.photoURL || legacy.image || '',
        isActive: legacy.isActive !== false && legacy.disabled !== true,
        role: legacy.role || 'listener',
        createdAt: legacy.createdAt || legacy.timestamp || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        migratedFrom: sourceRef.path || sourcePath,
        migratedAt: FieldValue.serverTimestamp(),
      };

      console.log(`  [INSERT] Migrating new user ${uid}: "${displayName}" <${email || 'no-email'}> (role: ${canonicalData.role})`);
      if (!dryRun) {
        currentBatch.set(targetRef, canonicalData);
        opCount++;
      }
      migratedCount++;
    }

    if (opCount >= 400 && !dryRun) {
      batches.push(currentBatch.commit());
      currentBatch = firestore.batch();
      opCount = 0;
    }
  }

  if (!dryRun) {
    if (opCount > 0) batches.push(currentBatch.commit());
    await Promise.all(batches);

    // Save one-time execution barrier
    await migrationRef.set({
      completedAt: FieldValue.serverTimestamp(),
      completedBy: 'cli-script',
      sourcePath: sourceRef.path || sourcePath,
      targetRoot,
      totalSource: snapshot.size,
      migratedCount,
      skippedCount,
      status: 'completed',
    });
  }

  console.log('------------------------------------------------------------');
  console.log(`🎉 Migration finished ${dryRun ? '(SIMULATED)' : 'SUCCESSFULLY'}!`);
  console.log(`   - Total Source Records: ${snapshot.size}`);
  console.log(`   - Migrated / Updated:   ${migratedCount}`);
  console.log(`   - Skipped (Unchanged):  ${skippedCount}`);
  console.log('------------------------------------------------------------');
}

run().catch((err) => {
  if (err.message && err.message.includes('Could not load the default credentials')) {
    console.error('\n❌ خطأ مصادقة: لم يتم العثور على بيانات اعتماد Google Cloud / Firebase.');
    console.error('يرجى تشغيل أحد الخيارات التالية للمصادقة:');
    console.error('1) تشغيل أمر تسجيل الدخول:');
    console.error('   gcloud auth application-default login');
    console.error('2) أو تمرير مفتاح Service Account JSON:');
    console.error('   node tool/migrate-legacy-users.mjs --credentials=/path/to/serviceAccountKey.json');
    console.error('3) أو للتشغيل على المحاكي المحلي (Local Emulator):');
    console.error('   FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 node tool/migrate-legacy-users.mjs\n');
  } else {
    console.error('Fatal error during migration:', err);
  }
  process.exit(1);
});
