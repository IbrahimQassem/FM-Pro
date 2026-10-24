import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { saveAdminContent } from '../../functions/lib/editorial-audit.js';
import { deleteAdminContent } from '../../functions/lib/admin-content-delete.js';
import { contentIdentity } from '../../functions/lib/admin-content.js';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fixtures = JSON.parse(await readFile(new URL('../../test/fixtures/admin-content-contract.json', import.meta.url), 'utf8'));
let app, db;
before(() => { assert.ok(process.env.FIRESTORE_EMULATOR_HOST); app = initializeApp({ projectId: 'demo-hudhud-editorial' }); db = getFirestore(app); });
after(async () => { if (app) await deleteApp(app); });
const actor = { callerUid: 'delete-super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' } };
const fields = (kind, changes) => { const { stats, ...value } = fixtures[kind]; return { ...value, ...changes }; };
const save = (root, kind, id, content) => saveAdminContent({ firestore: db, ...actor, data: { root, kind, id, content, expected: null } });
const remove = (root, kind, id, expected, firestore = db) => deleteAdminContent({ firestore, ...actor, data: { root, kind, id, expected } });

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: audited deletion releases identity once and rejects a stale request after ID reuse`, async () => {
    const station = db.doc(`${root}/stations/stations/deletion-station`);
    await station.set({ name: 'Synthetic deletion station', stats: { programsCount: 0 } });
    await save(root, 'programs', 'deletion-program', fields('programs', { stationId: station.id, title: 'Deletion program' }));
    const program = db.doc(`${root}/programs/programs/deletion-program`);
    const value = fields('episodes', { programId: program.id, stationId: station.id, audioUrl: 'https://radio.example/deletion.mp3' });
    const episode = db.doc(`${root}/episodes/episodes/deletion-episode`);
    await save(root, 'episodes', episode.id, value);
    const expected = (await episode.get()).data();
    const key = db.doc(`${root}/importKeys/importKeys/${contentIdentity('episodes', value)}`);
    const failing = { doc: db.doc.bind(db), runTransaction: operation => db.runTransaction(tx => operation(new Proxy(tx, {
      get(target, name) {
        if (name === 'set') return (ref, ...args) => {
          if (ref.path.includes('/auditLogs/')) throw new Error('Synthetic delete audit failure');
          return target.set(ref, ...args);
        };
        return typeof target[name] === 'function' ? target[name].bind(target) : target[name];
      },
    }))) };
    await assert.rejects(remove(root, 'episodes', episode.id, expected, failing), /Synthetic delete audit failure/);
    assert.equal((await episode.get()).exists, true);
    assert.equal((await episode.get()).get('adminDeletionToken'), undefined);
    assert.equal((await key.get()).exists, true);
    assert.equal((await program.get()).get('stats.episodesCount'), 1);
    await remove(root, 'episodes', episode.id, expected);
    assert.equal((await remove(root, 'episodes', episode.id, expected)).action, 'unchanged');
    assert.equal((await program.get()).get('stats.episodesCount'), 0);
    assert.equal((await key.get()).exists, false);
    const audits = await db.collection(`${root}/auditLogs/auditLogs`).where('targetId', '==', episode.id).where('action', '==', 'delete').get();
    assert.equal(audits.size, 1);
    await save(root, 'episodes', episode.id, value);
    await assert.rejects(remove(root, 'episodes', episode.id, expected), { code: 'failed-precondition' });
    assert.equal((await episode.get()).exists, true);
    assert.equal((await program.get()).get('stats.episodesCount'), 1);
    await assert.rejects(remove(root, 'programs', program.id, (await program.get()).data()), { code: 'failed-precondition' });
    await assert.rejects(remove(root, 'stations', station.id, (await station.get()).data()), { code: 'failed-precondition' });
  });
  test(`${root}: child queries block deletion despite a corrupt zero counter`, async () => {
    const station = db.doc(`${root}/stations/stations/corrupt-delete-station`);
    const program = db.doc(`${root}/programs/programs/corrupt-delete-program`);
    await station.set({ stats: { programsCount: 0 } });
    await program.set({ stationId: station.id, stats: { episodesCount: 0 } });
    await db.doc(`${root}/episodes/episodes/corrupt-delete-child`).set({ programId: program.id, stationId: station.id });
    await assert.rejects(remove(root, 'programs', program.id, (await program.get()).data()), { code: 'failed-precondition' });
    await assert.rejects(remove(root, 'stations', station.id, (await station.get()).data()), { code: 'failed-precondition' });
    assert.equal((await program.get()).exists, true);
    assert.equal((await station.get()).exists, true);
  });
}
