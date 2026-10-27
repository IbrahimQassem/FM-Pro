import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { isSafePublicUrl, withPublicResponse, readResponseBytes } from './public-fetch.js';
import { healthLimits, acquireHealthLease, commitHealthUnit, releaseHealthLease, streamIdentity } from './stream-health-progress.js';
export { healthLimits } from './stream-health-progress.js';
export { isSafePublicUrl } from './public-fetch.js';

export const healthRoots = ['HudHudDev', 'HudHudOfficial'];

/** Validate destinations and bound DNS, redirects and body consumption. */
export async function probeStream(url, { timeoutMs = healthLimits.probeTimeoutMs, fetchFn, lookupFn } = {}) {
  if (!isSafePublicUrl(url)) return { isHealthy: false, error: 'Invalid or unsafe stream URL' };
  try {
    return await withPublicResponse(url.trim(), { timeoutMs, fetchFn, lookupFn,
      headers: { 'User-Agent': 'HudHud-FM-StreamHealth/1.0', Accept: '*/*', 'Icy-MetaData': '1' },
    }, async (response, signal, finalUrl) => {
      if (!response.ok) return { isHealthy: false, error: `HTTP ${response.status}` };
      const type = (response.headers.get('content-type') || '').toLowerCase();
      if (type.includes('text/html') || type.includes('application/xhtml')) {
        return { isHealthy: false, error: 'Response is HTML, not audio stream' };
      }
      const hls = finalUrl.pathname.toLowerCase().endsWith('.m3u8') || type.includes('mpegurl');
      const bytes = await readResponseBytes(response, { maxBytes: hls ? 256 * 1024 : 64 * 1024,
        firstChunkOnly: !hls, signal });
      if (!bytes.length) return { isHealthy: false, error: 'Stream produced empty chunk' };
      const text = new TextDecoder().decode(bytes).toLowerCase();
      if (text.includes('<!doctype') || text.includes('<html')) return { isHealthy: false, error: 'Stream content is HTML' };
      if (hls && !text.includes('#extm3u')) return { isHealthy: false, error: 'Missing #EXTM3U header' };
      return { isHealthy: true, error: null };
    });
  } catch (error) {
    return { isHealthy: false, error: error?.name === 'AbortError' ? `Timeout (${timeoutMs}ms)` : 'Stream could not be checked safely' };
  }
}

/**
 * Pure evaluation of the state machine according to Section 7 & content-automation-contract:
 * - Checks primary and optional backup stream results.
 * - Degraded mode if primary fails but backup works, or consecutive failures < 3.
 * - Offline mode for consecutive failures >= 3 (alert triggered on crossing threshold).
 * - Freshness: Heartbeat emitted if stable online for >= 30 minutes.
 */
export function evaluateHealthMutation(currentData, primaryResult, backupResult = null, now = Date.now()) {
  const primaryHealthy = Boolean(primaryResult?.isHealthy);
  const backupHealthy = Boolean(backupResult?.isHealthy);
  const currentStatus = currentData?.healthStatus || (currentData?.isLive ? 'online' : 'offline');
  const currentFailures = Number(currentData?.consecutiveFailures) || 0;
  const currentSource = currentData?.streamHealthSource || 'primary';

  // Case 1: Primary source is healthy
  if (primaryHealthy) {
    const lastChecked =
      typeof currentData?.lastCheckedAt?.toMillis === 'function'
        ? currentData.lastCheckedAt.toMillis()
        : currentData?.lastCheckedAt
          ? new Date(currentData.lastCheckedAt).getTime()
          : 0;
    const isStale = lastChecked > 0 && now - lastChecked >= 30 * 60 * 1000;

    if (
      currentStatus === 'online' &&
      currentFailures === 0 &&
      currentData?.isLive === true &&
      currentSource === 'primary' &&
      !isStale
    ) {
      return null;
    }
    return {
      isLive: true,
      healthStatus: 'online',
      consecutiveFailures: 0,
      streamHealthSource: 'primary',
      shouldAlert: false,
    };
  }

  // Case 2: Primary is unhealthy, but Backup source is healthy (Section 7.3)
  if (backupHealthy) {
    const lastChecked =
      typeof currentData?.lastCheckedAt?.toMillis === 'function'
        ? currentData.lastCheckedAt.toMillis()
        : currentData?.lastCheckedAt
          ? new Date(currentData.lastCheckedAt).getTime()
          : 0;
    const isStale = lastChecked > 0 && now - lastChecked >= 30 * 60 * 1000;

    if (
      currentStatus === 'degraded' &&
      currentFailures === 0 &&
      currentData?.isLive === true &&
      currentSource === 'backup' &&
      !isStale
    ) {
      return null;
    }
    return {
      isLive: true,
      healthStatus: 'degraded',
      consecutiveFailures: 0,
      streamHealthSource: 'backup',
      shouldAlert: false,
    };
  }

  // Case 3: Both primary and backup (or primary without backup) failed
  const newFailures = currentFailures + 1;
  if (newFailures < 3) {
    return {
      isLive: currentData?.isLive ?? true,
      healthStatus: 'degraded',
      consecutiveFailures: newFailures,
      streamHealthSource: 'none',
      shouldAlert: false,
    };
  }

  const shouldAlert = currentFailures < 3;
  return {
    isLive: false,
    healthStatus: 'offline',
    consecutiveFailures: newFailures,
    streamHealthSource: 'none',
    shouldAlert,
  };
}

/**
 * Sends one-time alert to Telegram when a station drops to offline.
 */
export async function sendTelegramAlert({
  botToken,
  chatId,
  stationId,
  stationName,
  consecutiveFailures,
  error,
  fetchFn = globalThis.fetch,
  timeoutMs = healthLimits.alertTimeoutMs,
  signal,
}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > healthLimits.alertTimeoutMs) return false;
  if (!botToken || !chatId) {
    logger.info('Telegram alert skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured).');
    return false;
  }

  const text = `⚠️ *تنبيه انقطاع إذاعة في تطبيق الهدهد*\n` +
    `📻 *المحطة:* ${stationName || 'بدون اسم'}\n` +
    `🆔 *المعرف:* \`${stationId}\`\n` +
    `❌ *عدد الإخفاقات المتتالية:* ${consecutiveFailures}\n` +
    `🔍 *تفاصيل الخطأ:* ${error || 'غير محدد'}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await Promise.race([fetchFn(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    }), new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Health alert deadline.')), { once: true }))]);
    return res.ok;
  } catch {
    logger.warn('Health alert delivery did not complete safely.');
    return false;
  } finally { clearTimeout(timer); controller.abort(); }
}

/** Bounded, sequential station work with private transactional progress. */
export async function checkStationsStreamHealthForRoot({
  firestore, root, probeFn = probeStream, sendAlertFn = sendTelegramAlert,
  env = process.env, now = Date.now, invocationDeadline = Infinity,
}) {
  if (!healthRoots.includes(root)) throw new Error('Unknown health root.');
  const started = now(), deadline = Math.min(started + healthLimits.rootBudgetMs, invocationDeadline);
  const summary = { root, total: 0, scanned: 0, probed: 0, updated: 0, unchanged: 0, alerted: 0,
    skipped: 0, checkpointWrites: 0, busy: false, completeCycle: false, deferred: false };
  const remaining = () => { const time = now(); if (!Number.isSafeInteger(started) || !Number.isSafeInteger(time) || time < started) throw new Error('Health clock moved backwards.'); return deadline - time; };
  const bounded = async (work, maximumMs = Infinity) => {
    const allowance = Math.min(remaining(), maximumMs);
    const expired = () => { const error = new Error('Health root deadline expired.'); error.code = 'health-budget-exhausted'; return error; };
    if (allowance <= 0) throw expired();
    let timer;
    try { return await Promise.race([Promise.resolve().then(work), new Promise((_, reject) => { timer = setTimeout(() => reject(expired()), allowance); })]); }
    finally { clearTimeout(timer); }
  };
  if (remaining() < 2 * healthLimits.probeTimeoutMs + healthLimits.flushMarginMs) { summary.deferred = true; return summary; }
  const lease = await bounded(() => acquireHealthLease(firestore, root, { now, deadline }));
  if (!lease) { summary.busy = true; return summary; }
  summary.checkpointWrites++;
  const stations = firestore.collection(`${root}/stations/stations`);
  let complete = false, stopped = false;
  while (!stopped) {
    if (remaining() < 2 * healthLimits.probeTimeoutMs + healthLimits.flushMarginMs) break;
    let query = stations.orderBy(FieldPath.documentId()).limit(healthLimits.pageSize);
    if (lease.cursor !== null) query = query.startAfter(lease.cursor);
    const page = await bounded(() => query.get());
    for (const snapshot of page.docs) {
      const identity = streamIdentity(snapshot.data());
      const allowance = identity.active && !identity.deleting && identity.streamUrl
        ? 2 * healthLimits.probeTimeoutMs + healthLimits.flushMarginMs : healthLimits.flushMarginMs;
      if (remaining() < allowance) { stopped = true; break; }
      summary.scanned++; summary.total++;
      let primary = null, backup = null;
      if (identity.active && !identity.deleting && identity.streamUrl) {
        summary.probed++;
        primary = await bounded(() => probeFn(identity.streamUrl, { timeoutMs: healthLimits.probeTimeoutMs }));
        if (!primary.isHealthy && identity.backupStreamUrl)
          backup = await bounded(() => probeFn(identity.backupStreamUrl, { timeoutMs: healthLimits.probeTimeoutMs }));
      }
      const unit = await bounded(() => commitHealthUnit(firestore, root, lease, { id: snapshot.id, identity, now, deadline,
        evaluate: current => {
          const mutation = evaluateHealthMutation(current, primary, backup, now());
          if (!mutation) return null;
          const { shouldAlert, ...fields } = mutation;
          return { shouldAlert, payload: { ...fields, lastCheckedAt: FieldValue.serverTimestamp() } };
        } }));
      lease.cursor = unit.cursor; summary.checkpointWrites++;
      if (unit.skipped) summary.skipped++;
      else if (unit.mutation) summary.updated++;
      else summary.unchanged++;
      if (unit.mutation?.shouldAlert && remaining() > healthLimits.flushMarginMs - healthLimits.alertTimeoutMs) {
        summary.alerted++;
        const controller = new AbortController();
        const timeoutMs = Math.min(healthLimits.alertTimeoutMs, remaining() - (healthLimits.flushMarginMs - healthLimits.alertTimeoutMs));
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          await Promise.race([sendAlertFn({ botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID,
            stationId: snapshot.id, stationName: snapshot.data().name,
            consecutiveFailures: unit.mutation.payload.consecutiveFailures, error: primary?.error,
            timeoutMs, signal: controller.signal }), new Promise(resolve => controller.signal.addEventListener('abort', () => resolve(false), { once: true }))]);
        } catch { /* The committed threshold alert remains best effort, never replayed blindly. */ }
        finally { clearTimeout(timer); controller.abort(); }
      }
    }
    if (!stopped && page.size < healthLimits.pageSize) { complete = true; break; }
  }
  await bounded(() => releaseHealthLease(firestore, root, lease, { complete, now, deadline })); summary.checkpointWrites++;
  summary.completeCycle = complete; summary.deferred = !complete; return summary;
}

/** Give each root its own allocation while retaining invocation cleanup reserve. */
export async function checkAllStationHealth({ firestore, now = Date.now, runRoot = checkStationsStreamHealthForRoot, ...options }) {
  const deadline = now() + healthLimits.invocationMs - healthLimits.invocationReserveMs, results = [];
  for (const root of healthRoots) {
    try { results.push(await runRoot({ ...options, firestore, root, now, invocationDeadline: deadline })); }
    catch { results.push({ root, failed: true }); }
  }
  return results;
}
