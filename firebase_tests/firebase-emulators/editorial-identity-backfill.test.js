import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runIdentityBackfill, identityScopeKey } from '../../tool/backfill_content_identities.mjs';
import { contentIdentity } from '../../functions/lib/admin-content.js';
import { ingestEpisodesFromFeed } from '../../functions/lib/rss-ingestion.js';
import { saveAdminContent } from '../../functions/lib/editorial-audit.js';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const projectId = 'demo-hudhud-editorial'; let app, db, directory;
const fixture = JSON.parse(await readFile(new URL('../../test/fixtures/admin-content-contract.json', import.meta.url), 'utf8'));
before(async () => { assert.ok(process.env.FIRESTORE_EMULATOR_HOST); app = initializeApp({ projectId }); db = getFirestore(app); directory = await mkdtemp(join(tmpdir(), 'hudhud-identity-tests-')); });
after(async () => { await deleteApp(app); await rm(directory, { recursive: true, force: true }); });
async function setup(root, suffix, count = 3) {
  const parentId = `identity-${suffix}`;
  await db.doc(`${root}/stations/stations/identity-station`).set({ isActive: true, stats: { programsCount: 0 } });
  const parent = db.doc(`${root}/programs/programs/${parentId}`);
  await parent.set({ stationId: 'identity-station', stats: { episodesCount: count } });
  const batch = db.batch();
  for (let index = 0; index < count; index++) batch.create(db.doc(`${root}/episodes/episodes/${parentId}-${index}`), { programId: parentId, stationId: 'identity-station', audioUrl: `https://radio.example/${parentId}/${index}.mp3` });
  await batch.commit();
  const options = { projectId, root, kind: 'episodes', parentId, mode: 'dry-run', reportPath: join(directory, `${root}-${suffix}.json`), backupPath: join(directory, `${root}-${suffix}.backup.json`), maxItems: 2, maxRecords: 1000 };
  return { options, parent, marker: db.doc(`${root}/identityScopes/scopes/${identityScopeKey('episodes', parentId)}`) };
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: backfill is preview-only, backup-first, resumable and rollback removes only run-owned keys`, async () => {
    const { options, marker } = await setup(root, 'resume');
    const preview = await runIdentityBackfill(options, db);
    assert.equal(preview.changed, 0); assert.equal(preview.report.items.length, 3); assert.equal((await marker.get()).exists, false);
    const impossible = join(directory, 'non-directory'); await writeFile(impossible, 'synthetic');
    await assert.rejects(runIdentityBackfill({ ...options, mode: 'apply', backupPath: join(impossible, 'backup.json') }, db));
    const firstKey = db.doc(`${root}/importKeys/importKeys/${preview.report.items[0].key}`);
    assert.equal((await firstKey.get()).exists, false);
    const first = await runIdentityBackfill({ ...options, mode: 'apply' }, db);
    assert.equal(first.changed, 2); assert.equal(first.complete, false); assert.equal((await marker.get()).exists, false);
    let resumedTransactions = 0;
    const bounded = { projectId, doc: db.doc.bind(db), collection: db.collection.bind(db), runTransaction: (...args) => { resumedTransactions++; return db.runTransaction(...args); } };
    const second = await runIdentityBackfill({ ...options, mode: 'apply' }, bounded);
    assert.ok(resumedTransactions <= 3, `Resume re-read completed work in ${resumedTransactions} transactions`);
    assert.equal(second.changed, 1); assert.equal(second.complete, true); assert.equal((await marker.get()).get('state'), 'complete');
    assert.equal((await runIdentityBackfill({ ...options, mode: 'apply' }, db)).changed, 0);
    // A normal server writer replaces its reservation, so rollback must retain it.
    const protectedKey = db.doc(`${root}/importKeys/importKeys/${preview.report.items[0].key}`);
    const protectedValue = (await protectedKey.get()).data(); delete protectedValue.backfillRunId; await protectedKey.set(protectedValue);
    assert.equal((await runIdentityBackfill({ ...options, mode: 'restore' }, db)).complete, false);
    assert.equal((await marker.get()).exists, false);
    const restored = await runIdentityBackfill({ ...options, mode: 'restore' }, db);
    assert.equal(restored.complete, true); assert.equal((await protectedKey.get()).exists, true);
    assert.equal((await db.doc(`${root}/episodes/episodes/${options.parentId}-0`).get()).exists, true);
  });
  test(`${root}: stale scope, malformed content, duplicates and wrong clients never create a completion marker`, async () => {
    const { options, parent, marker } = await setup(root, 'stale');
    await assert.rejects(runIdentityBackfill(options, { projectId: 'demo-wrong' }));
    await runIdentityBackfill(options, db); await parent.update({ changed: true });
    await assert.rejects(runIdentityBackfill({ ...options, mode: 'apply' }, db), /Parent changed/);
    assert.equal((await marker.get()).exists, false);
    const duplicate = await setup(root, 'duplicate');
    await db.doc(`${root}/episodes/episodes/${duplicate.options.parentId}-1`).update({ audioUrl: `https://radio.example/${duplicate.options.parentId}/0.mp3` });
    assert.ok((await runIdentityBackfill(duplicate.options, db)).report.blockers.length);
    await assert.rejects(runIdentityBackfill({ ...duplicate.options, mode: 'apply' }, db));
    assert.equal((await duplicate.marker.get()).exists, false);
  });
}
test('a fully backfilled scope above450 accepts a new natural identity and rejects a duplicate', async () => {
  const root = 'HudHudDev';
  const { options, marker } = await setup(root, 'large', 451);
  await runIdentityBackfill(options, db);
  for (let step = 0; step < 5; step++) await runIdentityBackfill({ ...options, mode: 'apply', maxItems: 100 }, db);
  assert.equal((await marker.get()).get('state'), 'complete');
  const { stats, ...fields } = fixture.episodes;
  const content = { ...fields, programId: options.parentId, stationId: 'identity-station', audioUrl: 'https://radio.example/large-new.mp3' };
  const args = { firestore: db, callerUid: 'synthetic-super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' }, data: { root, kind: 'episodes', id: 'large-new', content, expected: null } };
  assert.equal((await saveAdminContent(args)).action, 'create');
  await assert.rejects(saveAdminContent({ ...args, data: { ...args.data, id: 'large-duplicate' } }), { code: 'already-exists' });
  const key = db.doc(`${root}/importKeys/importKeys/${contentIdentity('episodes', content)}`);
  assert.equal((await key.get()).get('targetId'), 'large-new');
});

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: RSS shares editor/import canonical audio identity and does not increment a duplicate`, async () => {
    const { options } = await setup(root, 'rss-identity', 0);
    const { stats, ...fields } = fixture.episodes;
    const content = { ...fields, programId: options.parentId, stationId: 'identity-station', audioUrl: 'https://radio.example/shared-rss.mp3#editor-fragment' };
    await saveAdminContent({ firestore: db, callerUid: 'synthetic-super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' }, data: { root, kind: 'episodes', id: 'rss-editor-existing', content, expected: null } });
    const xml = '<rss><channel><item><title>Synthetic RSS</title><enclosure url="https://radio.example/shared-rss.mp3" type="audio/mpeg"/><guid>different-producer-guid</guid></item></channel></rss>';
    const result = await ingestEpisodesFromFeed({ firestore: db, root, programId: options.parentId, stationId: 'identity-station', feedUrl: 'https://radio.example/rss',
      lookupFn: async () => [{ address: '93.184.216.34', family: 4 }], fetchFn: async () => ({ ok: true, headers: new Headers(), body: new Response(xml).body }) });
    assert.equal(result.ingested, 0); assert.equal(result.skipped, 1);
    assert.equal((await db.doc(`${root}/programs/programs/${options.parentId}`).get()).get('stats.episodesCount'), 1);
    assert.equal((await db.collection(`${root}/episodes/episodes`).where('programId', '==', options.parentId).get()).size, 1);
  });
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  function feedArgs(options, xml, firestore = db) {
    return { firestore, root, programId: options.parentId, stationId: 'identity-station', feedUrl: 'https://radio.example/rss', lookupFn: async () => [{ address: '93.184.216.34', family: 4 }], fetchFn: async () => ({ ok: true, headers: new Headers(), body: new Response(xml).body }) };
  }
  const feed = guid => `<rss><channel><item><title>Synthetic concurrent RSS</title><enclosure url="https://radio.example/concurrent-rss.mp3" type="audio/mpeg"/><guid>${guid}</guid></item></channel></rss>`;
  test(`${root}: concurrent RSS GUIDs sharing audio commit one counter, key and audit`, async () => {
    const { options, parent } = await setup(root, 'rss-race', 0);
    const results = await Promise.all([ingestEpisodesFromFeed(feedArgs(options, feed('rss-guid-one'))), ingestEpisodesFromFeed(feedArgs(options, feed('rss-guid-two')))]);
    assert.equal(results.reduce((sum, result) => sum + result.ingested, 0), 1);
    assert.equal((await parent.get()).get('stats.episodesCount'), 1);
    const records = await db.collection(`${root}/episodes/episodes`).where('programId', '==', options.parentId).get();
    assert.equal(records.size, 1);
    const key = db.doc(`${root}/importKeys/importKeys/${contentIdentity('episodes', records.docs[0].data())}`);
    assert.equal((await key.get()).get('targetId'), records.docs[0].id);
    assert.equal((await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', records.docs[0].id).get()).size, 1);
  });
  test(`${root}: a changed RSS parent aborts without a child, reservation or count change`, async () => {
    const { options, parent } = await setup(root, 'rss-parent', 0);
    const args = feedArgs(options, feed('rss-parent-change'));
    const fetch = args.fetchFn;
    args.fetchFn = async () => { await parent.update({ stationId: 'another-station' }); return fetch(); };
    await assert.rejects(ingestEpisodesFromFeed(args), /parent is unavailable or changed/);
    assert.equal((await parent.get()).get('stats.episodesCount'), 0);
    assert.equal((await db.collection(`${root}/episodes/episodes`).where('programId', '==', options.parentId).get()).empty, true);
  });
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: competing backfill runs cannot overlap one scope or race restoration`, async () => {
    const { options } = await setup(root, 'scope-lock');
    const other = { ...options, reportPath: `${options.reportPath}.other`, backupPath: `${options.backupPath}.other` };
    await runIdentityBackfill(options, db); await runIdentityBackfill(other, db);
    const candidates = [options, other];
    const results = await Promise.allSettled(candidates.map(value => runIdentityBackfill({ ...value, mode: 'apply', maxItems: 1 }, db)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const winner = candidates[results.findIndex(result => result.status === 'fulfilled')];
    const loser = candidates[results.findIndex(result => result.status === 'rejected')];
    assert.equal((await runIdentityBackfill({ ...winner, mode: 'restore' }, db)).complete, true);
    assert.equal((await runIdentityBackfill({ ...loser, mode: 'apply' }, db)).processed, 2);
  });
}
