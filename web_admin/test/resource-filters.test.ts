import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  readResourceStatus,
  readResourceParent,
  readResourceSearch,
  readReportType,
  resourceParentFilter,
  resourceStatusChoices,
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
  assert.equal(resourceParentFilter('stations')?.field, 'cityCode');
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
