import { createHash, randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export const ingestionRoots = ['HudHudDev', 'HudHudOfficial'];

/**
 * Strips CDATA and basic HTML tags from XML text node.
 */
function cleanXmlText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Parses duration string (e.g. "01:23:45", "23:45", or "1450") to seconds.
 */
export function parseDurationToSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const cleaned = durationStr.trim();
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }
  const parts = cleaned.split(':').map(p => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Pure JavaScript XML parser for RSS 2.0 / iTunes podcast feeds.
 */
export function parseRssFeed(xmlString) {
  if (typeof xmlString !== 'string' || xmlString.trim().length === 0) {
    return [];
  }

  const items = [];
  const itemRegex = /<item\b[^>]*>(.*?)<\/item>/gis;
  let match;

  while ((match = itemRegex.exec(xmlString)) !== null) {
    const itemBlock = match[1];

    // Title
    const titleMatch = /<title\b[^>]*>(.*?)<\/title>/is.exec(itemBlock);
    const title = cleanXmlText(titleMatch ? titleMatch[1] : 'حلقة جديدة');

    // Description
    const descMatch = /<(?:description|itunes:summary)\b[^>]*>(.*?)<\/(?:description|itunes:summary)>/is.exec(itemBlock);
    const description = cleanXmlText(descMatch ? descMatch[1] : '');

    // Enclosure (audio URL)
    const enclosureMatch = /<enclosure\b([^>]*)\/?>/is.exec(itemBlock);
    let audioUrl = '';
    if (enclosureMatch) {
      const urlMatch = /url=["'](https:\/\/[^"']+)["']/i.exec(enclosureMatch[1]);
      if (urlMatch) {
        audioUrl = urlMatch[1].trim();
      }
    }

    // Audio must be HTTPS per contract
    if (!audioUrl) continue;

    // GUID / externalId
    const guidMatch = /<guid\b[^>]*>(.*?)<\/guid>/is.exec(itemBlock);
    let externalId = guidMatch ? cleanXmlText(guidMatch[1]) : '';
    if (!externalId) {
      externalId = createHash('sha256').update(audioUrl).digest('hex').substring(0, 32);
    }

    // Publication Date
    const pubDateMatch = /<pubDate\b[^>]*>(.*?)<\/pubDate>/is.exec(itemBlock);
    let publishedAt = new Date();
    if (pubDateMatch) {
      const parsed = Date.parse(pubDateMatch[1].trim());
      if (!Number.isNaN(parsed)) {
        publishedAt = new Date(parsed);
      }
    }

    // Duration
    const durationMatch = /<itunes:duration\b[^>]*>(.*?)<\/itunes:duration>/is.exec(itemBlock);
    const durationSeconds = parseDurationToSeconds(durationMatch ? durationMatch[1] : '');

    // Cover image
    const imageMatch = /<itunes:image\b[^>]*href=["'](https:\/\/[^"']+)["']/is.exec(itemBlock);
    const coverUrl = imageMatch ? imageMatch[1].trim() : '';

    items.push({
      title,
      description,
      audioUrl,
      externalId,
      publishedAt,
      durationSeconds,
      coverUrl,
    });
  }

  return items;
}

/**
 * Generates a deterministic document ID for an ingested episode (IR-11).
 * Ensures concurrent ingestion runs targeting the same feed item produce the exact same ID.
 */
export function deterministicEpisodeId(programId, externalIdOrUrl) {
  const seed = `${programId}:${String(externalIdOrUrl || '').trim()}`;
  return createHash('sha256').update(seed).digest('hex').slice(0, 24);
}

/**
 * Fetches RSS feed from URL and returns parsed items.
 */
export async function fetchAndParseRss(feedUrl, { fetchFn = globalThis.fetch, timeoutMs = 15000 } = {}) {
  if (typeof feedUrl !== 'string' || !/^https?:\/\//i.test(feedUrl.trim())) {
    throw new Error('Invalid feed URL');
  }

  try {
    const parsed = new URL(feedUrl.trim());
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.')
    ) {
      throw new Error('Unsafe or private feed URL');
    }
  } catch (e) {
    throw new Error(`Feed URL validation failed: ${e.message}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchFn(feedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'HudHud-FM-RssIngest/1.0 (Podcast Aggregator)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching RSS feed`);
    }

    const xml = await res.text();
    return parseRssFeed(xml);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ingests podcast episodes into Firestore with idempotency and zero duplicates.
 */
export async function ingestEpisodesFromFeed({
  firestore,
  root,
  programId,
  stationId,
  feedUrl,
  fetchFn = globalThis.fetch,
}) {
  if (!ingestionRoots.includes(root)) {
    throw new Error(`Unknown root environment: ${root}`);
  }

  const items = await fetchAndParseRss(feedUrl, { fetchFn });
  if (items.length === 0) {
    return { programId, totalFeedItems: 0, ingested: 0, skipped: 0 };
  }

  const episodesCol = firestore.collection(root).doc('episodes').collection('episodes');
  const programRef = firestore.collection(root).doc('programs').collection('programs').doc(programId);

  // Query existing episodes for this program to ensure idempotency
  const existingSnapshot = await episodesCol.where('programId', '==', programId).get();
  const existingExternalIds = new Set();
  const existingAudioUrls = new Set();
  const existingDocIds = new Set(existingSnapshot.docs.map((d) => d.id));

  for (const doc of existingSnapshot.docs) {
    const data = doc.data();
    if (data.externalId) existingExternalIds.add(String(data.externalId));
    if (data.audioUrl) existingAudioUrls.add(String(data.audioUrl));
  }

  let ingested = 0;
  let skipped = 0;

  for (const item of items) {
    const episodeId = deterministicEpisodeId(programId, item.externalId || item.audioUrl);
    if (
      existingDocIds.has(episodeId) ||
      existingExternalIds.has(item.externalId) ||
      existingAudioUrls.has(item.audioUrl)
    ) {
      skipped++;
      continue;
    }

    const episodeDoc = episodesCol.doc(episodeId);

    const payload = {
      programId,
      stationId,
      title: item.title,
      description: item.description,
      audioUrl: item.audioUrl,
      coverUrl: item.coverUrl || '',
      externalId: item.externalId,
      durationSeconds: item.durationSeconds,
      status: 'published',
      isPublished: true,
      publishedDate: Timestamp.fromDate(item.publishedAt),
      broadcastAt: Timestamp.fromDate(item.publishedAt),
      utcOffsetMinutes: 180,
      priority: 0,
      isFeatured: false,
      stats: {
        playsCount: 0,
        likesCount: 0,
        commentsCount: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
    };

    const batch = firestore.batch();
    batch.set(episodeDoc, payload);
    batch.update(programRef, {
      'stats.episodesCount': FieldValue.increment(1),
      lastIngestedAt: FieldValue.serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      logger.error(`Failed to commit episode "${item.title}" (ID: ${episodeId}) for program ${programId}: ${err?.message}`);
      throw err;
    }

    existingExternalIds.add(item.externalId);
    existingAudioUrls.add(item.audioUrl);
    ingested++;
    logger.info(`Ingested episode "${item.title}" (ID: ${episodeId}) for program ${programId}`);
  }

  return { programId, totalFeedItems: items.length, ingested, skipped };
}

/**
 * Scans all programs that configure `rssFeedUrl` and executes scheduled ingestion.
 */
export async function ingestConfiguredPodcastFeedsForRoot({
  firestore,
  root,
  fetchFn = globalThis.fetch,
}) {
  const programsRef = firestore.collection(root).doc('programs').collection('programs');
  const snapshot = await programsRef.where('isActive', '==', true).get();

  let feedsProcessed = 0;
  let totalIngested = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const feedUrl = data.rssFeedUrl?.trim();
    if (!feedUrl || !/^https:\/\//i.test(feedUrl)) continue;

    try {
      feedsProcessed++;
      const res = await ingestEpisodesFromFeed({
        firestore,
        root,
        programId: doc.id,
        stationId: data.stationId || '',
        feedUrl,
        fetchFn,
      });
      totalIngested += res.ingested;
    } catch (err) {
      logger.error(`Error ingesting feed for program ${doc.id}: ${err?.message}`);
    }
  }

  return { root, feedsProcessed, totalIngested };
}
