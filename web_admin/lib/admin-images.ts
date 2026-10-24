import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from './firebase-client.ts';
import type { FirestoreRoot } from './firestore-environment';
export const maxImageBytes = 2 * 1024 * 1024;
export type ImageScope = {
  root: FirestoreRoot;
  kind: string;
  field: string;
  stationId?: string;
  programId?: string;
  recordId?: string;
};
export type ImageUpload = {
  url: string;
  uploadId: string;
  bytes: number;
  inputBytes: number;
  width: number;
  height: number;
};
const imageFields: Record<string, string[]> = {
  stations: ['logoUrl', 'thumbnailUrl'],
  programs: ['coverUrl', 'thumbnailUrl'],
  episodes: ['coverUrl'],
  banners: ['imageUrl'],
  campaigns: ['imageUrl'],
  notifications: ['imageUrl'],
};
export function isAdminImageField(kind: string, field: string): boolean {
  return imageFields[kind]?.includes(field) ?? false;
}
export function validateImageFile(file: Pick<File, 'size' | 'type'>): string {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'اختر صورة JPEG أو PNG أو WebP.';
  if (!file.size || file.size > maxImageBytes)
    return 'اختر صورة غير فارغة بحجم لا يتجاوز 2 م.ب.';
  return '';
}
export async function encodeImageFile(file: File): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (
    !bytes.length ||
    bytes.length !== file.size ||
    bytes.length > maxImageBytes
  )
    throw new Error('تعذرت قراءة الصورة.');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
export function imageUploadError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'functions/permission-denied': 'لا تملك صلاحية رفع صورة لهذا المحتوى.',
    'functions/unauthenticated': 'أعد تسجيل الدخول ثم حاول مجددًا.',
    'functions/resource-exhausted':
      'بلغت حد الرفع المؤقت. انتظر قليلًا ثم أعد المحاولة.',
    'functions/invalid-argument':
      'الصورة غير صالحة. اختر JPEG أو PNG أو WebP حتى 2 م.ب. وصغّر الأبعاد إذا تجاوزت 16 ميغابكسل.',
    'functions/failed-precondition':
      'تغيّر الارتباط أو انتهت محاولة الرفع. راجع النموذج ثم أعد اختيار الصورة.',
    'functions/aborted':
      'محاولة الرفع السابقة لم تنتهِ بعد. انتظر ثم أعد المحاولة.',
  };
  return (
    messages[code ?? ''] ??
    'تعذر رفع الصورة. بقيت قيمة النموذج كما هي؛ تحقق من الاتصال وأعد المحاولة.'
  );
}
export async function uploadImage(
  file: File,
  scope: ImageScope,
  operationId: string,
): Promise<ImageUpload> {
  const imageBase64 = await encodeImageFile(file);
  const { app } = await getFirebaseServices();
  const call = httpsCallable<Record<string, unknown>, ImageUpload>(
    getFunctions(app),
    'adminUploadImage',
    { timeout: 70_000 },
  );
  const response = await call({ ...scope, operationId, imageBase64 });
  const result = response.data;
  const url = new URL(result.url);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Invalid upload response.');
  return result;
}
