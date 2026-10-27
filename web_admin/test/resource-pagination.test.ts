import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, limit, query, queryEqual, startAfter, where } from 'firebase/firestore';
import { resourceQuery } from '../lib/admin-query.ts';
import { resourceDefinitions, type ResourceKey } from '../lib/admin-resources.ts';
import { advanceResourceScan, consumeResourcePage, matchesResourcePredicate, readResourceCursor,
  resourceCursor, resourcePageRequest, resourceQueryIdentity, resourceSnapshotPage, resourcePageCanAdvance, type ResourcePageRequestOptions } from '../lib/resource-pagination.ts';
void test('all26 approved server-filter shapes retain bounded resource queries in both roots', async () => {
  const app = initializeApp({ projectId: 'demo-query-contract' }, `query-${crypto.randomUUID()}`);
  const db = getFirestore(app);
  try {
    for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
      let shapes = 0;
      for (const resource of Object.keys(resourceDefinitions) as ResourceKey[]) {
        const statuses = ['locations','stations','programs','banners','users','subscriptions'].includes(resource)
          ? [{}, { statusField: 'isActive', statusMatch: true }]
          : resource === 'episodes' ? [{}, { statusField: 'isPublished', statusMatch: true }]
          : ['comments','reports'].includes(resource) ? [{}, { statusField: 'status', statusMatch: resource === 'reports' ? 'open' : 'published' }] : [{}];
        const extras = resource === 'programs' || resource === 'episodes' ? [{}, { parent: 'synthetic-parent' }]
          : resource === 'reports' ? [{}, { reportType: 'comment' as const }] : [{}];
        for (const status of statuses) for (const extra of extras) {
          const options: ResourcePageRequestOptions = { root, ...status, ...extra };
          const base = resourceQuery(db, resource, root);
          const constraints = [];
          if (options.statusField) constraints.push(where(options.statusField, '==', options.statusMatch));
          if (options.reportType) constraints.push(where('targetType', '==', options.reportType));
          if (options.parent) constraints.push(where(resource === 'programs' ? 'stationId' : 'programId', '==', options.parent));
          assert.equal(queryEqual(resourcePageRequest(base, resource, options), query(base, ...constraints, limit(51))), true);
          shapes++;
        }
      }
      assert.equal(shapes, 26);
    }
  } finally { await deleteApp(app); }
});
void test('cursor rejects cross-root/resource/filter/path/sort/version and malformed identity reuse', () => {
  const options = { parent: 'station-a' };
  const cursor = resourceCursor('programs', options, 'HudHudDev/programs/programs/p50');
  assert.equal(readResourceCursor(cursor, 'programs', options), 'HudHudDev/programs/programs/p50');
  for (const action of [
    () => readResourceCursor(cursor, 'programs', { parent: 'station-b' }),
    () => readResourceCursor(cursor, 'programs', { ...options, root: 'HudHudOfficial' }),
    () => readResourceCursor(cursor, 'episodes', options),
    () => resourceCursor('programs', options, 'HudHudDev/users/users/u'),
    () => readResourceCursor(cursor.replace('id_asc','name_asc'), 'programs', options),
    () => readResourceCursor(cursor.replace('"version":1','"version":2'), 'programs', options),
    () => readResourceCursor('missing', 'programs', options),
    () => resourceQueryIdentity('stations', { parent: 'not-supported' }),
    () => resourceQueryIdentity('users', { statusField: 'role', statusMatch: 'super_admin' }),
  ]) assert.throws(action);
});
void test('page consumes50 raw documents rather than lookahead or last valid mapping', () => {
  const raw = Array.from({ length: 51 }, (_, id) => ({ id, valid: id !== 49 }));
  const page = consumeResourcePage(raw);
  assert.equal(page.last?.id, 49); assert.equal(page.hasMore, true); assert.equal(page.documents.length, 50);
  assert.equal(page.documents.filter(record => record.valid).length, 49);
  assert.equal(consumeResourcePage([]).hasMore, false);
  assert.throws(() => consumeResourcePage(Array(52)));
});
void test('synthetic10000 resumable scan reaches last record with200 read cap and100 visible rows', () => {
  let state = { identity: 'fixed', evaluationTime: 1, examined: 0, matched: 0, rows: [] as number[], exhausted: false };
  for (let offset = 0; offset <= 10000; offset += 200) {
    const records = Array.from({ length: Math.min(200,10000-offset) }, (_, i) => offset+i);
    state = advanceResourceScan(state, 'fixed', { records, rawCount: records.length, cursor: String(offset+records.length), exhausted: records.length < 200 }, () => true);
    assert.ok(state.rows.length <= 100);
  }
  assert.equal(state.examined, 10000); assert.equal(state.matched, 10000); assert.equal(state.rows.at(-1), 9999);
  assert.equal(state.exhausted, true);
  assert.throws(() => advanceResourceScan(state, 'changed', { records: [], rawCount: 0, exhausted: true }, () => true));
});
void test('scan preserves missing listener roles, Arabic relation search and frozen health semantics', () => {
  const predicate = { term: '', feature: 'all', role: 'listener', sort: 'newest', evaluationTime: 10000000 };
  for (const role of [undefined,'listener','legacy']) assert.equal(matchesResourcePredicate({ id: 'u', data: { role } }, 'users', predicate), true);
  assert.equal(matchesResourcePredicate({ id:'u', data:{ role:'moderator' } },'users',predicate),false);
  assert.equal(matchesResourcePredicate({ id:'p', data:{},relationLabel:'Aden Station' }, 'programs', {...predicate,term:'Aden'}),true);
  const record = { id:'s',data:{healthStatus:'online',consecutiveFailures:0,lastCheckedAt:10000000-45*60*1000} };
  assert.equal(matchesResourcePredicate(record,'stations',{...predicate,feature:'healthy'}),true);
  assert.equal(matchesResourcePredicate(record,'stations',{...predicate,feature:'healthy',evaluationTime:10000001}),false);
});

void test('R06 SDK cursor: opaque continuation constructs valid actual SDK queries for collection and group', async (t) => {
  const app = initializeApp({ projectId: 'demo-cursor-contract' }, `cursor-${crypto.randomUUID()}`);
  const db = getFirestore(app);
  try {
    for (const [resource, path, position] of [
      ['programs', 'HudHudDev/programs/programs/p50', 'p50'],
      ['comments', 'HudHudDev/episodes/episodes/e/comments/c50', 'HudHudDev/episodes/episodes/e/comments/c50'],
    ] as const) await t.test(resource, () => {
      const base = resourceQuery(db, resource);
      const cursor = resourceCursor(resource, {}, path);
      assert.doesNotThrow(() => resourcePageRequest(base, resource, { cursor }),
        'A supported next-page action must construct a valid actual SDK query');
      assert.equal(queryEqual(resourcePageRequest(base, resource, { cursor }), query(base, startAfter(position), limit(51))), true);
    });
  } finally { await deleteApp(app); }
});
const boundaryDocuments = (prefix: string) => Array.from({ length: 51 }, (_, index) => ({
  ref: { path: `HudHudDev/programs/programs/${prefix}-${index}` },
}));
void test('R06 offline boundary: cache-only51 cannot mint a server continuation', () => {
  const page = resourceSnapshotPage(boundaryDocuments('cached'), true, 'programs');
  assert.equal(page.cursor, undefined, 'Cache-only documents cannot mint a server cursor');
  assert.equal(page.hasMore, false);
});
void test('R06 offline boundary: cached51 disables actual Next guard even if a stale cursor exists', () => {
  assert.equal(resourcePageCanAdvance({ loading:false,hasMore:true,cursor:'stale-server-cursor',cached:true }), false,
    'Actual Next guard must block every cached-page advance');
});
void test('R06 offline boundary: server51 permits a validated continuation', () => {
  const page = resourceSnapshotPage(boundaryDocuments('server'), false, 'programs');
  assert.ok(page.cursor); assert.equal(page.hasMore, true);
  assert.equal(resourcePageCanAdvance({ loading:false,hasMore:page.hasMore,cursor:page.cursor,cached:page.cached }), true);
});
void test('R06 offline boundary: server-to-cache preserves last server records and cannot advance', () => {
  const server = resourceSnapshotPage(boundaryDocuments('server'), false, 'programs');
  const offline = resourceSnapshotPage(boundaryDocuments('older-cache'), true, 'programs', {}, server);
  assert.deepEqual(offline.documents, server.documents, 'Offline cache cannot replace the last successful server page');
  assert.equal(offline.cursor, undefined); assert.equal(offline.hasMore, false);
  assert.equal(resourcePageCanAdvance({ loading:false,hasMore:offline.hasMore,cursor:offline.cursor,cached:offline.cached }), false);
});
