import { editableFingerprint } from '../lib/content-form.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contentPayload,
  scheduleClock,
  scheduleMinutes,
  editableSchedule,
  isNetworkUrl,
  validateContent,
} from '../lib/content-form.ts';

const program = {
  title: 'برنامج',
  stationId: 'station',
  presenters: [],
  categories: [],
  isActive: true,
  isFeatured: false,
  priority: 0,
};
void test('live streams permit HTTP while media rejects it and credentials', () => {
  assert.equal(isNetworkUrl('http://example.com/live', true), true);
  assert.equal(isNetworkUrl('http://example.com/audio'), false);
  assert.equal(
    isNetworkUrl('https://user:secret@example.com/live', true),
    false,
  );
  assert.equal(isNetworkUrl('javascript:alert(1)', true), false);
});
void test('program schedule is optional, but supplied schedules require valid ranges', () => {
  assert.deepEqual(validateContent('programs', program), {});
  assert.deepEqual(
    validateContent('programs', { ...program, schedule: null }),
    {},
  );
  const schedule = {
    weekdays: [1, 7],
    startMinute: 60,
    endMinute: 120,
    utcOffsetMinutes: 180,
  };
  assert.deepEqual(validateContent('programs', { ...program, schedule }), {});
  for (const invalid of [
    { ...schedule, endMinute: 60 },
    { ...schedule, weekdays: [0] },
    { ...schedule, utcOffsetMinutes: 900 },
  ]) {
    assert.ok(
      validateContent('programs', { ...program, schedule: invalid }).schedule,
    );
  }
});
void test('editable payload cannot overwrite relationship counters or unknown metadata', () => {
  const payload = contentPayload('programs', {
    ...program,
    title: '  عنوان  ',
    stats: { episodesCount: 100 },
    unexpected: true,
  });
  assert.equal(payload.title, 'عنوان');
  assert.equal('stats' in payload, false);
  assert.equal('unexpected' in payload, false);
});
void test('malformed lists and backwards banner windows are rejected', () => {
  assert.ok(
    validateContent('programs', { ...program, presenters: [42] }).presenters,
  );
  assert.ok(
    validateContent('banners', {
      title: 'إعلان',
      imageUrl: 'https://example.com/a.png',
      priority: 0,
      isActive: true,
      startAt: '2026-09-08',
      expiresAt: '2026-09-07',
    }).expiresAt,
  );
});

void test('clock inputs preserve midnight and reject invalid times without repairing malformed schedules silently', () => {
  assert.equal(scheduleClock(480), '08:00');
  assert.equal(scheduleClock(1440), '00:00');
  assert.equal(scheduleMinutes('00:00'), 0);
  assert.equal(scheduleMinutes('00:00', true), 1440);
  assert.equal(scheduleMinutes('23:59'), 1439);
  for (const value of ['25:00', '12:61', 'bad', ''])
    assert.equal(scheduleMinutes(value), '');
  assert.deepEqual(editableSchedule({ weekdays: 'invalid' }), {
    weekdays: [],
    startMinute: '',
    endMinute: '',
    utcOffsetMinutes: '',
  });
  assert.equal(editableSchedule(null), null);
  assert.ok(
    validateContent('programs', { ...program, schedule: 'malformed' }).schedule,
  );
});

void test('save fingerprints ignore map order but preserve meaningful content changes', () => {
  const first = {
    title: 'Program',
    schedule: { weekdays: [1, 7], startMinute: 60, endMinute: 120 },
  };
  const reordered = {
    schedule: { endMinute: 120, startMinute: 60, weekdays: [1, 7] },
    title: 'Program',
  };
  assert.equal(editableFingerprint(first), editableFingerprint(reordered));
  assert.notEqual(
    editableFingerprint(first),
    editableFingerprint({ ...first, title: 'Changed' }),
  );
  assert.notEqual(
    editableFingerprint(first),
    editableFingerprint({
      ...first,
      schedule: { ...first.schedule, weekdays: [7, 1] },
    }),
  );
  assert.equal(
    editableFingerprint({
      date: { toDate: () => new Date('2030-01-01T00:00:00Z') },
    }),
    editableFingerprint({ date: '2030-01-01T00:00:00.000Z' }),
  );
  assert.equal(
    editableFingerprint(
      contentPayload('programs', { ...first, stats: { episodesCount: 1 } }),
    ),
    editableFingerprint(
      contentPayload('programs', {
        ...reordered,
        stats: { episodesCount: 2 },
        serverOnly: 'preserved',
      }),
    ),
  );
});
