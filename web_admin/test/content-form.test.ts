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

void test('episode audio and artwork require HTTPS consistently with playback clients', () => {
  const episode = {
    title: 'حلقة',
    stationId: 'st-1',
    programId: 'pr-1',
    audioUrl: 'http://example.com/audio.mp3',
    coverUrl: 'https://example.com/cover.jpg',
    durationSeconds: 120,
    broadcastAt: '2026-09-08T10:00:00Z',
    utcOffsetMinutes: 180,
    isPublished: true,
    isFeatured: false,
    priority: 0,
  };
  assert.ok(validateContent('episodes', episode).audioUrl);
  assert.deepEqual(
    validateContent('episodes', {
      ...episode,
      audioUrl: 'https://example.com/audio.mp3',
    }),
    {},
  );

  const invalidCover = { ...episode, coverUrl: 'http://example.com/cover.jpg' };
  assert.ok(validateContent('episodes', invalidCover).coverUrl);
});

void test('station location selection and national scope validation (PKG-02)', () => {
  const baseStation = {
    name: 'إذاعة صنعاء',
    streamUrl: 'https://example.com/live',
    priority: 1,
    countryCode: 'YE',
    isActive: true,
    isFeatured: false,
    isVerified: false,
    isLive: true,
    isNational: false,
  };

  // Missing location
  const missingLocation = validateContent('stations', baseStation);
  assert.ok(missingLocation.location);

  // Regional governorate location
  const regionalStation = {
    ...baseStation,
    cityCode: 'sanaa',
    cityNameAr: 'صنعاء',
    locationType: 'governorate',
  };
  assert.deepEqual(validateContent('stations', regionalStation), {});
  const regionalPayload = contentPayload('stations', regionalStation);
  assert.equal(regionalPayload.cityCode, 'sanaa');
  assert.equal(regionalPayload.cityNameAr, 'صنعاء');
  assert.equal(regionalPayload.locationType, 'governorate');
  assert.equal(regionalPayload.isNational, false);

  // National location without isNational: true must fail
  const invalidNational = {
    ...baseStation,
    cityCode: 'yemen',
    cityNameAr: 'الجمهورية اليمنية (إذاعات وطنية)',
    locationType: 'national',
    isNational: false,
  };
  assert.ok(validateContent('stations', invalidNational).location);

  // National location with isNational: true passes
  const validNational = {
    ...baseStation,
    cityCode: 'yemen',
    cityNameAr: 'الجمهورية اليمنية (إذاعات وطنية)',
    locationType: 'national',
    isNational: true,
  };
  assert.deepEqual(validateContent('stations', validNational), {});
  const nationalPayload = contentPayload('stations', validNational);
  assert.equal(nationalPayload.cityCode, 'yemen');
  assert.equal(nationalPayload.locationType, 'national');
  assert.equal(nationalPayload.isNational, true);

  // National flag with regional city must fail
  const mismatchedNational = {
    ...baseStation,
    cityCode: 'aden',
    cityNameAr: 'عدن',
    locationType: 'governorate',
    isNational: true,
  };
  assert.ok(validateContent('stations', mismatchedNational).location);
});

void test('the Arabic regional reference is distinct from national/governorate locations', () => {
  const regional = {
    cityCode: 'global-ar',
    cityNameAr: 'عربي',
    countryCode: 'ARAB',
    countryNameAr: 'العالم العربي',
    locationType: 'regional',
    sortOrder: 230,
    isActive: true,
  };
  assert.deepEqual(validateContent('locations', regional), {});
  for (const patch of [
    { countryCode: 'YE' },
    { cityCode: 'aden' },
    { locationType: 'governorate' },
  ]) {
    assert.ok(
      validateContent('locations', { ...regional, ...patch }).countryCode,
    );
  }
});
