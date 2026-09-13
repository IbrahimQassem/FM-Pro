// Keep the portable avatar allowlist aligned with lib/core/config/profile_avatar.dart.
export const mascotAvatars = [
  { value: 'assets/images/mascot/mascot_avatar_default.webp', label: 'هدهد المستمع' },
  { value: 'assets/images/mascot/mascot_onboarding.webp', label: 'هدهد المرحّب' },
  { value: 'assets/images/mascot/mascot_empty_favorites.webp', label: 'هدهد المستكشف' },
  { value: 'assets/images/mascot/mascot_empty_comments.webp', label: 'هدهد المذيع' },
] as const;
export const defaultAvatar = mascotAvatars[0].value;
export const maxProfileImageBytes = 1024 * 1024;
export type ProfileUpdate = { displayName: string; avatarUrl?: string; imageBase64?: string };

export function sanitizeAvatar(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (text.length > 2048) return '';
  if (mascotAvatars.some(avatar => avatar.value === text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? text : '';
  } catch { return ''; }
}
export function avatarSource(value: unknown): string {
  const avatar = sanitizeAvatar(value) || defaultAvatar;
  return avatar.startsWith('assets/') ? `/${avatar}` : avatar;
}
export function profilePayload(update: ProfileUpdate): Record<string, unknown> {
  const displayName = update.displayName.trim();
  if (displayName.length < 2 || displayName.length > 120) throw new Error('invalid-display-name');
  if (update.imageBase64 !== undefined && update.avatarUrl !== undefined) throw new Error('invalid-profile-image');
  const payload: Record<string, unknown> = { displayName };
  if (update.imageBase64 !== undefined) {
    const base64 = update.imageBase64;
    if (!base64 || base64.length % 4 !== 0 || base64.length > Math.ceil(maxProfileImageBytes / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error('invalid-profile-image');
    const bytes = base64.length / 4 * 3 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (bytes > maxProfileImageBytes) throw new Error('invalid-profile-image');
    payload.imageBase64 = base64;
  } else if (update.avatarUrl !== undefined) {
    const avatarUrl = sanitizeAvatar(update.avatarUrl);
    if (update.avatarUrl !== '' && !avatarUrl) throw new Error('invalid-profile-image');
    payload.avatarUrl = avatarUrl;
  }
  return payload;
}
export function deletionMethod(providers: readonly string[]): 'password' | 'google' | 'app' {
  return providers.includes('password') ? 'password' : providers.includes('google.com') ? 'google' : 'app';
}
export function providerLabel(provider: string): string {
  return ({ 'google.com': 'Google', password: 'البريد وكلمة المرور', 'facebook.com': 'Facebook', 'apple.com': 'Apple' } as Record<string, string>)[provider] || 'طريقة دخول مرتبطة';
}
export function accountErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
  switch (code) {
    case 'auth/popup-closed-by-user': case 'auth/cancelled-popup-request': return 'أُلغيت نافذة Google. يمكنك المحاولة مرة أخرى.';
    case 'auth/popup-blocked': return 'حظر المتصفح نافذة Google. اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.';
    case 'auth/unauthorized-domain': case 'auth/operation-not-allowed': case 'auth/operation-not-supported-in-this-environment': return 'الدخول عبر Google غير متاح على هذا الموقع حالياً. يمكنك استخدام البريد وكلمة المرور.';
    case 'auth/account-exists-with-different-credential': case 'auth/credential-already-in-use': return 'تعذر استخدام Google لهذا الحساب. سجّل الدخول بالطريقة التي استخدمتها سابقاً للوصول إلى ملفك ومحطاتك.';
    case 'auth/network-request-failed': case 'functions/unavailable': return 'تعذر الاتصال. تحقق من الشبكة ثم أعد المحاولة.';
    case 'auth/too-many-requests': case 'functions/resource-exhausted': return 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.';
    case 'auth/user-mismatch': case 'auth/requires-recent-login': return 'أعد المصادقة بالحساب نفسه لإكمال هذه العملية.';
    default: return 'تعذر إكمال الطلب. تحقق من البيانات والاتصال ثم أعد المحاولة.';
  }
}
