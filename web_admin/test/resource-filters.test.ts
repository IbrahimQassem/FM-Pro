import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  readResourceStatus,
  readResourceParent,
  readResourceSearch,
  readReportType,
  resourceParentFilter,
  resourceStatusChoices,
  normalizeSearchText,
  matchRecordSearch,
  sortRecords,
} from '../lib/resource-filters.ts';
void test('resource status filters allow only supported fields and values', () => {
  assert.deepEqual(readResourceStatus('episodes', '#episodes?status=false'), {
    value: 'false',
    label: 'مسودة',
    field: 'isPublished',
    match: false,
  });
  assert.equal(
    readResourceStatus('stations', '#episodes?status=false'),
    undefined,
  );
  assert.equal(
    readResourceStatus('reports', '#reports?status=admin'),
    undefined,
  );
  assert.equal(
    readResourceStatus('reports', '#reports?status=resolved')?.match,
    'resolved',
  );
  assert.equal(resourceStatusChoices('favorites').length, 0);
});

void test('parent filters are resource scoped and reject unsafe document IDs', () => {
  assert.equal(resourceParentFilter('stations'), undefined);
  assert.equal(resourceParentFilter('programs')?.field, 'stationId');
  assert.equal(resourceParentFilter('episodes')?.field, 'programId');
  assert.equal(
    readResourceParent('episodes', '#episodes?parent=program-1&status=false'),
    'program-1',
  );
  for (const hash of [
    '#programs?parent=x',
    '#episodes?parent=a%2Fb',
    '#episodes?parent=%00',
    '#episodes?parent=' + 'a'.repeat(129),
  ])
    assert.equal(readResourceParent('episodes', hash), '');
  assert.equal(readResourceParent('users', '#users?parent=x'), '');
});

void test('page search restores Arabic text, stays scoped and bounds URL input', () => {
  assert.equal(
    readResourceSearch(
      'episodes',
      '#episodes?status=false&q=%D8%A7%D9%84%D9%8A%D9%85%D9%86',
    ),
    'اليمن',
  );
  assert.equal(readResourceSearch('programs', '#episodes?q=hello'), '');
  assert.equal(
    readResourceSearch('episodes', '#episodes?q=' + 'x'.repeat(201)).length,
    200,
  );
});

void test('report type filter accepts only the two Flutter report targets', () => {
  assert.equal(
    readReportType('reports', '#reports?type=user&status=open'),
    'user',
  );
  assert.equal(readReportType('reports', '#reports?type=comment'), 'comment');
  for (const hash of ['#episodes?type=user', '#reports?type=admin', '#reports'])
    assert.equal(readReportType('reports', hash), '');
  assert.equal(readReportType('users', '#users?type=user'), '');
});

void test('search normalization and multi-field matching works flexibly for stations', () => {
  assert.equal(normalizeSearchText('  إِذَاعَةُ صَنْعَاءَ!  '), 'اذاعه صنعاء');

  const station = {
    id: 'station-101',
    data: {
      name: 'إذاعة صنعاء',
      nameEn: 'Sana’a FM',
      frequency: '90.5 FM',
      cityNameAr: 'صنعاء',
      cityCode: 'sanaa',
      tagline: 'صوت الجمهورية اليمنية',
      description: 'محطة إذاعية عامة',
    },
  };

  // Match by Arabic name with different alef
  assert.equal(matchRecordSearch(station, 'اذاعه', 'stations'), true);
  // Match by frequency
  assert.equal(matchRecordSearch(station, '90.5', 'stations'), true);
  // Match by English name
  assert.equal(matchRecordSearch(station, 'Sana', 'stations'), true);
  // Match by city
  assert.equal(matchRecordSearch(station, 'صنعاء', 'stations'), true);
  // Multi-word match across fields
  assert.equal(matchRecordSearch(station, 'صنعاء 90.5 FM', 'stations'), true);
  // Non-matching query
  assert.equal(matchRecordSearch(station, 'عدن', 'stations'), false);
});

void test('station sorting orders correctly by name, priority, plays, and city', () => {
  const list = [
    {
      id: 'b',
      data: {
        name: 'ب',
        cityNameAr: 'تعز',
        priority: 10,
        stats: { totalPlays: 50, subscribersCount: 10, programsCount: 5 },
      },
    },
    {
      id: 'a',
      data: {
        name: 'أ',
        cityNameAr: 'صنعاء',
        priority: 50,
        stats: { totalPlays: 100, subscribersCount: 5, programsCount: 20 },
      },
    },
  ];

  const sortedByName = sortRecords(list, 'name_asc', 'stations');
  assert.equal(sortedByName[0].id, 'a');
  assert.equal(sortedByName[1].id, 'b');

  const sortedByPriority = sortRecords(list, 'priority_desc', 'stations');
  assert.equal(sortedByPriority[0].id, 'a');

  const sortedByPlays = sortRecords(list, 'plays_desc', 'stations');
  assert.equal(sortedByPlays[0].id, 'a');

  const sortedByPrograms = sortRecords(list, 'programs_desc', 'stations');
  assert.equal(sortedByPrograms[0].id, 'a');
});

