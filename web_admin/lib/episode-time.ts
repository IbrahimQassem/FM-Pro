/** Fixed-offset display; never depends on the administrator's device timezone. */
export function episodeBroadcastTime(
  value: unknown,
  offset: unknown,
): { local: string; utc: string; offset: string } | null {
  if (
    typeof value !== 'string' ||
    !/(Z|[+-]\d{2}:\d{2})$/i.test(value) ||
    typeof offset !== 'number' ||
    !Number.isInteger(offset) ||
    offset < -720 ||
    offset > 840
  )
    return null;
  const instant = Date.parse(value);
  const local = new Date(instant + offset * 60000);
  if (!Number.isFinite(instant) || !Number.isFinite(local.getTime()))
    return null;
  const magnitude = Math.abs(offset);
  return {
    local: local.toISOString().slice(0, 16).replace('T', ' '),
    utc: new Date(instant).toISOString().slice(0, 16).replace('T', ' '),
    offset: `UTC${offset < 0 ? '-' : '+'}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}`,
  };
}
