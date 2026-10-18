import * as XLSX from 'xlsx';
import {
  doc,
  getDocFromServer,
  Timestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import type { FirestoreRoot } from './firestore-environment';
import {
  contentPayload,
  editableFingerprint,
  validateContent,
} from './content-form.ts';
import { saveWithRelations } from './save-content.ts';

export type RowStatus = 'create' | 'update' | 'unchanged' | 'invalid';

export type FieldDiff = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type NormalizedProgramRow = {
  rowNumber: number;
  id: string;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
  errors: Record<string, string>;
  status: RowStatus;
  diff?: FieldDiff[];
  previous?: {
    reference: DocumentReference;
    data: Record<string, unknown>;
  };
};

export type NormalizedEpisodeRow = {
  rowNumber: number;
  id: string;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
  errors: Record<string, string>;
  status: RowStatus;
  diff?: FieldDiff[];
  previous?: {
    reference: DocumentReference;
    data: Record<string, unknown>;
  };
};

export type BatchImportPreview = {
  firestoreRoot: FirestoreRoot;
  programs: NormalizedProgramRow[];
  episodes: NormalizedEpisodeRow[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    newCount: number;
    updateCount: number;
    unchangedCount: number;
  };
  canCommit: boolean;
  hasErrors: boolean;
};

export type RowCommitOutcome = {
  id: string;
  kind: 'programs' | 'episodes';
  status: 'created' | 'updated' | 'unchanged' | 'failed';
  error?: string;
};

export type BatchImportCommitResult = {
  success: boolean;
  committedCount: number;
  skippedCount: number;
  failedCount: number;
  results: RowCommitOutcome[];
};

export type ParsedBatchSheets = {
  programsRaw: Array<{ rowNumber: number; data: Record<string, unknown> }>;
  episodesRaw: Array<{ rowNumber: number; data: Record<string, unknown> }>;
};

export type MockExistingLookup = {
  stations?: Map<string, Record<string, unknown>>;
  programs?: Map<string, Record<string, unknown>>;
  episodes?: Map<string, Record<string, unknown>>;
};

function safeText(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  return '';
}

// Aliases for header mapping
const PROGRAM_ALIASES: Record<string, string[]> = {
  stationId: [
    'stationid',
    'station_id',
    'station',
    'المحطة',
    'معرف المحطة',
    'معرف_المحطة',
  ],
  programId: [
    'programid',
    'program_id',
    'program',
    'id',
    'المعرف',
    'معرف البرنامج',
    'معرف_البرنامج',
  ],
  title: ['title', 'عنوان', 'العنوان', 'اسم البرنامج', 'اسم_البرنامج'],
  titleEn: ['titleen', 'title_en', 'العنوان بالإنجليزية', 'الاسم بالانجليزية'],
  weekdays: [
    'weekdays',
    'days',
    'أيام',
    'ايام',
    'أيام البث',
    'ايام البث',
    'أيام_البث',
  ],
  startTime: [
    'starttime',
    'start_time',
    'start',
    'وقت البدء',
    'وقت_البدء',
    'البدء',
  ],
  endTime: [
    'endtime',
    'end_time',
    'end',
    'وقت الانتهاء',
    'وقت_الانتهاء',
    'الانتهاء',
  ],
  utcOffsetMinutes: [
    'utcoffsetminutes',
    'utc_offset_minutes',
    'utcoffset',
    'فرق التوقيت',
    'فرق_التوقيت',
  ],
  isActive: [
    'isactive',
    'is_active',
    'active',
    'مفعل',
    'مفعّل',
    'ظاهر في التطبيق',
  ],
  isFeatured: ['isfeatured', 'is_featured', 'featured', 'مميز', 'برنامج مميز'],
  priority: ['priority', 'أولوية', 'الترتيب', 'الأولوية', 'أولوية العرض'],
  description: ['description', 'الوصف', 'وصف', 'نبذة'],
  coverUrl: ['coverurl', 'cover_url', 'رابط الغلاف', 'الغلاف'],
  thumbnailUrl: ['thumbnailurl', 'thumbnail_url', 'رابط الصورة المصغرة'],
  presenters: ['presenters', 'presenter', 'المقدمون', 'المقدم'],
  categories: ['categories', 'category', 'التصنيفات', 'التصنيف'],
};

const EPISODE_ALIASES: Record<string, string[]> = {
  episodeId: [
    'episodeid',
    'episode_id',
    'episode',
    'id',
    'المعرف',
    'معرف الحلقة',
    'معرف_الحلقة',
  ],
  programId: [
    'programid',
    'program_id',
    'program',
    'معرف البرنامج',
    'معرف_البرنامج',
    'البرنامج',
  ],
  title: ['title', 'عنوان', 'العنوان', 'اسم الحلقة', 'اسم_الحلقة'],
  audioUrl: [
    'audiourl',
    'audio_url',
    'audio',
    'رابط الصوت',
    'رابط الملف الصوتي',
  ],
  durationSec: [
    'durationsec',
    'duration_sec',
    'durationseconds',
    'duration_seconds',
    'duration',
    'المدة',
    'مدة الحلقة',
  ],
  broadcastAt: [
    'broadcastat',
    'broadcast_at',
    'broadcast',
    'تاريخ البث',
    'موعد البث',
    'موعد_البث',
  ],
  utcOffsetMinutes: [
    'utcoffsetminutes',
    'utc_offset_minutes',
    'utcoffset',
    'فرق التوقيت',
    'فرق_التوقيت',
  ],
  isPublished: [
    'ispublished',
    'is_published',
    'published',
    'منشور',
    'منشورة',
    'حالة النشر',
  ],
  isFeatured: ['isfeatured', 'is_featured', 'featured', 'مميز', 'حلقة مميزة'],
  priority: ['priority', 'أولوية', 'الترتيب', 'الأولوية', 'أولوية العرض'],
  description: ['description', 'الوصف', 'وصف'],
  coverUrl: ['coverurl', 'cover_url', 'رابط الغلاف', 'الغلاف'],
  presenter: ['presenter', 'المقدم'],
  guest: ['guest', 'الضيف'],
  publishedAt: ['publishedat', 'published_at', 'تاريخ النشر', 'تاريخ_النشر'],
};

/** Normalize row keys based on alias mapping. */
export function mapRowAliases(
  raw: Record<string, unknown>,
  aliases: Record<string, string[]>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const normalizedRaw: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    normalizedRaw[cleanKey] = value;
    normalizedRaw[key.trim()] = value;
  }

  for (const [canonical, syns] of Object.entries(aliases)) {
    if (raw[canonical] !== undefined) {
      result[canonical] = raw[canonical];
      continue;
    }
    let found = false;
    for (const syn of syns) {
      const cleanSyn = syn.toLowerCase().replace(/\s+/g, '_');
      if (normalizedRaw[cleanSyn] !== undefined) {
        result[canonical] = normalizedRaw[cleanSyn];
        found = true;
        break;
      }
      if (normalizedRaw[syn] !== undefined) {
        result[canonical] = normalizedRaw[syn];
        found = true;
        break;
      }
    }
    if (!found && raw[canonical] !== undefined) {
      result[canonical] = raw[canonical];
    }
  }

  return result;
}

/**
 * Parses an explicit boolean editorial decision.
 * Rejects missing, null, empty, or ambiguous values.
 */
export function parseExplicitBoolean(
  value: unknown,
): { valid: true; value: boolean } | { valid: false; reason: string } {
  if (value === null || value === undefined) {
    return {
      valid: false,
      reason:
        'القيمة مطلوبة كقيمة صريحة ولا يمكن استنتاجها من خلية فارغة.',
    };
  }
  if (typeof value === 'boolean') {
    return { valid: true, value };
  }
  if (typeof value === 'number') {
    if (value === 1) return { valid: true, value: true };
    if (value === 0) return { valid: true, value: false };
    return {
      valid: false,
      reason: 'القيمة الرقمية للبوليان يجب أن تكون 1 أو 0.',
    };
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (!s) {
      return {
        valid: false,
        reason:
          'القيمة مطلوبة كقيمة صريحة ولا يمكن استنتاجها من خلية فارغة.',
      };
    }
    if (
      [
        'true',
        'yes',
        'نعم',
        '1',
        'صواب',
        'مفعل',
        'مفعّل',
        'منشور',
        'منشورة',
        'صحيح',
      ].includes(s)
    ) {
      return { valid: true, value: true };
    }
    if (
      [
        'false',
        'no',
        'لا',
        '0',
        'خطأ',
        'معطل',
        'معطّل',
        'غير منشور',
        'غير منشورة',
        'غير صحيح',
      ].includes(s)
    ) {
      return { valid: true, value: false };
    }
    return {
      valid: false,
      reason: `قيمة منطقية غير صالحة: "${value}". أدخل صواب/خطأ أو نعم/لا.`,
    };
  }
  return { valid: false, reason: 'نوع بيانات غير صالح للقيمة المنطقية.' };
}

/**
 * Parses ISO weekdays: comma-separated numbers 1–7.
 * Rejects empty, non-integers, out of range (<1 or >7), and duplicates.
 */
export function parseScheduleWeekdays(
  value: unknown,
): { valid: true; weekdays: number[] } | { valid: false; reason: string } {
  if (value === null || value === undefined) {
    return { valid: false, reason: 'أيام الأسبوع مطلوبة.' };
  }
  let items: string[] = [];
  if (typeof value === 'number') {
    items = [String(value)];
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { valid: false, reason: 'أيام الأسبوع مطلوبة.' };
    // Check if Excel/SheetJS auto-formatted a 3-day weekday string like '1,3,6' into date '1/3/06' or '01/03/06'
    const dateMatch = trimmed.match(/^0?([1-7])\/0?([1-7])\/(?:20)?0?([1-7])$/);
    if (dateMatch) {
      items = [dateMatch[1], dateMatch[2], dateMatch[3]];
    } else {
      items = trimmed.split(/[,،\s]+/).filter(Boolean);
    }
  } else if (value instanceof Date && !isNaN(value.getTime())) {
    const m = value.getMonth() + 1;
    const d = value.getDate();
    const y = value.getFullYear() % 100;
    if (m >= 1 && m <= 7 && d >= 1 && d <= 7 && y >= 1 && y <= 7) {
      items = [String(m), String(d), String(y)];
    } else {
      return { valid: false, reason: 'صيغة أيام الأسبوع غير صالحة.' };
    }
  } else if (Array.isArray(value)) {
    items = value.map((x) => safeText(x)).filter(Boolean);
  } else {
    return { valid: false, reason: 'صيغة أيام الأسبوع غير صالحة.' };
  }

  if (items.length === 0) {
    return { valid: false, reason: 'أيام الأسبوع مطلوبة.' };
  }

  const days: number[] = [];
  const seen = new Set<number>();
  for (const item of items) {
    const n = Number(item);
    if (!Number.isInteger(n) || n < 1 || n > 7) {
      return {
        valid: false,
        reason: `اليوم "${item}" غير صالح؛ يجب أن يكون رقماً بين 1 و 7 (حسب المعيار ISO).`,
      };
    }
    if (seen.has(n)) {
      return { valid: false, reason: `تكرار اليوم ${n} غير مسموح.` };
    }
    seen.add(n);
    days.push(n);
  }

  days.sort((a, b) => a - b);
  return { valid: true, weekdays: days };
}

/**
 * Parses 24-hour clock time to integer minutes after midnight.
 * Accept '24:00' as the end-of-day sentinel mapped to 1440 if isEndTime=true.
 */
export function parseClockToMinutes(
  value: unknown,
  isEndTime = false,
): { valid: true; minutes: number } | { valid: false; reason: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, reason: 'الوقت مطلوب.' };
  }
  // Excel fractional day number (e.g. 0.3541666666666667 for 08:30)
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1) {
      const m = Math.round(value * 1440);
      if (isEndTime && m === 0) return { valid: true, minutes: 1440 };
      return { valid: true, minutes: m };
    }
  }

  const s = safeText(value);
  if (!s) return { valid: false, reason: 'الوقت مطلوب.' };
  if (isEndTime && s === '24:00') {
    return { valid: true, minutes: 1440 };
  }

  const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(s);
  if (!match) {
    return {
      valid: false,
      reason: `صيغة الوقت "${s}" غير صالحة؛ استخدم نظام 24 ساعة (HH:mm).`,
    };
  }

  const hours = Number(match[1]);
  const mins = Number(match[2]);
  const total = hours * 60 + mins;

  if (isEndTime && total === 0) {
    return { valid: true, minutes: 1440 };
  }

  return { valid: true, minutes: total };
}

/**
 * Parses Date/Time value to an ISO 8601 string.
 */
export function parseDateTimeToIso(
  value: unknown,
): { valid: true; iso: string } | { valid: false; reason: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, reason: 'تاريخ وموعد البث مطلوب.' };
  }
  if (value instanceof Date) {
    if (Number.isFinite(value.getTime())) {
      return { valid: true, iso: value.toISOString() };
    }
    return { valid: false, reason: 'تاريخ غير صالح.' };
  }
  if (typeof value === 'number') {
    // Excel serial date code
    if (value > 20000 && value < 80000) {
      const ms = Math.round((value - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (Number.isFinite(d.getTime())) {
        return { valid: true, iso: d.toISOString() };
      }
    }
  }

  const s = safeText(value);
  if (!s) return { valid: false, reason: 'تاريخ وموعد البث مطلوب.' };

  const parsed = Date.parse(s);
  if (!Number.isFinite(parsed)) {
    return { valid: false, reason: `تاريخ غير صالح: "${s}".` };
  }
  return { valid: true, iso: new Date(parsed).toISOString() };
}

/** Validates Firestore document ID format. */
export function validateDocumentId(
  id: unknown,
  fieldName: string,
): { valid: true; id: string } | { valid: false; reason: string } {
  if (typeof id !== 'string' || !id.trim()) {
    return { valid: false, reason: `${fieldName} مطلوب كمعرّف ثابت.` };
  }
  const trimmed = id.trim();
  if (trimmed.includes('/')) {
    return {
      valid: false,
      reason: `${fieldName} لا يمكن أن يحتوي على علامة سلاش (/).`,
    };
  }
  if (trimmed === '.' || trimmed === '..' || trimmed.startsWith('__')) {
    return {
      valid: false,
      reason: `${fieldName} يحتوي على نمط معرّف محجوز غير مسموح.`,
    };
  }
  return { valid: true, id: trimmed };
}

/**
 * Normalizes and validates a single Program row.
 */
export function normalizeProgramRow(
  rawRow: Record<string, unknown>,
  rowNumber: number,
): NormalizedProgramRow {
  const mapped = mapRowAliases(rawRow, PROGRAM_ALIASES);
  const errors: Record<string, string> = {};

  // 1. Program ID
  const idResult = validateDocumentId(mapped.programId, 'programId');
  const programId = idResult.valid ? idResult.id : '';
  if (!idResult.valid) {
    errors.programId = idResult.reason;
  }

  // 2. Station ID
  const stationIdRaw = safeText(mapped.stationId);
  if (!stationIdRaw) {
    errors.stationId = 'معرّف المحطة (stationId) مطلوب.';
  } else if (stationIdRaw.includes('/')) {
    errors.stationId = 'معرّف المحطة لا يمكن أن يحتوي على سلاش (/).';
  }

  // 3. Title
  const title = safeText(mapped.title);
  if (!title) {
    errors.title = 'عنوان البرنامج مطلوب.';
  }

  // 4. Schedule conversion
  const weekdaysRes = parseScheduleWeekdays(mapped.weekdays);
  if (!weekdaysRes.valid) {
    errors.weekdays = weekdaysRes.reason;
  }

  const startRes = parseClockToMinutes(mapped.startTime, false);
  if (!startRes.valid) {
    errors.startTime = startRes.reason;
  }

  const endRes = parseClockToMinutes(mapped.endTime, true);
  if (!endRes.valid) {
    errors.endTime = endRes.reason;
  }

  if (startRes.valid && endRes.valid) {
    if (endRes.minutes <= startRes.minutes) {
      errors.endTime = `وقت الانتهاء (${endRes.minutes}) يجب أن يكون بعد وقت البدء (${startRes.minutes}) وفي نفس اليوم.`;
    }
  }

  // 5. UTC Offset
  const offsetNum = Number(mapped.utcOffsetMinutes);
  if (!Number.isInteger(offsetNum) || offsetNum !== 180) {
    errors.utcOffsetMinutes =
      'فرق التوقيت (utcOffsetMinutes) يجب أن يساوي 180 لمحتوى اليمن.';
  }

  // 6. Flags
  const activeRes = parseExplicitBoolean(mapped.isActive);
  if (!activeRes.valid) {
    errors.isActive = activeRes.reason;
  }

  const featuredRes = parseExplicitBoolean(mapped.isFeatured);
  if (!featuredRes.valid) {
    errors.isFeatured = featuredRes.reason;
  }

  // 7. Priority
  const prioNum = Number(mapped.priority);
  if (!Number.isInteger(prioNum)) {
    errors.priority = 'الأولوية (priority) مطلوبة كعدد صحيح.';
  }

  // Optional fields
  const parseList = (val: unknown): string[] => {
    if (Array.isArray(val)) return val.map((x) => safeText(x)).filter(Boolean);
    if (typeof val === 'string') {
      return val
        .split(/[\n,،]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const normalized: Record<string, unknown> = {
    stationId: stationIdRaw,
    title,
    titleEn: typeof mapped.titleEn === 'string' ? mapped.titleEn.trim() : '',
    description:
      typeof mapped.description === 'string' ? mapped.description.trim() : '',
    coverUrl: typeof mapped.coverUrl === 'string' ? mapped.coverUrl.trim() : '',
    thumbnailUrl:
      typeof mapped.thumbnailUrl === 'string'
        ? mapped.thumbnailUrl.trim()
        : '',
    presenters: parseList(mapped.presenters),
    categories: parseList(mapped.categories),
    schedule: {
      weekdays: weekdaysRes.valid ? weekdaysRes.weekdays : [],
      startMinute: startRes.valid ? startRes.minutes : 0,
      endMinute: endRes.valid ? endRes.minutes : 0,
      utcOffsetMinutes: 180,
    },
    isActive: activeRes.valid ? activeRes.value : false,
    isFeatured: featuredRes.valid ? featuredRes.value : false,
    priority: Number.isInteger(prioNum) ? prioNum : 0,
  };

  // Run shared content validation
  const sharedErrors = validateContent('programs', normalized);
  for (const [k, msg] of Object.entries(sharedErrors)) {
    if (!errors[k]) errors[k] = msg;
  }

  const payload = contentPayload('programs', normalized);

  return {
    rowNumber,
    id: programId,
    raw: rawRow,
    normalized: payload,
    errors,
    status: Object.keys(errors).length > 0 ? 'invalid' : 'create',
  };
}

/**
 * Normalizes and validates a single Episode row.
 */
export function normalizeEpisodeRow(
  rawRow: Record<string, unknown>,
  rowNumber: number,
): NormalizedEpisodeRow {
  const mapped = mapRowAliases(rawRow, EPISODE_ALIASES);
  const errors: Record<string, string> = {};

  // 1. Episode ID
  const idResult = validateDocumentId(mapped.episodeId, 'episodeId');
  const episodeId = idResult.valid ? idResult.id : '';
  if (!idResult.valid) {
    errors.episodeId = idResult.reason;
  }

  // 2. Program ID
  const progIdRaw = safeText(mapped.programId);
  if (!progIdRaw) {
    errors.programId = 'معرّف البرنامج (programId) مطلوب.';
  } else if (progIdRaw.includes('/')) {
    errors.programId = 'معرّف البرنامج لا يمكن أن يحتوي على سلاش (/).';
  }

  // 3. Title
  const title = safeText(mapped.title);
  if (!title) {
    errors.title = 'عنوان الحلقة مطلوب.';
  }

  // 4. Audio URL (Strict HTTPS with authority)
  const audioUrlRaw =
    typeof mapped.audioUrl === 'string' ? mapped.audioUrl.trim() : '';
  if (!audioUrlRaw) {
    errors.audioUrl = 'رابط الملف الصوتي مطلوب.';
  } else {
    try {
      const u = new URL(audioUrlRaw);
      if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) {
        errors.audioUrl =
          'رابط الصوت يجب أن يكون رابط HTTPS صالحاً يحتوي على خادم/نطاق وبدون بيانات اعتماد.';
      }
    } catch {
      errors.audioUrl = 'رابط الصوت غير صالح.';
    }
  }

  // 5. Duration (Seconds)
  const durNum = Number(mapped.durationSec);
  if (!Number.isInteger(durNum) || durNum < 0) {
    errors.durationSec =
      'مدة الحلقة (durationSec) يجب أن تكون عدداً صحيحاً غير سالب بالثواني.';
  }

  // 6. Broadcast At
  const broadcastRes = parseDateTimeToIso(mapped.broadcastAt);
  if (!broadcastRes.valid) {
    errors.broadcastAt = broadcastRes.reason;
  }

  // 7. UTC Offset
  const offsetNum = Number(mapped.utcOffsetMinutes);
  if (!Number.isInteger(offsetNum) || offsetNum !== 180) {
    errors.utcOffsetMinutes =
      'فرق التوقيت (utcOffsetMinutes) يجب أن يساوي 180 لمحتوى اليمن.';
  }

  // 8. Flags
  const publishedRes = parseExplicitBoolean(mapped.isPublished);
  if (!publishedRes.valid) {
    errors.isPublished = publishedRes.reason;
  }

  const featuredRes = parseExplicitBoolean(mapped.isFeatured);
  if (!featuredRes.valid) {
    errors.isFeatured = featuredRes.reason;
  }

  // 9. Priority
  const prioNum = Number(mapped.priority);
  if (!Number.isInteger(prioNum)) {
    errors.priority = 'الأولوية (priority) مطلوبة كعدد صحيح.';
  }

  // Optional publishedAt
  let publishedAtIso: string | null = null;
  if (mapped.publishedAt) {
    const pubRes = parseDateTimeToIso(mapped.publishedAt);
    if (pubRes.valid) {
      publishedAtIso = pubRes.iso;
    } else {
      errors.publishedAt = pubRes.reason;
    }
  }

  const normalized: Record<string, unknown> = {
    programId: progIdRaw,
    stationId: '', // To be derived in relationship resolution phase!
    title,
    description:
      typeof mapped.description === 'string' ? mapped.description.trim() : '',
    audioUrl: audioUrlRaw,
    durationSeconds: Number.isInteger(durNum) && durNum >= 0 ? durNum : 0,
    coverUrl: typeof mapped.coverUrl === 'string' ? mapped.coverUrl.trim() : '',
    presenter:
      typeof mapped.presenter === 'string' ? mapped.presenter.trim() : '',
    guest: typeof mapped.guest === 'string' ? mapped.guest.trim() : '',
    broadcastAt: broadcastRes.valid
      ? broadcastRes.iso
      : new Date().toISOString(),
    utcOffsetMinutes: 180,
    publishedAt: publishedAtIso,
    isPublished: publishedRes.valid ? publishedRes.value : false,
    isFeatured: featuredRes.valid ? featuredRes.value : false,
    priority: Number.isInteger(prioNum) ? prioNum : 0,
  };

  return {
    rowNumber,
    id: episodeId,
    raw: rawRow,
    normalized,
    errors,
    status: Object.keys(errors).length > 0 ? 'invalid' : 'create',
  };
}

/**
 * Converts formatted dates in a data object to Firestore Timestamps.
 */
export function toFirestorePayload(
  value: unknown,
  key = '',
): unknown {
  if (Array.isArray(value))
    return value.map((item) => toFirestorePayload(item));
  if (value && typeof value === 'object') {
    if (value instanceof Timestamp) return value;
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        toFirestorePayload(childValue, childKey),
      ]),
    );
  }
  if (
    typeof value === 'string' &&
    /(At|Date)$/.test(key) &&
    Number.isFinite(Date.parse(value))
  ) {
    return Timestamp.fromDate(new Date(value));
  }
  return value;
}

/**
 * Parses an XLSX/CSV workbook or file buffer into raw program and episode rows.
 */
export function parseBatchImportWorkbook(
  data: ArrayBuffer | Uint8Array | string,
): ParsedBatchSheets {
  let isZip = false;
  if (typeof data !== 'string') {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  }

  const workbook =
    typeof data === 'string'
      ? XLSX.read(data, { type: 'string', raw: true })
      : isZip
        ? XLSX.read(data, { type: 'array', cellDates: true })
        : XLSX.read(data, { type: 'array', raw: true });

  let programsSheetName: string | null = null;
  let episodesSheetName: string | null = null;

  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase().trim();
    if (
      lower.includes('program') ||
      lower.includes('برامج') ||
      lower.includes('البرامج')
    ) {
      if (!programsSheetName) programsSheetName = name;
    } else if (
      lower.includes('episode') ||
      lower.includes('حلقات') ||
      lower.includes('الحلقات')
    ) {
      if (!episodesSheetName) episodesSheetName = name;
    }
  }

  // Fallback: If 2 sheets and not matched by name
  if (workbook.SheetNames.length === 2) {
    if (!programsSheetName && !episodesSheetName) {
      programsSheetName = workbook.SheetNames[0];
      episodesSheetName = workbook.SheetNames[1];
    } else if (programsSheetName && !episodesSheetName) {
      episodesSheetName = workbook.SheetNames.find(
        (n) => n !== programsSheetName,
      )!;
    } else if (!programsSheetName && episodesSheetName) {
      programsSheetName = workbook.SheetNames.find(
        (n) => n !== episodesSheetName,
      )!;
    }
  } else if (workbook.SheetNames.length === 1) {
    // Single sheet: determine by header inspection
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const firstRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      range: 0,
      defval: '',
    });
    const headerRow = (firstRows[0] as unknown as string[]) || [];
    const headerStr = headerRow
      .map((x) => (typeof x === 'string' ? x.toLowerCase() : ''))
      .join(' ');

    if (headerStr.includes('episode') || headerStr.includes('audiourl')) {
      episodesSheetName = sheetName;
    } else {
      programsSheetName = sheetName;
    }
  }

  const parseSheetRows = (sheetName: string | null) => {
    if (!sheetName || !workbook.Sheets[sheetName]) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      {
        defval: '',
        raw: false,
      },
    );
    return rows
      .map((data, idx) => ({ rowNumber: idx + 2, data }))
      .filter((r) =>
        Object.values(r.data).some((val) => safeText(val) !== ''),
      );
  };

  return {
    programsRaw: parseSheetRows(programsSheetName),
    episodesRaw: parseSheetRows(episodesSheetName),
  };
}

/**
 * Parses separate files (programs / episodes) if provided individually.
 */
export function parseBatchImportFromFiles(files: {
  workbook?: ArrayBuffer | Uint8Array;
  programs?: string | ArrayBuffer | Uint8Array;
  episodes?: string | ArrayBuffer | Uint8Array;
}): ParsedBatchSheets {
  if (files.workbook) {
    return parseBatchImportWorkbook(files.workbook);
  }

  let programsRaw: Array<{ rowNumber: number; data: Record<string, unknown> }> =
    [];
  let episodesRaw: Array<{ rowNumber: number; data: Record<string, unknown> }> =
    [];

  if (files.programs) {
    const res = parseBatchImportWorkbook(files.programs);
    programsRaw =
      res.programsRaw.length > 0 ? res.programsRaw : res.episodesRaw;
  }

  if (files.episodes) {
    const res = parseBatchImportWorkbook(files.episodes);
    episodesRaw =
      res.episodesRaw.length > 0 ? res.episodesRaw : res.programsRaw;
  }

  return { programsRaw, episodesRaw };
}

/**
 * Compares two objects and returns differences between fields.
 */
function computeFieldDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const k of keys) {
    if (k === 'stats' || k === 'createdAt' || k === 'updatedAt') continue;
    const oldVal = oldData[k];
    const newVal = newData[k];
    const oldFp = editableFingerprint(oldVal);
    const newFp = editableFingerprint(newVal);
    if (oldFp !== newFp) {
      diffs.push({ field: k, oldValue: oldVal, newValue: newVal });
    }
  }
  return diffs;
}

/**
 * Resolves relationships, validates against Firestore, and creates the preview.
 */
export async function previewBatchImport(
  firestore: Firestore,
  firestoreRoot: FirestoreRoot,
  sheets: ParsedBatchSheets,
  options?: { mockExisting?: MockExistingLookup },
): Promise<BatchImportPreview> {
  if (!['HudHudDev', 'HudHudOfficial'].includes(firestoreRoot)) {
    throw new Error(`جذر Firestore غير صالح: "${firestoreRoot}".`);
  }

  const mock = options?.mockExisting;
  const isMock = !!mock;

  // 1. Initial normalization
  const normalizedPrograms = sheets.programsRaw.map((r) =>
    normalizeProgramRow(r.data, r.rowNumber),
  );
  const normalizedEpisodes = sheets.episodesRaw.map((r) =>
    normalizeEpisodeRow(r.data, r.rowNumber),
  );

  // Map of programs in the current batch for quick lookup
  const batchProgramsMap = new Map<string, NormalizedProgramRow>();
  for (const p of normalizedPrograms) {
    if (p.id) batchProgramsMap.set(p.id, p);
  }

  // 2. Fetch referenced Stations from Firestore / Mock
  const neededStationIds = new Set<string>();
  for (const p of normalizedPrograms) {
    const stId = safeText(p.normalized.stationId);
    if (stId) {
      neededStationIds.add(stId);
    }
  }

  const existingStations = new Map<string, Record<string, unknown>>();
  for (const stId of neededStationIds) {
    if (isMock) {
      const found = mock.stations?.get(stId);
      if (found) existingStations.set(stId, found);
    } else {
      try {
        const ref = doc(firestore, `${firestoreRoot}/stations/stations`, stId);
        const snap = await getDocFromServer(ref);
        if (snap.exists()) {
          existingStations.set(stId, snap.data());
        }
      } catch {
        // Station not found or permission error
      }
    }
  }

  // 3. Validate Program relationships and verify existing Programs in Firestore
  for (const p of normalizedPrograms) {
    const stId = safeText(p.normalized.stationId);
    if (!existingStations.has(stId)) {
      p.errors.stationId = `المحطة المرتبطة ("${stId}") غير موجودة في بيئة "${firestoreRoot}".`;
      p.status = 'invalid';
    }

    if (p.id && p.status !== 'invalid') {
      let existingDoc: Record<string, unknown> | null = null;
      let existingRef: DocumentReference | null = null;

      if (isMock) {
        existingDoc = mock.programs?.get(p.id) || null;
      } else {
        const ref = doc(firestore, `${firestoreRoot}/programs/programs`, p.id);
        existingRef = ref;
        try {
          const snap = await getDocFromServer(ref);
          if (snap.exists()) {
            existingDoc = snap.data();
          }
        } catch {
          // New doc
        }
      }

      if (existingDoc) {
        const curFp = editableFingerprint(
          contentPayload('programs', existingDoc),
        );
        const newFp = editableFingerprint(
          contentPayload('programs', p.normalized),
        );
        if (curFp === newFp) {
          p.status = 'unchanged';
        } else {
          p.status = 'update';
          p.diff = computeFieldDiff(existingDoc, p.normalized);
          if (existingRef) {
            p.previous = { reference: existingRef, data: existingDoc };
          }
        }
      } else {
        p.status = 'create';
      }
    }
  }

  // 4. Fetch Programs needed by Episodes (either from batch or from Firestore / Mock)
  const neededProgramIds = new Set<string>();
  for (const ep of normalizedEpisodes) {
    const prId = safeText(ep.normalized.programId);
    if (prId) {
      neededProgramIds.add(prId);
    }
  }

  const existingPrograms = new Map<string, Record<string, unknown>>();
  for (const prId of neededProgramIds) {
    if (batchProgramsMap.has(prId)) {
      existingPrograms.set(prId, batchProgramsMap.get(prId)!.normalized);
    } else if (isMock) {
      const found = mock.programs?.get(prId);
      if (found) existingPrograms.set(prId, found);
    } else {
      try {
        const ref = doc(firestore, `${firestoreRoot}/programs/programs`, prId);
        const snap = await getDocFromServer(ref);
        if (snap.exists()) {
          existingPrograms.set(prId, snap.data());
        }
      } catch {
        // Program not found
      }
    }
  }

  // Also fetch stations for any program not in current batch
  for (const [, prData] of existingPrograms) {
    const stId = safeText(prData.stationId);
    if (stId && !existingStations.has(stId)) {
      if (isMock) {
        const found = mock.stations?.get(stId);
        if (found) existingStations.set(stId, found);
      } else {
        try {
          const ref = doc(
            firestore,
            `${firestoreRoot}/stations/stations`,
            stId,
          );
          const snap = await getDocFromServer(ref);
          if (snap.exists()) {
            existingStations.set(stId, snap.data());
          }
        } catch {
          // not found
        }
      }
    }
  }

  // 5. Validate Episode relationships and derive stationId
  for (const ep of normalizedEpisodes) {
    const prId = safeText(ep.normalized.programId);
    const referencedProgram = existingPrograms.get(prId);

    if (!referencedProgram) {
      ep.errors.programId = `البرنامج المرتبط ("${prId}") غير موجود في بيئة "${firestoreRoot}" ولا في ورقة البرامج.`;
      ep.status = 'invalid';
    } else {
      const derivedStationId = safeText(referencedProgram.stationId);
      if (!derivedStationId || !existingStations.has(derivedStationId)) {
        ep.errors.programId = `محطة البرنامج المرتبط ("${derivedStationId}") غير موجودة في بيئة "${firestoreRoot}".`;
        ep.status = 'invalid';
      } else {
        ep.normalized.stationId = derivedStationId;
      }
    }

    // Run shared content validation on episode after stationId derivation
    const sharedErrors = validateContent('episodes', ep.normalized);
    for (const [k, msg] of Object.entries(sharedErrors)) {
      if (!ep.errors[k]) ep.errors[k] = msg;
    }
    if (Object.keys(ep.errors).length > 0) {
      ep.status = 'invalid';
    }

    // 6. Check existing Episodes in Firestore
    if (ep.id && ep.status !== 'invalid') {
      let existingDoc: Record<string, unknown> | null = null;
      let existingRef: DocumentReference | null = null;

      if (isMock) {
        existingDoc = mock.episodes?.get(ep.id) || null;
      } else {
        const ref = doc(firestore, `${firestoreRoot}/episodes/episodes`, ep.id);
        existingRef = ref;
        try {
          const snap = await getDocFromServer(ref);
          if (snap.exists()) {
            existingDoc = snap.data();
          }
        } catch {
          // New doc
        }
      }

      if (existingDoc) {
        const curFp = editableFingerprint(
          contentPayload('episodes', existingDoc),
        );
        const newFp = editableFingerprint(
          contentPayload('episodes', ep.normalized),
        );
        if (curFp === newFp) {
          ep.status = 'unchanged';
        } else {
          ep.status = 'update';
          ep.diff = computeFieldDiff(existingDoc, ep.normalized);
          if (existingRef) {
            ep.previous = { reference: existingRef, data: existingDoc };
          }
        }
      } else {
        ep.status = 'create';
      }
    }
  }

  // 7. Calculate summary
  const allRows = [...normalizedPrograms, ...normalizedEpisodes];
  const totalRows = allRows.length;
  const invalidRows = allRows.filter((r) => r.status === 'invalid').length;
  const validRows = totalRows - invalidRows;
  const newCount = allRows.filter((r) => r.status === 'create').length;
  const updateCount = allRows.filter((r) => r.status === 'update').length;
  const unchangedCount = allRows.filter((r) => r.status === 'unchanged').length;

  const hasErrors = invalidRows > 0;
  const canCommit = !hasErrors && totalRows > 0;

  return {
    firestoreRoot,
    programs: normalizedPrograms,
    episodes: normalizedEpisodes,
    summary: {
      totalRows,
      validRows,
      invalidRows,
      newCount,
      updateCount,
      unchangedCount,
    },
    canCommit,
    hasErrors,
  };
}

/**
 * Commits valid rows through the relationship-aware save flow (saveWithRelations).
 * Strict safety: Rejects if preview has errors, isolates partial failures,
 * supports retries without duplicating unchanged documents.
 */
export async function commitBatchImport(
  firestore: Firestore,
  firestoreRoot: FirestoreRoot,
  preview: BatchImportPreview,
  options?: {
    allowUpdates?: boolean;
    onProgress?: (progress: {
      current: number;
      total: number;
      currentId: string;
    }) => void;
  },
): Promise<BatchImportCommitResult> {
  if (preview.hasErrors || !preview.canCommit) {
    throw new Error(
      'لا يمكن تنفيذ الاستيراد مع وجود صفوف غير صالحة. يرجى تصحيح الأخطاء في الجدول وإعادة المحاولة.',
    );
  }

  const allowUpdates = !!options?.allowUpdates;
  const results: RowCommitOutcome[] = [];
  let committedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const total = preview.programs.length + preview.episodes.length;
  let step = 0;

  // 1. Commit Programs first so newly created programs exist for episodes
  for (const prog of preview.programs) {
    step++;
    options?.onProgress?.({
      current: step,
      total,
      currentId: prog.id,
    });

    if (prog.status === 'unchanged') {
      skippedCount++;
      results.push({ id: prog.id, kind: 'programs', status: 'unchanged' });
      continue;
    }

    if (prog.status === 'update' && !allowUpdates) {
      failedCount++;
      results.push({
        id: prog.id,
        kind: 'programs',
        status: 'failed',
        error: 'تحديث البرنامج يتطلب تفعيل خيار "السماح بتحديث السجلات الموجودة".',
      });
      continue;
    }

    try {
      const payload = toFirestorePayload(prog.normalized) as Record<
        string,
        unknown
      >;
      const defaults =
        prog.status === 'create'
          ? { episodesCount: 0, subscribersCount: 0, totalPlays: 0 }
          : undefined;

      await saveWithRelations(
        firestore,
        firestoreRoot,
        'programs',
        `${firestoreRoot}/programs/programs`,
        prog.id,
        payload,
        prog.previous || null,
        undefined,
        defaults,
      );

      committedCount++;
      results.push({
        id: prog.id,
        kind: 'programs',
        status: prog.status === 'create' ? 'created' : 'updated',
      });
    } catch (err: unknown) {
      failedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        id: prog.id,
        kind: 'programs',
        status: 'failed',
        error: msg,
      });
    }
  }

  // 2. Commit Episodes
  for (const ep of preview.episodes) {
    step++;
    options?.onProgress?.({
      current: step,
      total,
      currentId: ep.id,
    });

    if (ep.status === 'unchanged') {
      skippedCount++;
      results.push({ id: ep.id, kind: 'episodes', status: 'unchanged' });
      continue;
    }

    if (ep.status === 'update' && !allowUpdates) {
      failedCount++;
      results.push({
        id: ep.id,
        kind: 'episodes',
        status: 'failed',
        error: 'تحديث الحلقة يتطلب تفعيل خيار "السماح بتحديث السجلات الموجودة".',
      });
      continue;
    }

    try {
      const payload = toFirestorePayload(ep.normalized) as Record<
        string,
        unknown
      >;
      const defaults =
        ep.status === 'create'
          ? { playsCount: 0, likesCount: 0, commentsCount: 0 }
          : undefined;

      await saveWithRelations(
        firestore,
        firestoreRoot,
        'episodes',
        `${firestoreRoot}/episodes/episodes`,
        ep.id,
        payload,
        ep.previous || null,
        undefined,
        defaults,
      );

      committedCount++;
      results.push({
        id: ep.id,
        kind: 'episodes',
        status: ep.status === 'create' ? 'created' : 'updated',
      });
    } catch (err: unknown) {
      failedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        id: ep.id,
        kind: 'episodes',
        status: 'failed',
        error: msg,
      });
    }
  }

  return {
    success: failedCount === 0,
    committedCount,
    skippedCount,
    failedCount,
    results,
  };
}

/**
 * Creates a clean, contract-compliant XLSX workbook template with
 * Programs and Episodes sheets and realistic sample data.
 */
export function createBatchImportTemplateWorkbook(): XLSX.WorkBook {
  const programsData = [
    {
      stationId: 's1_1',
      programId: 'prog_sabah_yemen',
      title: 'صباح الخير يا يمن',
      weekdays: '1,2,3,4,5',
      startTime: '08:00',
      endTime: '09:30',
      utcOffsetMinutes: 180,
      isActive: true,
      isFeatured: true,
      priority: 1,
      description: 'برنامج صباحي يومي يناقش قضايا التنمية والمجتمع اليمني',
    },
    {
      stationId: 's1_1',
      programId: 'prog_torath',
      title: 'ألحان من التراث',
      weekdays: '5,6',
      startTime: '20:00',
      endTime: '21:30',
      utcOffsetMinutes: 180,
      isActive: true,
      isFeatured: false,
      priority: 2,
      description: 'جولة أسبوعية في الموسيقى والأهازيج الشعبية والتراثية',
    },
  ];

  const episodesData = [
    {
      episodeId: 'ep_sabah_101',
      programId: 'prog_sabah_yemen',
      title: 'الحلقة 101: افتتاح موسم البن اليمني',
      audioUrl: 'https://audio.hudhud.fm/episodes/sabah-101.mp3',
      durationSec: 3600,
      broadcastAt: '2026-10-15T08:00:00+03:00',
      utcOffsetMinutes: 180,
      isPublished: true,
      isFeatured: true,
      priority: 1,
      description: 'تغطية خاصة ومقابلات مع مزارعي البن في بني مطر وحراز',
    },
    {
      episodeId: 'ep_sabah_102',
      programId: 'prog_sabah_yemen',
      title: 'الحلقة 102: مبادرات التعليم والتقنية',
      audioUrl: 'https://audio.hudhud.fm/episodes/sabah-102.mp3',
      durationSec: 3450,
      broadcastAt: '2026-10-16T08:00:00+03:00',
      utcOffsetMinutes: 180,
      isPublished: true,
      isFeatured: false,
      priority: 2,
      description: 'حوار مفتوح حول التعليم الرقمي والمبادرات الشبابية في اليمن',
    },
  ];

  const wb = XLSX.utils.book_new();

  const wsPrograms = XLSX.utils.json_to_sheet(programsData, {
    header: [
      'stationId',
      'programId',
      'title',
      'weekdays',
      'startTime',
      'endTime',
      'utcOffsetMinutes',
      'isActive',
      'isFeatured',
      'priority',
      'description',
    ],
  });
  wsPrograms['!cols'] = [
    { wch: 16 }, // stationId
    { wch: 20 }, // programId
    { wch: 24 }, // title
    { wch: 14 }, // weekdays
    { wch: 12 }, // startTime
    { wch: 12 }, // endTime
    { wch: 18 }, // utcOffsetMinutes
    { wch: 12 }, // isActive
    { wch: 12 }, // isFeatured
    { wch: 10 }, // priority
    { wch: 45 }, // description
  ];

  const wsEpisodes = XLSX.utils.json_to_sheet(episodesData, {
    header: [
      'episodeId',
      'programId',
      'title',
      'audioUrl',
      'durationSec',
      'broadcastAt',
      'utcOffsetMinutes',
      'isPublished',
      'isFeatured',
      'priority',
      'description',
    ],
  });
  wsEpisodes['!cols'] = [
    { wch: 18 }, // episodeId
    { wch: 20 }, // programId
    { wch: 35 }, // title
    { wch: 45 }, // audioUrl
    { wch: 14 }, // durationSec
    { wch: 28 }, // broadcastAt
    { wch: 18 }, // utcOffsetMinutes
    { wch: 14 }, // isPublished
    { wch: 12 }, // isFeatured
    { wch: 10 }, // priority
    { wch: 50 }, // description
  ];

  XLSX.utils.book_append_sheet(wb, wsPrograms, 'البرامج');
  XLSX.utils.book_append_sheet(wb, wsEpisodes, 'الحلقات');

  return wb;
}

/**
 * Options for downloading the batch import template.
 */
export interface BatchImportTemplateDownloadOptions {
  root?: string;
  filename?: string;
}

/**
 * Initiates an automatic download of the import template Excel file in browser.
 * Generates a descriptive filename by default, e.g. `hudhud-programs-and-episodes-template-HudHudOfficial-2026-10-19.xlsx`.
 */
export function downloadBatchImportTemplate(
  optionsOrFilename?: string | BatchImportTemplateDownloadOptions,
): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  let finalFilename: string;
  if (typeof optionsOrFilename === 'string') {
    finalFilename = optionsOrFilename;
  } else if (optionsOrFilename && typeof optionsOrFilename === 'object') {
    finalFilename =
      optionsOrFilename.filename ||
      `hudhud-programs-and-episodes-template-${optionsOrFilename.root ? `${optionsOrFilename.root}-` : ''}${dateStr}.xlsx`;
  } else {
    finalFilename = `hudhud-programs-and-episodes-template-${dateStr}.xlsx`;
  }
  const wb = createBatchImportTemplateWorkbook();
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    XLSX.writeFile(wb, finalFilename, { compression: true });
  }
  return finalFilename;
}

