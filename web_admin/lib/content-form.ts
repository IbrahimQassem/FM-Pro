export type ContentKind =
  | 'stations'
  | 'programs'
  | 'episodes'
  | 'banners'
  | 'locations';
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'url' | 'number' | 'list' | 'date';
  required?: boolean;
};
const title: Field[] = [
  { key: 'title', label: 'العنوان', required: true },
  { key: 'description', label: 'الوصف', type: 'textarea' },
];
const artwork: Field[] = [
  { key: 'coverUrl', label: 'رابط الغلاف', type: 'url' },
];
export const contentFields: Record<ContentKind, Field[]> = {
  stations: [
    { key: 'name', label: 'اسم المحطة', required: true },
    { key: 'nameEn', label: 'الاسم بالإنجليزية' },
    { key: 'tagline', label: 'العبارة التعريفية' },
    { key: 'description', label: 'عن المحطة', type: 'textarea' },
    { key: 'frequency', label: 'التردد' },
    {
      key: 'streamUrl',
      label: 'رابط البث الأساسي',
      type: 'url',
      required: true,
    },
    { key: 'backupStreamUrl', label: 'رابط البث الاحتياطي', type: 'url' },
    { key: 'logoUrl', label: 'رابط الشعار', type: 'url' },
    { key: 'thumbnailUrl', label: 'رابط الصورة المصغرة', type: 'url' },
  ],
  programs: [
    ...title,
    { key: 'titleEn', label: 'العنوان بالإنجليزية' },
    ...artwork,
    { key: 'thumbnailUrl', label: 'رابط الصورة المصغرة', type: 'url' },
    { key: 'presenters', label: 'المقدمون — اسم في كل سطر', type: 'list' },
    { key: 'categories', label: 'التصنيفات — تصنيف في كل سطر', type: 'list' },
  ],
  episodes: [
    ...title,
    ...artwork,
    {
      key: 'audioUrl',
      label: 'رابط الملف الصوتي',
      type: 'url',
      required: true,
    },
    {
      key: 'durationSeconds',
      label: 'مدة الحلقة بالثواني',
      type: 'number',
      required: true,
    },
    { key: 'presenter', label: 'المقدم' },
    { key: 'guest', label: 'الضيف' },
    {
      key: 'broadcastAt',
      label: 'موعد البث (UTC)',
      type: 'date',
      required: true,
    },
    {
      key: 'utcOffsetMinutes',
      label: 'فرق التوقيت بالدقائق عن UTC',
      type: 'number',
      required: true,
    },
    { key: 'publishedAt', label: 'تاريخ النشر (UTC)', type: 'date' },
  ],
  banners: [
    { key: 'title', label: 'عنوان الإعلان', required: true },
    { key: 'imageUrl', label: 'رابط صورة الإعلان', type: 'url', required: true },
    { key: 'startAt', label: 'يبدأ في (UTC)', type: 'date' },
    { key: 'expiresAt', label: 'ينتهي في (UTC)', type: 'date' },
  ],
  locations: [
    { key: 'cityCode', label: 'رمز المدينة', required: true },
    { key: 'cityNameAr', label: 'اسم المدينة', required: true },
    {
      key: 'sortOrder',
      label: 'ترتيب المدينة',
      type: 'number',
      required: true,
    },
  ],
};
export const contentFlags: Record<ContentKind, Array<[string, string]>> = {
  stations: [
    ['isActive', 'ظاهر في التطبيق'],
    ['isFeatured', 'محطة مميزة'],
    ['isVerified', 'محطة موثقة'],
    ['isLive', 'بث مباشر'],
  ],
  programs: [
    ['isActive', 'ظاهر في التطبيق'],
    ['isFeatured', 'برنامج مميز'],
  ],
  episodes: [
    ['isPublished', 'منشورة للمستمعين'],
    ['isFeatured', 'حلقة مميزة'],
  ],
  banners: [['isActive', 'الإعلان مفعّل']],
  locations: [['isActive', 'المدينة مفعّلة']],
};
export function isContentKind(key: string): key is ContentKind {
  return Object.hasOwn(contentFields, key);
}
export function isNetworkUrl(value: unknown, allowHttp = false): boolean {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return (
      !!u.hostname &&
      !u.username &&
      !u.password &&
      (u.protocol === 'https:' || (allowHttp && u.protocol === 'http:'))
    );
  } catch {
    return false;
  }
}
export function editableValue(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  )
    return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(editableValue);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, editableValue(v)]),
    );
  return value;
}
export function validateContent(
  kind: ContentKind,
  data: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of contentFields[kind]) {
    const value = data[field.key];
    if (field.required && (value == null || value === ''))
      errors[field.key] = 'هذا الحقل مطلوب.';
    if (
      field.type === 'list' &&
      (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
    )
      errors[field.key] = 'أدخل قائمة نصوص صالحة.';
    if (field.type === 'number' && !Number.isInteger(value))
      errors[field.key] = 'أدخل عددًا صحيحًا.';
    if (
      field.type === 'url' &&
      value &&
      !isNetworkUrl(value, kind === 'stations')
    )
      errors[field.key] =
        kind === 'stations'
          ? 'أدخل رابط HTTP أو HTTPS صالحًا.'
          : 'أدخل رابط HTTPS صالحًا.';
    if (
      field.type === 'date' &&
      value &&
      (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    )
      errors[field.key] = 'أدخل تاريخًا صالحًا.';
    if (field.required && typeof value === 'string' && !value.trim())
      errors[field.key] = 'هذا الحقل مطلوب.';
  }
  for (const [key] of contentFlags[kind])
    if (typeof data[key] !== 'boolean') errors[key] = 'اختر حالة صالحة.';
  if (kind === 'locations' && Number(data.sortOrder) < 0)
    errors.sortOrder = 'الترتيب لا يمكن أن يكون سالبًا.';
  if (kind !== 'locations' && !Number.isInteger(data.priority))
    errors.priority = 'أدخل أولوية صحيحة.';
  if (
    (kind === 'stations' || kind === 'locations') &&
    data.countryCode !== 'YE'
  )
    errors.countryCode = 'المحتوى الحالي مخصص لليمن.';
  if (kind === 'stations' && (!data.cityCode || !data.cityNameAr))
    errors.location = 'اختر مدينة مرجعية.';
  if (kind === 'programs' && !data.stationId) errors.stationId = 'اختر المحطة.';
  if (kind === 'episodes') {
    if (!data.programId || !data.stationId)
      errors.programId = 'اختر برنامجًا تابعًا لمحطة.';
    if (Number(data.durationSeconds) < 0)
      errors.durationSeconds = 'المدة لا يمكن أن تكون سالبة.';
    if (
      Number(data.utcOffsetMinutes) < -720 ||
      Number(data.utcOffsetMinutes) > 840
    )
      errors.utcOffsetMinutes = 'فرق التوقيت خارج النطاق المسموح.';
  }
  if (kind === 'programs' && data.schedule != null) {
    const s = data.schedule as Record<string, unknown>;
    if (
      !Array.isArray(s.weekdays) ||
      !s.weekdays.length ||
      s.weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7) ||
      !Number.isInteger(s.startMinute) ||
      !Number.isInteger(s.endMinute) ||
      Number(s.startMinute) < 0 ||
      Number(s.startMinute) >= 1440 ||
      Number(s.endMinute) <= Number(s.startMinute) ||
      Number(s.endMinute) > 1440 ||
      !Number.isInteger(s.utcOffsetMinutes) ||
      Number(s.utcOffsetMinutes) < -720 ||
      Number(s.utcOffsetMinutes) > 840
    )
      errors.schedule =
        'اختر أيامًا وفترة صالحة تنتهي في اليوم نفسه وفرق توقيت صحيحًا.';
  }
  if (
    kind === 'banners' &&
    typeof data.startAt === 'string' &&
    typeof data.expiresAt === 'string' &&
    Date.parse(data.startAt) >= Date.parse(data.expiresAt)
  )
    errors.expiresAt = 'يجب أن تكون النهاية بعد البداية.';
  return errors;
}
export function contentPayload(
  kind: ContentKind,
  form: Record<string, unknown>,
): Record<string, unknown> {
  const keys = [
    ...contentFields[kind].map((f) => f.key),
    ...contentFlags[kind].map(([key]) => key),
    'priority',
  ];
  if (kind === 'stations' || kind === 'locations')
    keys.push('countryCode', 'countryNameAr', 'cityCode', 'cityNameAr');
  if (kind === 'programs') keys.push('stationId', 'schedule');
  if (kind === 'episodes') keys.push('programId', 'stationId');
  // Preserve existing banner target metadata, without offering unsupported navigation.
  if (kind === 'banners') keys.push('targetType', 'targetId', 'targetUrl');
  return Object.fromEntries(
    keys
      .filter((k) => form[k] !== undefined)
      .map((k) => [
        k,
        Array.isArray(form[k])
          ? (form[k] as string[]).map((v) => v.trim()).filter(Boolean)
          : typeof form[k] === 'string'
            ? (form[k] as string).trim()
            : form[k],
      ]),
  );
}

/** End-of-day midnight remains 1440 in the existing Firestore schedule contract. */
export function scheduleClock(minutes: unknown): string {
  if (
    typeof minutes !== 'number' ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 1440
  )
    return '';
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function scheduleMinutes(
  clock: string,
  endOfPeriod = false,
): number | '' {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock)) return '';
  const [hour, minute] = clock.split(':').map(Number);
  const value = hour * 60 + minute;
  return endOfPeriod && value === 0 ? 1440 : value;
}

export function editableSchedule(value: unknown): {
  weekdays: number[];
  startMinute: number | '';
  endMinute: number | '';
  utcOffsetMinutes: number | '';
} | null {
  if (value == null) return null;
  const data =
    typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    weekdays: Array.isArray(data.weekdays)
      ? data.weekdays.filter(
          (day): day is number =>
            typeof day === 'number' &&
            Number.isInteger(day) &&
            day >= 1 &&
            day <= 7,
        )
      : [],
    startMinute: typeof data.startMinute === 'number' ? data.startMinute : '',
    endMinute: typeof data.endMinute === 'number' ? data.endMinute : '',
    utcOffsetMinutes:
      typeof data.utcOffsetMinutes === 'number' ? data.utcOffsetMinutes : '',
  };
}

/** Firestore map key order is not content; array order still is. */
export function editableFingerprint(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, normalize(child)]),
      );
    return item;
  };
  return JSON.stringify(normalize(editableValue(value)));
}
