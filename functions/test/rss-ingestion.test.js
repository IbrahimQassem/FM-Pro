import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseDurationToSeconds,
  parseRssFeed,
  ingestEpisodesFromFeed,
} from '../lib/rss-ingestion.js';

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

  describe('ingestEpisodesFromFeed (Idempotency & Zero Duplicates)', () => {
    it('ingests new episodes on first run and skips all on second run (idempotent)', async () => {
      const existingDocs = [];
      const setCalls = [];
      let programUpdate = null;

      const mockFirestore = {
        collection: (root) => ({
          doc: (sub) => ({
            collection: (col) => ({
              where: (field, op, val) => ({
                get: async () => ({ docs: existingDocs }),
              }),
              doc: (id) => ({
                set: async (data) => {
                  setCalls.push({ id, data });
                  existingDocs.push({
                    data: () => data,
                  });
                },
                update: async (data) => {
                  programUpdate = data;
                },
              }),
            }),
          }),
        }),
      };

      const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>الحلقة 10</title>
      <enclosure url="https://cdn.example.com/ep10.mp3" type="audio/mpeg" />
      <guid>feed-item-10</guid>
    </item>
  </channel>
</rss>`;

      const mockFetch = async () => ({
        ok: true,
        text: async () => feedXml,
      });

      // Run 1: Ingest
      const result1 = await ingestEpisodesFromFeed({
        firestore: mockFirestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch,
      });

      assert.strictEqual(result1.ingested, 1);
      assert.strictEqual(result1.skipped, 0);
      assert.strictEqual(setCalls.length, 1);
      assert.strictEqual(setCalls[0].data.title, 'الحلقة 10');
      assert.strictEqual(setCalls[0].data.externalId, 'feed-item-10');
      assert.strictEqual(setCalls[0].data.isPublished, true);
      assert.strictEqual(setCalls[0].data.utcOffsetMinutes, 180);

      // Run 2: Same feed -> Must detect existing externalId and skip (0 writes)
      const result2 = await ingestEpisodesFromFeed({
        firestore: mockFirestore,
        root: 'HudHudDev',
        programId: 'prog-podcast',
        stationId: 'st-sanaa',
        feedUrl: 'https://example.com/podcast.xml',
        fetchFn: mockFetch,
      });

      assert.strictEqual(result2.ingested, 0, 'Second run must ingest 0 items');
      assert.strictEqual(result2.skipped, 1, 'Second run must skip duplicate item');
      assert.strictEqual(setCalls.length, 1, 'Zero new writes on duplicate feed');
    });
  });
});
