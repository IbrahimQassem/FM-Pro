import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { doc, getDocFromServer } from 'firebase/firestore';
import { saveWithRelations } from '../lib/save-content.ts';
import { callableEmulator } from './support/callable-emulator.ts';

void test('trusted program transfer includes off-page children, races safely with creation and rejects overflow',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
    const harness = await callableEmulator();
    const fixtures = JSON.parse(await readFile(new URL('../../test/fixtures/admin-content-contract.json', import.meta.url), 'utf8'));
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const id = crypto.randomUUID();
        const old = harness.adminDb.doc(`${root}/stations/stations/${id}-old`);
        const next = harness.adminDb.doc(`${root}/stations/stations/${id}-next`);
        await old.set({ stats: { programsCount: 0 } }); await next.set({ stats: { programsCount: 0 } });
        const path = `${root}/programs/programs`;
        const program = doc(harness.db, path, id);
        const { stats: programStats, ...programFields } = fixtures.programs;
        const data = { ...programFields, stationId: old.id, title: `Transfer ${id}` };
        await saveWithRelations(harness.db, root, 'programs', path, id, data, null);
        assert.equal((await getDocFromServer(program)).get('stats.episodesCount'), programStats.episodesCount);
        const seed = harness.adminDb.batch();
        for (let index = 0; index < 55; index++) seed.set(harness.adminDb.doc(`${root}/episodes/episodes/${id}-${index}`), { programId: id, stationId: old.id, createdBy: 'fixture-creator' });
        seed.update(harness.adminDb.doc(program.path), { 'stats.episodesCount': 55 }); await seed.commit();
        const previous = (await getDocFromServer(program)).data()!;
        const { stats: episodeStats, ...episodeFields } = fixtures.episodes;
        const results = await Promise.allSettled([
          saveWithRelations(harness.db, root, 'programs', path, id, { ...data, stationId: next.id }, { reference: program, data: previous }),
          saveWithRelations(harness.db, root, 'episodes', `${root}/episodes/episodes`, `${id}-concurrent`,
            { ...episodeFields, stationId: old.id, programId: id, audioUrl: `https://radio.example/${id}.mp3` }, null),
        ]);
        assert.equal(results[0].status, 'fulfilled');
        const children = await harness.adminDb.collection(`${root}/episodes/episodes`).where('programId', '==', id).get();
        assert.equal(children.size, results[1].status === 'fulfilled' ? 56 : 55);
        assert.equal(children.docs.every((item: { get(key: string): unknown }) => item.get('stationId') === next.id), true);
        assert.equal((await harness.adminDb.doc(`${root}/episodes/episodes/${id}-0`).get()).get('createdBy'), 'fixture-creator');
        assert.equal((await getDocFromServer(program)).get('stats.episodesCount'), children.size);
        if (results[1].status === 'fulfilled') {
          assert.equal((await harness.adminDb.doc(`${root}/episodes/episodes/${id}-concurrent`).get()).get('stats.playsCount'), episodeStats.playsCount);
        }
        assert.equal((await old.get()).get('stats.programsCount'), 0); assert.equal((await next.get()).get('stats.programsCount'), 1);
        const overflow = harness.adminDb.batch();
        for (let index = children.size; index < 451; index++) overflow.set(harness.adminDb.doc(`${root}/episodes/episodes/${id}-overflow-${index}`), { programId: id, stationId: next.id });
        overflow.update(harness.adminDb.doc(program.path), { 'stats.episodesCount': 451 }); await overflow.commit();
        const before = (await getDocFromServer(program)).data()!;
        await assert.rejects(saveWithRelations(harness.db, root, 'programs', path, id, { ...data, stationId: old.id }, { reference: program, data: before }),
          error => error instanceof Error && error.message.includes('450'));
        assert.equal((await getDocFromServer(program)).get('stationId'), next.id);
        assert.equal((await next.get()).get('stats.programsCount'), 1);
      }
    } finally { await harness.close(); }
  });
