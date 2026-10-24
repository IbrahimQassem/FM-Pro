import { describe, it } from 'node:test';
import assert from 'node:assert';
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
        typeof d.data === 'function' ? d : { id: d.id || d.externalId || 'doc-id', data: () => d }
      );
      const setCalls = [];
      const programUpdates = [];
      let shouldFailCommit = failCommit;
      let shouldFailPredicate = failCommitPredicate;
      let shouldFailUpdate = failUpdate;

      const firestore = {
        collection: (root) => ({
          doc: (sub) => ({
            collection: (col) => ({
              where: (field, op, val) => ({
                get: async () => ({ docs: [...existingDocs] }),
              }),
              doc: (id) => ({
                id,
                set: async (data) => {
                  setCalls.push({ id, data });
                  existingDocs.push({
                    id,
                    data: () => data,
                  });
                },
                update: async (data) => {
                  if (shouldFailUpdate) {
                    throw new Error('Simulated network failure on program update');
                  }
                  programUpdates.push(data);
                },
              }),
            }),
          }),
        }),
        batch: () => {
          const stagedOps = [];
          return {
            set: (docRef, data) => {
              stagedOps.push({ type: 'set', docRef, data });
            },
            update: (docRef, data) => {
              stagedOps.push({ type: 'update', docRef, data });
            },
            delete: (docRef) => {
              stagedOps.push({ type: 'delete', docRef });
            },
            commit: async () => {
              const shouldFail =
                (typeof shouldFailPredicate === 'function' && shouldFailPredicate()) ||
                shouldFailCommit ||
                shouldFailUpdate;
              if (shouldFail) {
                throw new Error('Simulated network failure on batch commit');
              }
              for (const op of stagedOps) {
                if (op.type === 'set') {
                  const id = op.docRef.id;
                  setCalls.push({ id, data: op.data });
                  existingDocs.push({
                    id,
                    data: () => op.data,
                  });
                } else if (op.type === 'update') {
                  programUpdates.push(op.data);
                }
              }
            },
          };
        },
      };

      return {
        firestore,
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
        /Simulated network failure on batch commit/,
        'Must reject and surface failure to caller instead of falsely claiming success'
      );

      // Verify no partial writes occurred
      assert.strictEqual(setCalls.length, 0, 'No episode write must be committed when batch fails');
      assert.strictEqual(programUpdates.length, 0, 'No program counter update must be committed when batch fails');
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
        failCommitPredicate: () => {
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
        /Simulated network failure on batch commit/
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
