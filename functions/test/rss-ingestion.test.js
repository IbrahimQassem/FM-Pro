import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { contentIdentity, contentIdentityScope } from '../lib/admin-content.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  parseDurationToSeconds,
  parseRssFeed,
  ingestEpisodesFromFeed,
  ingestConfiguredPodcastFeedsForRoot,
} from '../lib/rss-ingestion.js';

const lookupFn = async () => [{ address: '93.184.216.34', family: 4 }];

it('scheduled ingestion forwards its validated resolver to the feed boundary', async () => {
  let lookups = 0;
  const firestore = {
    collection: () => ({ doc: () => ({ collection: () => ({ where: () => ({ get: async () => ({
      docs: [{ id: 'synthetic-program', data: () => ({ rssFeedUrl: 'https://radio.example/feed', stationId: 's' }) }],
    }) }) }) }) }),
  };
  const result = await ingestConfiguredPodcastFeedsForRoot({ firestore, root: 'HudHudDev',
    lookupFn: async () => { lookups++; return lookupFn(); },
    fetchFn: async () => new Response('<rss><channel></channel></rss>'),
  });
  assert.equal(lookups, 1);
  assert.equal(result.feedsProcessed, 1);
});

describe('RSS Podcast & Episode Ingestion', () => {
  describe('parseDurationToSeconds', () => {
    it('converts HH:MM:SS format to total seconds', () => {
      assert.strictEqual(parseDurationToSeconds('01:15:30'), 4530);
    });

    it('converts MM:SS format to total seconds', () => {
      assert.strictEqual(parseDurationToSeconds('25:40'), 1540);
    });

    it('handles numeric seconds string directly', () => {
      assert.strictEqual(parseDurationToSeconds('3600'), 3600);
    });

    it('returns 0 on empty or invalid duration string', () => {
      assert.strictEqual(parseDurationToSeconds(''), 0);
      assert.strictEqual(parseDurationToSeconds('invalid'), 0);
    });
  });

  describe('parseRssFeed', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>بودكاست الهدهد اليمني</title>
    <item>
      <title><![CDATA[حلقة تاريخ اليمن القديم - الجزء 1]]></title>
      <description><![CDATA[<p>حديث شيق عن تاريخ اليمن وسد مأرب.</p>]]></description>
      <enclosure url="https://storage.example.com/audio/ep1.mp3" type="audio/mpeg" length="12345678" />
      <guid isPermaLink="false">hudhud-history-01</guid>
      <pubDate>Mon, 19 Oct 2026 07:00:00 +0300</pubDate>
      <itunes:duration>45:20</itunes:duration>
      <itunes:image href="https://storage.example.com/images/ep1.jpg" />
    </item>
    <item>
      <!-- Insecure HTTP link: Must be skipped per contract -->
      <title>حلقة غير آمنة</title>
      <enclosure url="http://insecure.example.com/audio.mp3" type="audio/mpeg" />
      <guid>insecure-01</guid>
    </item>
    <item>
      <title>حلقة بلا معرف guid</title>
      <enclosure url="https://storage.example.com/audio/ep2.mp3" type="audio/mpeg" />
      <pubDate>Tue, 20 Oct 2026 08:30:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    it('parses valid podcast items with HTTPS audio, stripping CDATA and HTML', () => {
      const items = parseRssFeed(sampleXml);

      assert.strictEqual(items.length, 2, 'Must include 2 valid items and exclude insecure HTTP item');

      const first = items[0];
      assert.strictEqual(first.title, 'حلقة تاريخ اليمن القديم - الجزء 1');
      assert.strictEqual(first.description, 'حديث شيق عن تاريخ اليمن وسد مأرب.');
      assert.strictEqual(first.audioUrl, 'https://storage.example.com/audio/ep1.mp3');
      assert.strictEqual(first.externalId, 'hudhud-history-01');
      assert.strictEqual(first.durationSeconds, 45 * 60 + 20);
      assert.strictEqual(first.coverUrl, 'https://storage.example.com/images/ep1.jpg');

      const second = items[1];
      assert.strictEqual(second.title, 'حلقة بلا معرف guid');
      assert.strictEqual(second.audioUrl, 'https://storage.example.com/audio/ep2.mp3');
      assert.ok(second.externalId.length > 0, 'Must generate fallback externalId from audio hash');
    });
  });

  describe('ingestEpisodesFromFeed', () => {
    function createMockFirestore({
      initialDocs = [],
      failCommit = false,
      failCommitPredicate = null,
      failUpdate = false,
    } = {}) {
      const existingDocs = initialDocs.map(d =>
        typeof d.data === 'function' ? d : { id: d.id || d.externalId || 'doc-id', data: () => ({ stationId: 'st-sanaa', ...d }) }
      );
      const setCalls = [];
      const programUpdates = [];
      let shouldFailCommit = failCommit;
      let shouldFailPredicate = failCommitPredicate;
      let shouldFailUpdate = failUpdate;

      const documents = new Map();
      const reference = path => ({ path, id: path.split('/').at(-1) });
      const query = (path, constraints = [], bound = Infinity) => ({
        _query: true, path, constraints, bound,
        where: (field, op, value) => query(path, [...constraints, [field, value]], bound),
        limit: value => query(path, constraints, value),
        get: async () => {
          const docs = existingDocs.filter(item => constraints.every(([field, value]) => item.data()[field] === value)).slice(0, bound);
          return { docs, size: docs.length, empty: docs.length === 0 };
        },
        doc: id => reference(`${path}/${id}`),
      });
      const collection = path => ({ ...query(path), doc: id => ({ ...reference(`${path}/${id}`), collection: name => collection(`${path}/${id}/${name}`) }) });
      const snapshot = ref => {
        let data;
        if (ref.path.includes('/episodes/episodes/')) data = existingDocs.find(item => item.id === ref.id)?.data();
        else if (ref.path.includes('/programs/programs/')) data = { stationId: 'st-sanaa', isActive: true, stats: { episodesCount: existingDocs.length } };
        else if (ref.path.includes('/stations/stations/')) data = { isActive: true };
        else data = documents.get(ref.path);
        return { ref, exists: !!data, data: () => data, get: field => field.split('.').reduce((value, key) => value?.[key], data) };
      };
      let queue = Promise.resolve();
      const firestore = {
        doc: reference, collection,
        runTransaction(fn) {
          const operation = queue.then(async () => {
            const writes = [];
            const stage = (type, ref, data) => writes.push({ type, ref, data });
            const result = await fn({ get: async target => target._query ? target.get() : snapshot(target),
              set: (ref, data) => stage('set', ref, data), create: (ref, data) => stage('create', ref, data),
              update: (ref, data) => stage('update', ref, data), delete: ref => stage('delete', ref),
            });
            if (writes.length && ((typeof shouldFailPredicate === 'function' && shouldFailPredicate(writes)) || shouldFailCommit || shouldFailUpdate)) throw new Error('Simulated network failure on content transaction commit');
            for (const { ref, data, type } of writes) {
              if (ref.path.includes('/episodes/episodes/')) {
                if (type === 'create' && existingDocs.some(item => item.id === ref.id)) throw new Error('Unexpected duplicate create');
                setCalls.push({ id: ref.id, data }); existingDocs.push({ id: ref.id, data: () => data });
              } else if (ref.path.includes('/programs/programs/')) programUpdates.push(data);
              else if (type === 'delete') documents.delete(ref.path);
              else documents.set(ref.path, data);
            }
            return result;
          });
          queue = operation.catch(() => {}); return operation;
        },
      };

      return {
        firestore,
        documents,
        existingDocs,
        setCalls,
        programUpdates,
        setFailCommit: (val) => { shouldFailCommit = val; },
        setFailPredicate: (fn) => { shouldFailPredicate = fn; },
        setFailUpdate: (val) => { shouldFailUpdate = val; },
      };
    }

    const singleItemFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>الحلقة 10</title>
      <enclosure url="https://cdn.example.com/ep10.mp3" type="audio/mpeg" />
      <guid>feed-item-10</guid>
      <pubDate>Mon, 19 Oct 2026 07:00:00 +0300</pubDate>
    </item>
  </channel>
</rss>`;

    for (const root of ['HudHudDev', 'HudHudOfficial']) {
      it(`${root}: R09 preserves a legacy GUID-less episode and binds decoded/raw aliases without recounting`, async () => {
        const raw = 'https://cdn.example.com/legacy.mp3?token=one&amp;part=two';
        const decoded = 'https://cdn.example.com/legacy.mp3?token=one&part=two';
        const legacy = { stationId: 'st-sanaa', id: 'legacy-static-id', programId: 'prog-podcast', audioUrl: raw,
          externalId: createHash('sha256').update(raw).digest('hex').slice(0,32), isPublished: false,
          stats: { commentsCount: 7, playsCount: 9 } };
        const { firestore, documents, existingDocs, setCalls, programUpdates } = createMockFirestore({ initialDocs: [legacy] });
        const xml = `<rss><item><title>Legacy</title><enclosure url="${raw}"/></item></rss>`;
        const result = await ingestEpisodesFromFeed({ firestore, root, programId: 'prog-podcast', stationId: 'st-sanaa', feedUrl: 'https://example.com/feed', lookupFn,
          fetchFn: async () => new Response(xml) });
        assert.equal(result.ingested, 0);
        assert.equal(setCalls.length, 0);
        assert.equal(programUpdates.length, 0);
        assert.deepEqual(existingDocs[0].data(), legacy);
        for (const audioUrl of [raw, decoded]) {
          const key = contentIdentity('episodes', { programId: 'prog-podcast', audioUrl });
          assert.equal(documents.get(`${root}/importKeys/importKeys/${key}`)?.targetId, legacy.id,
            'Both raw and decoded identities must bind to the unchanged legacy ID.');
        }
      });
      it(`${root}: R09 refuses raw/decoded aliases owned by distinct existing episodes`, async () => {
        const raw='https://cdn.example.com/collision.mp3?a=1&amp;b=2';
        const decoded='https://cdn.example.com/collision.mp3?a=1&b=2';
        const {firestore,setCalls,programUpdates}=createMockFirestore({initialDocs:[
          {id:'raw-owner', programId:'prog-podcast', audioUrl:raw},
          {id:'decoded-owner', programId:'prog-podcast', audioUrl:decoded},
        ]});
        await assert.rejects(ingestEpisodesFromFeed({firestore,root,programId:'prog-podcast',stationId:'st-sanaa',feedUrl:'https://example.com/feed',lookupFn,
          fetchFn:async()=>new Response(`<rss><item><enclosure url="${raw}"/></item></rss>`)}), /identity|alias/i);
        assert.equal(setCalls.length,0);
        assert.equal(programUpdates.length,0);
      });
    }

    it('R09 completed URL backfill does not hide a legacy GUID owner after a feed URL rotation', async () => {
      const { firestore, documents, setCalls } = createMockFirestore({ initialDocs: [{ id: 'arbitrary-legacy-guid-owner', programId: 'prog-podcast',
        stationId: 'st-sanaa', externalId: 'stable-rotated-guid', audioUrl: 'https://cdn.example.com/old-url.mp3' }] });
      documents.set(`HudHudDev/identityScopes/scopes/${contentIdentityScope('episodes', 'prog-podcast')}`,
        { version: 1, state: 'complete', targetKind: 'episodes', parentId: 'prog-podcast', runId: 'a'.repeat(64) });
      const result = await ingestEpisodesFromFeed({ firestore, root: 'HudHudDev', programId: 'prog-podcast', stationId: 'st-sanaa',
        feedUrl: 'https://example.com/feed', lookupFn,
        fetchFn: async () => new Response('<rss><item><guid>stable-rotated-guid</guid><enclosure url="https://cdn.example.com/new-url.mp3"/></item></rss>') });
      assert.equal(result.skipped, 1); assert.equal(result.ingested, 0); assert.equal(setCalls.length, 0);
    });

    it('R09 a matching episode with a foreign station fails closed instead of being duplicated', async () => {
      const { firestore, setCalls } = createMockFirestore({ initialDocs: [{ id: 'foreign-station-owner', programId: 'prog-podcast',
        stationId: 'foreign-station', externalId: 'foreign-guid', audioUrl: 'https://cdn.example.com/foreign.mp3' }] });
      await assert.rejects(ingestEpisodesFromFeed({ firestore, root: 'HudHudDev', programId: 'prog-podcast', stationId: 'st-sanaa',
        feedUrl: 'https://example.com/feed', lookupFn,
        fetchFn: async () => new Response('<rss><item><guid>foreign-guid</guid><enclosure url="https://cdn.example.com/foreign.mp3"/></item></rss>') }),
        error => error.code === 'failed-precondition');
      assert.equal(setCalls.length, 0);
    });

    it('R09 alias ownership survives five GUID-preserving rotations and a later admin URL edit', async () => {
      const legacy = { id: 'rotating-owner', stationId: 'st-sanaa', programId: 'prog-podcast',
        externalId: 'rotation-guid', audioUrl: 'https://cdn.example.com/original.mp3', isPublished: false };
      const { firestore, documents, setCalls, programUpdates } = createMockFirestore({ initialDocs: [legacy] });
      const rawUrls = Array.from({ length: 5 }, (_, index) => `https://cdn.example.com/rotate-${index}.mp3?a=1&amp;b=2`);
      const ingest = raw => ingestEpisodesFromFeed({ firestore, root: 'HudHudDev', programId: 'prog-podcast', stationId: 'st-sanaa',
        feedUrl: 'https://example.com/feed', lookupFn, fetchFn: async () => new Response(`<rss><item><guid>rotation-guid</guid><enclosure url="${raw}"/></item></rss>`) });
      for (const raw of rawUrls) assert.equal((await ingest(raw)).skipped, 1);
      legacy.audioUrl = 'https://cdn.example.com/admin-edited.mp3';
      assert.equal((await ingest(rawUrls[0])).skipped, 1);
      for (const raw of rawUrls) for (const audioUrl of [raw, raw.replace('&amp;', '&')]) {
        const key = contentIdentity('episodes', { programId: legacy.programId, audioUrl });
        const proof = documents.get(`HudHudDev/importKeys/importKeys/${key}`);
        assert.equal(proof.targetId, legacy.id); assert.equal(proof.rssOwnerExternalIdHash, createHash('sha256').update(legacy.externalId).digest('hex'));
        assert.equal(Object.values(proof).some(value => typeof value === 'string' && value.includes('https://')), false);
        assert.equal(Object.values(proof).some(Array.isArray), false);
      }
      assert.equal(setCalls.length, 0); assert.equal(programUpdates.length, 0);
    });

    it('R09 legacy alias lookup accepts real SDK-style prototype snapshot methods', async () => {
      class LegacySnapshot {
        get id() { return 'prototype-legacy'; }
        data() { return { stationId:'st-sanaa', programId:'prog-podcast', audioUrl:'https://cdn.example.com/prototype.mp3', externalId:'prototype-guid' }; }
      }
      const {firestore,setCalls,programUpdates}=createMockFirestore({initialDocs:[new LegacySnapshot()]});
      let outcome;
      try {
        outcome=await ingestEpisodesFromFeed({firestore,root:'HudHudDev',programId:'prog-podcast',stationId:'st-sanaa',feedUrl:'https://example.com/feed',lookupFn,
          fetchFn:async()=>new Response('<rss><item><guid>prototype-guid</guid><enclosure url="https://cdn.example.com/prototype.mp3"/></item></rss>')});
      } catch { outcome=null; }
      assert.equal(outcome?.skipped,1,'An existing SDK query snapshot must resolve without a duplicate or rejection.');
      assert.equal(setCalls.length,0);
      assert.equal(programUpdates.length,0);
    });

    it('ingests episode with nested stats map, omits legacy root counters, preserves timestamps, and updates program stats.episodesCount', async () => {
      const { firestore, setCalls, programUpdates } = createMockFirestore();

      const mockFetch = async () => ({
        ok: true,
        headers: new Headers(), body: new Response(singleItemFeedXml).body,
      });

      const result = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(result.ingested, 1);
      assert.strictEqual(result.skipped, 0);
      assert.strictEqual(setCalls.length, 1);

      const episodeData = setCalls[0].data;
      assert.strictEqual(episodeData.title, 'الحلقة 10');
      assert.strictEqual(episodeData.externalId, 'feed-item-10');
      assert.strictEqual(episodeData.isPublished, true);
      assert.strictEqual(episodeData.utcOffsetMinutes, 180);

      // Requirement 1 & 3: stats map present with correct values, legacy root counters absent
      assert.deepStrictEqual(episodeData.stats, {
        playsCount: 0,
        likesCount: 0,
        commentsCount: 0,
      });
      assert.strictEqual(episodeData.playsCount, undefined);
      assert.strictEqual(episodeData.likesCount, undefined);
      assert.strictEqual(episodeData.commentsCount, undefined);
      assert.strictEqual('playsCount' in episodeData, false);
      assert.strictEqual('likesCount' in episodeData, false);
      assert.strictEqual('commentsCount' in episodeData, false);

      // Expected timestamps preserved
      assert.ok(episodeData.publishedDate instanceof Timestamp);
      assert.ok(episodeData.broadcastAt instanceof Timestamp);
      assert.ok(episodeData.createdAt.isEqual(FieldValue.serverTimestamp()));

      // Requirement 2 & 3: program counter updated via stats.episodesCount and FieldValue.increment
      assert.strictEqual(programUpdates.length, 1);
      const programUpdate = programUpdates[0];
      assert.strictEqual('episodesCount' in programUpdate, false, 'Root episodesCount must not be present');
      assert.strictEqual(programUpdate.episodesCount, undefined);
      assert.ok('stats.episodesCount' in programUpdate, 'Update key stats.episodesCount must be present');
      assert.ok(programUpdate['stats.episodesCount'].isEqual(FieldValue.increment(1)));
      assert.ok(programUpdate.lastIngestedAt.isEqual(FieldValue.serverTimestamp()));
    });

    it('enforces idempotency on re-run: skips duplicate feed items and avoids secondary program update calls', async () => {
      const { firestore, setCalls, programUpdates } = createMockFirestore();

      const mockFetch = async () => ({
        ok: true,
        headers: new Headers(), body: new Response(singleItemFeedXml).body,
      });

      // Run 1: Ingest
      const result1 = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(result1.ingested, 1);
      assert.strictEqual(result1.skipped, 0);
      assert.strictEqual(setCalls.length, 1);
      assert.strictEqual(programUpdates.length, 1);

      // Run 2: Same feed -> Must detect existing externalId and skip (0 writes, 0 program update calls)
      const result2 = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(result2.ingested, 0, 'Second run must ingest 0 items');
      assert.strictEqual(result2.skipped, 1, 'Second run must skip duplicate item');
      assert.strictEqual(setCalls.length, 1, 'Zero new writes on duplicate feed');
      assert.strictEqual(programUpdates.length, 1, 'Program update must not be invoked a second time');
    });

    it('increments program counter by newly ingested count only when mixing existing and new feed items', async () => {
      const initialDocs = [
        {
          externalId: 'feed-item-existing',
          audioUrl: 'https://cdn.example.com/existing.mp3',
          programId: 'prog-podcast',
        },
      ];

      const { firestore, setCalls, programUpdates } = createMockFirestore({ initialDocs });

      const mixedFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>حلقة موجودة مسبقاً</title>
      <enclosure url="https://cdn.example.com/existing.mp3" type="audio/mpeg" />
      <guid>feed-item-existing</guid>
    </item>
    <item>
      <title>حلقة جديدة 1</title>
      <enclosure url="https://cdn.example.com/new1.mp3" type="audio/mpeg" />
      <guid>feed-item-new-1</guid>
    </item>
    <item>
      <title>حلقة جديدة 2</title>
      <enclosure url="https://cdn.example.com/new2.mp3" type="audio/mpeg" />
      <guid>feed-item-new-2</guid>
    </item>
  </channel>
</rss>`;

      const mockFetch = async () => ({
        ok: true,
        headers: new Headers(), body: new Response(mixedFeedXml).body,
      });

      const result = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(result.totalFeedItems, 3);
      assert.strictEqual(result.ingested, 2, 'Only 2 new episodes should be ingested');
      assert.strictEqual(result.skipped, 1, '1 existing episode should be skipped');
      assert.strictEqual(setCalls.length, 2, 'Exactly 2 new episode documents written');

      assert.strictEqual(setCalls[0].data.externalId, 'feed-item-new-1');
      assert.strictEqual(setCalls[1].data.externalId, 'feed-item-new-2');

      assert.strictEqual(programUpdates.length, 2, 'Program update invoked once per newly ingested episode commit unit');
      for (const updateData of programUpdates) {
        assert.strictEqual('episodesCount' in updateData, false);
        assert.ok('stats.episodesCount' in updateData);
        assert.ok(
          updateData['stats.episodesCount'].isEqual(FieldValue.increment(1)),
          'Increment count must equal 1 per newly ingested episode'
        );
        assert.ok(updateData.lastIngestedAt.isEqual(FieldValue.serverTimestamp()));
      }
    });

    it('does not invoke program update when all feed items are skipped', async () => {
      const initialDocs = [
        {
          externalId: 'feed-item-1',
          audioUrl: 'https://cdn.example.com/ep1.mp3',
          programId: 'prog-podcast',
        },
      ];

      const { firestore, setCalls, programUpdates } = createMockFirestore({ initialDocs });

      const allExistingFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>الحلقة 1</title>
      <enclosure url="https://cdn.example.com/ep1.mp3" type="audio/mpeg" />
      <guid>feed-item-1</guid>
    </item>
  </channel>
</rss>`;

      const mockFetch = async () => ({
        ok: true,
        headers: new Headers(), body: new Response(allExistingFeedXml).body,
      });

      const result = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(result.ingested, 0);
      assert.strictEqual(result.skipped, 1);
      assert.strictEqual(setCalls.length, 0);
      assert.strictEqual(programUpdates.length, 0, 'No program updates should be attempted when 0 items ingested');
    });

    it('prevents partial failure when commit fails: leaves no episode without counter, no counter without episode, and rejects without false success', async () => {
      const { firestore, existingDocs, setCalls, programUpdates, setFailCommit } = createMockFirestore({ failCommit: true });

      const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>حلقة تجربة الفشل الذري</title>
      <enclosure url="https://cdn.example.com/atomic-fail.mp3" type="audio/mpeg" />
      <guid>feed-item-atomic-fail</guid>
    </item>
  </channel>
</rss>`;

      const mockFetch = async () => ({
        ok: true,
        headers: new Headers(), body: new Response(feedXml).body,
      });

      // Run 1: Batch commit fails (simulated network or Firestore error)
      await assert.rejects(
        ingestEpisodesFromFeed({
          firestore,
          root: 'HudHudDev',
          programId: 'prog-podcast',
          stationId: 'st-sanaa',
          feedUrl: 'https://example.com/podcast.xml',
          fetchFn: mockFetch, lookupFn,
        }),
        /Simulated network failure on content transaction commit/,
        'Must reject and surface failure to caller instead of falsely claiming success'
      );

      // Verify no partial writes occurred
      assert.strictEqual(setCalls.length, 0, 'No episode write must be committed when transaction fails');
      assert.strictEqual(programUpdates.length, 0, 'No program counter update must be committed when transaction fails');
      assert.strictEqual(existingDocs.length, 0, 'Firestore existingDocs must remain empty');

      // Run 2 (Retry): Failure condition cleared -> succeeds completely exactly once
      setFailCommit(false);
      const retryResult = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(retryResult.ingested, 1, 'Retry must ingest the episode successfully');
      assert.strictEqual(retryResult.skipped, 0);
      assert.strictEqual(setCalls.length, 1, 'Episode document committed exactly once');
      assert.strictEqual(programUpdates.length, 1, 'Program counter updated exactly once');
      assert.strictEqual(existingDocs.length, 1);
      assert.ok(programUpdates[0]['stats.episodesCount'].isEqual(FieldValue.increment(1)));

      // Run 3: Subsequent run of successful feed skips duplicate and makes zero new writes
      const duplicateResult = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(duplicateResult.ingested, 0, 'Subsequent run must ingest 0 items');
      assert.strictEqual(duplicateResult.skipped, 1, 'Duplicate item skipped');
      assert.strictEqual(setCalls.length, 1, 'No additional episode writes');
      assert.strictEqual(programUpdates.length, 1, 'No additional program counter updates');
    });

    it('preserves successful commit units and their counters when a subsequent unit fails, allowing retry without re-counting', async () => {
      const initialDocs = [
        {
          id: 'existing-doc-1',
          externalId: 'feed-item-existing',
          audioUrl: 'https://cdn.example.com/existing.mp3',
          programId: 'prog-podcast',
        },
      ];

      let commitIndex = 0;
      const {
        firestore,
        existingDocs,
        setCalls,
        programUpdates,
        setFailPredicate,
      } = createMockFirestore({
        initialDocs,
        failCommitPredicate: writes => {
          if (!writes.some(write => write.type === 'create' && write.ref.path.includes('/episodes/episodes/'))) return false;
          commitIndex++;
          // Allow first commit unit (item-1) to succeed, fail on second unit (item-2)
          return commitIndex > 1;
        },
      });

      const multiItemFeedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>حلقة موجودة مسبقاً</title>
      <enclosure url="https://cdn.example.com/existing.mp3" type="audio/mpeg" />
      <guid>feed-item-existing</guid>
    </item>
    <item>
      <title>حلقة جديدة 1</title>
      <enclosure url="https://cdn.example.com/new1.mp3" type="audio/mpeg" />
      <guid>feed-item-new-1</guid>
    </item>
    <item>
      <title>حلقة جديدة 2</title>
      <enclosure url="https://cdn.example.com/new2.mp3" type="audio/mpeg" />
      <guid>feed-item-new-2</guid>
    </item>
  </channel>
</rss>`;

      const mockFetch = async () => ({
        ok: true,
        headers: new Headers(), body: new Response(multiItemFeedXml).body,
      });

      // Run 1: Existing item skipped; Item 1 commits successfully; Item 2 commit fails and throws
      await assert.rejects(
        ingestEpisodesFromFeed({
          firestore,
          root: 'HudHudDev',
          programId: 'prog-podcast',
          stationId: 'st-sanaa',
          feedUrl: 'https://example.com/podcast.xml',
          fetchFn: mockFetch, lookupFn,
        }),
        /Simulated network failure on content transaction commit/
      );

      // Verify that Item 1 was committed along with its counter increment
      assert.strictEqual(setCalls.length, 1, 'Only unit 1 episode was committed');
      assert.strictEqual(setCalls[0].data.externalId, 'feed-item-new-1');
      assert.strictEqual(programUpdates.length, 1, 'Only unit 1 program counter increment was committed');
      assert.ok(programUpdates[0]['stats.episodesCount'].isEqual(FieldValue.increment(1)));

      // Verify that Item 2 was NOT committed and did not leave partial writes
      assert.strictEqual(
        existingDocs.some(d => d.data().externalId === 'feed-item-new-2'),
        false,
        'Item 2 must not exist in Firestore'
      );

      // Run 2 (Retry): Failure cleared; re-running the feed must skip existing & Item 1, and ingest Item 2
      setFailPredicate(null);
      const retryResult = await ingestEpisodesFromFeed({
        firestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch, lookupFn,
      });

      assert.strictEqual(retryResult.ingested, 1, 'Only Item 2 newly ingested on retry');
      assert.strictEqual(retryResult.skipped, 2, 'Initial existing item and Item 1 both skipped');

      assert.strictEqual(setCalls.length, 2, 'Both new episodes committed exactly once across runs');
      assert.strictEqual(setCalls[1].data.externalId, 'feed-item-new-2');
      assert.strictEqual(programUpdates.length, 2, 'Program counter updated exactly once per newly ingested episode');
      assert.ok(programUpdates[1]['stats.episodesCount'].isEqual(FieldValue.increment(1)));

      // Verify final document count: 1 initial existing + 2 newly ingested episodes
      assert.strictEqual(existingDocs.length, 3);
    });

    it('generates deterministic episode IDs and prevents duplicates during concurrent runs (IR-11)', async () => {
      const { deterministicEpisodeId } = await import('../lib/rss-ingestion.js');
      const id1 = deterministicEpisodeId('prog-1', 'guid-xyz');
      const id2 = deterministicEpisodeId('prog-1', 'guid-xyz');
      const id3 = deterministicEpisodeId('prog-1', 'guid-abc');

      assert.strictEqual(id1, id2, 'Identical program and guid must yield identical document ID');
      assert.notStrictEqual(id1, id3, 'Different guids must yield different IDs');
      assert.strictEqual(typeof id1, 'string');
      assert.strictEqual(id1.length, 24);
    });

    it('rejects loopback and private feed URLs (IR-10)', async () => {
      const { fetchAndParseRss } = await import('../lib/rss-ingestion.js');
      for (const unsafeUrl of [
        'http://localhost/feed.xml',
        'http://127.0.0.1:8080/feed.xml',
        'http://169.254.169.254/feed.xml',
        'http://10.0.0.1/rss',
      ]) {
        await assert.rejects(
          () => fetchAndParseRss(unsafeUrl),
          /Unsafe or private feed URL/
        );
      }
    });
  });
});


describe('R09 XML entity semantics', () => {
  const feed = (url, title = 'Episode') => `<rss><item><title>${title}</title><enclosure url="${url}"/></item></rss>`;
  it('decodes predefined and numeric references exactly once before URL and fallback identity', () => {
    const [item] = parseRssFeed(feed('https://cdn.example.com/a.mp3?one=1&amp;two=&#50;&#x33;', 'Fish &amp; &lt;chips&gt; &quot;yes&quot; &apos;ok&apos;'));
    assert.equal(item.audioUrl, 'https://cdn.example.com/a.mp3?one=1&two=23');
    assert.equal(item.title, 'Fish & <chips> "yes" \'ok\'');
    assert.equal(item.externalId, createHash('sha256').update(item.audioUrl).digest('hex').slice(0,32));
  });
  it('decodes ordinary GUIDs but preserves CDATA literal entity text', () => {
    const [ordinary] = parseRssFeed('<rss><item><guid>id&amp;one</guid><enclosure url="https://cdn.example.com/a.mp3"/></item></rss>');
    assert.equal(ordinary.externalId,'id&one');
    const [cdata] = parseRssFeed(feed('https://cdn.example.com/a.mp3', '<![CDATA[literal &amp; text]]>'));
    assert.equal(cdata.title,'literal &amp; text');
  });
  for (const entity of ['&unknown;', '&amp', '&#0;', '&#xD800;', '&#1114112;', '&#xFFFE;']) {
    it(`rejects malformed or XML-invalid reference ${entity} in the affected item`, () => {
      assert.equal(parseRssFeed(feed(`https://cdn.example.com/a.mp3?x=${entity}`)).length,0);
    });
  }
  it('rejects DTD declarations without external resolution', () => {
    assert.throws(()=>parseRssFeed('<!DOCTYPE rss [<!ENTITY leak SYSTEM "https://example.test/private">]>'+feed('https://cdn.example.com/a.mp3')), /DTD|declaration/i);
  });
  it('validates the decoded enclosure protocol and public address', () => {
    assert.equal(parseRssFeed(feed('https://127.0.0.1/audio.mp3')).length,0);
    assert.equal(parseRssFeed(feed('https://user:password@cdn.example.com/audio.mp3')).length,0);
  });
});

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  it(`${root}: active RSS creation atomically establishes native empty baseline; paused retry commits nothing`, async () => {
    const { MemoryFirestore, FieldValue } = await import('./support/comment-count-fixture.js');
    const db = new MemoryFirestore(), fence = `${root}/commentCountContributions`;
    db.seed(fence, { version: 1, writerProtocol: 1, state: 'active', generation: 9, owner: 'unit', planHash: 'a'.repeat(64),
      leaseUntil: 0, activeFrom: FieldValue.serverTimestamp(), baselineManifestHash: 'b'.repeat(64) });
    db.seed(`${root}/stations/stations/station`, { isActive: true });
    db.seed(`${root}/programs/programs/program`, { stationId: 'station', isActive: true, stats: { episodesCount: 0 } });
    const options = { firestore: db, root, programId: 'program', stationId: 'station', feedUrl: 'https://example.com/feed', lookupFn,
      fetchFn: async () => new Response('<rss><item><guid>native-guid</guid><enclosure url="https://cdn.example.com/native.mp3"/></item></rss>') };
    assert.equal((await ingestEpisodesFromFeed(options)).ingested, 1);
    const episodes = await db.collection(`${root}/episodes/episodes`).get(); assert.equal(episodes.size, 1);
    const episode = episodes.docs[0], baseline = db.snapshot(`${root}/commentCountContributions/episodes/${episode.id}`);
    assert.equal(episode.get('stats.commentsCount'), 0); assert.equal(episode.createTime.isEqual(baseline.updateTime), true);
    db.seed(fence, { ...db.snapshot(fence).data(), state: 'paused', generation: 10 }); const before = db.writes.length;
    await assert.rejects(ingestEpisodesFromFeed(options), error => error.retryable && error.details.reason === 'comment-count-maintenance');
    assert.equal(db.writes.length, before);
  });
}
