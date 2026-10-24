import { isSafePublicUrl, withPublicResponse, readResponseBytes } from './public-fetch.js';
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { contentIdentity, validContentId } from './admin-content.js';
import { assertCounterAdjustment, prepareContentIdentity } from './admin-content-relations.js';
import { recordEditorialAuditLog } from './editorial-audit.js';

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
export async function fetchAndParseRss(feedUrl, { fetchFn, lookupFn, timeoutMs = 15000 } = {}) {
  if (!isSafePublicUrl(feedUrl)) throw new Error('Unsafe or private feed URL');
  return withPublicResponse(feedUrl.trim(), { fetchFn, lookupFn, timeoutMs,
    headers: { 'User-Agent': 'HudHud-FM-RssIngest/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
  }, async (response, signal) => {
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching RSS feed`);
    const bytes = await readResponseBytes(response, { maxBytes: 2 * 1024 * 1024, signal });
    return parseRssFeed(new TextDecoder().decode(bytes));
  });
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
  fetchFn,
  lookupFn,
}) {
  if (!ingestionRoots.includes(root) || !validContentId(programId) || !validContentId(stationId)) {
    throw new Error(`Unknown root environment: ${root}`);
  }

  const items = await fetchAndParseRss(feedUrl, { fetchFn, lookupFn });
  if (items.length === 0) {
    return { programId, totalFeedItems: 0, ingested: 0, skipped: 0 };
  }

  const episodesCol = firestore.collection(root).doc('episodes').collection('episodes');
  const programRef = firestore.collection(root).doc('programs').collection('programs').doc(programId);

  // Query existing episodes for this program to ensure idempotency
  const existingSnapshot = await episodesCol.where('programId', '==', programId).get();
  const existingExternalIds = new Set();
  const existingAudioUrls = new Set();
  const existingIdentities = new Set();
  const existingDocIds = new Set(existingSnapshot.docs.map((d) => d.id));

  for (const doc of existingSnapshot.docs) {
    const data = doc.data();
    if (data.externalId) existingExternalIds.add(String(data.externalId));
    if (data.audioUrl) existingAudioUrls.add(String(data.audioUrl));
    const identity = contentIdentity('episodes', data);
    if (identity) existingIdentities.add(identity);
  }

  let ingested = 0;
  let skipped = 0;

  for (const item of items) {
    const episodeId = deterministicEpisodeId(programId, item.externalId || item.audioUrl);
    if (
      existingDocIds.has(episodeId) ||
      existingExternalIds.has(item.externalId) ||
      existingAudioUrls.has(item.audioUrl) ||
      existingIdentities.has(contentIdentity('episodes', { programId, audioUrl: item.audioUrl }))
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

    let created = false;
    try {
      created = await firestore.runTransaction(async tx => {
        const [current, program, station] = await Promise.all([tx.get(episodeDoc), tx.get(programRef), tx.get(firestore.doc(`${root}/stations/stations/${stationId}`))]);
        if (current.exists) {
          if (current.get('programId') !== programId || contentIdentity('episodes', current.data()) !== contentIdentity('episodes', payload)) throw new Error('RSS deterministic identity conflicts with existing content.');
          return false;
        }
        if (!program.exists || program.get('stationId') !== stationId || program.get('isActive') === false || program.get('adminDeletionToken') || !station.exists || station.get('adminDeletionToken')) throw new Error('RSS parent is unavailable or changed.');
        assertCounterAdjustment(program.get('stats.episodesCount'), 1);
        const identities = await prepareContentIdentity(tx, firestore, { root, kind: 'episodes', id: episodeId, content: payload, existing: null });
        for (const write of identities) write();
        tx.create(episodeDoc, { ...payload, createdBy: 'system:rss', createdByName: 'RSS', updatedBy: 'system:rss', updatedByName: 'RSS', updatedAt: FieldValue.serverTimestamp() });
        tx.update(programRef, { 'stats.episodesCount': FieldValue.increment(1), lastIngestedAt: FieldValue.serverTimestamp() });
        await recordEditorialAuditLog(tx, firestore, { root, targetKind: 'episodes', targetId: episodeId, targetTitle: item.title,
          action: 'import', actorUid: 'system:rss', actorEmail: '', summary: 'RSS import' });
        return true;
      });
    } catch (error) {
      if (error.code === 'already-exists') { skipped++; continue; }
      logger.warn('RSS content transaction failed; no partial item commit was accepted.');
      throw error;
    }
    existingDocIds.add(episodeId);
    existingExternalIds.add(item.externalId);
    existingAudioUrls.add(item.audioUrl);
    existingIdentities.add(contentIdentity('episodes', payload));
    if (created) ingested++; else skipped++;

  }

  return { programId, totalFeedItems: items.length, ingested, skipped };
}

/**
 * Scans all programs that configure `rssFeedUrl` and executes scheduled ingestion.
 */
export async function ingestConfiguredPodcastFeedsForRoot({
  firestore,
  root,
  fetchFn,
  lookupFn,
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
        lookupFn,
      });
      totalIngested += res.ingested;
    } catch (err) {
      logger.warn('RSS ingestion failed for a configured feed.');
    }
  }

  return { root, feedsProcessed, totalIngested };
}
