import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { deleteEpisode } from '../lib/delete-episode.ts';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
void test(
  'episode deletion is retryable, root-scoped and decrements counters once',
  { skip: !emulator },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    assert.ok(projectId?.startsWith('demo-'), 'Only demo projects are allowed');
    const app = initializeApp({ projectId }, `deletion-${crypto.randomUUID()}`);
    const database = getFirestore(app);
    const [host, port] = emulator!.split(':');
    connectFirestoreEmulator(database, host, Number(port), {
      mockUserToken: {
        sub: 'fixture-admin',
        admin: true,
        email_verified: true,
      },
    });
    const environment = await initializeTestEnvironment({
      projectId,
      firestore: { host, port: Number(port) },
    });
    const listenerApp = initializeApp(
      { projectId },
      `listener-${crypto.randomUUID()}`,
    );
    const listener = getFirestore(listenerApp);
    connectFirestoreEmulator(listener, host, Number(port), {
      mockUserToken: { sub: 'fixture-listener', email_verified: true },
    });
    try {
      await environment.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .doc('HudHudDev/users/users/fixture-listener')
          .set({
            displayName: 'Fixture listener',
            isActive: true,
            role: 'listener',
          });
        await context
          .firestore()
          .doc('HudHudDev/users/users/fixture-listener/agreements/ugc')
          .set({ termsVersion: '2026-09-01', acceptedAt: new Date() });
      });
      for (const root of ['HudHudDev', 'HudHudOfficial']) {
        const id = crypto.randomUUID();
        const program = doc(database, `${root}/programs/programs`, id);
        const episode = doc(database, `${root}/episodes/episodes`, id);
        await setDoc(program, { stats: { episodesCount: 1 } });
        const data = {
          programId: id,
          title: 'Synthetic episode',
          stats: { commentsCount: 0 },
        };
        await setDoc(episode, data);
        await setDoc(program, { stats: { episodesCount: 0 } });
        await assert.rejects(deleteEpisode(database, episode, data), {
          name: 'ContentError',
        });
        assert.equal((await getDoc(episode)).exists(), true);
        assert.equal(
          (await getDoc(episode)).data()?.adminDeletionToken,
          undefined,
        );
        assert.equal((await getDoc(program)).data()?.stats.episodesCount, 0);
        await setDoc(program, { stats: { episodesCount: 1 } });
        await setDoc(episode, {
          ...data,
          adminDeletionToken: 'interrupted-attempt',
        });
        await deleteEpisode(database, episode, data);
        await deleteEpisode(database, episode, data);
        assert.equal((await getDoc(episode)).exists(), false);
        assert.equal((await getDoc(program)).data()?.stats.episodesCount, 0);
        await setDoc(episode, data);
        await setDoc(program, { stats: { episodesCount: 1 } });
        await Promise.allSettled([
          deleteEpisode(database, episode, data),
          deleteEpisode(database, episode, data),
        ]);
        assert.equal((await getDoc(episode)).exists(), false);
        assert.equal((await getDoc(program)).data()?.stats.episodesCount, 0);
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const id = crypto.randomUUID();
        const episode = doc(database, 'HudHudDev/episodes/episodes', id);
        const program = doc(database, 'HudHudDev/programs/programs', id);
        const data = { programId: id, title: 'Concurrent fixture' };
        await setDoc(program, { stats: { episodesCount: 1 } });
        await setDoc(episode, data);
        const comment = doc(
          listener,
          `${episode.path}/comments/fixture-comment`,
        );
        await Promise.allSettled([
          deleteEpisode(database, episode, data),
          setDoc(comment, {
            episodeId: id,
            authorId: 'fixture-listener',
            authorName: 'Fixture listener',
            content: 'Fixture comment',
            createdAt: serverTimestamp(),
            isEdited: false,
            status: 'published',
          }),
        ]);
        const remaining = await getDoc(episode);
        const child = await getDoc(doc(database, comment.path));
        assert.ok(
          remaining.exists() || !child.exists(),
          'Deletion cannot leave an orphan comment',
        );
        assert.equal(remaining.data()?.adminDeletionToken, undefined);
        assert.equal(
          (await getDoc(program)).data()?.stats.episodesCount,
          remaining.exists() ? 1 : 0,
        );
        if (child.exists())
          await assert.rejects(deleteEpisode(database, episode, data));
      }
      const orphan = doc(
        database,
        'HudHudDev/episodes/episodes',
        crypto.randomUUID(),
      );
      const orphanData = {
        programId: crypto.randomUUID(),
        title: 'Missing program',
      };
      await setDoc(orphan, orphanData);
      await assert.rejects(deleteEpisode(database, orphan, orphanData));
      assert.equal(
        (await getDoc(orphan)).data()?.adminDeletionToken,
        undefined,
      );
      await assert.rejects(
        deleteEpisode(
          database,
          doc(database, 'Unknown/episodes/episodes/invalid'),
          {},
        ),
      );
    } finally {
      await environment.cleanup();
      await deleteApp(listenerApp);
      await deleteApp(app);
    }
  },
);
