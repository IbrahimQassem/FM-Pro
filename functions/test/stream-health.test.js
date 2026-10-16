import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  probeStream,
  evaluateHealthMutation,
  sendTelegramAlert,
  checkStationsStreamHealthForRoot,
} from '../lib/stream-health.js';

describe('Live Stream Health Checker', () => {
  describe('probeStream', () => {
    it('rejects invalid or non-http URLs without network calls', async () => {
      const res1 = await probeStream('');
      assert.strictEqual(res1.isHealthy, false);

      const res2 = await probeStream('ftp://audio.example.com/stream');
      assert.strictEqual(res2.isHealthy, false);
    });

    it('validates HLS stream by checking #EXTM3U header', async () => {
      const mockFetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/vnd.apple.mpegurl' }),
        text: async () => '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10',
      });

      const res = await probeStream('https://radio.example.com/live.m3u8', { fetchFn: mockFetch });
      assert.strictEqual(res.isHealthy, true);
      assert.strictEqual(res.error, null);
    });

    it('fails HLS stream when #EXTM3U is missing', async () => {
      const mockFetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/vnd.apple.mpegurl' }),
        text: async () => 'Error: Stream not ready',
      });

      const res = await probeStream('https://radio.example.com/live.m3u8', { fetchFn: mockFetch });
      assert.strictEqual(res.isHealthy, false);
      assert.match(res.error, /Missing #EXTM3U/);
    });

    it('validates Icecast stream by reading first chunk and cancelling reader', async () => {
      let cancelled = false;
      const mockReader = {
        read: async () => ({ value: new Uint8Array([0x49, 0x44, 0x33, 0x03]), done: false }),
        cancel: async () => { cancelled = true; },
      };

      const mockFetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        body: { getReader: () => mockReader },
      });

      const res = await probeStream('https://radio.example.com/stream', { fetchFn: mockFetch });
      assert.strictEqual(res.isHealthy, true);
      assert.strictEqual(cancelled, true);
    });

    it('fails when HTTP response is not ok', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 503,
        headers: new Headers(),
      });

      const res = await probeStream('https://radio.example.com/stream', { fetchFn: mockFetch });
      assert.strictEqual(res.isHealthy, false);
      assert.strictEqual(res.error, 'HTTP 503');
    });
  });

  describe('evaluateHealthMutation (Zero-Write & State Machine)', () => {
    it('applies Zero-Write on Stability when healthy station is already online with 0 failures', () => {
      const current = {
        isLive: true,
        healthStatus: 'online',
        consecutiveFailures: 0,
      };
      const mutation = evaluateHealthMutation(current, { isHealthy: true });
      assert.strictEqual(mutation, null, 'Must return null (0 writes) when already stable online');
    });

    it('recovers from degraded or offline to online with 0 consecutive failures', () => {
      const degraded = {
        isLive: true,
        healthStatus: 'degraded',
        consecutiveFailures: 2,
      };
      const mutation = evaluateHealthMutation(degraded, { isHealthy: true });
      assert.deepStrictEqual(mutation, {
        isLive: true,
        healthStatus: 'online',
        consecutiveFailures: 0,
        shouldAlert: false,
      });
    });

    it('transitions to degraded with isLive true for failures < 3', () => {
      const online = {
        isLive: true,
        healthStatus: 'online',
        consecutiveFailures: 0,
      };
      const mutation1 = evaluateHealthMutation(online, { isHealthy: false });
      assert.deepStrictEqual(mutation1, {
        isLive: true,
        healthStatus: 'degraded',
        consecutiveFailures: 1,
        shouldAlert: false,
      });

      const mutation2 = evaluateHealthMutation(
        { isLive: true, healthStatus: 'degraded', consecutiveFailures: 1 },
        { isHealthy: false }
      );
      assert.deepStrictEqual(mutation2, {
        isLive: true,
        healthStatus: 'degraded',
        consecutiveFailures: 2,
        shouldAlert: false,
      });
    });

    it('transitions to offline and triggers alert when consecutiveFailures reaches 3', () => {
      const degradedTwo = {
        isLive: true,
        healthStatus: 'degraded',
        consecutiveFailures: 2,
      };
      const mutation = evaluateHealthMutation(degradedTwo, { isHealthy: false });
      assert.deepStrictEqual(mutation, {
        isLive: false,
        healthStatus: 'offline',
        consecutiveFailures: 3,
        shouldAlert: true,
      });
    });

    it('suppresses duplicate alerts on subsequent failures beyond threshold', () => {
      const alreadyOffline = {
        isLive: false,
        healthStatus: 'offline',
        consecutiveFailures: 3,
      };
      const mutation = evaluateHealthMutation(alreadyOffline, { isHealthy: false });
      assert.deepStrictEqual(mutation, {
        isLive: false,
        healthStatus: 'offline',
        consecutiveFailures: 4,
        shouldAlert: false,
      });
    });
  });

  describe('sendTelegramAlert', () => {
    it('skips silently if botToken or chatId is missing', async () => {
      const sent = await sendTelegramAlert({
        botToken: null,
        chatId: null,
        stationId: 'sanaa',
        stationName: 'إذاعة صنعاء',
        consecutiveFailures: 3,
        error: 'Timeout',
      });
      assert.strictEqual(sent, false);
    });

    it('sends markdown alert payload to Telegram Bot API', async () => {
      let requestedUrl = '';
      let requestBody = null;

      const mockFetch = async (url, opts) => {
        requestedUrl = url;
        requestBody = JSON.parse(opts.body);
        return { ok: true };
      };

      const sent = await sendTelegramAlert({
        botToken: 'TEST_TOKEN',
        chatId: '12345678',
        stationId: 'sanaa-fm',
        stationName: 'صنعاء إف إم',
        consecutiveFailures: 3,
        error: 'HTTP 502 Bad Gateway',
        fetchFn: mockFetch,
      });

      assert.strictEqual(sent, true);
      assert.strictEqual(requestedUrl, 'https://api.telegram.org/botTEST_TOKEN/sendMessage');
      assert.strictEqual(requestBody.chat_id, '12345678');
      assert.match(requestBody.text, /صنعاء إف إم/);
      assert.match(requestBody.text, /HTTP 502 Bad Gateway/);
    });
  });

  describe('checkStationsStreamHealthForRoot', () => {
    it('scans stations, preserves stable online (Zero-Write), and updates degraded/offline', async () => {
      const updates = [];
      const alerts = [];

      const stations = [
        // Station 1: Online stable -> ZERO-WRITE!
        {
          id: 'st-1',
          data: () => ({
            name: 'إذاعة 1',
            streamUrl: 'https://st1.example.com/live',
            isLive: true,
            healthStatus: 'online',
            consecutiveFailures: 0,
            isActive: true,
          }),
          ref: {
            update: async (payload) => updates.push({ id: 'st-1', payload }),
          },
        },
        // Station 2: Failing -> will become degraded (1st failure)
        {
          id: 'st-2',
          data: () => ({
            name: 'إذاعة 2',
            streamUrl: 'https://st2.example.com/live',
            isLive: true,
            healthStatus: 'online',
            consecutiveFailures: 0,
            isActive: true,
          }),
          ref: {
            update: async (payload) => updates.push({ id: 'st-2', payload }),
          },
        },
        // Station 3: Inactive -> skipped
        {
          id: 'st-3',
          data: () => ({
            name: 'إذاعة 3',
            streamUrl: 'https://st3.example.com/live',
            isActive: false,
          }),
          ref: {
            update: async (payload) => updates.push({ id: 'st-3', payload }),
          },
        },
      ];

      const mockFirestore = {
        collection: (root) => ({
          doc: (path) => ({
            collection: (sub) => ({
              get: async () => ({ docs: stations, size: stations.length }),
            }),
          }),
        }),
      };

      const mockProbe = async (url) => {
        if (url.includes('st1')) return { isHealthy: true };
        return { isHealthy: false, error: 'Connection refused' };
      };

      const mockSendAlert = async (params) => {
        alerts.push(params);
      };

      const summary = await checkStationsStreamHealthForRoot({
        firestore: mockFirestore,
        root: 'HudHudDev',
        probeFn: mockProbe,
        sendAlertFn: mockSendAlert,
      });

      assert.strictEqual(summary.probed, 2);
      assert.strictEqual(summary.unchanged, 1, 'Station 1 must have 0 writes (Zero-Write)');
      assert.strictEqual(summary.updated, 1, 'Station 2 must be updated to degraded');
      assert.strictEqual(updates.length, 1);
      assert.strictEqual(updates[0].id, 'st-2');
      assert.strictEqual(updates[0].payload.healthStatus, 'degraded');
      assert.strictEqual(updates[0].payload.consecutiveFailures, 1);
      assert.strictEqual(alerts.length, 0); // No alert on 1st failure
    });
  });
});
