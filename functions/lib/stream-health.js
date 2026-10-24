import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { isSafePublicUrl, withPublicResponse, readResponseBytes } from './public-fetch.js';
export { isSafePublicUrl } from './public-fetch.js';

export const healthRoots = ['HudHudDev', 'HudHudOfficial'];

/** Validate destinations and bound DNS, redirects and body consumption. */
export async function probeStream(url, { timeoutMs = 8000, fetchFn, lookupFn } = {}) {
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
export function evaluateHealthMutation(currentData, primaryResult, backupResult = null) {
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
    const isStale = lastChecked > 0 && Date.now() - lastChecked >= 30 * 60 * 1000;

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
    const isStale = lastChecked > 0 && Date.now() - lastChecked >= 30 * 60 * 1000;

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
}) {
  if (!botToken || !chatId) {
    logger.info('Telegram alert skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured).');
    return false;
  }

  const text = `⚠️ *تنبيه انقطاع إذاعة في تطبيق الهدهد*\n` +
    `📻 *المحطة:* ${stationName || 'بدون اسم'}\n` +
    `🆔 *المعرف:* \`${stationId}\`\n` +
    `❌ *عدد الإخفاقات المتتالية:* ${consecutiveFailures}\n` +
    `🔍 *تفاصيل الخطأ:* ${error || 'غير محدد'}`;

  try {
    const res = await fetchFn(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    return res.ok;
  } catch (err) {
    logger.warn(`Failed to send Telegram alert for station ${stationId}: ${err?.message}`);
    return false;
  }
}

/**
 * Scans stations in the given root collection and checks stream health.
 */
export async function checkStationsStreamHealthForRoot({
  firestore,
  root,
  probeFn = probeStream,
  sendAlertFn = sendTelegramAlert,
  env = process.env,
}) {
  if (!healthRoots.includes(root)) {
    throw new Error(`Unknown root environment: ${root}`);
  }

  const stationsRef = firestore.collection(root).doc('stations').collection('stations');
  const snapshot = await stationsRef.get();

  let probed = 0;
  let updated = 0;
  let unchanged = 0;
  let alerted = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const streamUrl = data.streamUrl?.trim() || '';

    // Terrestrial only or explicitly inactive stations are skipped
    if (!streamUrl || data.isActive === false) {
      continue;
    }

    probed++;
    const primaryResult = await probeFn(streamUrl);
    let backupResult = null;
    const backupUrl = data.backupStreamUrl?.trim() || '';

    // Probe backup source if primary failed and backup URL is present (Section 7.3)
    if (!primaryResult.isHealthy && backupUrl) {
      backupResult = await probeFn(backupUrl);
    }

    const mutation = evaluateHealthMutation(data, primaryResult, backupResult);

    if (!mutation) {
      unchanged++;
      continue;
    }

    updated++;
    const updatePayload = {
      isLive: mutation.isLive,
      healthStatus: mutation.healthStatus,
      consecutiveFailures: mutation.consecutiveFailures,
      streamHealthSource: mutation.streamHealthSource,
      lastCheckedAt: FieldValue.serverTimestamp(),
    };

    await doc.ref.update(updatePayload);

    if (mutation.shouldAlert) {
      alerted++;
      await sendAlertFn({
        botToken: env.TELEGRAM_BOT_TOKEN,
        chatId: env.TELEGRAM_CHAT_ID,
        stationId: doc.id,
        stationName: data.name,
        consecutiveFailures: mutation.consecutiveFailures,
        error: primaryResult.error,
      });
    }
  }

  return { root, total: snapshot.size, probed, updated, unchanged, alerted };
}
