import type { Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { ResourceKey } from './admin-resources';
import type { FirestoreRoot } from './firestore-environment';
import { isContentKind, contentPayload } from './content-form.ts';
import { publicStationData, stationPrivacyRequestOptions, type StationPrivacyOptions } from './station-private.ts';

type Reference = { path: string; id?: string };
type Previous = { reference: Reference; data: Record<string, unknown> } | null;
export type AdminSaveRequest = {
  root: FirestoreRoot;
  kind: ResourceKey;
  id: string;
  content: Record<string, unknown>;
  expected: Record<string, unknown> | null;
  locationId?: string;
  source: 'editor' | 'import';
  expectedPrivateRevision?: number | null;
  deletePrivateFields?: readonly string[];
};
type AdminSaveResult = {
  success: boolean;
  id: string;
  action: 'create' | 'update' | 'unchanged';
};

export function contentError(message: string, code?: string): Error {
  const error: Error & { code?: string } = new Error(message);
  error.name = 'ContentError';
  if (code) error.code = code;
  return error;
}
export function portable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  )
    return value.toDate().toISOString();
  if (value && typeof value === 'object' && 'firestore' in value && 'path' in value && typeof value.path === 'string') return { referencePath: value.path };
  if (value && typeof value === 'object' && 'isEqual' in value && typeof value.isEqual === 'function' && 'latitude' in value && 'longitude' in value) return { latitude: value.latitude, longitude: value.longitude };
  if (Array.isArray(value)) return value.map(portable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, portable(item)]),
    );
  return value;
}

export function buildAdminSaveRequest(
  root: FirestoreRoot,
  kind: ResourceKey,
  path: string,
  id: string,
  data: Record<string, unknown>,
  previous: Previous,
  location?: Reference,
  source: 'editor' | 'import' = 'editor',
  privacy?: StationPrivacyOptions,
): AdminSaveRequest {
  if (
    !['HudHudDev', 'HudHudOfficial'].includes(root) ||
    !isContentKind(kind) ||
    path !== `${root}/${kind}/${kind}` ||
    !id ||
    id.trim() !== id ||
    id.length > 128 ||
    id.includes('/') ||
    id === '.' ||
    id === '..'
  )
    throw contentError('مسار المحتوى أو بيئة الإدارة غير صالح.');
  if (previous && previous.reference.path !== `${path}/${id}`)
    throw contentError('السجل السابق لا يطابق مسار الحفظ.');
  if (
    location &&
    (location.path.split('/').length !== 4 ||
      !location.path.startsWith(`${root}/locations/locations/`))
  )
    throw contentError('مرجع المدينة خارج بيئة الإدارة المحددة.');
  const content = portable(contentPayload(kind, data)) as Record<string, unknown>;
  const privacyOptions = stationPrivacyRequestOptions(kind, content, privacy);
  const previousData = previous && kind === 'stations' ? publicStationData(previous.data) : previous?.data;
  return {
    root,
    kind,
    id,
    content,
    expected: previous
      ? (portable(contentPayload(kind, previousData!)) as Record<
          string,
          unknown
        >)
      : null,
    ...(location ? { locationId: location.path.split('/')[3] } : {}),
    source,
    ...privacyOptions,
  };
}

/** Content, relationship counters, deduplication and audit commit on the server. */
export async function saveWithRelations(
  firestore: Firestore,
  root: FirestoreRoot,
  kind: ResourceKey,
  path: string,
  id: string,
  data: Record<string, unknown>,
  previous: Previous,
  location?: Reference,
  source: 'editor' | 'import' = 'editor',
  privacy?: StationPrivacyOptions,
): Promise<AdminSaveResult> {
  const request = buildAdminSaveRequest(
    root,
    kind,
    path,
    id,
    data,
    previous,
    location,
    source,
    privacy,
  );
  const result = await invokeAdminContent<AdminSaveResult>(firestore, 'adminSaveContent', request);
  if (result.id !== id || !['create', 'update', 'unchanged'].includes(result.action)) throw contentError('لم يتم تأكيد حفظ المحتوى. أعد تحميل السجل قبل المحاولة.');
  return result;
}

export async function invokeAdminContent<T extends { success: boolean }>(
  firestore: Firestore,
  name: 'adminSaveContent' | 'adminDeleteContent' | 'adminReviewReport',
  request: Record<string, unknown>,
): Promise<T> {
  try {
    const result = await httpsCallable<Record<string, unknown>, T>(getFunctions(firestore.app), name)(request);
    if (result.data?.success !== true) throw contentError('لم يتم تأكيد العملية. أعد تحميل البيانات قبل المحاولة.');
    return result.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'ContentError') throw error;
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : '';
    const details =
      error && typeof error === 'object' && 'details' in error
        ? error.details
        : null;
    const reason =
      details && typeof details === 'object' && 'reason' in details
        ? String(details.reason)
        : '';
    const reasons: Record<string, string> = {
      'episode-has-comments': 'لا يمكن حذف حلقة لها تعليقات. ألغِ نشرها بدلًا من حذفها.',
      'content-has-children': 'لا يمكن حذف سجل مرتبط بمحتوى آخر. انقل المحتوى المرتبط أولًا.',
      'stale-content': 'تغيّر السجل منذ تحميله. أعد تحميله قبل الحذف.',
      'deletion-replaced': 'توجد محاولة حذف أخرى. أعد تحميل السجل قبل المحاولة.',
      'missing-parent': 'الارتباط السابق غير موجود. راجع البيانات قبل الحذف.',
      'report-limit': 'يتجاوز عدد البلاغات المفتوحة حد العملية. أغلق البلاغات غير المستحقة ثم أعد المحاولة.',
      'relationship-counter':
        'عداد الارتباط غير متسق. راجع السجل المرتبط قبل النقل أو الحفظ.',
      'location-children-limit':
        'ترتبط المدينة بأكثر من 450 محطة. انقل بعض المحطات قبل تعديل بيانات الموقع.',
      'program-children-limit':
        'يتجاوز البرنامج 450 حلقة. انقل بعض الحلقات قبل تغيير المحطة.',
      'identity-backfill':
        'يلزم تحديث سجل هويات المحتوى القديم بإجراء إداري مُراجع قبل حفظ هذا الارتباط الكبير.',
    };
    const messages: Record<string, string> = {
      'functions/failed-precondition':
        'تغيّر السجل أو الارتباط أو عداده. أعد تحميل البيانات وراجعها قبل الحفظ.',
      'functions/already-exists':
        'يوجد سجل مطابق أو حجز استيراد متعارض. أعد معاينة البيانات.',
      'functions/permission-denied': 'لا تملك صلاحية تنفيذ هذه العملية على المحتوى المحدد.',
      'functions/unauthenticated': 'أعد تسجيل الدخول قبل متابعة العملية.',
      'functions/invalid-argument':
        'بيانات المحتوى غير صالحة. راجع الحقول والارتباطات.',
    };
    throw contentError(
      reasons[reason] ||
        messages[code] ||
        'تعذّر تأكيد العملية. أعد تحميل البيانات قبل المحاولة مجددًا.',
      code,
    );
  }
}
