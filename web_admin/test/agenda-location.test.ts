import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agendaFilterHash, readAgendaFilters } from '../lib/agenda-location.ts';
void test('agenda filter links round-trip safely and reject malformed scope/values', () => {
  const filters = { station: 'محطة & خاصة', day: 7, inactive: true };
  assert.deepEqual(readAgendaFilters(agendaFilterHash(filters)), filters);
  assert.deepEqual(readAgendaFilters('#stations?station=x&day=2'), {
    station: '',
    day: 0,
    inactive: false,
  });
  assert.deepEqual(
    readAgendaFilters('#schedule?station=a%2Fb&day=99&inactive=true'),
    { station: '', day: 0, inactive: false },
  );
  assert.equal(
    agendaFilterHash({ station: '', day: 0, inactive: false }),
    '#schedule',
  );
});
