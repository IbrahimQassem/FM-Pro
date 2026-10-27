import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { createRssDemoFirestore, RssRepairBackupStore, previewRssRepairs, executeRssRepair } from '../../tool/repair_rss_urls.mjs';
import { parseRssFeed, ingestEpisodesFromFeed } from '../../functions/lib/rss-ingestion.js';
import { prepareContentIdentity } from '../../functions/lib/admin-content-relations.js';
import { contentIdentity, contentIdentityScope } from '../../functions/lib/admin-content.js';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
let app, db, repairDb, environment;
before(async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/);
  app = initializeApp({ projectId: 'demo-hudhud-editorial' }, `rss-${randomUUID()}`);
  db = getFirestore(app);
  repairDb = createRssDemoFirestore({ projectId: 'demo-hudhud-editorial', emulatorHost: process.env.FIRESTORE_EMULATOR_HOST });
  environment = await initializeTestEnvironment({ projectId: 'demo-hudhud-editorial',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
after(async () => { await environment?.cleanup(); await repairDb?.terminate(); if (app) await deleteApp(app); });
const lookupFn = async () => [{ address: '93.184.216.34', family: 4 }];
const rss = (url, guid = '') => `<rss><item><title>RSS &amp; synthetic</title>${guid ? `<guid>${guid}</guid>` : ''}<enclosure url="${url}"/></item></rss>`;
async function fixture(root, count) {
  const id = `rss-${randomUUID()}`, stationId = `${id}-station`, programId = `${id}-program`;
  await db.doc(`${root}/stations/stations/${stationId}`).set({ isActive: true });
  const program = db.doc(`${root}/programs/programs/${programId}`);
  await program.set({ stationId, isActive: true, stats: { episodesCount: count } });
  return { program, programId, stationId, ingest: xml => ingestEpisodesFromFeed({ firestore: db, root, programId, stationId,
    feedUrl: 'https://example.com/synthetic-feed', lookupFn, fetchFn: async () => new Response(xml) }) };
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: existing reservation reads are preserved while all clients are denied repair jobs, receipts and reservation writes`, async () => {
    const hash = createHash('sha256').update(randomUUID()).digest('hex');
    const paths = [`${root}/importKeys/importKeys/${hash}`, `${root}/rssUrlRepairs/runs/${hash}`,
      `${root}/rssUrlRepairs/runs/${hash}/items/000`, `${root}/rssUrlRepairs/runs/${hash}/restores/000`];
    for (const path of paths) await db.doc(path).set({ version: 2, synthetic: true });
    const clients = [{ client: environment.unauthenticatedContext().firestore(), reservationRead: false },
      ...[{}, { role: 'listener' }, { role: 'moderator' }, { role: 'station_admin' },
        { admin: true, role: 'station_admin', allStations: true }, { admin: true, role: 'moderator' },
        { admin: true }, { role: 'super_admin' }, { admin: true, role: 'super_admin' }]
        .map((claims, index) => ({ client: environment.authenticatedContext(`rss-private-${index}`, claims).firestore(),
          reservationRead: claims.admin === true || ['station_admin', 'super_admin'].includes(claims.role) }))];
    for (const { client, reservationRead } of clients) for (const path of paths) {
      const read = path.includes('/importKeys/') && reservationRead ? assertSucceeds : assertFails;
      await read(getDoc(doc(client, path)));
      await read(getDocs(collection(client, path.split('/').slice(0, -1).join('/'))));
      await assertFails(setDoc(doc(client, `${path}-new`), { version: 2 }));
      await assertFails(updateDoc(doc(client, path), { version: 99 }));
      await assertFails(deleteDoc(doc(client, path)));
    }
  });

  for (const behavior of ['recover', 'aba', 'recreate', 'missing-backup', 'expired-backup']) {
    test(`${root}: owned real SDK repair ${behavior} preserves receipt/version recovery safeguards`, async () => {
      const { programId, stationId, program } = await fixture(root, 1), episode = db.doc(`${root}/episodes/episodes/${programId}-repair`);
      const raw = `https://cdn.example.com/${programId}.mp3?a=1&amp;b=2`, xml = rss(raw, 'repair-guid');
      await episode.set({ programId, stationId, externalId: 'repair-guid', audioUrl: raw, isPublished: false, stats: { commentsCount: 9 } });
      const original = await episode.get(), directory = await mkdtemp(join(tmpdir(), 'rss-repair-sdk-')); let clock = Date.now();
      const store = await RssRepairBackupStore.open({ directory, key: randomBytes(32), expiresAt: clock + 86400000, now: () => clock });
      const options = { projectId: 'demo-hudhud-editorial', root, programId };
      try {
        const manifest = await previewRssRepairs(options, repairDb, parseRssFeed(xml)); await store.put(manifest);
        const context = { manifest, reviewedHash: manifest.runId, store, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST, owner: 'sdk-repair' };
        if (behavior === 'missing-backup') {
          await rm(join(directory, `${manifest.runId}.rss-backup`));
          await assert.rejects(executeRssRepair(options, repairDb, context));
          assert.equal((await episode.get()).updateTime.isEqual(original.updateTime), true);
          assert.equal((await db.doc(`${root}/rssUrlRepairs/runs/${manifest.runId}`).get()).exists, false);
          return;
        }
        await assert.rejects(executeRssRepair(options, repairDb, { ...context, afterCommit: async () => { throw new Error('Synthetic lost ACK'); } }));
        const applied = await episode.get(), receipt = await db.doc(`${root}/rssUrlRepairs/runs/${manifest.runId}/items/000`).get();
        assert.equal(applied.updateTime.isEqual(receipt.updateTime), true);
        assert.equal(applied.createTime.isEqual(original.createTime), true);
        assert.equal(applied.get('audioUrl'), raw.replace('&amp;', '&'));
        if (behavior === 'aba' || behavior === 'recreate') {
          if (behavior === 'recreate') await episode.delete();
          else await episode.update({ syntheticAbaTransition: true });
          await episode.set(applied.data()); const drifted = await episode.get();
          assert.deepEqual(drifted.data(), applied.data());
          assert.equal(drifted.updateTime.isEqual(applied.updateTime), false);
          await assert.rejects(executeRssRepair(options, repairDb, context));
          await assert.rejects(executeRssRepair({ ...options, mode: 'restore' }, repairDb, context));
          assert.equal((await episode.get()).updateTime.isEqual(drifted.updateTime), true);
        } else if (behavior === 'expired-backup') {
          clock += 86400001;
          await assert.rejects(executeRssRepair(options, repairDb, context));
          await assert.rejects(executeRssRepair({ ...options, mode: 'restore' }, repairDb, context));
          assert.equal((await episode.get()).updateTime.isEqual(applied.updateTime), true);
        } else {
          assert.equal((await executeRssRepair(options, repairDb, context)).changed, 0);
          assert.equal((await executeRssRepair({ ...options, mode: 'restore' }, repairDb, context)).changed, 1);
          const restored = await episode.get(), restoration = await db.doc(`${root}/rssUrlRepairs/runs/${manifest.runId}/restores/000`).get();
          assert.deepEqual(restored.data(), original.data());
          assert.equal(restored.updateTime.isEqual(restoration.updateTime), true);
          assert.equal((await executeRssRepair({ ...options, mode: 'restore' }, repairDb, context)).changed, 0);
        }
        assert.equal((await program.get()).get('stats.episodesCount'), 1);
      } finally { await rm(directory, { recursive: true, force: true }); }
    });
  }

  test(`${root}: real RSS transaction preserves the legacy ID and binds both aliases without republishing or recounting`, async () => {
    const { program, programId, stationId, ingest } = await fixture(root, 1);
    const raw = `https://cdn.example.com/${programId}.mp3?one=1&amp;two=2`, decoded = raw.replace('&amp;', '&');
    const episode = db.doc(`${root}/episodes/episodes/${programId}-legacy`);
    const original = { programId, stationId, audioUrl: raw,
      externalId: createHash('sha256').update(raw).digest('hex').slice(0, 32),
      title: 'Original legacy title', isPublished: false, stats: { commentsCount: 7, playsCount: 9 } };
    await episode.set(original); const before = await episode.get();
    const auditQuery = db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', episode.id);
    const auditCount = (await auditQuery.get()).size;
    for (let retry = 0; retry < 2; retry++) {
      const result = await ingest(rss(raw));
      assert.equal(result.ingested, 0); assert.equal(result.skipped, 1);
    }
    const after = await episode.get();
    assert.deepEqual(after.data(), original);
    assert.equal(after.updateTime.isEqual(before.updateTime), true, 'No legacy episode write can retrigger publication.');
    assert.equal((await program.get()).get('stats.episodesCount'), 1);
    assert.equal((await auditQuery.get()).size, auditCount);
    for (const audioUrl of [raw, decoded]) {
      const key = contentIdentity('episodes', { programId, audioUrl });
      const alias = await db.doc(`${root}/importKeys/importKeys/${key}`).get();
      assert.equal(alias.get('targetId'), episode.id); assert.equal(alias.get('keyHash'), key);
    }
  });

  test(`${root}: real RSS transaction refuses conflicting raw and decoded owners atomically`, async () => {
    const { program, programId, stationId, ingest } = await fixture(root, 2);
    const raw = `https://cdn.example.com/${programId}.mp3?a=1&amp;b=2`, decoded = raw.replace('&amp;', '&');
    const episodes = [db.doc(`${root}/episodes/episodes/${programId}-raw`), db.doc(`${root}/episodes/episodes/${programId}-decoded`)];
    const values = [raw, decoded].map(audioUrl => ({ programId, stationId, audioUrl, isPublished: false, stats: { commentsCount: 3 } }));
    await Promise.all(episodes.map((ref, index) => ref.set(values[index])));
    await assert.rejects(ingest(rss(raw)), error => error.code === 'failed-precondition' && error.details?.reason === 'rss-identity-conflict');
    assert.equal((await program.get()).get('stats.episodesCount'), 2);
    for (let index = 0; index < episodes.length; index++) assert.deepEqual((await episodes[index].get()).data(), values[index]);
    for (const audioUrl of [raw, decoded]) {
      const key = contentIdentity('episodes', { programId, audioUrl });
      assert.equal((await db.doc(`${root}/importKeys/importKeys/${key}`).get()).exists, false);
    }
  });

  test(`${root}: historical aliases survive five feed rotations and a real admin identity edit`, async () => {
    const { program, programId, stationId, ingest } = await fixture(root, 1);
    const episode = db.doc(`${root}/episodes/episodes/${programId}-stable`);
    await episode.set({ programId, stationId, externalId: 'stable-guid', audioUrl: 'https://cdn.example.com/original.mp3', isPublished: false });
    await db.doc(`${root}/identityScopes/scopes/${contentIdentityScope('episodes', programId)}`).set({
      version: 1, state: 'complete', targetKind: 'episodes', parentId: programId, runId: 'a'.repeat(64) });
    const urls = Array.from({ length: 5 }, (_, index) => `https://cdn.example.com/${programId}-${index}.mp3?a=1&amp;b=2`);
    for (const url of urls) assert.equal((await ingest(rss(url, 'stable-guid'))).skipped, 1);
    await db.runTransaction(async tx => {
      const before = await tx.get(episode), content = { ...before.data(), audioUrl: `https://cdn.example.com/${programId}-admin.mp3` };
      const writes = await prepareContentIdentity(tx, db, { root, kind: 'episodes', id: episode.id, existing: before.data(), content });
      for (const write of writes) write();
      tx.update(episode, { audioUrl: content.audioUrl });
    });
    const afterEdit = await episode.get();
    assert.equal((await ingest(rss(urls[0], 'stable-guid'))).skipped, 1);
    assert.equal((await episode.get()).updateTime.isEqual(afterEdit.updateTime), true);
    await assert.rejects(db.runTransaction(async tx => {
      await prepareContentIdentity(tx, db, { root, kind: 'episodes', id: `${programId}-intruder`, existing: null,
        content: { programId, stationId, audioUrl: urls[0] } });
    }), error => error.code === 'already-exists');
    for (const url of urls) for (const audioUrl of [url, url.replace('&amp;', '&')]) {
      const key = contentIdentity('episodes', { programId, audioUrl });
      const alias = await db.doc(`${root}/importKeys/importKeys/${key}`).get();
      assert.equal(alias.get('targetId'), episode.id); assert.equal(alias.get('rssOwnerRoot'), root);
      assert.equal(alias.get('rssOwnerStationId'), stationId);
      assert.equal(alias.get('rssOwnerExternalIdHash'), createHash('sha256').update('stable-guid').digest('hex'));
    }
    assert.equal((await program.get()).get('stats.episodesCount'), 1);
  });

  test(`${root}: a conflicting reservation fails closed before RSS changes aliases, episodes or counters`, async () => {
    const { program, programId, stationId, ingest } = await fixture(root, 1);
    const raw = `https://cdn.example.com/${programId}.mp3?a=1&amp;b=2`;
    const episode = db.doc(`${root}/episodes/episodes/${programId}-owner`);
    await episode.set({ programId, stationId, externalId: 'stable-guid', audioUrl: raw, isPublished: false });
    const key = contentIdentity('episodes', { programId, audioUrl: raw.replace('&amp;', '&') });
    const aliasRef = db.doc(`${root}/importKeys/importKeys/${key}`);
    await aliasRef.set({ targetKind: 'episodes', targetId: 'missing-owner', keyHash: key });
    const before = await episode.get(), aliasBefore = await aliasRef.get();
    await assert.rejects(ingest(rss(raw, 'stable-guid')), error => error.code === 'failed-precondition');
    assert.equal((await episode.get()).updateTime.isEqual(before.updateTime), true);
    assert.equal((await aliasRef.get()).updateTime.isEqual(aliasBefore.updateTime), true);
    assert.equal((await program.get()).get('stats.episodesCount'), 1);
  });

  test(`${root}: concurrent first imports and retries create one decoded episode, audit and counter adjustment`, async () => {
    const { program, programId, ingest } = await fixture(root, 0);
    const raw = `https://cdn.example.com/${programId}.mp3?one=1&amp;two=&#50;`;
    const xml = rss(raw, `guid&amp;${programId}`);
    const results = await Promise.all([ingest(xml), ingest(xml)]);
    assert.equal(results.reduce((sum, value) => sum + value.ingested, 0), 1);
    assert.equal((await ingest(xml)).ingested, 0);
    const episodes = await db.collection(`${root}/episodes/episodes`).where('programId', '==', programId).get();
    assert.equal(episodes.size, 1);
    const episode = episodes.docs[0];
    assert.equal(episode.get('audioUrl'), `https://cdn.example.com/${programId}.mp3?one=1&two=2`);
    assert.equal(episode.get('externalId'), `guid&${programId}`);
    assert.equal(episode.get('title'), 'RSS & synthetic');
    assert.equal((await program.get()).get('stats.episodesCount'), 1);
    assert.equal((await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', episode.id).get()).size, 1);
    assert.deepEqual(episode.get('stats'), { playsCount: 0, likesCount: 0, commentsCount: 0 });
  });
}
