import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceExport, exportManifest, pageExportManifest, startExport } from '../lib/export-pages.ts';
import { buildStationExcelData } from '../lib/export-excel.ts';
void test('complete fixed2001 export resumes bounded200 requests, writes parts<=1000, and manifest proves equality', async () => {
  let state = startExport<number>('fixed-query', '2026-10-26T12:00:00.000Z');
  const written: number[] = [];
  for (let offset = 0; offset < 2001; offset += 200) {
    const records = Array.from({ length: Math.min(200,2001-offset) }, (_, index) => offset+index);
    const before = state;
    state = await advanceExport(state, 'fixed-query', { records, rawCount: records.length,
      cursor: String(offset+records.length), exhausted: records.length < 200 }, async (rows, index) => {
      assert.ok(rows.length <= 1000); written.push(...rows); return `part-${index}.xlsx`;
    });
    assert.ok(state.pending.length < 800);
    assert.ok(before.pending.length + records.length <= 1000);
    if (offset === 200) {
      const paused = structuredClone(state);
      state = paused;
      assert.equal((await exportManifest(state)).complete, false);
      assert.equal((await exportManifest(state)).written, 0);
    }
  }
  assert.deepEqual(written, Array.from({ length:2001 }, (_, index) => index));
  assert.equal(new Set(written).size, 2001);
  const manifest = await exportManifest(state);
  assert.equal(manifest.complete, true); assert.equal(manifest.written, 2001);
  assert.equal(manifest.matchedSoFar, 2001); assert.equal(manifest.pending, 0);
  assert.equal(manifest.serverOrder, 'id_asc');
  assert.doesNotMatch(JSON.stringify(manifest), /private-sentinel/);
});
void test('failed writer leaves original cursor, pending rows and emitted part registry unchanged', async () => {
  const state = { ...startExport<number>('fixed'), pending: Array.from({ length:600 }, (_, index) => index), examined:600,matched:600,cursor:'600' };
  await assert.rejects(advanceExport(state,'fixed',{records:Array(200).fill(1),rawCount:200,cursor:'800',exhausted:false},async()=>{throw new Error('Synthetic writer failure');}), /Synthetic writer/);
  assert.equal(state.cursor, '600'); assert.equal(state.pending.length, 600); assert.equal(state.parts.length, 0);
});
void test('export rejects changed query, excessive reads, stale cursor and missing completion evidence', async () => {
  const state = { ...startExport<number>('fixed'), cursor:'same' };
  for (const [identity,batch] of [
    ['changed',{records:[],rawCount:0,exhausted:true}],
    ['fixed',{records:[],rawCount:201,cursor:'new',exhausted:false}],
    ['fixed',{records:[],rawCount:200,cursor:'same',exhausted:false}],
    ['fixed',{records:[],rawCount:200,cursor:'new',exhausted:true}],
  ] as const) await assert.rejects(advanceExport(state,identity,{...batch,records:[...batch.records]},async()=> 'unused'));
});
void test('export uses authorized canonical private projection and never legacy public owner fallback', () => {
  const row = buildStationExcelData([{ id:'synthetic', data:{name:'Synthetic',owner:'private-sentinel'},privateData:{owner:'Authorized owner'} }])[0];
  assert.ok(Object.values(row).includes('Authorized owner'));
  assert.ok(!Object.values(row).includes('private-sentinel'));
  const empty = buildStationExcelData([{id:'synthetic',data:{owner:'private-sentinel'}}])[0];
  assert.ok(!Object.values(empty).includes('private-sentinel'));
});

const syntheticSensitiveTerms = ['Synthetic Private Name', 'private-query@example.test', '+967770001234'];
const sensitiveQueryIdentity = JSON.stringify(['HudHudDev', syntheticSensitiveTerms.join(' '), 'healthy', 'listener', 'name_asc']);
void test('R06 export privacy: full manifest never serializes synthetic sensitive search terms', async () => {
  const state = startExport<number>(sensitiveQueryIdentity, '2026-10-26T12:00:00.000Z');
  const manifest = await exportManifest(state);
  const serialized = JSON.stringify(manifest);
  for (const term of syntheticSensitiveTerms) assert.ok(!serialized.includes(term),
    'Full manifest must not serialize raw synthetic personal search input');
  assert.match(manifest.queryFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(state.identity, sensitiveQueryIdentity, 'Private in-memory identity must remain unchanged');
});
void test('R06 export privacy: current-page manifest never serializes synthetic sensitive search terms', async () => {
  for (const scope of ['current-page', 'visible-scan-page'] as const) {
    const details = { identity: sensitiveQueryIdentity, scope, root: 'HudHudDev' as const,
      count: 1, filename: 'synthetic-page.xlsx', asOf: '2026-10-26T12:00:00.000Z' };
    const manifest = await pageExportManifest(details);
    const serialized = JSON.stringify(manifest);
    for (const term of syntheticSensitiveTerms) assert.ok(!serialized.includes(term),
      'Page manifest must not serialize raw synthetic personal search input');
    assert.match(manifest.queryFingerprint, /^sha256:[a-f0-9]{64}$/);
    assert.equal(details.identity, sensitiveQueryIdentity);
    assert.equal(manifest.scope, scope);
  }
});
