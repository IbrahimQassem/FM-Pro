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


export function recentStation(stations: Station[], history: { stationId: string }[]): Station | null {
  for (const entry of history) {
    const station = stations.find((item) => item.id === entry.stationId);
    if (station) return station;
  }
  return stations[0] || null;
}
