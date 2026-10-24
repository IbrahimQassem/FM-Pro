import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { saveAdminContent } from '../../functions/lib/editorial-audit.js';
import { editableContent } from '../../functions/lib/admin-content.js';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
let app, db;
const fixtures = JSON.parse(await readFile(new URL('../../test/fixtures/admin-content-contract.json', import.meta.url), 'utf8'));
const content = (kind, changes = {}) => {
  const { stats, ...value } = fixtures[kind];
  return { ...value, ...changes };
};
const save = (root, kind, id, value, expected = null, extra = {}) => saveAdminContent({
  firestore: db, callerUid: 'synthetic-super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' },
  data: { root, kind, id, content: value, expected: expected ? editableContent(kind, expected) : null, ...extra },
});
before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator required');
  app = initializeApp({ projectId: 'demo-hudhud-editorial' });
  db = getFirestore(app);
});
after(async () => { if (app) await deleteApp(app); });

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: audit failure rolls back content, counter and identity reservation`, async () => {
    const station = db.doc(`${root}/stations/stations/rollback-station`);
    await station.set({ stats: { programsCount: 0 } });
    const value = content('programs', { stationId: station.id, title: 'Rollback fixture' });
    const failingDb = {
      doc: db.doc.bind(db), collection: db.collection.bind(db),
      runTransaction: operation => db.runTransaction(tx => operation(new Proxy(tx, {
        get(target, key) {
          if (key === 'set') return (ref, ...args) => {
            if (ref.path.includes('/auditLogs/')) throw new Error('Synthetic audit failure');
            return target.set(ref, ...args);
          };
          return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
        },
      }))),
    };
    await assert.rejects(saveAdminContent({ firestore: failingDb, callerUid: 'synthetic-super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' },
      data: { root, kind: 'programs', id: 'rollback-program', content: value, expected: null } }), /Synthetic audit failure/);
    assert.equal((await station.get()).get('stats.programsCount'), 0);
    assert.equal((await db.doc(`${root}/programs/programs/rollback-program`).get()).exists, false);
    await save(root, 'programs', 'rollback-program', value);
    assert.equal((await station.get()).get('stats.programsCount'), 1);
  });
  test(`${root}: creates and retries audited content with server-owned counters; stale saves fail atomically`, async () => {
    const station = db.doc(`${root}/stations/stations/counter-station`);
    await station.set({ stats: { programsCount: 0 } });
    const value = content('programs', { stationId: station.id, title: 'Counter fixture' });
    const ref = db.doc(`${root}/programs/programs/counter-program`);
    const initialAudits = (await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', ref.id).get()).size;
    await save(root, 'programs', ref.id, value);
    assert.equal((await station.get()).get('stats.programsCount'), 1);
    assert.equal((await ref.get()).get('stats.episodesCount'), 0);
    await save(root, 'programs', ref.id, value);
    assert.equal((await station.get()).get('stats.programsCount'), 1);
    assert.equal((await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', ref.id).get()).size, initialAudits + 1);
    const original = (await ref.get()).data();
    await ref.update({ title: 'Concurrent edit', serverOnly: 'retained' });
    await assert.rejects(save(root, 'programs', ref.id, { ...value, title: 'Stale edit' }, original), { code: 'failed-precondition' });
    assert.equal((await ref.get()).get('title'), 'Concurrent edit');
  });
  test(`${root}: program transfers preserve child ownership, counters and creation metadata`, async () => {
    const oldStation = db.doc(`${root}/stations/stations/transfer-old`);
    const nextStation = db.doc(`${root}/stations/stations/transfer-next`);
    await oldStation.set({ stats: { programsCount: 0 } }); await nextStation.set({ stats: { programsCount: 0 } });
    const program = db.doc(`${root}/programs/programs/transfer-program`);
    await save(root, 'programs', program.id, content('programs', { title: 'Transfer fixture', stationId: oldStation.id }));
    const episode = db.doc(`${root}/episodes/episodes/transfer-child`);
    await save(root, 'episodes', episode.id, content('episodes', { programId: program.id, stationId: oldStation.id }));
    const previous = (await program.get()).data();
    await save(root, 'programs', program.id, { ...editableContent('programs', previous), stationId: nextStation.id }, previous);
    assert.equal((await oldStation.get()).get('stats.programsCount'), 0);
    assert.equal((await nextStation.get()).get('stats.programsCount'), 1);
    assert.equal((await episode.get()).get('stationId'), nextStation.id);
    assert.equal((await program.get()).get('createdBy'), previous.createdBy);
    assert.equal((await program.get()).get('stats.episodesCount'), 1);
  });
  test(`${root}: two importers cannot create different IDs for the same natural key`, async () => {
    const station = db.doc(`${root}/stations/stations/import-station`);
    await station.set({ stats: { programsCount: 0 } });
    const value = content('programs', { stationId: station.id, title: '  برنامج FM  ' });
    const results = await Promise.allSettled(['import-a', 'import-b'].map(id => save(root, 'programs', id, value, null, { source: 'import' })));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await station.get()).get('stats.programsCount'), 1);
    const docs = await db.collection(`${root}/programs/programs`).where('stationId', '==', station.id).get();
    assert.equal(docs.size, 1);
    const audits = await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', docs.docs[0].id).get();
    assert.equal(audits.size, 1); assert.equal(audits.docs[0].get('action'), 'import');
  });
  test(`${root}: transfer includes off-page children and cannot orphan a concurrent episode`, async () => {
    const old = db.doc(`${root}/stations/stations/bulk-old`), next = db.doc(`${root}/stations/stations/bulk-next`);
    await old.set({ stats: { programsCount: 0 } }); await next.set({ stats: { programsCount: 0 } });
    const program = db.doc(`${root}/programs/programs/bulk-program`);
    await save(root, 'programs', program.id, content('programs', { stationId: old.id, title: 'Bulk transfer fixture' }));
    const seed = db.batch();
    for (let index = 0; index < 55; index++) seed.set(db.doc(`${root}/episodes/episodes/bulk-${index}`),
      content('episodes', { programId: program.id, stationId: old.id, audioUrl: `https://radio.example/${index}.mp3` }));
    seed.update(program, { 'stats.episodesCount': 55 }); await seed.commit();
    const before = (await program.get()).data();
    const results = await Promise.allSettled([
      save(root, 'programs', program.id, { ...editableContent('programs', before), stationId: next.id }, before),
      save(root, 'episodes', 'bulk-concurrent', content('episodes', { programId: program.id, stationId: old.id, audioUrl: 'https://radio.example/concurrent.mp3' })),
    ]);
    assert.equal(results[0].status, 'fulfilled');
    const episodes = await db.collection(`${root}/episodes/episodes`).where('programId', '==', program.id).get();
    assert.equal(episodes.docs.every(entry => entry.get('stationId') === next.id), true);
    assert.equal((await program.get()).get('stats.episodesCount'), episodes.size);
    assert.equal(episodes.size, results[1].status === 'fulfilled' ? 56 : 55);
    assert.equal((await old.get()).get('stats.programsCount'), 0);
    assert.equal((await next.get()).get('stats.programsCount'), 1);
  });
  test(`${root}: locations remain unique and identity edits update station projections atomically`, async () => {
    const loc = content('locations', { cityCode: 'fixture-city', locationType: 'governorate' });
    await save(root, 'locations', 'fixture-city', loc);
    await assert.rejects(save(root, 'locations', 'duplicate-city', loc), { code: 'already-exists' });
    const station = content('stations', { cityCode: loc.cityCode, cityNameAr: loc.cityNameAr, locationType: loc.locationType });
    await save(root, 'stations', 'located-station', station, null, { locationId: 'fixture-city' });
    const ref = db.doc(`${root}/locations/locations/fixture-city`);
    await save(root, 'locations', ref.id, { ...loc, cityNameAr: 'Updated city' }, (await ref.get()).data());
    assert.equal((await db.doc(`${root}/stations/stations/located-station`).get()).get('cityNameAr'), 'Updated city');
    assert.equal((await ref.get()).get('adminRelationRevision'), 1);
  });
  test(`${root}: rejects takeover atomically and allows an audited own-station edit`, async () => {
    const stationPath = `${root}/stations/stations`;
    await db.doc(`${stationPath}/station-a`).set({ name: 'Synthetic A' });
    await db.doc(`${stationPath}/station-b`).set({ name: 'Synthetic B' });
    const program = db.doc(`${root}/programs/programs/target`);
    await program.set(content('programs', { title: 'Original', stationId: 'station-b' }));
    const initialAudits = (await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', 'target').get()).size;
    const args = {
      firestore: db, callerUid: 'synthetic-admin-a', callerRole: 'station_admin',
      callerClaims: { role: 'station_admin', assignedStations: ['station-a'] },
      data: { root, kind: 'programs', id: 'target', content: content('programs', { stationId: 'station-a', title: 'Edited' }), expected: content('programs', { stationId: 'station-b', title: 'Original' }) },
    };
    await assert.rejects(saveAdminContent(args), { code: 'permission-denied' });
    assert.equal((await program.get()).get('title'), 'Original');
    assert.equal((await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', 'target').get()).size, initialAudits);

    await program.set(content('programs', { title: 'Own program', stationId: 'station-a' }));
    args.data.expected = editableContent('programs', (await program.get()).data());
    await saveAdminContent(args);
    assert.equal((await program.get()).get('title'), 'Edited');
    const audit = await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', 'target').get();
    assert.equal(audit.size, 1);
    assert.equal(audit.docs[0].get('actorUid'), 'synthetic-admin-a');
    assert.equal(audit.docs[0].get('action'), 'update');
  });
  test(`${root}: invalid episode parent causes no content or audit writes`, async () => {
    const before = (await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', 'bad-parent').get()).size;
    await assert.rejects(saveAdminContent({
      firestore: db, callerUid: 'synthetic-super', callerRole: 'super_admin',
      callerClaims: { role: 'super_admin' },
      data: { root, kind: 'episodes', id: 'bad-parent',
        expected: null, content: content('episodes', { title: 'Synthetic episode', stationId: 'station-a', programId: 'absent' }) },
    }), { code: 'failed-precondition' });
    assert.equal((await db.doc(`${root}/episodes/episodes/bad-parent`).get()).exists, false);
    assert.equal((await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', 'bad-parent').get()).size, before);
  });
}
