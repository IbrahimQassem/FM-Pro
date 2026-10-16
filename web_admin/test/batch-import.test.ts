import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import {
  parseExplicitBoolean,
  parseScheduleWeekdays,
  parseClockToMinutes,
  validateDocumentId,
  normalizeProgramRow,
  normalizeEpisodeRow,
  parseBatchImportWorkbook,
  parseBatchImportFromFiles,
  previewBatchImport,
  commitBatchImport,
} from '../lib/batch-import.ts';
import type { Firestore } from 'firebase/firestore';

void test('schedule conversion: ISO weekdays validation, deduplication and sorting', () => {
  // Valid weekdays
  assert.deepEqual(parseScheduleWeekdays('1, 7'), {
    valid: true,
    weekdays: [1, 7],
  });
  assert.deepEqual(parseScheduleWeekdays('7, 1, 3'), {
    valid: true,
    weekdays: [1, 3, 7],
  });
  assert.deepEqual(parseScheduleWeekdays('5'), {
    valid: true,
    weekdays: [5],
  });
  assert.deepEqual(parseScheduleWeekdays([6, 2]), {
    valid: true,
    weekdays: [2, 6],
  });

  // Rejections: duplicates
  const dupRes = parseScheduleWeekdays('1, 2, 1');
  assert.equal(dupRes.valid, false);
  assert.ok(dupRes.reason.includes('تكرار'));

  // Rejections: invalid days (0, 8, non-numbers)
  assert.equal(parseScheduleWeekdays('0, 1').valid, false);
  assert.equal(parseScheduleWeekdays('8').valid, false);
  assert.equal(parseScheduleWeekdays('monday').valid, false);

  // Rejections: empty / null / whitespace
  assert.equal(parseScheduleWeekdays('').valid, false);
  assert.equal(parseScheduleWeekdays('   ').valid, false);
  assert.equal(parseScheduleWeekdays(null).valid, false);
});

void test('schedule conversion: 24-hour time to minutes and 24:00 sentinel mapping', () => {
  // Start times
  assert.deepEqual(parseClockToMinutes('00:00'), { valid: true, minutes: 0 });
  assert.deepEqual(parseClockToMinutes('08:30'), { valid: true, minutes: 510 });
  assert.deepEqual(parseClockToMinutes('23:59'), {
    valid: true,
    minutes: 1439,
  });

  // Fractional day numbers from Excel
  assert.deepEqual(parseClockToMinutes(0.5), { valid: true, minutes: 720 });

  // End time sentinel: 24:00 maps to 1440
  assert.deepEqual(parseClockToMinutes('24:00', true), {
    valid: true,
    minutes: 1440,
  });
  assert.deepEqual(parseClockToMinutes('00:00', true), {
    valid: true,
    minutes: 1440,
  });

  // Invalid times
  assert.equal(parseClockToMinutes('24:00', false).valid, false);
  assert.equal(parseClockToMinutes('25:00').valid, false);
  assert.equal(parseClockToMinutes('12:60').valid, false);
  assert.equal(parseClockToMinutes('abc').valid, false);
  assert.equal(parseClockToMinutes('').valid, false);
});

void test('schedule conversion: program row enforces endTime > startTime and utcOffsetMinutes = 180', () => {
  const baseRaw = {
    programId: 'prog-1',
    stationId: 'st-1',
    title: 'برنامج الصباح',
    weekdays: '1, 7',
    startTime: '08:00',
    endTime: '09:30',
    utcOffsetMinutes: 180,
    isActive: 'نعم',
    isFeatured: 'لا',
    priority: 1,
  };

  const validProg = normalizeProgramRow(baseRaw, 2);
  assert.equal(validProg.status, 'create');
  assert.deepEqual(validProg.errors, {});
  const sched = validProg.normalized.schedule as Record<string, unknown>;
  assert.equal(sched.startMinute, 480);
  assert.equal(sched.endMinute, 570);
  assert.equal(sched.utcOffsetMinutes, 180);

  // End sentinel 24:00 -> 1440
  const sentinelProg = normalizeProgramRow(
    { ...baseRaw, startTime: '22:00', endTime: '24:00' },
    2,
  );
  assert.equal(sentinelProg.status, 'create');
  assert.equal(
    (sentinelProg.normalized.schedule as Record<string, unknown>).endMinute,
    1440,
  );

  // Rejection: endTime <= startTime
  const backwardsProg = normalizeProgramRow(
    { ...baseRaw, startTime: '10:00', endTime: '09:00' },
    2,
  );
  assert.equal(backwardsProg.status, 'invalid');
  assert.ok(backwardsProg.errors.endTime);

  const equalProg = normalizeProgramRow(
    { ...baseRaw, startTime: '10:00', endTime: '10:00' },
    2,
  );
  assert.equal(equalProg.status, 'invalid');
  assert.ok(equalProg.errors.endTime);

  // Rejection: utcOffsetMinutes != 180
  const wrongOffsetProg = normalizeProgramRow(
    { ...baseRaw, utcOffsetMinutes: 0 },
    2,
  );
  assert.equal(wrongOffsetProg.status, 'invalid');
  assert.ok(wrongOffsetProg.errors.utcOffsetMinutes);
});

void test('explicit boolean parsing rejects missing, empty, or ambiguous values', () => {
  // True values
  for (const val of [true, 1, 'true', 'TRUE', 'yes', 'نعم', '1', 'صواب']) {
    assert.deepEqual(
      parseExplicitBoolean(val),
      { valid: true, value: true },
      String(val),
    );
  }

  // False values
  for (const val of [false, 0, 'false', 'FALSE', 'no', 'لا', '0', 'خطأ']) {
    assert.deepEqual(
      parseExplicitBoolean(val),
      { valid: true, value: false },
      String(val),
    );
  }

  // Rejected missing / ambiguous values
  for (const val of ['', '   ', null, undefined, 'maybe', 2, -1, 'pending']) {
    assert.equal(parseExplicitBoolean(val).valid, false, String(val));
  }
});

void test('document ID validation enforces valid non-empty identifiers without slashes', () => {
  assert.deepEqual(validateDocumentId('prog-101', 'programId'), {
    valid: true,
    id: 'prog-101',
  });
  assert.equal(validateDocumentId('', 'programId').valid, false);
  assert.equal(validateDocumentId('path/subpath', 'programId').valid, false);
  assert.equal(validateDocumentId('..', 'programId').valid, false);
  assert.equal(validateDocumentId('__reserved__', 'programId').valid, false);
});

void test('episode row normalization validates HTTPS audioUrl, durationSec and broadcast date', () => {
  const baseEp = {
    episodeId: 'ep-1',
    programId: 'prog-1',
    title: 'الحلقة الأولى',
    audioUrl: 'https://cdn.example.com/audio/ep1.mp3',
    durationSec: 1800,
    broadcastAt: '2026-10-17T07:00:00.000Z',
    utcOffsetMinutes: 180,
    isPublished: true,
    isFeatured: false,
    priority: 0,
  };

  const validEp = normalizeEpisodeRow(baseEp, 2);
  assert.equal(validEp.status, 'create');
  assert.deepEqual(validEp.errors, {});
  assert.equal(validEp.normalized.durationSeconds, 1800);
  assert.equal(validEp.normalized.broadcastAt, '2026-10-17T07:00:00.000Z');

  // Rejection: HTTP audioUrl (must be HTTPS with authority)
  const httpEp = normalizeEpisodeRow(
    { ...baseEp, audioUrl: 'http://cdn.example.com/audio.mp3' },
    2,
  );
  assert.equal(httpEp.status, 'invalid');
  assert.ok(httpEp.errors.audioUrl);

  // Rejection: Negative duration
  const negDur = normalizeEpisodeRow({ ...baseEp, durationSec: -10 }, 2);
  assert.equal(negDur.status, 'invalid');
  assert.ok(negDur.errors.durationSec);

  // Rejection: Missing published flag (never infer from missing cell)
  const missingPub = normalizeEpisodeRow(
    { ...baseEp, isPublished: '' },
    2,
  );
  assert.equal(missingPub.status, 'invalid');
  assert.ok(missingPub.errors.isPublished);
});

void test('parseBatchImportWorkbook parses XLSX workbook with Programs and Episodes sheets', () => {
  const wb = XLSX.utils.book_new();

  const progRows = [
    {
      stationId: 'st-sanaa',
      programId: 'prog-morning',
      title: 'صباح الخير',
      weekdays: '1, 2, 3, 4, 5',
      startTime: '07:00',
      endTime: '08:30',
      utcOffsetMinutes: 180,
      isActive: 'نعم',
      isFeatured: 'لا',
      priority: 1,
    },
  ];

  const epRows = [
    {
      episodeId: 'ep-morning-01',
      programId: 'prog-morning',
      title: 'حلقة يوم الأحد',
      audioUrl: 'https://stream.hudhud.fm/ep01.mp3',
      durationSec: 3600,
      broadcastAt: '2026-10-17 07:00:00',
      utcOffsetMinutes: 180,
      isPublished: 'نعم',
      isFeatured: 'نعم',
      priority: 1,
    },
  ];

  const progSheet = XLSX.utils.json_to_sheet(progRows);
  const epSheet = XLSX.utils.json_to_sheet(epRows);
  XLSX.utils.book_append_sheet(wb, progSheet, 'البرامج');
  XLSX.utils.book_append_sheet(wb, epSheet, 'الحلقات');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const parsed = parseBatchImportWorkbook(buf);

  assert.equal(parsed.programsRaw.length, 1);
  assert.equal(parsed.episodesRaw.length, 1);
  assert.equal(parsed.programsRaw[0].data.programId, 'prog-morning');
  assert.equal(parsed.episodesRaw[0].data.episodeId, 'ep-morning-01');
});

void test('parseBatchImportFromFiles supports individual CSV strings', () => {
  const progCsv = `stationId,programId,title,weekdays,startTime,endTime,utcOffsetMinutes,isActive,isFeatured,priority
st-aden,prog-evening,مساء النور,"6, 7",18:00,20:00,180,true,false,2`;

  const epCsv = `episodeId,programId,title,audioUrl,durationSec,broadcastAt,utcOffsetMinutes,isPublished,isFeatured,priority
ep-evening-01,prog-evening,حلقة الجمعة,https://cdn.example.com/ep.mp3,1200,2026-10-17T18:00:00Z,180,true,false,0`;

  const parsed = parseBatchImportFromFiles({
    programs: progCsv,
    episodes: epCsv,
  });

  assert.equal(parsed.programsRaw.length, 1);
  assert.equal(parsed.episodesRaw.length, 1);
  assert.equal(parsed.programsRaw[0].data.programId, 'prog-evening');
  assert.equal(parsed.episodesRaw[0].data.episodeId, 'ep-evening-01');
});

void test('missing relationships: program with missing station or episode with missing program', async () => {
  const dummyFirestore = {} as Firestore;
  const mockStations = new Map<string, Record<string, unknown>>([
    ['st-valid', { name: 'إذاعة صنعاء', stats: { programsCount: 0 } }],
  ]);
  const mockPrograms = new Map<string, Record<string, unknown>>();

  const sheets = {
    programsRaw: [
      {
        rowNumber: 2,
        data: {
          programId: 'prog-good',
          stationId: 'st-valid', // exists
          title: 'برنامج صالح',
          weekdays: '1, 7',
          startTime: '08:00',
          endTime: '09:00',
          utcOffsetMinutes: 180,
          isActive: true,
          isFeatured: false,
          priority: 0,
        },
      },
      {
        rowNumber: 3,
        data: {
          programId: 'prog-bad',
          stationId: 'st-missing', // DOES NOT EXIST
          title: 'برنامج بمحطة مفقودة',
          weekdays: '1, 7',
          startTime: '08:00',
          endTime: '09:00',
          utcOffsetMinutes: 180,
          isActive: true,
          isFeatured: false,
          priority: 0,
        },
      },
    ],
    episodesRaw: [
      {
        rowNumber: 2,
        data: {
          episodeId: 'ep-valid',
          programId: 'prog-good', // exists in batch
          title: 'حلقة البرنامج الصالح',
          audioUrl: 'https://cdn.example.com/audio.mp3',
          durationSec: 600,
          broadcastAt: '2026-10-17T10:00:00Z',
          utcOffsetMinutes: 180,
          isPublished: true,
          isFeatured: false,
          priority: 0,
        },
      },
      {
        rowNumber: 3,
        data: {
          episodeId: 'ep-missing-prog',
          programId: 'prog-ghost', // DOES NOT EXIST
          title: 'حلقة ببرنامج مفقود',
          audioUrl: 'https://cdn.example.com/audio.mp3',
          durationSec: 600,
          broadcastAt: '2026-10-17T10:00:00Z',
          utcOffsetMinutes: 180,
          isPublished: true,
          isFeatured: false,
          priority: 0,
        },
      },
    ],
  };

  const preview = await previewBatchImport(
    dummyFirestore,
    'HudHudDev',
    sheets,
    {
      mockExisting: {
        stations: mockStations,
        programs: mockPrograms,
      },
    },
  );

  assert.equal(preview.hasErrors, true);
  assert.equal(preview.canCommit, false);

  // Program 1 is valid, Program 2 is invalid
  assert.equal(preview.programs[0].status, 'create');
  assert.equal(preview.programs[1].status, 'invalid');
  assert.ok(preview.programs[1].errors.stationId.includes('st-missing'));

  // Episode 1 derives stationId 'st-valid' from batch program 1
  assert.equal(preview.episodes[0].status, 'create');
  assert.equal(preview.episodes[0].normalized.stationId, 'st-valid');

  // Episode 2 has missing program relationship
  assert.equal(preview.episodes[1].status, 'invalid');
  assert.ok(preview.episodes[1].errors.programId.includes('prog-ghost'));
});

void test('unchanged re-imports are detected as unchanged no-ops and diffs are computed for updates', async () => {
  const dummyFirestore = {} as Firestore;
  const mockStations = new Map<string, Record<string, unknown>>([
    ['st-1', { name: 'المحطة', stats: { programsCount: 1 } }],
  ]);

  const existingProgramData = {
    stationId: 'st-1',
    title: 'برنامج قائم',
    titleEn: '',
    description: '',
    coverUrl: '',
    thumbnailUrl: '',
    presenters: [],
    categories: [],
    schedule: {
      weekdays: [1, 7],
      startMinute: 480,
      endMinute: 540,
      utcOffsetMinutes: 180,
    },
    isActive: true,
    isFeatured: false,
    priority: 0,
    stats: { episodesCount: 5, subscribersCount: 10, totalPlays: 100 },
  };

  const mockPrograms = new Map<string, Record<string, unknown>>([
    ['prog-existing', existingProgramData],
    ['prog-to-update', { ...existingProgramData, title: 'العنوان القديم' }],
  ]);

  const sheets = {
    programsRaw: [
      {
        rowNumber: 2,
        data: {
          programId: 'prog-existing',
          stationId: 'st-1',
          title: 'برنامج قائم', // Identical!
          weekdays: '1, 7',
          startTime: '08:00',
          endTime: '09:00',
          utcOffsetMinutes: 180,
          isActive: true,
          isFeatured: false,
          priority: 0,
        },
      },
      {
        rowNumber: 3,
        data: {
          programId: 'prog-to-update',
          stationId: 'st-1',
          title: 'العنوان الجديد المعدل', // Changed!
          weekdays: '1, 7',
          startTime: '08:00',
          endTime: '09:00',
          utcOffsetMinutes: 180,
          isActive: true,
          isFeatured: false,
          priority: 0,
        },
      },
    ],
    episodesRaw: [],
  };

  const preview = await previewBatchImport(
    dummyFirestore,
    'HudHudDev',
    sheets,
    {
      mockExisting: {
        stations: mockStations,
        programs: mockPrograms,
      },
    },
  );

  assert.equal(preview.hasErrors, false);
  assert.equal(preview.canCommit, true);
  assert.equal(preview.summary.unchangedCount, 1);
  assert.equal(preview.summary.updateCount, 1);

  // Unchanged row
  assert.equal(preview.programs[0].status, 'unchanged');
  assert.equal(preview.programs[0].diff, undefined);

  // Updated row
  assert.equal(preview.programs[1].status, 'update');
  assert.ok(preview.programs[1].diff);
  assert.equal(preview.programs[1].diff[0].field, 'title');
  assert.equal(preview.programs[1].diff[0].oldValue, 'العنوان القديم');
  assert.equal(
    preview.programs[1].diff[0].newValue,
    'العنوان الجديد المعدل',
  );
});

void test('commitBatchImport rejects when preview has errors', async () => {
  const dummyFirestore = {} as Firestore;
  const preview = {
    firestoreRoot: 'HudHudDev' as const,
    programs: [],
    episodes: [],
    summary: {
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      newCount: 0,
      updateCount: 0,
      unchangedCount: 0,
    },
    canCommit: false,
    hasErrors: true,
  };

  await assert.rejects(
    commitBatchImport(dummyFirestore, 'HudHudDev', preview),
    {
      message:
        'لا يمكن تنفيذ الاستيراد مع وجود صفوف غير صالحة. يرجى تصحيح الأخطاء في الجدول وإعادة المحاولة.',
    },
  );
});

void test('commitBatchImport handles unchanged rows and requires allowUpdates for updates', async () => {
  const dummyFirestore = {} as Firestore;
  const preview = {
    firestoreRoot: 'HudHudDev' as const,
    programs: [
      {
        rowNumber: 2,
        id: 'prog-1',
        raw: {},
        normalized: { title: 'P1' },
        errors: {},
        status: 'unchanged' as const,
      },
      {
        rowNumber: 3,
        id: 'prog-2',
        raw: {},
        normalized: { title: 'P2' },
        errors: {},
        status: 'update' as const,
      },
    ],
    episodes: [],
    summary: {
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      newCount: 0,
      updateCount: 1,
      unchangedCount: 1,
    },
    canCommit: true,
    hasErrors: false,
  };

  // Without allowUpdates: prog-1 is skipped as unchanged, prog-2 fails update guard
  const outcome = await commitBatchImport(
    dummyFirestore,
    'HudHudDev',
    preview,
    {
      allowUpdates: false,
    },
  );

  assert.equal(outcome.skippedCount, 1);
  assert.equal(outcome.failedCount, 1);
  assert.equal(outcome.results[0].status, 'unchanged');
  assert.equal(outcome.results[1].status, 'failed');
  assert.ok(outcome.results[1].error?.includes('تحديث البرنامج يتطلب'));
});

void test('partial failures and retry: tracks per-row failure without duplicating successful rows', async () => {
  const dummyFirestore = {} as Firestore;
  // A batch preview with two new programs
  const preview = {
    firestoreRoot: 'HudHudDev' as const,
    programs: [
      {
        rowNumber: 2,
        id: 'prog-success',
        raw: {},
        normalized: {
          title: 'برنامج ناجح',
          stationId: 'st-1',
          schedule: { weekdays: [1], startMinute: 60, endMinute: 120, utcOffsetMinutes: 180 },
          isActive: true,
          isFeatured: false,
          priority: 0,
        },
        errors: {},
        status: 'create' as const,
      },
      {
        rowNumber: 3,
        id: 'prog-will-fail',
        raw: {},
        // Invalid path / ID that will fail saveWithRelations
        normalized: {
          title: 'برنامج سيفشل',
          stationId: 'st-1',
          schedule: { weekdays: [1], startMinute: 60, endMinute: 120, utcOffsetMinutes: 180 },
          isActive: true,
          isFeatured: false,
          priority: 0,
        },
        errors: {},
        status: 'create' as const,
      },
    ],
    episodes: [],
    summary: {
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      newCount: 2,
      updateCount: 0,
      unchangedCount: 0,
    },
    canCommit: true,
    hasErrors: false,
  };

  // When commitBatchImport runs against dummyFirestore, saveWithRelations fails on prog-success
  // because dummyFirestore is empty. The error is captured per-row as 'failed'!
  const outcome = await commitBatchImport(dummyFirestore, 'HudHudDev', preview);
  assert.equal(outcome.success, false);
  assert.equal(outcome.failedCount, 2);
  assert.equal(outcome.results[0].status, 'failed');
  assert.equal(outcome.results[1].status, 'failed');

  // Verify that if prog-success had succeeded in Firestore, re-previewing marks it 'unchanged'
  const successProgramData = normalizeProgramRow(
    {
      programId: 'prog-success',
      stationId: 'st-1',
      title: 'برنامج ناجح',
      weekdays: '1',
      startTime: '01:00',
      endTime: '02:00',
      utcOffsetMinutes: 180,
      isActive: true,
      isFeatured: false,
      priority: 0,
    },
    2,
  ).normalized;

  const mockExisting = {
    stations: new Map([['st-1', { name: 'المحطة' }]]),
    programs: new Map([['prog-success', successProgramData]]),
  };

  const recheckPreview = await previewBatchImport(
    dummyFirestore,
    'HudHudDev',
    {
      programsRaw: [
        {
          rowNumber: 2,
          data: {
            programId: 'prog-success',
            stationId: 'st-1',
            title: 'برنامج ناجح',
            weekdays: '1',
            startTime: '01:00',
            endTime: '02:00',
            utcOffsetMinutes: 180,
            isActive: true,
            isFeatured: false,
            priority: 0,
          },
        },
      ],
      episodesRaw: [],
    },
    { mockExisting },
  );

  assert.equal(recheckPreview.programs[0].status, 'unchanged');
  assert.equal(recheckPreview.summary.unchangedCount, 1);
  assert.equal(recheckPreview.summary.newCount, 0);

  // Re-committing the unchanged program results in a zero-write skipped row (no duplication!)
  const retryOutcome = await commitBatchImport(dummyFirestore, 'HudHudDev', recheckPreview);
  assert.equal(retryOutcome.skippedCount, 1);
  assert.equal(retryOutcome.committedCount, 0);
  assert.equal(retryOutcome.results[0].status, 'unchanged');
});

