import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { saveWithRelations } from '../lib/save-content.ts';
import { callableEmulator } from './support/callable-emulator.ts';

void test(
  'real callable rejects unauthenticated callers and cross-station takeover, and permits own-station edits',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const harness = await callableEmulator({
      admin: true,
      role: 'station_admin',
      assignedStations: ['authorization-a'],
    });
    const projectId = process.env.GCLOUD_PROJECT;
    const guest = initializeApp(
      { projectId, apiKey: 'demo-key' },
      `guest-${crypto.randomUUID()}`,
    );
    connectFunctionsEmulator(getFunctions(guest), '127.0.0.1', 5001);
    const fixture = JSON.parse(
      await readFile(
        new URL(
          '../../test/fixtures/admin-content-contract.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ).programs;
    const { stats, ...fields } = fixture;
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const path = `${root}/programs/programs`;
        const id = `authorization-${crypto.randomUUID()}`;
        const ref = harness.adminDb.doc(`${path}/${id}`);
        const original = {
          ...fields,
          stationId: 'authorization-b',
          title: 'Synthetic original',
        };
        const edited = {
          ...fields,
          stationId: 'authorization-a',
          title: 'Synthetic edited',
        };
        await harness.adminDb
          .doc(`${root}/stations/stations/authorization-a`)
          .set({ stats: { programsCount: 0 } });
        await ref.set({ ...original, stats });
        const previous = { reference: { path: ref.path }, data: original };
        await assert.rejects(
          saveWithRelations(
            getFirestore(guest),
            root,
            'programs',
            path,
            id,
            edited,
            previous,
          ),
          { code: 'functions/unauthenticated' },
        );
        await assert.rejects(
          saveWithRelations(
            harness.db,
            root,
            'programs',
            path,
            id,
            edited,
            previous,
          ),
          { code: 'functions/permission-denied' },
        );
        assert.equal((await ref.get()).get('title'), original.title);
        await ref.set({ ...original, stationId: 'authorization-a', stats });
        const own = (await ref.get()).data();
        await saveWithRelations(
          harness.db,
          root,
          'programs',
          path,
          id,
          edited,
          { reference: { path: ref.path }, data: own },
        );
        assert.equal((await ref.get()).get('title'), edited.title);
        const audit = await harness.adminDb
          .collection(`${root}/auditLogs/auditLogs`)
          .where('targetId', '==', id)
          .get();
        assert.equal(audit.size, 1);
      }
    } finally {
      await deleteApp(guest);
      await harness.close();
    }
  },
);
