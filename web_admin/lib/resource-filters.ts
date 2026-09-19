export type StatusChoice = {
  value: string;
  label: string;
  field: string;
  match: string | boolean;
};
export function resourceStatusChoices(resource: string): StatusChoice[] {
  if (resource === 'reports')
    return ['open', 'resolved', 'dismissed'].map((value, i) => ({
      value,
      label: ['مفتوحة', 'تمت معالجتها', 'مرفوضة'][i],
      field: 'status',
      match: value,
    }));
  if (resource === 'comments')
    return ['published', 'hidden', 'removed'].map((value, i) => ({
      value,
      label: ['منشورة', 'مخفية', 'مزالة'][i],
      field: 'status',
      match: value,
    }));
  if (
    ![
      'stations',
      'programs',
      'episodes',
      'banners',
      'locations',
      'users',
      'subscriptions',
    ].includes(resource)
  )
    return [];
  return [true, false].map((match) => ({
    value: String(match),
    label:
      resource === 'episodes'
        ? match
          ? 'منشورة'
          : 'مسودة'
        : match
          ? 'مفعّلة'
          : 'غير مفعّلة',
    field: resource === 'episodes' ? 'isPublished' : 'isActive',
    match,
  }));
}
export function readResourceStatus(
  resource: string,
  hash: string,
): StatusChoice | undefined {
  const [section, search = ''] = hash.replace(/^#/, '').split('?');
  if (section !== resource) return;
  const value = new URLSearchParams(search).get('status');
  return resourceStatusChoices(resource).find(
    (choice) => choice.value === value,
  );
}

export function resourceParentFilter(resource: string) {
  if (resource === 'programs')
    return {
      kind: 'stations' as const,
      field: 'stationId',
      label: 'تصفية حسب المحطة',
    };
  if (resource === 'episodes')
    return {
      kind: 'programs' as const,
      field: 'programId',
      label: 'تصفية حسب البرنامج',
    };
}
export function readResourceParent(resource: string, hash: string): string {
  const [section, search = ''] = hash.replace(/^#/, '').split('?');
  if (section !== resource || !resourceParentFilter(resource)) return '';
  const value = new URLSearchParams(search).get('parent') ?? '';
  return value.length <= 128 &&
    !value.includes('/') &&
    !Array.from(value).some((character) => character.charCodeAt(0) < 32)
    ? value
    : '';
}

export function readResourceSearch(resource: string, hash: string): string {
  const [section, search = ''] = hash.replace(/^#/, '').split('?');
  if (section !== resource) return '';
  return (new URLSearchParams(search).get('q') ?? '').slice(0, 200);
}

export function readReportType(
  resource: string,
  hash: string,
): 'comment' | 'user' | '' {
  const [section, search = ''] = hash.replace(/^#/, '').split('?');
  if (resource !== 'reports' || section !== resource) return '';
  const value = new URLSearchParams(search).get('type');
  return value === 'comment' || value === 'user' ? value : '';
}

/** Normalize Arabic text and diacritics for flexible fuzzy searching. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic diacritics (tashkeel)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // replace punctuation/symbols with space
    .replace(/\s+/g, ' ')
    .trim();
}

/** Multi-field, multi-word matching with Arabic normalization. */
export function matchRecordSearch(
  record: { id: string; data: Record<string, unknown>; relationLabel?: string },
  term: string,
  resource?: string,
): boolean {
  const trimmed = term.trim();
  if (!trimmed) return true;

  const fields: string[] = [
    record.id,
    typeof record.data.name === 'string' ? record.data.name : '',
    typeof record.data.nameEn === 'string' ? record.data.nameEn : '',
    typeof record.data.title === 'string' ? record.data.title : '',
    typeof record.data.titleEn === 'string' ? record.data.titleEn : '',
    typeof record.data.displayName === 'string' ? record.data.displayName : '',
    typeof record.data.email === 'string' ? record.data.email : '',
    typeof record.relationLabel === 'string' ? record.relationLabel : '',
  ];

  if (resource === 'stations') {
    fields.push(
      typeof record.data.cityNameAr === 'string' ? record.data.cityNameAr : '',
      typeof record.data.cityCode === 'string' ? record.data.cityCode : '',
      typeof record.data.frequency === 'string' ? record.data.frequency : '',
      typeof record.data.tagline === 'string' ? record.data.tagline : '',
      typeof record.data.description === 'string'
        ? record.data.description
        : '',
    );
  } else if (resource === 'locations') {
    fields.push(
      typeof record.data.cityNameAr === 'string' ? record.data.cityNameAr : '',
      typeof record.data.cityCode === 'string' ? record.data.cityCode : '',
      typeof record.data.countryNameAr === 'string' ? record.data.countryNameAr : '',
      typeof record.data.countryCode === 'string' ? record.data.countryCode : '',
    );
  } else if (resource === 'users') {
    fields.push(
      typeof record.data.username === 'string' ? record.data.username : '',
      typeof record.data.role === 'string' ? record.data.role : '',
      typeof record.data.phoneNumber === 'string' ? record.data.phoneNumber : '',
    );
  } else if (resource === 'programs') {
    fields.push(
      Array.isArray(record.data.presenters) ? record.data.presenters.join(' ') : '',
      Array.isArray(record.data.categories) ? record.data.categories.join(' ') : '',
      typeof record.data.description === 'string' ? record.data.description : '',
      typeof record.data.stationId === 'string' ? record.data.stationId : '',
    );
  } else if (resource === 'episodes') {
    fields.push(
      typeof record.data.description === 'string' ? record.data.description : '',
      typeof record.data.presenter === 'string' ? record.data.presenter : '',
      typeof record.data.guest === 'string' ? record.data.guest : '',
      typeof record.data.programId === 'string' ? record.data.programId : '',
      typeof record.data.stationId === 'string' ? record.data.stationId : '',
    );
  } else if (resource === 'banners') {
    fields.push(
      typeof record.data.targetType === 'string' ? record.data.targetType : '',
      typeof record.data.targetId === 'string' ? record.data.targetId : '',
      typeof record.data.targetUrl === 'string' ? record.data.targetUrl : '',
    );
  } else if (resource === 'comments') {
    fields.push(
      typeof record.data.content === 'string' ? record.data.content : '',
      typeof record.data.authorName === 'string' ? record.data.authorName : '',
      typeof record.data.authorEmail === 'string' ? record.data.authorEmail : '',
      typeof record.data.authorUid === 'string' ? record.data.authorUid : '',
      typeof record.data.episodeId === 'string' ? record.data.episodeId : '',
    );
  } else if (resource === 'reports') {
    fields.push(
      typeof record.data.reason === 'string' ? record.data.reason : '',
      typeof record.data.details === 'string' ? record.data.details : '',
      typeof record.data.targetType === 'string' ? record.data.targetType : '',
      typeof record.data.commentId === 'string' ? record.data.commentId : '',
      typeof record.data.episodeId === 'string' ? record.data.episodeId : '',
      typeof record.data.reporterUid === 'string' ? record.data.reporterUid : '',
    );
  } else if (resource === 'favorites' || resource === 'subscriptions') {
    fields.push(
      typeof record.data.userId === 'string' ? record.data.userId : '',
      typeof record.data.targetId === 'string' ? record.data.targetId : '',
      typeof record.data.targetType === 'string' ? record.data.targetType : '',
    );
  }

  const normalizedCombined = normalizeSearchText(fields.join(' '));
  const normalizedQuery = normalizeSearchText(trimmed);
  const words = normalizedQuery.split(' ').filter(Boolean);

  return words.every((word) => normalizedCombined.includes(word));
}

export type SortChoice = {
  value: string;
  label: string;
};

export const stationSortChoices: SortChoice[] = [
  { value: 'newest', label: 'الترتيب: الأحدث أولاً' },
  { value: 'oldest', label: 'الترتيب: الأقدم أولاً' },
  { value: 'name_asc', label: 'الاسم: أ إلى ي' },
  { value: 'name_desc', label: 'الاسم: ي إلى أ' },
  { value: 'priority_desc', label: 'الأولوية: الأعلى أولاً' },
  { value: 'priority_asc', label: 'الأولوية: الأقل أولاً' },
  { value: 'plays_desc', label: 'الأكثر استماعاً' },
  { value: 'subscribers_desc', label: 'الأكثر متابعة' },
  { value: 'programs_desc', label: 'الأكثر برامج' },
  { value: 'city_asc', label: 'المدينة: أ إلى ي' },
];

export const genericSortChoices: SortChoice[] = [
  { value: 'newest', label: 'الترتيب: الأحدث أولاً' },
  { value: 'oldest', label: 'الترتيب: الأقدم أولاً' },
  { value: 'name_asc', label: 'الاسم: أ إلى ي' },
  { value: 'name_desc', label: 'الاسم: ي إلى أ' },
];

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function sortRecords<
  T extends { id: string; data: Record<string, unknown> },
>(records: T[], sortBy: string, _resource?: string): T[] {
  if (sortBy === 'newest') return records;
  if (sortBy === 'oldest') return [...records].reverse();

  return [...records].sort((a, b) => {
    if (sortBy === 'name_asc' || sortBy === 'name_desc') {
      const nameA = asString(a.data.name) || asString(a.data.title) || a.id;
      const nameB = asString(b.data.name) || asString(b.data.title) || b.id;
      const cmp = nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
      return sortBy === 'name_asc' ? cmp : -cmp;
    }
    if (sortBy === 'city_asc') {
      const cityA = asString(a.data.cityNameAr) || asString(a.data.cityCode);
      const cityB = asString(b.data.cityNameAr) || asString(b.data.cityCode);
      return cityA.localeCompare(cityB, 'ar', { sensitivity: 'base' });
    }
    if (sortBy === 'priority_desc' || sortBy === 'priority_asc') {
      const prioA = Number(a.data.priority ?? 0);
      const prioB = Number(b.data.priority ?? 0);
      return sortBy === 'priority_desc' ? prioB - prioA : prioA - prioB;
    }
    if (sortBy === 'plays_desc') {
      const pA = Number(
        (a.data.stats as Record<string, unknown>)?.totalPlays ?? 0,
      );
      const pB = Number(
        (b.data.stats as Record<string, unknown>)?.totalPlays ?? 0,
      );
      return pB - pA;
    }
    if (sortBy === 'subscribers_desc') {
      const sA = Number(
        (a.data.stats as Record<string, unknown>)?.subscribersCount ?? 0,
      );
      const sB = Number(
        (b.data.stats as Record<string, unknown>)?.subscribersCount ?? 0,
      );
      return sB - sA;
    }
    if (sortBy === 'programs_desc') {
      const prA = Number(
        (a.data.stats as Record<string, unknown>)?.programsCount ?? 0,
      );
      const prB = Number(
        (b.data.stats as Record<string, unknown>)?.programsCount ?? 0,
      );
      return prB - prA;
    }
    return 0;
  });
}

