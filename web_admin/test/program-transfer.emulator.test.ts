import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  increment,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { readProgramTransferEpisodes } from '../lib/program-transfer.ts';

void test(
  'program transfer includes off-page and concurrently created episodes atomically',
  {
    skip: !process.env.FIRESTORE_EMULATOR_HOST,
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    assert.ok(projectId?.startsWith('demo-'));
    const app = initializeApp({ projectId }, `transfer-${crypto.randomUUID()}`);
    const db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    connectFirestoreEmulator(db, host, Number(port), {
      mockUserToken: {
        sub: 'fixture-admin',
        admin: true,
        email_verified: true,
      },
    });
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial']) {
        const id = crypto.randomUUID();
        const program = doc(db, `${root}/programs/programs`, id);
        const oldStation = doc(db, `${root}/stations/stations`, `${id}-old`);
        const nextStation = doc(db, `${root}/stations/stations`, `${id}-next`);
        const episodes = Array.from({ length: 56 }, (_, i) =>
          doc(db, `${root}/episodes/episodes`, `${id}-${i}`),
        );
        const seed = writeBatch(db);
        seed.set(program, {
          stationId: oldStation.id,
          stats: { episodesCount: 55 },
        });
        seed.set(oldStation, { stats: { programsCount: 1 } });
        seed.set(nextStation, { stats: { programsCount: 0 } });
        for (const episode of episodes.slice(0, 55))
          seed.set(episode, {
            programId: id,
            stationId: oldStation.id,
            title: 'Fixture',
          });
        await seed.commit();
        let attempts = 0;
        await runTransaction(db, async (tx) => {
          const current = await tx.get(program);
          const children = await readProgramTransferEpisodes(tx, current);
          await tx.get(oldStation);
          await tx.get(nextStation);
          if (++attempts === 1) {
            const concurrent = writeBatch(db);
            concurrent.set(episodes[55], {
              programId: id,
              stationId: oldStation.id,
              title: 'Concurrent fixture',
            });
            concurrent.update(program, { 'stats.episodesCount': increment(1) });
            await concurrent.commit();
          }
          for (const child of children)
            tx.update(child, { stationId: nextStation.id });
          tx.update(program, { stationId: nextStation.id });
          tx.update(oldStation, { 'stats.programsCount': increment(-1) });
          tx.update(nextStation, { 'stats.programsCount': increment(1) });
        });
        assert.ok(
          attempts > 1,
          'Concurrent creation must retry the child query',
        );
        for (const episode of episodes)
          assert.equal(
            (await getDoc(episode)).data()?.stationId,
            nextStation.id,
          );
        assert.equal((await getDoc(program)).data()?.stats.episodesCount, 56);
        assert.equal((await getDoc(oldStation)).data()?.stats.programsCount, 0);
        assert.equal(
          (await getDoc(nextStation)).data()?.stats.programsCount,
          1,
        );

        const overflow = writeBatch(db);
        for (let i = 56; i < 451; i++)
          overflow.set(doc(db, `${root}/episodes/episodes`, `${id}-${i}`), {
            programId: id,
            stationId: nextStation.id,
          });
        await overflow.commit();
        await assert.rejects(
          runTransaction(db, async (tx) => {
            const current = await tx.get(program);
            await readProgramTransferEpisodes(tx, current);
            tx.update(program, { stationId: oldStation.id });
          }),
          /450/,
        );
        assert.equal((await getDoc(program)).data()?.stationId, nextStation.id);
      }
    } finally {
      await deleteApp(app);
    }
  },
);
