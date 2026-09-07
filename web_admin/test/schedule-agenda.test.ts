import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agendaSchedule, overlappingPrograms } from '../lib/schedule-agenda.ts';

void test('agenda rejects malformed schedules and detects actual UTC overlaps across week boundaries', () => {
  assert.equal(agendaSchedule(null), null);
  assert.equal(
    agendaSchedule({
      weekdays: [0],
      startMinute: 0,
      endMinute: 60,
      utcOffsetMinutes: 0,
    }),
    null,
  );
  assert.equal(
    agendaSchedule({
      weekdays: [1],
      startMinute: 60,
      endMinute: 60,
      utcOffsetMinutes: 0,
    }),
    null,
  );
  const schedule = {
    weekdays: [1],
    startMinute: 0,
    endMinute: 60,
    utcOffsetMinutes: 180,
  };
  assert.ok(agendaSchedule(schedule));
  const same = { ...schedule, startMinute: 30, endMinute: 90 };
  assert.deepEqual(
    [
      ...overlappingPrograms([
        { id: 'a', schedule },
        { id: 'b', schedule: same },
      ]),
    ].sort(),
    ['a', 'b'],
  );
  assert.equal(
    overlappingPrograms([
      { id: 'a', schedule },
      { id: 'b', schedule: { ...schedule, startMinute: 60, endMinute: 90 } },
    ]).size,
    0,
  );
  const sundayUTC = {
    weekdays: [7],
    startMinute: 21 * 60 + 30,
    endMinute: 22 * 60,
    utcOffsetMinutes: 0,
  };
  assert.equal(
    overlappingPrograms([
      { id: 'a', schedule },
      { id: 'b', schedule: sundayUTC },
    ]).size,
    2,
  );
  assert.equal(
    overlappingPrograms([
      { id: 'a', schedule: { ...schedule, weekdays: [1, 1] } },
    ]).size,
    0,
  );
});
