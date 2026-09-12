type StationStats = {
  programsCount: number;
  subscribersCount: number;
  totalPlays: number;
};

export type Station = {
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
