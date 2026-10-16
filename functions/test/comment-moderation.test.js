import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  filterLocally,
  filterWithGemini,
  moderateCommentContent,
  handleCommentCreated,
} from '../lib/comment-moderation.js';

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
      let updatedPayload = null;

      const mockSnapshot = {
        exists: true,
        id: 'comm-123',
        data: () => ({
          content: 'شكراً للإذاعة',
          status: 'pending',
        }),
        ref: {
          update: async (payload) => {
            updatedPayload = payload;
          },
        },
      };

      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: '{"isAppropriate": true, "flagReason": null}' }] } },
          ],
        }),
      });

      const result = await handleCommentCreated({
        snapshot: mockSnapshot,
        root: 'HudHudDev',
        episodeId: 'ep-1',
        geminiApiKey: 'TEST_KEY',
        fetchFn: mockFetch,
      });

      assert.strictEqual(result.status, 'published');
      assert.strictEqual(updatedPayload.status, 'published');
      assert.strictEqual(updatedPayload.moderationReason, null);
    });
  });
});
