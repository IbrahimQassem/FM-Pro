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
  if (resource === 'stations')
    return {
      kind: 'locations' as const,
      field: 'cityCode',
      label: 'تصفية حسب المدينة',
    };
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
