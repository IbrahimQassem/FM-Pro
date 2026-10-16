import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export const healthRoots = ['HudHudDev', 'HudHudOfficial'];

/**
 * Probes a live stream URL according to contract specifications:
 * - GET request with AbortController (timeout 8000ms).
 * - For HLS (.m3u8), verifies response contains #EXTM3U.
 * - For Icecast/Shoutcast, reads the first chunk (value.length > 0) and immediately cancels the stream reader.
 */
export async function probeStream(url, { timeoutMs = 8000, fetchFn = globalThis.fetch } = {}) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return { isHealthy: false, error: 'Invalid stream URL' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url.trim(), {
      method: 'GET',
      headers: {
        'User-Agent': 'HudHud-FM-StreamHealth/1.0',
        'Accept': '*/*',
        'Icy-MetaData': '1',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { isHealthy: false, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    const isHls = url.toLowerCase().includes('.m3u8') || contentType.includes('mpegurl');

    if (isHls) {
      const text = await response.text();
      const isHealthy = text.includes('#EXTM3U');
      return { isHealthy, error: isHealthy ? null : 'Missing #EXTM3U header' };
    }

    if (!response.body) {
      return { isHealthy: false, error: 'No response body stream' };
    }

    const reader = response.body.getReader();
    try {
      const { value, done } = await reader.read();
      const isHealthy = !done && Boolean(value && value.length > 0);
      return { isHealthy, error: isHealthy ? null : 'Stream produced empty chunk' };
    } finally {
      await reader.cancel().catch(() => {});
    }
  } catch (err) {
    const isTimeout = err?.name === 'AbortError' || err?.code === 20;
    return { isHealthy: false, error: isTimeout ? 'Timeout (8000ms)' : (err?.message || 'Network error') };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pure evaluation of the state machine according to content-automation-contract.md:
 * - Zero-Write on Stability: Returns null when healthy and already 'online' with 0 failures.
 * - Degraded mode for failures < 3 (isLive remains true).
 * - Offline mode for failures >= 3 (isLive becomes false, alert triggered on reaching threshold).
 */
export function evaluateHealthMutation(currentData, probeResult) {
  const isHealthy = Boolean(probeResult.isHealthy);
  const currentStatus = currentData?.healthStatus || (currentData?.isLive ? 'online' : 'offline');
  const currentFailures = Number(currentData?.consecutiveFailures) || 0;

  if (isHealthy) {
    // Zero-Write on Stability:
    if (currentStatus === 'online' && currentFailures === 0 && currentData?.isLive === true) {
      return null;
    }
    return {
      isLive: true,
      healthStatus: 'online',
      consecutiveFailures: 0,
      shouldAlert: false,
    };
  }

  const newFailures = currentFailures + 1;
  if (newFailures < 3) {
    return {
      isLive: currentData?.isLive ?? true,
      healthStatus: 'degraded',
      consecutiveFailures: newFailures,
      shouldAlert: false,
    };
  }

  const shouldAlert = currentFailures < 3;
  return {
    isLive: false,
    healthStatus: 'offline',
    consecutiveFailures: newFailures,
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
    const probeResult = await probeFn(streamUrl);
    const mutation = evaluateHealthMutation(data, probeResult);

    if (!mutation) {
      unchanged++;
      continue;
    }

    updated++;
    const updatePayload = {
      isLive: mutation.isLive,
      healthStatus: mutation.healthStatus,
      consecutiveFailures: mutation.consecutiveFailures,
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
        error: probeResult.error,
      });
    }
  }

  return { root, total: snapshot.size, probed, updated, unchanged, alerted };
}
