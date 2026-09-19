/**
 * Utility function to format user creation and update dates in Arabic locale,
 * supporting Firestore Timestamps, serialization objects ({seconds}), ISO strings,
 * and unix millisecond timestamps, with graceful fallback if not present.
 */
export function formatUserDate(value: unknown, fallback = ''): string {
  if (!value) return fallback;
  try {
    let d: Date | null = null;
    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as { toDate: () => Date }).toDate === 'function'
    ) {
      d = (value as { toDate: () => Date }).toDate();
    } else if (
      typeof value === 'object' &&
      value !== null &&
      'seconds' in value &&
      typeof (value as { seconds: number }).seconds === 'number'
    ) {
      d = new Date((value as { seconds: number }).seconds * 1000);
    } else if (typeof value === 'string' || typeof value === 'number') {
      d = new Date(value);
    }
    if (d && !Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('ar-YE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch {
    // fallback on error
  }
  return fallback;
}
