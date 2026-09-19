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

void test('search matching works accurately across all other resources', () => {
  // Programs
  const program = {
    id: 'p1',
    data: {
      title: 'صباح الخير يا يمن',
      presenters: ['علي محمد', 'سارة أحمد'],
      categories: ['ثقافي', 'حوار'],
      description: 'برنامج حواري صباحي',
      stationId: 'st_sanaa',
    },
  };
  assert.equal(matchRecordSearch(program, 'سارة', 'programs'), true);
  assert.equal(matchRecordSearch(program, 'حوار', 'programs'), true);
  assert.equal(matchRecordSearch(program, 'مساء', 'programs'), false);

  // Episodes
  const episode = {
    id: 'ep1',
    data: {
      title: 'الحلقة الأولى: التعليم الرقمي',
      presenter: 'فؤاد الكبسي',
      guest: 'د. يحيى الشامي',
      description: 'مناقشة واقع التعليم الإلكتروني',
    },
  };
  assert.equal(matchRecordSearch(episode, 'الشامي', 'episodes'), true);
  assert.equal(matchRecordSearch(episode, 'الكبسي', 'episodes'), true);
  assert.equal(matchRecordSearch(episode, 'رياضة', 'episodes'), false);

  // Banners
  const banner = {
    id: 'b1',
    data: {
      title: 'تغطية عيد الاستقلال',
      targetType: 'station',
      targetId: 'st_aden',
      targetUrl: 'https://example.com/live',
    },
  };
  assert.equal(matchRecordSearch(banner, 'الاستقلال', 'banners'), true);
  assert.equal(matchRecordSearch(banner, 'st_aden', 'banners'), true);

  // Locations
  const location = {
    id: 'loc_ib',
    data: {
      cityNameAr: 'إب',
      cityCode: 'ibb',
      countryNameAr: 'اليمن',
      countryCode: 'YE',
    },
  };
  assert.equal(matchRecordSearch(location, 'اب', 'locations'), true);
  assert.equal(matchRecordSearch(location, 'ibb', 'locations'), true);

  // Comments
  const comment = {
    id: 'c1',
    data: {
      content: 'حلقة ممتازة جدا ومفيدة',
      authorName: 'حميد القاسمي',
      authorEmail: 'hameed@example.com',
      episodeId: 'ep123',
    },
  };
  assert.equal(matchRecordSearch(comment, 'ممتازة', 'comments'), true);
  assert.equal(matchRecordSearch(comment, 'القاسمي', 'comments'), true);
  assert.equal(matchRecordSearch(comment, 'hameed', 'comments'), true);

  // Reports
  const report = {
    id: 'rep1',
    data: {
      reason: 'inappropriate',
      details: 'ألفاظ مسيئة في التعليق',
      reporterUid: 'user_456',
    },
  };
  assert.equal(matchRecordSearch(report, 'مسيئة', 'reports'), true);
  assert.equal(matchRecordSearch(report, 'user_456', 'reports'), true);

  // Favorites & Subscriptions
  const sub = {
    id: 'sub1',
    data: {
      userId: 'usr_789',
      targetId: 'st_taiz',
      targetType: 'station',
    },
  };
  assert.equal(matchRecordSearch(sub, 'usr_789', 'subscriptions'), true);
  assert.equal(matchRecordSearch(sub, 'st_taiz', 'favorites'), true);
});


