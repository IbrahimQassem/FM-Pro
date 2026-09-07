export const agendaDays = [
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
  'الأحد',
];
export type AgendaSchedule = {
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  utcOffsetMinutes: number;
};
export function agendaSchedule(value: unknown): AgendaSchedule | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as AgendaSchedule;
  if (
    !Array.isArray(s.weekdays) ||
    !s.weekdays.length ||
    !s.weekdays.every((d) => Number.isInteger(d) && d >= 1 && d <= 7) ||
    !Number.isInteger(s.startMinute) ||
    !Number.isInteger(s.endMinute) ||
    s.startMinute < 0 ||
    s.startMinute >= s.endMinute ||
    s.endMinute > 1440 ||
    !Number.isInteger(s.utcOffsetMinutes) ||
    s.utcOffsetMinutes < -720 ||
    s.utcOffsetMinutes > 840
  )
    return null;
  return s;
}
export function overlappingPrograms(
  items: Array<{ id: string; schedule: AgendaSchedule }>,
): Set<string> {
  const week = 7 * 1440;
  const intervals = items.flatMap((item) =>
    [...new Set(item.schedule.weekdays)].map((day) => {
      const start =
        ((day - 1) * 1440 +
          item.schedule.startMinute -
          item.schedule.utcOffsetMinutes +
          week) %
        week;
      return {
        id: item.id,
        start,
        end: start + item.schedule.endMinute - item.schedule.startMinute,
      };
    }),
  );
  const overlaps = new Set<string>();
  for (let i = 0; i < intervals.length; i++)
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i],
        b = intervals[j];
      if (
        a.id !== b.id &&
        [-week, 0, week].some(
          (shift) => a.start < b.end + shift && b.start + shift < a.end,
        )
      ) {
        overlaps.add(a.id);
        overlaps.add(b.id);
      }
    }
  return overlaps;
}
