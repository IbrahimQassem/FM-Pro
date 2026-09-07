export type BannerStatus =
  | 'inactive'
  | 'upcoming'
  | 'visible'
  | 'expired'
  | 'invalid';
export const bannerStatusLabels: Record<BannerStatus, string> = {
  inactive: 'غير مفعّل',
  upcoming: 'لم يبدأ بعد',
  visible: 'ظاهر الآن',
  expired: 'منتهي',
  invalid: 'توقيت غير صالح',
};
export function bannerTime(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return Date.parse(value);
  if (
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  )
    return value.toMillis();
  return NaN;
}
/** Matches BannerItem.isVisibleAt: inclusive start, exclusive expiry. */
export function bannerStatus(
  data: Record<string, unknown>,
  now: number,
): BannerStatus {
  const start = bannerTime(data.startAt),
    end = bannerTime(data.expiresAt);
  if (
    (start !== null && !Number.isFinite(start)) ||
    (end !== null && !Number.isFinite(end))
  )
    return 'invalid';
  if (data.isActive !== true) return 'inactive';
  if (end !== null && end <= now) return 'expired';
  if (start !== null && start > now) return 'upcoming';
  return 'visible';
}
