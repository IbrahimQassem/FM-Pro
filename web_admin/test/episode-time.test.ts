import assert from 'node:assert/strict';
import { test } from 'node:test';
import { episodeBroadcastTime } from '../lib/episode-time.ts';
import { agendaSchedule } from '../lib/schedule-agenda.ts';
void test('episode broadcast display uses its fixed offset across date boundaries', () => {
  assert.deepEqual(episodeBroadcastTime('2026-12-31T23:30:00Z', 180), {
    local: '2027-01-01 02:30',
    utc: '2026-12-31 23:30',
    offset: 'UTC+03:00',
  });
  assert.equal(
    episodeBroadcastTime('2026-01-01T00:00:00Z', -720)?.local,
    '2025-12-31 12:00',
  );
  assert.equal(
    episodeBroadcastTime('2026-01-01T00:00:00Z', 345)?.offset,
    'UTC+05:45',
  );
  assert.equal(episodeBroadcastTime('bad', 180), null);
  assert.equal(episodeBroadcastTime('2026-01-01T00:00:00', 180), null);
  assert.equal(episodeBroadcastTime('2026-01-01T00:00:00Z', -721), null);
  assert.equal(episodeBroadcastTime('2026-01-01T00:00:00Z', 841), null);
  assert.equal(
    agendaSchedule({
      weekdays: [1],
      startMinute: 0,
      endMinute: 60,
      utcOffsetMinutes: -721,
    }),
    null,
  );
});
