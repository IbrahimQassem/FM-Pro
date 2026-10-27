import { logger } from 'firebase-functions';
import { MemoryFirestore, FieldValue } from './support/comment-count-fixture.js';
import { prepareNewEpisodeCountBaseline } from '../lib/comment-counts.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  filterLocally,
  filterWithGemini,
  moderateCommentContent,
  handleCommentCreated,
} from '../lib/comment-moderation.js';

async function moderationFixture(root = 'HudHudDev', status = 'pending') {
  const db = new MemoryFirestore();
  db.seed(`${root}/commentCountContributions`, { version: 1, writerProtocol: 1, state: 'active', generation: 4,
    owner: 'unit-owner', planHash: 'a'.repeat(64), leaseUntil: 0, activeFrom: FieldValue.serverTimestamp(), baselineManifestHash: 'b'.repeat(64) });
  await db.runTransaction(async tx => {
    const prepared = await prepareNewEpisodeCountBaseline(tx, db, { root, episodeId: 'ep-1', serverTimestamp: () => FieldValue.serverTimestamp() });
    tx.create(db.doc(`${root}/episodes/episodes/ep-1`), { stats: { commentsCount: 0 } });
    for (const write of prepared.writes) write();
  });
  const comment = `${root}/episodes/episodes/ep-1/comments/comment`;
  db.seed(comment, { content: 'A useful synthetic comment', status });
  return { db, comment, snapshot: db.snapshot(comment), root, episodeId: 'ep-1' };
}

describe('UGC Comment Moderation Pipeline', () => {
  describe('filterLocally (Stage 1 - Free Local Regex)', () => {
    it('approves clean Arabic feedback', () => {
      const res = filterLocally('برنامج رائع جداً ومفيد، تحياتي لإذاعة صنعاء والقائمين عليها!');
      assert.strictEqual(res.isClean, true);
    });

    it('rejects external URLs (http, https, www)', () => {
      const res1 = filterLocally('زوروا موقعنا https://scam-site.com لمشاهدة المزيد');
      assert.strictEqual(res1.isClean, false);
      assert.strictEqual(res1.reason, 'local_blocklist_link');

      const res2 = filterLocally('رابط التحميل www.free-stuff.org');
      assert.strictEqual(res2.isClean, false);
      assert.strictEqual(res2.reason, 'local_blocklist_link');
    });

    it('rejects messaging invitation links (Telegram, WhatsApp)', () => {
      const res = filterLocally('انضم لقناتنا t.me/free_crypto_yemen للحصول على جوائز');
      assert.strictEqual(res.isClean, false);
      assert.strictEqual(res.reason, 'local_blocklist_link');
    });

    it('rejects spam phone numbers', () => {
      const res = filterLocally('للتواصل والاستفسار عبر واتساب: +967 771 234 567');
      assert.strictEqual(res.isClean, false);
      assert.strictEqual(res.reason, 'local_blocklist_phone');
    });

    it('rejects severe vulgarities and insults', () => {
      const res = filterLocally('يا كلب ما تفهم شي');
      assert.strictEqual(res.isClean, false);
      assert.strictEqual(res.reason, 'local_blocklist_profanity');
    });
  });

  describe('filterWithGemini (Stage 2 - Gemini 2.5 Flash)', () => {
    it('returns isAppropriate: true when API key is missing (graceful fallback)', async () => {
      const res = await filterWithGemini('تعليق تجريبي', { apiKey: null });
      assert.strictEqual(res.isAppropriate, true);
      assert.strictEqual(res.flagReason, null);
    });

    it('parses structured JSON response from Gemini API', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: '{"isAppropriate": false, "flagReason": "sectarian_incitement"}' },
                ],
              },
            },
          ],
        }),
      });

      const res = await filterWithGemini('محتوى تحريضي مشبوه', {
        apiKey: 'TEST_KEY',
        fetchFn: mockFetch,
      });

      assert.strictEqual(res.isAppropriate, false);
      assert.strictEqual(res.flagReason, 'sectarian_incitement');
    });
  });

  describe('moderateCommentContent (Combined Pipeline)', () => {
    it('stops at Stage 1 for vulgar content without invoking Gemini (Zero API Cost)', async () => {
      let geminiCalled = false;
      const mockFetch = async () => {
        geminiCalled = true;
        return { ok: true };
      };

      const result = await moderateCommentContent('يا حمار أنت والبرنامج', {
        apiKey: 'TEST_KEY',
        fetchFn: mockFetch,
      });

      assert.strictEqual(result.status, 'rejected');
      assert.strictEqual(result.moderationReason, 'local_blocklist_profanity');
      assert.strictEqual(geminiCalled, false, 'Must not call Gemini API when local regex fails');
    });

    it('invokes Gemini for passed text and flags if inappropriate', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: '{"isAppropriate": false, "flagReason": "subtle_hate_speech"}' },
                ],
              },
            },
          ],
        }),
      });

      const result = await moderateCommentContent('كلام مناطقي خفي', {
        apiKey: 'TEST_KEY',
        fetchFn: mockFetch,
      });

      assert.strictEqual(result.status, 'flagged');
      assert.strictEqual(result.moderationReason, 'subtle_hate_speech');
    });

    it('approves clean content and returns status: published', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: '{"isAppropriate": true, "flagReason": null}' },
                ],
              },
            },
          ],
        }),
      });

      const result = await moderateCommentContent('أفضل حلقة سمعتها هذا الأسبوع، شكراً جزيلاً', {
        apiKey: 'TEST_KEY',
        fetchFn: mockFetch,
      });

      assert.strictEqual(result.status, 'published');
      assert.strictEqual(result.moderationReason, null);
    });
  });

  describe('handleCommentCreated', () => {
    it('updates Firestore document status on creation', async () => {
      const f = await moderationFixture();
      const result = await handleCommentCreated({ ...f, moderateFn: async () => ({ status: 'published', moderationReason: null }) });
      assert.strictEqual(result.status, 'published');
      assert.strictEqual(f.db.snapshot(f.comment).get('status'), 'published');
      assert.strictEqual(f.db.snapshot(f.comment).get('moderationReason'), null);
    });
    it('skips already hidden or removed comments (IR-06)', async () => {
      for (const status of ['hidden', 'removed']) {
        const f = await moderationFixture('HudHudDev', status), before = f.db.snapshot(f.comment).updateTime;
        const result = await handleCommentCreated({ ...f, moderateFn: async () => assert.fail('Terminal decision reached classifier') });
        assert.strictEqual(result, null); assert.equal(f.db.snapshot(f.comment).updateTime.isEqual(before), true);
        assert.equal(f.db.snapshot(`${f.root}/episodes/episodes/ep-1`).get('stats.commentsCount'), 0);
      }
    });
    it('preserves concurrent manual moderation in transaction (IR-06)', async () => {
      const f = await moderationFixture();
      const result = await handleCommentCreated({ ...f, moderateFn: async () => {
        await f.db.doc(f.comment).update({ status: 'hidden' }); return { status: 'published', moderationReason: null };
      } });
      assert.strictEqual(result, null); assert.strictEqual(f.db.snapshot(f.comment).get('status'), 'hidden');
      assert.strictEqual(f.db.snapshot(`${f.root}/episodes/episodes/ep-1`).get('stats.commentsCount'), 0);
    });
  });
});

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  it(`R12 RED: ${root} a real published comment moderation leaves exactlyone counted contribution`, async () => {
    const f = await moderationFixture(root, 'published');
    await handleCommentCreated(f);
    assert.strictEqual(f.db.snapshot(f.comment).get('status'), 'published');
    assert.strictEqual(f.db.snapshot(`${root}/episodes/episodes/ep-1`).get('stats.commentsCount'), 1,
      'A successful new published-comment worker must not leave the canonical count atzero.');
    await handleCommentCreated(f);
    assert.strictEqual(f.db.snapshot(`${root}/episodes/episodes/ep-1`).get('stats.commentsCount'), 1);
  });
}

it('moderation provider failures never log synthetic credentials or user text', async t => {
  const warnings = []; t.mock.method(logger, 'warn', (...args) => warnings.push(args));
  const secret = 'SYNTHETIC_PRIVATE_CONTENT https://provider.example/?key=SYNTHETIC_SECRET';
  const result = await filterWithGemini('Synthetic ordinary comment', { apiKey: 'SYNTHETIC_KEY', fetchFn: async () => { throw new Error(secret); } });
  assert.strictEqual(result.isAppropriate, true);
  assert.strictEqual(JSON.stringify(warnings).includes('SYNTHETIC_'), false, 'Credential/user-content sentinels must never reach logs.');
});
