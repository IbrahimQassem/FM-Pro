export function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128 && !value.includes('/') && value !== '.' && value !== '..';
}
export function readIds(storage: Pick<Storage, 'getItem'>, key: string): string[] {
  try { const data: unknown = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(data) ? [...new Set(data.filter(validId))].slice(0, 100) : []; } catch { return []; }
}
export function toggleId(ids: string[], id: string): string[] {
  if (!validId(id)) return ids;
  return ids.includes(id) ? ids.filter(value => value !== id) : [id, ...ids].slice(0, 100);
}
export function stationHref(id: string, programId?: string, episodeId?: string): string {
  const params = new URLSearchParams({ station: id });
  if (programId && validId(programId)) params.set('program', programId);
  if (episodeId && validId(episodeId)) params.set('episode', episodeId);
  return `?${params}#station-detail`;
}
export function alertHref(data: Record<string, unknown> | undefined, root: string): string | null {
  if (!data || data.version !== '1' || data.type !== 'episode' || data.root !== root || !validId(data.stationId) || !validId(data.programId) || !validId(data.episodeId)) return null;
  return stationHref(data.stationId, data.programId, data.episodeId);
}
export type Schedule = { weekdays: number[]; startMinute: number; endMinute: number; utcOffsetMinutes: number };
export type Program = { id: string; stationId: string; title: string; description: string; priority: number; schedule: Schedule | null };
export type Episode = { id: string; programId: string; stationId: string; title: string; description: string; audioUrl: string; broadcastAt: number; utcOffsetMinutes: number };
type Snapshot = { id: string; data(): Record<string, unknown> };
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function integer(value: unknown, min: number, max: number): value is number { return Number.isInteger(value) && Number(value) >= min && Number(value) <= max; }
export function programFromSnapshot(doc: Snapshot, stationId: string): Program | null {
  const d = doc.data();
  if (!validId(doc.id) || d.stationId !== stationId || d.isActive !== true || d.adminDeletionToken || !text(d.title)) return null;
  let schedule: Schedule | null = null;
  if (d.schedule != null) {
    const s = d.schedule as Schedule;
    if (!Array.isArray(s.weekdays) || !s.weekdays.length || !s.weekdays.every(day => integer(day, 1, 7)) || !integer(s.startMinute, 0, 1439) || !integer(s.endMinute, s.startMinute + 1, 1440) || !integer(s.utcOffsetMinutes, -720, 840)) return null;
    schedule = { weekdays: [...new Set(s.weekdays)], startMinute: s.startMinute, endMinute: s.endMinute, utcOffsetMinutes: s.utcOffsetMinutes };
  }
  return { id: doc.id, stationId, title: text(d.title), description: text(d.description), priority: typeof d.priority === 'number' && Number.isFinite(d.priority) ? d.priority : 0, schedule };
}
export function episodeFromSnapshot(doc: Snapshot, stationId: string, programs: Program[]): Episode | null {
  const d = doc.data();
  if (!validId(doc.id) || d.stationId !== stationId || d.isPublished !== true || d.adminDeletionToken || !text(d.title) || !programs.some(p => p.id === d.programId)) return null;
  try { const p = new URL(text(d.audioUrl)).protocol; if (p !== 'https:' && p !== 'http:') return null; } catch { return null; }
  const timestamp = d.broadcastAt as { toMillis?: () => number } | undefined;
  const date = typeof timestamp?.toMillis === 'function' ? timestamp.toMillis() : NaN;
  if (!Number.isFinite(date) || !integer(d.utcOffsetMinutes, -720, 840)) return null;
  return { id: doc.id, stationId, programId: String(d.programId), title: text(d.title), description: text(d.description), audioUrl: text(d.audioUrl), broadcastAt: date, utcOffsetMinutes: d.utcOffsetMinutes };
}
export function scheduleStatus(schedule: Schedule, now: number): 'live' | 'next' | 'upcoming' | 'ended' {
  const local = new Date(now + schedule.utcOffsetMinutes * 60000);
  const day = local.getUTCDay() || 7;
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (!schedule.weekdays.includes(day)) return 'upcoming';
  if (minute >= schedule.endMinute) return 'ended';
  if (minute >= schedule.startMinute) return 'live';
  return schedule.startMinute - minute <= 180 ? 'next' : 'upcoming';
}
// Canonical preferences override legacy duplicates, including explicit opt-outs.
export type Follow = { stationId: string; isActive: boolean; notificationsEnabled: boolean };
export function resolveFollows(docs: Snapshot[]): Follow[] {
  const groups = new Map<string, Snapshot[]>();
  for (const doc of docs) { const d = doc.data(); if (d.targetType === 'station' && validId(d.targetId)) groups.set(d.targetId, [...(groups.get(d.targetId) || []), doc]); }
  const time = (doc: Snapshot) => { const v = doc.data().updatedAt as { toMillis?: () => number }; return typeof v?.toMillis === 'function' ? v.toMillis() : 0; };
  return [...groups].map(([stationId, entries]) => {
    const chosen = entries.find(d => d.id === `station_${stationId}`) || entries.sort((a,b) => time(b) - time(a) || b.id.localeCompare(a.id))[0];
    const d = chosen.data(); return { stationId, isActive: d.isActive === true, notificationsEnabled: d.isActive === true && d.notificationsEnabled === true };
  });
}
