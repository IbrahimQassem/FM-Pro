type StationStats = {
  programsCount: number;
  subscribersCount: number;
  totalPlays: number;
};

export type Station = {
  resume?: boolean;
  id: string;
  name: string;
  nameEn: string;
  tagline: string;
  description: string;
  streamUrl: string;
  backupStreamUrl: string;
  logoUrl: string;
  thumbnailUrl: string;
  frequency: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;
  whatsapp?: string;
  owner?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  streamType?: string;
  audioCodec?: string;
  bitrateKbps?: string;
  sampleRateHz?: string;
  transmitterPower?: string;
  transmitterLocation?: string;
  coverageArea?: string;
  rds?: string;
  countryCode: string;
  countryNameAr: string;
  cityCode: string;
  cityNameAr: string;
  priority: number;
  isLive: boolean;
  isActive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  healthStatus?: string;
  consecutiveFailures?: number;
  streamHealthSource?: string;
  lastCheckedAt?: number | string | null;
  stats: StationStats;
};

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function stationFromSnapshot(snapshot: {
  id: string;
  data: () => Record<string, unknown>;
}): Station {
  const data = snapshot.data();
  const rawFailures = data.consecutiveFailures;
  const failures = rawFailures == null ? 0 : typeof rawFailures === 'number' ||
    (typeof rawFailures === 'string' && rawFailures.trim()) ? Number(rawFailures) : NaN;
  const stats = typeof data.stats === 'object' && data.stats !== null
    ? data.stats as Record<string, unknown>
    : {};
  return {
    id: snapshot.id,
    name: textValue(data.name),
    nameEn: textValue(data.nameEn),
    tagline: textValue(data.tagline),
    description: textValue(data.description),
    streamUrl: textValue(data.streamUrl),
    backupStreamUrl: textValue(data.backupStreamUrl),
    logoUrl: textValue(data.logoUrl),
    thumbnailUrl: textValue(data.thumbnailUrl),
    frequency: textValue(data.frequency),
    websiteUrl: textValue(data.websiteUrl) || textValue(data.website),
    facebookUrl: textValue(data.facebookUrl),
    instagramUrl: textValue(data.instagramUrl),
    youtubeUrl: textValue(data.youtubeUrl),
    twitterUrl: textValue(data.twitterUrl),
    whatsapp: textValue(data.whatsapp),
    owner: textValue(data.owner),
    address: textValue(data.address),
    contactPerson: textValue(data.contactPerson),
    contactPhone: textValue(data.contactPhone),
    contactEmail: textValue(data.contactEmail),
    streamType: textValue(data.streamType),
    audioCodec: textValue(data.audioCodec),
    bitrateKbps: textValue(data.bitrateKbps),
    sampleRateHz: textValue(data.sampleRateHz),
    transmitterPower: textValue(data.transmitterPower),
    transmitterLocation: textValue(data.transmitterLocation),
    coverageArea: textValue(data.coverageArea),
    rds: textValue(data.rds),
    countryCode: textValue(data.countryCode),
    countryNameAr: textValue(data.countryNameAr),
    cityCode: textValue(data.cityCode),
    cityNameAr: textValue(data.cityNameAr),
    priority: numberValue(data.priority),
    isLive: data.isLive === true,
    isActive: data.isActive === true,
    isVerified: data.isVerified === true,
    isFeatured: data.isFeatured === true,
    healthStatus: textValue(data.healthStatus),
    consecutiveFailures: Number.isSafeInteger(failures) && failures >= 0 ? failures : -1,
    streamHealthSource: textValue(data.streamHealthSource) || 'primary',
    lastCheckedAt: data.lastCheckedAt
      ? (typeof (data.lastCheckedAt as { toMillis?: () => number }).toMillis === 'function'
          ? (data.lastCheckedAt as { toMillis: () => number }).toMillis()
          : data.lastCheckedAt as number | string)
      : null,
    stats: {
      programsCount: numberValue(stats.programsCount),
      subscribersCount: numberValue(stats.subscribersCount),
      totalPlays: numberValue(stats.totalPlays),
    },
  };
}

export function sortStations(a: Station, b: Station): number {
  if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.name.localeCompare(b.name, 'ar', { sensitivity: 'base' });
}


export type StationStreamHealthState =
  | 'available'
  | 'backupAvailable'
  | 'unstable'
  | 'temporarilyStopped'
  | 'unverified'
  | 'noOnlineSource'
  | 'deviceConnectionError';

export function resolveStreamHealthState(station: Station, now: number = Date.now()): StationStreamHealthState {
  if (!station.streamUrl && !station.backupStreamUrl) {
    return 'noOnlineSource';
  }
  const checkedTime = streamCheckedAt(station);
  if (checkedTime === null || Math.abs(now - checkedTime) > 45 * 60 * 1000) return 'unverified';
  if (!Number.isSafeInteger(station.consecutiveFailures ?? 0) || (station.consecutiveFailures ?? 0) < 0) return 'unverified';
  if (station.healthStatus === 'offline' || (station.consecutiveFailures ?? 0) >= 3) {
    return 'temporarilyStopped';
  }
  if (station.healthStatus === 'degraded') {
    if (station.streamHealthSource === 'backup') {
      return 'backupAvailable';
    }
    return 'unstable';
  }
  if (station.healthStatus === 'online') {
    return 'available';
  }
  return 'unverified';
}

export function recentStation(stations: Station[], history: { stationId: string }[]): Station | null {
  for (const entry of history) {
    const station = stations.find((item) => item.id === entry.stationId);
    if (station) return station;
  }
  return stations[0] || null;
}

/** A last-checked classification, not a guarantee of playback on this device. */
export function isWorkingStream(station: Station, now = Date.now()): boolean {
  return (station.consecutiveFailures ?? 0) === 0 && resolveStreamHealthState(station, now) === 'available';
}
export function nextStreamHealthChange(station: Station, now = Date.now()): number | null {
  if (!['online', 'offline', 'degraded'].includes(station.healthStatus ?? '') || (station.consecutiveFailures ?? 0) < 0 || (!station.streamUrl && !station.backupStreamUrl) || !station.lastCheckedAt) return null;
  const checked = streamCheckedAt(station);
  if (checked === null) return null;
  const entry = checked - 45 * 60000, expiry = checked + 45 * 60000;
  return now < entry ? entry : now <= expiry ? expiry + 1 : null;
}

export const streamHealthLabels: Record<StationStreamHealthState, string> = {
  available: 'سليم في آخر فحص', backupAvailable: 'بث بديل', unstable: 'بث غير مستقر',
  temporarilyStopped: 'متوقف مؤقتًا', unverified: 'لم يُفحص حديثًا',
  noOnlineSource: 'بدون بث مباشر', deviceConnectionError: 'تعذر الاتصال من جهازك',
};

export function streamCheckedAt(station: Station): number | null {
  if (station.lastCheckedAt === null || station.lastCheckedAt === undefined) return null;
  const time = typeof station.lastCheckedAt === 'number' ? station.lastCheckedAt : Date.parse(String(station.lastCheckedAt));
  return Number.isFinite(time) && Number.isFinite(new Date(time).getTime()) ? time : null;
}
