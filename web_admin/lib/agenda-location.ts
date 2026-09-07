export type AgendaFilters = { station: string; day: number; inactive: boolean };
export function readAgendaFilters(hash: string): AgendaFilters {
  const [section, search = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(section === 'schedule' ? search : '');
  const station = params.get('station') ?? '';
  const day = Number(params.get('day') ?? 0);
  return {
    station: station.length <= 128 && !station.includes('/') ? station : '',
    day: Number.isInteger(day) && day >= 0 && day <= 7 ? day : 0,
    inactive: params.get('inactive') === '1',
  };
}
export function agendaFilterHash(filters: AgendaFilters): string {
  const params = new URLSearchParams();
  if (filters.station) params.set('station', filters.station);
  if (filters.day) params.set('day', String(filters.day));
  if (filters.inactive) params.set('inactive', '1');
  return `#schedule${params.size ? `?${params}` : ''}`;
}
