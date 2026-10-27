import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  probeStream,
  evaluateHealthMutation,
  sendTelegramAlert,
  checkStationsStreamHealthForRoot,
  checkAllStationHealth,
  healthLimits,
} from '../lib/stream-health.js';

const lookupFn = async () => [{ address: '93.184.216.34', family: 4 }];

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
        body: new Response('#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10').body,
      });

      const res = await probeStream('https://radio.example.com/live.m3u8', { lookupFn, fetchFn: mockFetch });
      assert.strictEqual(res.isHealthy, true);
      assert.strictEqual(res.error, null);
    });

    it('fails HLS stream when #EXTM3U is missing', async () => {
      const mockFetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/vnd.apple.mpegurl' }),
        body: new Response('Error: Stream not ready').body,
      });

      const res = await probeStream('https://radio.example.com/live.m3u8', { lookupFn, fetchFn: mockFetch });
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

      const res = await probeStream('https://radio.example.com/stream', { lookupFn, fetchFn: mockFetch });
      assert.strictEqual(res.isHealthy, true);
      assert.strictEqual(cancelled, true);
    });

    it('fails when HTTP response is not ok', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 503,
        headers: new Headers(),
      });

      const res = await probeStream('https://radio.example.com/stream', { lookupFn, fetchFn: mockFetch });
      assert.strictEqual(res.isHealthy, false);
      assert.strictEqual(res.error, 'HTTP 503');
    });

    it('rejects loopback and private IP URLs to prevent SSRF (IR-10)', async () => {
      let fetchCalled = false;
      const mockFetch = async () => {
        fetchCalled = true;
        return { ok: true };
      };

      for (const unsafeUrl of [
        'http://127.0.0.1:8000/stream',
        'http://localhost/stream',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.1/radio',
        'http://192.168.1.1/live',
      ]) {
        const res = await probeStream(unsafeUrl, { lookupFn, fetchFn: mockFetch });
        assert.strictEqual(res.isHealthy, false);
        assert.match(res.error, /Invalid or unsafe stream URL/);
      }
      assert.strictEqual(fetchCalled, false, 'Must never initiate network request to private/loopback IP');
    });

    it('rejects HTML 200 responses for both audio streams and HLS (IR-09)', async () => {
      // Audio stream with text/html content-type
      const htmlFetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: async () => '<!DOCTYPE html><html><body>Error</body></html>',
      });
      const res1 = await probeStream('https://radio.example.com/stream', { lookupFn, fetchFn: htmlFetch });
      assert.strictEqual(res1.isHealthy, false);
      assert.match(res1.error, /HTML/);

      // Icecast stream returning HTML bytes in body
      const htmlChunk = new TextEncoder().encode('<!DOCTYPE html><html>Maintenance</html>');
      const mockReader = {
        read: async () => ({ value: htmlChunk, done: false }),
        cancel: async () => {},
      };
      const chunkFetch = async () => ({
        ok: true,
        headers: new Headers({ 'content-type': 'audio/mpeg' }),
        body: { getReader: () => mockReader },
      });
      const res2 = await probeStream('https://radio.example.com/stream', { lookupFn, fetchFn: chunkFetch });
      assert.strictEqual(res2.isHealthy, false);
      assert.match(res2.error, /HTML/);
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
        streamHealthSource: 'primary',
        shouldAlert: false,
      });
    });

    it('switches to backup stream source when primary fails and backup is healthy (Section 7.3)', () => {
      const online = {
        isLive: true,
        healthStatus: 'online',
        consecutiveFailures: 0,
        streamHealthSource: 'primary',
      };
      const mutation = evaluateHealthMutation(
        online,
        { isHealthy: false, error: 'Primary stream down' },
        { isHealthy: true, error: null }
      );
      assert.deepStrictEqual(mutation, {
        isLive: true,
        healthStatus: 'degraded',
        consecutiveFailures: 0,
        streamHealthSource: 'backup',
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
        streamHealthSource: 'none',
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
        streamHealthSource: 'none',
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
        streamHealthSource: 'none',
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
        streamHealthSource: 'none',
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
      const f = healthFixture('HudHudDev', 3, { backup: false }), alerts = [];
      f.records.get(f.path('s-0002')).isActive = false;
      const summary = await checkStationsStreamHealthForRoot({ firestore: f.db, root: 'HudHudDev', now: () => f.clock.value,
        probeFn: async url => ({ isHealthy: url.endsWith('/0'), error: 'Synthetic failure' }), sendAlertFn: async value => alerts.push(value) });
      const updates = f.writes.filter(write => write.path.includes('/stations/stations/'));
      assert.strictEqual(summary.probed, 2);
      assert.strictEqual(summary.unchanged, 1, 'Stable online station has zero station writes.');
      assert.strictEqual(summary.updated, 1); assert.strictEqual(updates.length, 1);
      assert.strictEqual(updates[0].path, f.path('s-0001'));
      assert.strictEqual(updates[0].data.healthStatus, 'degraded');
      assert.strictEqual(updates[0].data.consecutiveFailures, 1); assert.strictEqual(alerts.length, 0);
    });
  });
});

// R11 fixtures use only synthetic URLs/callbacks; no external fetch or messaging.
function healthFixture(root, count, { backup = true, clock = { value: 1800000000000 } } = {}) {
  const records = new Map(), writes = [], reads = []; let tail = Promise.resolve();
  const path = id => `${root}/stations/stations/${id}`;
  for (let index = 0; index < count; index++) records.set(path(`s-${String(index).padStart(4, '0')}`), {
    streamUrl: `https://radio.example/${index}`, ...(backup ? { backupStreamUrl: `https://backup.example/${index}` } : {}),
    isActive: true, isLive: true, healthStatus: 'online', consecutiveFailures: 0,
    lastCheckedAt: new Date(clock.value).toISOString(),
  });
  const reference = target => ({ path: target, id: target.split('/').at(-1),
    collection: name => query(`${target}/${name}`), get: async () => snapshot(target),
    update: async data => { if (!records.has(target)) throw new Error('Synthetic missing station'); records.set(target, { ...records.get(target), ...data }); writes.push({ path: target, data }); },
  });
  const snapshot = target => ({ ref: reference(target), id: target.split('/').at(-1), exists: records.has(target),
    data: () => records.has(target) ? { ...records.get(target) } : undefined,
    get: key => records.get(target)?.[key],
  });
  const query = (target, cursor = null, bound = Infinity) => ({
    _query: true, doc: id => reference(`${target}/${id}`), orderBy: () => query(target, cursor, bound),
    startAfter: value => query(target, value, bound), limit: value => query(target, cursor, value),
    get: async () => {
      reads.push({ path: target, bound, cursor });
      const docs = [...records.keys()].filter(key => key.startsWith(`${target}/`) && key.split('/').length === target.split('/').length + 1)
        .sort().filter(key => cursor === null || key.split('/').at(-1) > cursor).slice(0, bound).map(snapshot);
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  });
  const db = { collection: target => query(target), doc: reference,
    runTransaction(operation) {
      const run = tail.then(async () => {
        const staged = [];
        const result = await operation({ get: async target => { assert.equal(staged.length, 0, 'Reads precede writes'); return target._query ? target.get() : snapshot(target.path); },
          set: (ref, data) => staged.push({ path: ref.path, data, set: true }), update: (ref, data) => staged.push({ path: ref.path, data }) });
        for (const write of staged) {
          if (!write.set) assert.equal(records.has(write.path), true, 'No resurrection');
          records.set(write.path, write.set ? { ...write.data } : { ...records.get(write.path), ...write.data }); writes.push(write);
        }
        return result;
      }); tail = run.catch(() => {}); return run;
    } };
  return { db, records, writes, reads, path, clock };
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  it(`R11 RED: ${root} nineteen dual timeout stations cannot consume the second root budget`, async () => {
    const clock = { value: 1800000000000 }, first = healthFixture(root, 19, { clock });
    const started = clock.value;
    const probeFn = async () => { clock.value += 8000; return { isHealthy: false, error: 'Synthetic timeout' }; };
    await checkStationsStreamHealthForRoot({ firestore: first.db, root, now: () => clock.value, probeFn, sendAlertFn: async () => false });
    assert.ok(clock.value - started <= 100000, 'The first root must stop within its100s allocation;304s starves the next root.');
  });
  it(`R11 RED: ${root} station inventory reads are document-ID bounded to50`, async () => {
    const f = healthFixture(root, 105, { backup: false });
    await checkStationsStreamHealthForRoot({ firestore: f.db, root, now: () => f.clock.value,
      probeFn: async () => ({ isHealthy: true }), sendAlertFn: async () => false });
    assert.ok(f.reads.length > 0);
    assert.ok(f.reads.every(read => read.bound <= 50), 'No whole-collection read is permitted.');
  });
}

it('R11 fair scheduler reaches both roots despite nineteen dual timeouts in each', async () => {
  const clock = { value: 1800000000000 }, starts = [], fixtures = new Map(['HudHudDev', 'HudHudOfficial'].map(root => [root, healthFixture(root, 19, { clock })]));
  const initial = clock.value;
  const results = await checkAllStationHealth({ firestore: {}, now: () => clock.value,
    runRoot: options => { starts.push(clock.value - initial); return checkStationsStreamHealthForRoot({ ...options,
      firestore: fixtures.get(options.root).db, probeFn: async () => { clock.value += 8000; return { isHealthy: false }; }, sendAlertFn: async () => false }); } });
  assert.deepEqual(starts, [0, 80000]); assert.equal(results.length, 2);
  assert.equal(results.every(result => result.probed === 5 && result.deferred), true);
  assert.ok(healthLimits.invocationMs - (clock.value - initial) >= healthLimits.invocationReserveMs);
});
it('R11 cursor fairness visits105 stations across finite invocations and wraps only on next invocation', async () => {
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    const f = healthFixture(root, 105, { backup: false }), seen = [];
    const invoke = () => checkStationsStreamHealthForRoot({ firestore: f.db, root, now: () => f.clock.value,
      probeFn: async url => { seen.push(url); f.clock.value += 8000; return { isHealthy: true }; }, sendAlertFn: async () => false });
    let runs = 0, summary;
    do { summary = await invoke(); assert.ok(++runs <= 12); } while (!summary.completeCycle);
    assert.equal(new Set(seen).size, 105); assert.equal(seen.length, 105); assert.equal(runs, 11);
    assert.equal(f.records.get(`${root}/streamHealthJobs/checkpoints/active`).cursor, null);
    assert.equal(f.records.get(`${root}/streamHealthJobs/checkpoints/active`).cycle, 1);
    await invoke(); assert.equal(seen[105], 'https://radio.example/0');
    assert.equal(f.reads.every(read => read.bound <= 50), true);
  }
});
it('R11 a busy first-root lease does not consume or suppress the second allocation', async () => {
  const clock = { value: 1800000000000 }, fixtures = new Map(['HudHudDev', 'HudHudOfficial'].map(root => [root, healthFixture(root, 1, { clock })]));
  fixtures.get('HudHudDev').records.set('HudHudDev/streamHealthJobs/checkpoints/active', { version: 1, generation: 1,
    cycle: 0, cursor: null, owner: 'other-worker', leaseUntil: clock.value + 120000 });
  const results = await checkAllStationHealth({ firestore: {}, now: () => clock.value,
    runRoot: options => checkStationsStreamHealthForRoot({ ...options, firestore: fixtures.get(options.root).db,
      probeFn: async () => ({ isHealthy: true }), sendAlertFn: async () => false }) });
  assert.equal(results[0].busy, true); assert.equal(results[1].probed, 1);
});
it('R11 deleted cursor station does not block value-cursor continuation', async () => {
  const root = 'HudHudDev', f = healthFixture(root, 3, { backup: false }), seen = [];
  f.records.set(`${root}/streamHealthJobs/checkpoints/active`, { version: 1, generation: 5, cycle: 0, cursor: 's-0001', owner: 'expired', leaseUntil: 0 });
  f.records.delete(f.path('s-0001'));
  await checkStationsStreamHealthForRoot({ firestore: f.db, root, now: () => f.clock.value,
    probeFn: async url => { seen.push(url); return { isHealthy: true }; }, sendAlertFn: async () => false });
  assert.deepEqual(seen, ['https://radio.example/2']); assert.equal(f.records.has(f.path('s-0001')), false);
});
for (const drift of ['delete', 'primary', 'backup', 'inactive', 'deleting']) it(`R11 ${drift} drift after probe cannot receive stale health writes`, async () => {
  const root = 'HudHudOfficial', f = healthFixture(root, 2), alerts = [];
  const result = await checkStationsStreamHealthForRoot({ firestore: f.db, root, now: () => f.clock.value,
    probeFn: async url => {
      if (url === 'https://radio.example/0') {
        if (drift === 'delete') f.records.delete(f.path('s-0000'));
        else Object.assign(f.records.get(f.path('s-0000')), drift === 'primary' ? { streamUrl: 'https://edited.example/' } :
          drift === 'backup' ? { backupStreamUrl: 'https://edited.example/' } : drift === 'inactive' ? { isActive: false } : { adminDeletionToken: 'deleting' });
      }
      return { isHealthy: false };
    }, sendAlertFn: async value => alerts.push(value) });
  assert.equal(result.skipped, 1); assert.equal(result.updated, 1);
  assert.equal(f.writes.filter(write => write.path === f.path('s-0000')).length, 0);
  assert.equal(result.completeCycle, true); assert.equal(alerts.length, 0);
});
it('R11 overlapping workers accept one lease and never duplicate a threshold alert', async () => {
  const root = 'HudHudDev', f = healthFixture(root, 1, { backup: false }); f.records.get(f.path('s-0000')).consecutiveFailures = 2;
  let release, entered; const blocked = new Promise(resolve => { release = resolve; }), firstProbe = new Promise(resolve => { entered = resolve; });
  let probes = 0, alerts = 0;
  const options = { firestore: f.db, root, now: () => f.clock.value,
    probeFn: async () => { probes++; entered(); await blocked; return { isHealthy: false }; }, sendAlertFn: async () => { alerts++; return true; } };
  const first = checkStationsStreamHealthForRoot(options); await firstProbe;
  const second = await checkStationsStreamHealthForRoot(options); assert.equal(second.busy, true); release(); await first;
  assert.equal(probes, 1); assert.equal(alerts, 1);
});
it('R11 stale lease generation after a probe cannot write station or advance cursor', async () => {
  const root = 'HudHudDev', f = healthFixture(root, 1, { backup: false }), progress = `${root}/streamHealthJobs/checkpoints/active`;
  await assert.rejects(checkStationsStreamHealthForRoot({ firestore: f.db, root, now: () => f.clock.value,
    probeFn: async () => { const lease = f.records.get(progress); f.records.set(progress, { ...lease, owner: 'replacement', generation: lease.generation + 1 }); return { isHealthy: false }; },
    sendAlertFn: async () => { throw new Error('No alert may run'); } }), { code: 'health-progress-conflict' });
  assert.equal(f.writes.filter(write => write.path.includes('/stations/')).length, 0);
  assert.equal(f.records.get(progress).cursor, null);
});
it('R11 failed unit commit never skips its prefetched station on recovery', async () => {
  const root = 'HudHudDev', f = healthFixture(root, 3, { backup: false }), original = f.db.runTransaction; let commits = 0;
  f.db.runTransaction = operation => { if (++commits === 3) throw new Error('Synthetic commit outage'); return original(operation); };
  await assert.rejects(checkStationsStreamHealthForRoot({ firestore: f.db, root, now: () => f.clock.value,
    probeFn: async () => ({ isHealthy: true }), sendAlertFn: async () => false }), /Synthetic commit outage/);
  const progress = f.records.get(`${root}/streamHealthJobs/checkpoints/active`); assert.equal(progress.cursor, 's-0000');
  f.db.runTransaction = original; f.clock.value += 120001; const seen = [];
  await checkStationsStreamHealthForRoot({ firestore: f.db, root, now: () => f.clock.value,
    probeFn: async url => { seen.push(url); return { isHealthy: true }; }, sendAlertFn: async () => false });
  assert.deepEqual(seen, ['https://radio.example/1', 'https://radio.example/2']);
});
it('R11 scheduler continues after a first-root failure and keeps explicit reserve', async () => {
  const roots = [];
  const results = await checkAllStationHealth({ firestore: {}, now: () => 1800000000000,
    runRoot: async ({ root, invocationDeadline }) => { roots.push(root); assert.equal(invocationDeadline, 1800000260000); if (root === 'HudHudDev') throw new Error('Synthetic outage'); return { root }; } });
  assert.deepEqual(roots, ['HudHudDev', 'HudHudOfficial']); assert.equal(results[0].failed, true); assert.equal(results[1].root, 'HudHudOfficial');
});
it('R11 direct Telegram transport aborts hanging callbacks without exposing errors or sending real messages', async () => {
  let signal;
  const result = await sendTelegramAlert({ botToken: 'SYNTHETIC', chatId: 'SYNTHETIC', stationId: 's', timeoutMs: 20,
    fetchFn: async (_, options) => { signal = options.signal; return new Promise(() => {}); } });
  assert.equal(result, false); assert.equal(signal.aborted, true);
});
it('R11 an8-second probe result is accepted without racing a duplicate transport timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = healthFixture('HudHudDev', 1, { backup: false }); let started;
  const entered = new Promise(resolve => { started = resolve; });
  const task = checkStationsStreamHealthForRoot({ firestore: f.db, root: 'HudHudDev', now: () => f.clock.value,
    probeFn: () => new Promise(resolve => { setTimeout(() => resolve({ isHealthy: false }), 8000); started(); }),
    sendAlertFn: async () => false }).then(value => ({ value }), error => ({ error }));
  await entered; f.clock.value += 8000; t.mock.timers.tick(8000);
  const result = await task;
  assert.equal(result.error, undefined, 'A compliant eight-second transport result must complete its unit.');
  assert.equal(result.value.updated, 1); assert.equal(result.value.completeCycle, true);
});
it('R11 a stalled metadata read cannot starve the second root or advance uncommitted progress', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const clock = { value: 1800000000000 }, first = healthFixture('HudHudDev', 1, { clock }), second = healthFixture('HudHudOfficial', 1, { clock });
  let entered; const started = new Promise(resolve => { entered = resolve; });
  first.db.collection = () => ({ orderBy: () => ({ limit: () => ({ get: async () => { entered(); return new Promise(() => {}); } }) }) });
  const task = checkAllStationHealth({ firestore: {}, now: () => clock.value,
    runRoot: options => checkStationsStreamHealthForRoot({ ...options, firestore: options.root === 'HudHudDev' ? first.db : second.db,
      probeFn: async () => ({ isHealthy: true }), sendAlertFn: async () => false }) });
  await started; clock.value += 100001; t.mock.timers.tick(100001);
  const result = await task; assert.equal(result[0].failed, true); assert.equal(result[1].probed, 1);
  assert.equal(first.records.get('HudHudDev/streamHealthJobs/checkpoints/active').cursor, null);
  assert.equal(first.writes.length, 1);
});
it('R11 stable station writes remainzero while bounded operational checkpoint writes are explicit', async () => {
  const f = healthFixture('HudHudDev', 105, { backup: false });
  const result = await checkStationsStreamHealthForRoot({ firestore: f.db, root: 'HudHudDev', now: () => f.clock.value,
    probeFn: async () => ({ isHealthy: true }), sendAlertFn: async () => false });
  assert.equal(result.scanned, 105); assert.equal(result.updated, 0); assert.equal(result.unchanged, 105);
  assert.equal(result.checkpointWrites, result.scanned + 2);
  assert.equal(f.writes.filter(write => write.path.includes('/stations/')).length, 0);
  assert.equal(f.writes.length, result.checkpointWrites);
});
it('R11 injected evaluation clock retains the documented30minute heartbeat boundary', () => {
  const data = { isLive: true, healthStatus: 'online', consecutiveFailures: 0, streamHealthSource: 'primary', lastCheckedAt: new Date(1000) };
  assert.equal(evaluateHealthMutation(data, { isHealthy: true }, null, 1800999), null);
  assert.equal(evaluateHealthMutation(data, { isHealthy: true }, null, 1801000).healthStatus, 'online');
});
