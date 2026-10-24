import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export const editableFields = {
  stations: new Set(
    'name nameEn tagline description frequency streamUrl backupStreamUrl logoUrl thumbnailUrl websiteUrl facebookUrl instagramUrl youtubeUrl twitterUrl whatsapp owner address contactPerson contactPhone contactEmail streamType audioCodec bitrateKbps sampleRateHz transmitterPower transmitterLocation coverageArea rds isActive isFeatured isVerified isLive isNational priority countryCode countryNameAr cityCode cityNameAr locationType'.split(
      ' ',
    ),
  ),
  programs: new Set(
    'title titleEn description coverUrl thumbnailUrl presenters categories schedule isActive isFeatured priority stationId'.split(
      ' ',
    ),
  ),
  episodes: new Set(
    'title description coverUrl audioUrl durationSeconds presenter guest broadcastAt utcOffsetMinutes publishedAt isPublished isFeatured priority programId stationId'.split(
      ' ',
    ),
  ),
  locations: new Set(
    'cityCode cityNameAr sortOrder priority isActive countryCode countryNameAr locationType'.split(
      ' ',
    ),
  ),
  banners: new Set(
    'title imageUrl targetType targetId targetUrl priority isActive startAt expiresAt'.split(
      ' ',
    ),
  ),
};
const dateFields = new Set([
  'broadcastAt',
  'publishedAt',
  'startAt',
  'expiresAt',
]);
const booleanFields = new Set([
  'isActive',
  'isFeatured',
  'isVerified',
  'isLive',
  'isNational',
  'isPublished',
]);
const numberFields = new Set([
  'priority',
  'durationSeconds',
  'utcOffsetMinutes',
  'sortOrder',
]);
export const validContentId = (value) =>
  typeof value === 'string' &&
  value === value.trim() &&
  value.length > 0 &&
  value.length <= 128 &&
  !value.includes('/') &&
  value !== '.' &&
  value !== '..';
export const contentIdentityScope = (kind, parentId) =>
  ['programs', 'episodes'].includes(kind) && validContentId(parentId)
    ? createHash('sha256')
        .update(JSON.stringify([kind, parentId]))
        .digest('hex')
    : null;
const invalid = () => {
  throw new HttpsError('invalid-argument', 'Invalid editable content.');
};

export function editableContent(kind, value) {
  const normalize = (item) => {
    if (item instanceof Timestamp) return item.toDate().toISOString();
    if (item instanceof Date) return item.toISOString();
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, normalize(item[key])]),
      );
    return typeof item === 'string' ? item.trim() : item;
  };
  const result = normalize(
    Object.fromEntries(
      Object.entries(value || {}).filter(
        ([key, item]) => editableFields[kind]?.has(key) && item !== undefined,
      ),
    ),
  );
  for (const key of ['presenters', 'categories']) {
    if (Array.isArray(result[key]))
      result[key] = result[key].filter((item) => item !== '');
  }
  return result;
}

export function validateAdminContent(kind, value) {
  const allowed = editableFields[kind];
  if (
    !allowed ||
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.has(key))
  )
    invalid();
  const content = editableContent(kind, value);
  for (const [key, item] of Object.entries(content)) {
    if (booleanFields.has(key)) {
      if (typeof item !== 'boolean') invalid();
    } else if (numberFields.has(key)) {
      if (!Number.isSafeInteger(item)) invalid();
    } else if (dateFields.has(key)) {
      if (item != null && item !== '') {
        if (typeof item !== 'string' || !Number.isFinite(Date.parse(item)))
          invalid();
        try {
          content[key] = Timestamp.fromDate(new Date(item));
        } catch {
          invalid();
        }
      } else content[key] = null;
    } else if (key === 'presenters' || key === 'categories') {
      if (
        !Array.isArray(item) ||
        item.some((entry) => typeof entry !== 'string')
      )
        invalid();
      content[key] = item.map((entry) => entry.trim()).filter(Boolean);
    } else if (key === 'schedule') {
      if (item == null) continue;
      const keys = ['weekdays', 'startMinute', 'endMinute', 'utcOffsetMinutes'];
      if (
        typeof item !== 'object' ||
        Array.isArray(item) ||
        Object.keys(item).some((field) => !keys.includes(field)) ||
        !Array.isArray(item.weekdays) ||
        !item.weekdays.length ||
        item.weekdays.some(
          (day) => !Number.isInteger(day) || day < 1 || day > 7,
        ) ||
        !Number.isInteger(item.startMinute) ||
        item.startMinute < 0 ||
        item.startMinute > 1439 ||
        !Number.isInteger(item.endMinute) ||
        item.endMinute <= item.startMinute ||
        item.endMinute > 1440 ||
        !Number.isInteger(item.utcOffsetMinutes) ||
        item.utcOffsetMinutes < -720 ||
        item.utcOffsetMinutes > 840
      )
        invalid();
    } else if (typeof item !== 'string') invalid();
  }
  const requiredText =
    kind === 'stations'
      ? ['name', 'countryCode', 'countryNameAr', 'cityCode', 'cityNameAr']
      : kind === 'locations'
        ? ['cityCode', 'cityNameAr', 'countryCode', 'countryNameAr']
        : ['title'];
  if (
    requiredText.some(
      (key) => typeof content[key] !== 'string' || !content[key],
    )
  )
    invalid();
  const flags =
    kind === 'stations'
      ? ['isActive', 'isFeatured', 'isVerified', 'isLive']
      : kind === 'programs'
        ? ['isActive', 'isFeatured']
        : kind === 'episodes'
          ? ['isPublished', 'isFeatured']
          : ['isActive'];
  if (flags.some((key) => typeof content[key] !== 'boolean')) invalid();
  if (kind !== 'locations' && !Number.isSafeInteger(content.priority))
    invalid();
  if (kind === 'stations' || kind === 'locations') {
    if (
      !(
        (content.countryCode === 'YE' &&
          ['governorate', 'national'].includes(content.locationType)) ||
        (content.countryCode === 'ARAB' &&
          content.cityCode === 'global-ar' &&
          content.countryNameAr === 'العالم العربي' &&
          content.locationType === 'regional')
      )
    )
      invalid();
    if (
      kind === 'stations' &&
      Boolean(content.isNational) !== (content.locationType === 'national')
    )
      invalid();
  }
  if (kind === 'stations' && typeof content.streamUrl !== 'string') invalid();
  if (
    content.contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.contactEmail)
  )
    invalid();
  if (
    kind === 'locations' &&
    (!Number.isSafeInteger(content.sortOrder) || content.sortOrder < 0)
  )
    invalid();
  if (kind === 'programs' || kind === 'episodes') {
    if (
      !validContentId(content.stationId) ||
      (kind === 'episodes' && !validContentId(content.programId))
    )
      invalid();
  }
  if (
    kind === 'episodes' &&
    (!content.audioUrl ||
      !(content.broadcastAt instanceof Timestamp) ||
      !Number.isSafeInteger(content.durationSeconds) ||
      content.durationSeconds < 0 ||
      !Number.isSafeInteger(content.utcOffsetMinutes) ||
      content.utcOffsetMinutes < -720 ||
      content.utcOffsetMinutes > 840)
  )
    invalid();
  for (const [key, item] of Object.entries(content)) {
    if (!item || (!key.endsWith('Url') && key !== 'whatsapp')) continue;
    if (key === 'whatsapp' && !/^https?:/i.test(item)) continue;
    let url;
    try {
      url = new URL(item);
    } catch {
      invalid();
    }
    // Existing station mappers/editor permit legacy public HTTP network URLs.
    const allowHttp = kind === 'stations';
    if (
      !url.hostname ||
      url.username ||
      url.password ||
      (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:'))
    )
      invalid();
  }
  if (kind === 'banners') {
    if (
      !content.imageUrl ||
      (content.startAt &&
        content.expiresAt &&
        content.startAt.toMillis() >= content.expiresAt.toMillis())
    )
      invalid();
    if (
      content.targetType &&
      !['none', 'station', 'program', 'episode', 'url'].includes(
        content.targetType,
      )
    )
      invalid();
  }
  return content;
}

export function contentIdentity(kind, content) {
  let input;
  if (kind === 'programs') {
    if (
      !validContentId(content.stationId) ||
      typeof content.title !== 'string' ||
      !content.title.trim()
    )
      return null;
    const title = content.title
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[A-Z]/g, (character) => character.toLowerCase());
    input = `program\n${content.stationId}\n${title}`;
  } else if (kind === 'episodes') {
    if (
      !validContentId(content.programId) ||
      typeof content.audioUrl !== 'string'
    )
      return null;
    let url;
    try {
      url = new URL(content.audioUrl.trim());
    } catch {
      return null;
    }
    url.hostname = url.hostname.toLowerCase();
    url.hash = '';
    input = `episode\n${content.programId}\n${url.toString()}`;
  } else return null;
  return createHash('sha256').update(input).digest('hex');
}

export function initialContentStats(kind) {
  return kind === 'stations'
    ? { programsCount: 0, subscribersCount: 0, totalPlays: 0 }
    : kind === 'programs'
      ? { episodesCount: 0, subscribersCount: 0, totalPlays: 0 }
      : kind === 'episodes'
        ? { playsCount: 0, likesCount: 0, commentsCount: 0 }
        : null;
}
