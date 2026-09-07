/** Reject corrupted counters rather than worsening them during a content move. */
export function assertCounterAdjustment(value: unknown, delta: 1 | -1): void {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    !Number.isSafeInteger(value + delta) ||
    value + delta < 0
  ) {
    const error = new Error(
      'عداد الارتباط غير متسق. راجع بيانات السجل المرتبط قبل النقل أو الحذف.',
    );
    error.name = 'ContentError';
    throw error;
  }
}
