import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export const healthRoots = ['HudHudDev', 'HudHudOfficial'];

/**
 * Validates that a URL is a valid public HTTP(S) endpoint.
 * Blocks private IP ranges, loopback, link-local / cloud metadata (169.254.169.254),
 * and local hostnames to prevent SSRF (IR-10).
 */
export function isSafePublicUrl(urlString) {
  if (typeof urlString !== 'string' || !urlString.trim()) return false;
  let parsed;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return false;
  }

  // IPv4 private & link-local checks
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (ipv4Match) {
    const [b0, b1] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (b0 === 127) return false; // Loopback 127.0.0.0/8
    if (b0 === 10) return false; // Private 10.0.0.0/8
    if (b0 === 169 && b1 === 254) return false; // Link-local / Cloud metadata 169.254.0.0/16
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return false; // Private 172.16.0.0/12
    if (b0 === 192 && b1 === 168) return false; // Private 192.168.0.0/16
    if (b0 === 0) return false; // 0.0.0.0/8
  }

  if (hostname.startsWith('[fc') || hostname.startsWith('[fd') || hostname.startsWith('[fe80')) {
    return false;
  }

  return true;
}

/**
 * Probes a live stream URL according to contract specifications:
 * - Rejects private/SSRF URLs without network calls (IR-10).
 * - GET request with AbortController (timeout 8000ms).
 * - Rejects HTML / text responses even if status is 200 (IR-09).
 * - For HLS (.m3u8), verifies response contains #EXTM3U and not HTML.
 * - For Icecast/Shoutcast, reads the first chunk and verifies it does not start with HTML tags.
 */
export async function probeStream(url, { timeoutMs = 8000, fetchFn = globalThis.fetch } = {}) {
  if (!isSafePublicUrl(url)) {
    return { isHealthy: false, error: 'Invalid or unsafe stream URL' };
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

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      return { isHealthy: false, error: 'Response is HTML, not audio stream' };
    }

    const isHls = url.toLowerCase().includes('.m3u8') || contentType.includes('mpegurl');

    if (isHls) {
      const text = await response.text();
      if (text.toLowerCase().includes('<!doctype') || text.toLowerCase().includes('<html')) {
        return { isHealthy: false, error: 'HLS manifest returned HTML' };
      }
      const isHealthy = text.includes('#EXTM3U');
      return { isHealthy, error: isHealthy ? null : 'Missing #EXTM3U header' };
    }

    if (!response.body) {
      return { isHealthy: false, error: 'No response body stream' };
    }

    const reader = response.body.getReader();
    try {
      const { value, done } = await reader.read();
      if (done || !value || value.length === 0) {
        return { isHealthy: false, error: 'Stream produced empty chunk' };
      }

      // Check if initial bytes look like HTML text
      const headString = new TextDecoder('utf-8', { fatal: false })
        .decode(value.slice(0, 50))
        .toLowerCase();
      if (headString.includes('<!doctype') || headString.includes('<html')) {
        return { isHealthy: false, error: 'Stream content is HTML' };
      }

      return { isHealthy: true, error: null };
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
