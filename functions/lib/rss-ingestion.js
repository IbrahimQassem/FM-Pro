import { readCommentCountFence } from './comment-count-maintenance.js';
import { prepareNewEpisodeCountBaseline } from './comment-counts.js';
import { isSafePublicUrl, withPublicResponse, readResponseBytes } from './public-fetch.js';
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { contentIdentity, validContentId } from './admin-content.js';
import { assertCounterAdjustment, prepareRssIdentities } from './admin-content-relations.js';
import { recordEditorialAuditLog } from './editorial-audit.js';

export const ingestionRoots = ['HudHudDev', 'HudHudOfficial'];

/**
 * Strips CDATA and basic HTML tags from XML text node.
 */
const xmlCharacter = code => code === 9 || code === 10 || code === 13 ||
  (code >= 0x20 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) ||
  (code >= 0x10000 && code <= 0x10ffff);

/** Decode XML references once; no DTD, HTML entity table or external resolution. */
export function decodeXmlEntities(value) {
  if (typeof value !== 'string' || [...value].some(character => !xmlCharacter(character.codePointAt(0)))) {
    throw new Error('Invalid XML character.');
  }
  const predefined = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);)/.test(value)) throw new Error('Invalid XML reference.');
  return value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g, (_, reference) => {
    if (Object.hasOwn(predefined, reference)) return predefined[reference];
    const code = reference.startsWith('#x') ? Number.parseInt(reference.slice(2), 16) : Number(reference.slice(1));
    if (!Number.isSafeInteger(code) || !xmlCharacter(code)) throw new Error('Invalid XML character reference.');
    return String.fromCodePoint(code);
  });
}

function cleanXmlText(text) {
  if (typeof text !== 'string') return '';
  return text.split(/(<!\[CDATA\[[\s\S]*?\]\]>)/g).map(part => {
    const cdata = part.startsWith('<![CDATA[');
    const value = (cdata ? part.slice(9, -3) : part).replace(/<[^>]+>/g, '');
    return cdata ? value : decodeXmlEntities(value);
  }).join('').trim();
}
const legacyXmlText = text => text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
const httpsAudio = value => /^https:\/\//i.test(value) && isSafePublicUrl(value);
const attribute = (block, key) => new RegExp(`(?:^|\\s)${key}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(block)?.[2] ?? '';

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
  if (typeof xmlString !== 'string' || !xmlString.trim()) return [];
  const ordinary = xmlString.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(ordinary)) throw new Error('RSS DTD/entity declarations are not supported.');
  const items = [];
  for (const match of xmlString.matchAll(/<item\b[^>]*>(.*?)<\/item>/gis)) {
    const block = match[1];
    try {
      if ([...block].some(character => !xmlCharacter(character.codePointAt(0)))) continue;
      decodeXmlEntities(block.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, ''));
      const node = name => new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(block)?.[1] ?? '';
      const title = cleanXmlText(node('title') || 'حلقة جديدة');
      const description = cleanXmlText(node('description') || node('itunes:summary'));
      const enclosure = /<enclosure\b([^>]*)\/?>/is.exec(block)?.[1] ?? '';
      const legacyAudioUrl = attribute(enclosure, 'url').trim();
      const audioUrl = decodeXmlEntities(legacyAudioUrl).trim();
      if (!httpsAudio(audioUrl)) continue;
      const guid = node('guid');
      const externalId = cleanXmlText(guid) || createHash('sha256').update(audioUrl).digest('hex').slice(0, 32);
      const legacyExternalId = legacyXmlText(guid) || createHash('sha256').update(legacyAudioUrl).digest('hex').slice(0, 32);
      const date = Date.parse(cleanXmlText(node('pubDate')));
      const publishedAt = Number.isFinite(date) ? new Date(date) : new Date();
      const durationSeconds = parseDurationToSeconds(cleanXmlText(node('itunes:duration')));
      const image = /<itunes:image\b([^>]*)\/?>/is.exec(block)?.[1] ?? '';
      const decodedImage = decodeXmlEntities(attribute(image, 'href')).trim();
      const coverUrl = httpsAudio(decodedImage) ? decodedImage : '';
      items.push({ title, description, audioUrl, externalId, publishedAt, durationSeconds, coverUrl,
        legacyAudioUrl, legacyExternalId });
    } catch {
      // Reject only the malformed item; never expose a URL or feed payload in logs.
    }
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

  let ingested = 0;
  let skipped = 0;

  for (const item of items) {
    const episodeId = deterministicEpisodeId(programId, item.externalId || item.audioUrl);
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
        await readCommentCountFence(tx, firestore, root);
        const [program, station] = await Promise.all([tx.get(programRef), tx.get(firestore.doc(`${root}/stations/stations/${stationId}`))]);
        if (!program.exists || program.get('stationId') !== stationId || program.get('isActive') === false || program.get('adminDeletionToken') || !station.exists || station.get('adminDeletionToken')) throw new Error('RSS parent is unavailable or changed.');
        const identity = await prepareRssIdentities(tx, firestore, { root, programId, stationId, id: episodeId,
          audioUrls: [item.audioUrl, item.legacyAudioUrl],
          externalIds: [item.externalId, item.legacyExternalId],
          candidateIds: [episodeId, deterministicEpisodeId(programId, item.legacyExternalId || item.legacyAudioUrl)] });
        if (identity.existing) {
          for (const write of identity.writes) write();
          return false;
        }
        const creation = await prepareNewEpisodeCountBaseline(tx, firestore, { root, episodeId, serverTimestamp: () => FieldValue.serverTimestamp() });
        assertCounterAdjustment(program.get('stats.episodesCount'), 1);
        for (const write of creation.writes) write();
        for (const write of identity.writes) write();
        tx.create(episodeDoc, { ...payload, createdBy: 'system:rss', createdByName: 'RSS', updatedBy: 'system:rss', updatedByName: 'RSS', updatedAt: FieldValue.serverTimestamp() });
        tx.update(programRef, { 'stats.episodesCount': FieldValue.increment(1), lastIngestedAt: FieldValue.serverTimestamp() });
        await recordEditorialAuditLog(tx, firestore, { root, targetKind: 'episodes', targetId: episodeId, targetTitle: item.title,
          action: 'import', actorUid: 'system:rss', actorEmail: '', summary: 'RSS import' });
        return true;
      });
    } catch (error) {
      logger.warn('RSS content transaction failed; no partial item commit was accepted.');
      throw error;
    }
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
