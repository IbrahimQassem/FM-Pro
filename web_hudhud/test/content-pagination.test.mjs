import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import * as discovery from '../lib/discovery.ts';
import { initializeApp } from 'firebase/app';
import { Timestamp, Bytes, GeoPoint, VectorValue, vector, DocumentReference, getFirestore, doc as sdkDoc, query as sdkQuery, collection as sdkCollection, orderBy as sdkOrderBy, documentId as sdkDocumentId, startAfter as sdkStartAfter, queryEqual } from 'firebase/firestore';
const syntheticDb = getFirestore(initializeApp({ projectId: 'demo-hudhud-b12-cursor' }, 'b12-cursor-test'));

const timestamp = (seconds, nanoseconds = 0) => new Timestamp(seconds, nanoseconds);
const p = (id, extra = {}) => ({ id, stationId: 's', isActive: true, isFeatured: false, priority: 0, title: id, stats: { episodesCount: 10000 }, ...extra });
const e = (id, extra = {}) => ({ id, stationId: 's', programId: 'p', isPublished: true, priority: 0, title: id, audioUrl: 'https://example.invalid/audio', broadcastAt: timestamp(10000 - Number(id.slice(1))), utcOffsetMinutes: 180, ...extra });
const snap = value => ({ id: value.id, data: () => value, exists: () => !!value, get: key => value[key] });
const tupleValue = v => v && typeof v.seconds === 'number' ? v.seconds * 1e9 + v.nanoseconds : v;
async function setup({ programs = [p('p')], episodes = Array.from({ length: 10000 }, (_, i) => e(`e${i}`)), root = 'HudHudDev', cache = false, serverError = false } = {}) {
  const calls = [], direct = [];
  const rows = { programs, episodes };
  const constraint = kind => (...args) => ({ kind, args });
  const sdk = {
    collection: (_db, path) => ({ path }), doc: (_db, path) => sdkDoc(syntheticDb, path),
    query: (base, ...constraints) => ({ ...base, constraints }), where: constraint('where'), orderBy: constraint('orderBy'), limit: constraint('limit'), startAfter: constraint('startAfter'), documentId: () => '__name__',
    Timestamp, Bytes, GeoPoint, VectorValue, vector, DocumentReference,
  };
  function evaluate(q, source) {
    if (source === 'server' && serverError) throw new Error('Synthetic network failure');
    if (source === 'cache' && !cache) throw new Error('Cold cache');
    const kind = q.path.split('/').at(-1);
    let docs = [...rows[kind]];
    const cs = q.constraints || [];
    for (const c of cs.filter(c => c.kind === 'where')) docs = docs.filter(d => d[c.args[0]] === c.args[2]);
    const orders = cs.filter(c => c.kind === 'orderBy');
    docs = docs.filter(d => orders.every(c => c.args[0] === '__name__' || d[c.args[0]] !== undefined));
    function compare(a, values) { for (let i = 0; i < orders.length; i++) { const [field, direction] = orders[i].args; const av = tupleValue(field === '__name__' ? a.id : a[field]); const bv = tupleValue(values[i]); const cmp = av < bv ? -1 : av > bv ? 1 : 0; if (cmp) return direction === 'desc' ? -cmp : cmp; } return 0; }
    docs.sort((a,b) => compare(a, orders.map(c => c.args[0] === '__name__' ? b.id : b[c.args[0]])));
    const after = cs.find(c => c.kind === 'startAfter'); if (after) docs = docs.filter(d => compare(d, after.args) > 0);
    const cap = cs.find(c => c.kind === 'limit'); if (cap) docs = docs.slice(0, cap.args[0]);
    calls.push({ kind, source, count: docs.length, constraints: cs });
    return { docs: docs.map(snap), empty: !docs.length };
  }
  sdk.getDocsFromCache = async q => evaluate(q, 'cache'); sdk.getDocsFromServer = async q => evaluate(q, 'server');
  sdk.getDocFromServer = async ref => { direct.push(ref.path); const parts = ref.path.split('/'); const kind = parts.at(-2), id = parts.at(-1); const value = kind === 'stations' ? { id, isActive: id === 's' } : rows[kind]?.find(d => d.id === id); return value ? snap(value) : { exists: () => false }; };
  const dependencies = { 'firebase/firestore': sdk, './firebase-client': { getPublicFirestore: async () => syntheticDb }, './firestore-environment': { firestoreRoot: root }, './discovery': discovery };
  const compiled = ts.transpileModule(await readFile(new URL('../lib/content-repository.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const module = new SourceTextModule(compiled);
  await module.link(async name => { const values = dependencies[name]; assert.ok(values, `Unexpected dependency ${name}`); return new SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }); });
  await module.evaluate();
  return { repo: module.namespace, calls, direct, rows };
}

test('initial real repository loads bounded content from a 10000 episode archive', async () => {
  const f = await setup();
  const value = await f.repo.loadStationContent('s');
  assert.ok(f.calls.filter(c => c.source === 'server').every(c => c.count <= 51), 'Initial content must read at most51 raw documents per query');
  assert.ok(value.episodes.length <= 50, 'Initial content must return at most50 episodes');
});

test('all 10000 episodes are reachable by explicit bounded continuations without duplicates', async () => {
  const f = await setup(); const first = await f.repo.loadStationContent('s');
  const ids = new Set(first.episodes.map(item => item.id)); let cursor = first.episodesPage.nextCursor; let actions = 1;
  while (cursor) { const page = await f.repo.loadEpisodesPage('s', first.selectedProgram, cursor); assert.ok(page.rawReadCount <= 51); assert.ok(page.items.length <= 50); for (const item of page.items) { assert.equal(ids.has(item.id), false); ids.add(item.id); } cursor = page.nextCursor; actions++; }
  assert.equal(ids.size, 10000); assert.equal(actions, 200); assert.equal(f.calls.filter(c => c.source === 'server').length, 201);
});
test('active/published and selected parent filters precede limits and draft archives cannot hide content', async () => {
  const f = await setup({ programs: [...Array.from({ length: 101 }, (_, i) => p(`inactive${i}`, { isActive: false })), p('p'), p('other')], episodes: [...Array.from({ length: 101 }, (_, i) => e(`e${i}`, { isPublished: false })), e('e1000'), e('e2000', { programId: 'other' })] });
  const value = await f.repo.loadStationContent('s'); assert.equal(value.selectedProgram.id, 'other'); assert.equal(value.episodes[0].id, 'e2000');
  const page = await f.repo.loadEpisodesPage('s', value.programs.find(item => item.id === 'p')); assert.equal(page.items[0].id, 'e1000');
  assert.ok(f.calls.every(call => call.count <= 51));
});
test('program order uses featured then priority title and ID; parent count is canonical', async () => {
  const f = await setup({ programs: [p('z'), p('b', { title: 'Equal', isFeatured: true }), p('a', { title: 'Equal', isFeatured: true }), p('priority', { priority: 9 })], episodes: [] });
  const page = await f.repo.loadProgramsPage('s'); assert.deepEqual(Array.from(page.items, item => item.id), ['a','b','priority','z']); assert.equal(page.items[0].episodesCount,10000);
});
test('invalid mapped rows advance the last consumed raw cursor, not lookahead or mapped item', async () => {
  const episodes = Array.from({ length: 101 }, (_, i) => e(`e${i}`, i < 50 ? { title: '' } : {}));
  const f = await setup({ episodes }); const program = discovery.programFromSnapshot(snap(p('p')), 's');
  const first = await f.repo.loadEpisodesPage('s', program); assert.equal(first.items.length,0); assert.equal(first.invalidCount,50); assert.equal(first.nextCursor.after.at(-1),'e49');
  const second = await f.repo.loadEpisodesPage('s', program, first.nextCursor); assert.equal(second.items[0].id,'e50'); assert.equal(second.items.length,50); assert.equal(second.nextCursor.after.at(-1),'e99');
});
test('empty programs avoid the episode query entirely', async () => {
  const f = await setup({ programs: [] }); const value = await f.repo.loadStationContent('s'); assert.equal(value.selectedProgram,null); assert.equal(value.episodes.length,0); assert.deepEqual(f.calls.map(call => call.kind), ['programs']);
});
test('cursor rejects root, parent, filter/version/order and tuple tampering before IO', async () => {
  const f = await setup(); const value = await f.repo.loadStationContent('s'); const cursor = value.episodesPage.nextCursor; const before = f.calls.length;
  for (const patch of [{ version: 2 }, { root: 'HudHudOfficial' }, { stationId: 'other' }, { programId: 'other' }, { resource: 'programs' }, { order: 'unknown' }, { after: [] }, { after: [null,0,'../'] }, { after: [{seconds:1,nanoseconds:1e9},0,'e'] }]) await assert.rejects(f.repo.loadEpisodesPage('s',value.selectedProgram,{...cursor,...patch}));
  assert.equal(f.calls.length,before);
});
test('timestamp cursor preserves seconds/nanoseconds and equal timestamp ID ties', async () => {
  const episodes = Array.from({ length: 52 }, (_, i) => e(`e${String(i).padStart(3,'0')}`, { broadcastAt: timestamp(1,123456789) }));
  const f = await setup({ episodes }); const value = await f.repo.loadStationContent('s');
  assert.equal(value.episodesPage.nextCursor.after[0].seconds,1); assert.equal(value.episodesPage.nextCursor.after[0].nanoseconds,123456789);
  const next = await f.repo.loadEpisodesPage('s',value.selectedProgram,value.episodesPage.nextCursor); assert.deepEqual(Array.from(next.items,item=>item.id),['e050','e051']);
});
test('cache first is bounded, marked offline and cannot advance a server traversal', async () => {
  const f = await setup({ cache: true }); const seen=[]; const value = await f.repo.loadStationContent('s',c=>seen.push(c));
  assert.equal(seen.length,1); assert.equal(seen[0].offline,true); assert.equal(seen[0].episodesPage.nextCursor,null); assert.equal(seen[0].programsPage.nextCursor,null); assert.equal(value.offline,false);
  const count=f.calls.length; await assert.rejects(f.repo.loadEpisodesPage('s',value.selectedProgram,value.episodesPage.nextCursor,'cache')); assert.equal(f.calls.length,count);
  const offline = await setup({ cache:true,serverError:true }); assert.equal((await offline.repo.loadStationContent('s')).offline,true);
});
test('distant episode direct lookup validates only station, episode and program with no page reads', async () => {
  const f = await setup(); const linked = await f.repo.resolveContentLink('s',{programId:'p',episodeId:'e9999'}); assert.equal(linked.episode.id,'e9999'); assert.equal(f.direct.length,3); assert.equal(f.calls.length,0);
});
test('direct link rejects hidden/deleting/wrong-parent/cross-station records without autoplay', async () => {
  for (const patch of [{isPublished:false},{adminDeletionToken:'pending'},{programId:'other'},{stationId:'other'}]) {
    const f=await setup({episodes:[e('e9999',patch)]}); const linked=await f.repo.resolveContentLink('s',{programId:'p',episodeId:'e9999'}); assert.equal(linked.episode,null); assert.ok(f.direct.length<=3);
  }
  for(const patch of [{isActive:false},{adminDeletionToken:'pending'},{stationId:'other'}]) { const f=await setup({programs:[p('p',patch)]});const linked=await f.repo.resolveContentLink('s',{programId:'p',episodeId:'e9999'});assert.equal(linked.episode,null); }
});
test('linked program outside the first program page is validated directly without hydrating all parents', async () => {
  const f=await setup({programs:Array.from({length:101},(_,i)=>p(`p${String(i).padStart(3,'0')}`)),episodes:[e('e9999',{programId:'p100'})]});const value=await f.repo.loadStationContent('s',undefined,{programId:'p100',episodeId:'e9999'});assert.equal(value.programs.length,50);assert.equal(value.selectedProgram.id,'p100');assert.equal(value.selectedEpisode.id,'e9999');assert.equal(f.direct.length,3);assert.ok(f.calls.every(c=>c.count<=51));
});
test('both roots keep every query and direct lookup in the selected canonical root', async () => {
  for(const root of ['HudHudDev','HudHudOfficial']) { const f=await setup({root});const value=await f.repo.loadStationContent('s');assert.equal(value.episodesPage.nextCursor.root,root);await f.repo.resolveContentLink('s',{programId:'p',episodeId:'e9999'});assert.ok(f.direct.every(path=>path.startsWith(`${root}/`))); }
});
test('concurrent inserts before the cursor require refresh and deletes do not duplicate the next page', async()=>{
 const f=await setup({episodes:Array.from({length:101},(_,i)=>e(`e${i}`))});const first=await f.repo.loadStationContent('s');
 f.rows.episodes.unshift(e('inserted',{broadcastAt:timestamp(20000)}));f.rows.episodes=f.rows.episodes.filter(row=>row.id!=='e50');
 const next=await f.repo.loadEpisodesPage('s',first.selectedProgram,first.episodesPage.nextCursor);
 assert.equal(next.items.some(item=>item.id==='inserted'),false);assert.equal(next.items.some(item=>first.episodes.some(old=>old.id===item.id)),false);assert.equal(next.items[0].id,'e51');
 const refreshed=await f.repo.loadEpisodesPage('s',first.selectedProgram);assert.equal(refreshed.items[0].id,'inserted');
});

test('REVIEW B12: invalid raw map sort value must advance to later valid episode', async()=>{
 const episodes=Array.from({length:51},(_,i)=>e(`e${String(i).padStart(3,'0')}`,i===49?{priority:{unexpected:'map'}}:{}));
 const f=await setup({episodes}); const program=discovery.programFromSnapshot(snap(p('p')),'s');
 let first;
 await assert.doesNotReject(async()=>{first=await f.repo.loadEpisodesPage('s',program);},'A malformed raw sort value must not block the entire page or later valid episode');
 assert.equal(first.nextCursor.after.at(-1),'e049','Invalid raw last row must retain continuation');
 const second=await f.repo.loadEpisodesPage('s',program,first.nextCursor);
 assert.equal(second.items.some(row=>row.id==='e050'),true,'Later valid episode must remain reachable');
});

test('REVIEW B12: plain map with timestamp-looking fields must remain a map in cursor', async()=>{
 const raw={seconds:123,nanoseconds:456};
 const episodes=Array.from({length:51},(_,i)=>e(`e${String(i).padStart(3,'0')}`,i===49?{priority:raw}:{}));
 const f=await setup({episodes}); const program=discovery.programFromSnapshot(snap(p('p')),'s');
 const first=await f.repo.loadEpisodesPage('s',program);
 await f.repo.loadEpisodesPage('s',program,first.nextCursor);
 const after=f.calls.at(-1).constraints.find(c=>c.kind==='startAfter').args[1];
 assert.equal(after.constructor.name,'Object','A raw map must not change Firestore type to Timestamp');
});

test('raw Firestore ordering types survive immutable JSON cursor round trips without type guessing',async()=>{
 const ref=sdkDoc(syntheticDb,'HudHudOfficial/legacy/values/reference');
 const values=[null,false,true,NaN,Infinity,-Infinity,-0,17,'legacy',timestamp(123,456),Bytes.fromUint8Array(new Uint8Array([0,127,255])),ref,new GeoPoint(12.5,43.25),vector([1,-2,3]),['array',{seconds:1,nanoseconds:2}],{kind:'timestamp',seconds:3,nanoseconds:4,nested:{geo:new GeoPoint(-1,2)}},Object.fromEntries([['__proto__',{owned:true}],['constructor','safe']])];
 for(const raw of values){
  const episodes=Array.from({length:51},(_,i)=>e(`e${String(i).padStart(3,'0')}`,i===49?{priority:raw,title:''}:{}));
  const f=await setup({episodes});const program=discovery.programFromSnapshot(snap(p('p')),'s');const first=await f.repo.loadEpisodesPage('s',program);
  assert.equal(first.invalidCount,1);assert.equal(first.nextCursor.after.at(-1),'e049');
  const frozen=value=>{if(value&&typeof value==='object'){assert.equal(Object.isFrozen(value),true);Object.values(value).forEach(frozen);}};frozen(first.nextCursor);
  const restored=JSON.parse(JSON.stringify(first.nextCursor));const second=await f.repo.loadEpisodesPage('s',program,restored);
  assert.equal(second.items[0].id,'e050');const after=f.calls.at(-1).constraints.find(c=>c.kind==='startAfter').args;const actual=after[1];
  // Actual SDK query construction serializes both bounds locally: no reads.
  const base=sdkQuery(sdkCollection(syntheticDb,'HudHudDev/episodes/episodes'),sdkOrderBy('broadcastAt','desc'),sdkOrderBy('priority','desc'),sdkOrderBy(sdkDocumentId(),'asc'));
  assert.equal(queryEqual(sdkQuery(base,sdkStartAfter(...after)),sdkQuery(base,sdkStartAfter(episodes[49].broadcastAt,raw,'e049'))),true,'Round-trip bound must have identical native Firestore semantics');
  if(raw instanceof Timestamp)assert.ok(actual instanceof Timestamp&&actual.isEqual(raw));
  else if(raw instanceof Bytes)assert.ok(actual instanceof Bytes&&actual.isEqual(raw));
  else if(raw instanceof DocumentReference){assert.ok(actual instanceof DocumentReference);assert.equal(actual.path,raw.path);assert.equal(actual.firestore,syntheticDb);}
  else if(raw instanceof GeoPoint)assert.ok(actual instanceof GeoPoint&&actual.isEqual(raw));
  else if(raw instanceof VectorValue)assert.ok(actual instanceof VectorValue&&actual.isEqual(raw));
  else if(raw&&typeof raw==='object'){
   assert.equal(Array.isArray(actual),Array.isArray(raw));
   if(Array.isArray(raw))assert.equal(JSON.stringify(actual),JSON.stringify(raw));
   else {assert.equal(actual.seconds,raw.seconds);assert.equal(actual.kind,raw.kind);if(raw.nested)assert.ok(actual.nested.geo instanceof GeoPoint);if(Object.hasOwn(raw,'__proto__')){assert.equal(Object.hasOwn(actual,'__proto__'),true);assert.equal(actual.__proto__.owned,true);assert.equal(Object.getPrototypeOf(actual).owned,undefined);}}
  } else assert.equal(Object.is(actual,raw),true);
 }
});

test('malformed, excessive and foreign-scope raw cursor payloads fail before any query read',async()=>{
 const f=await setup();const first=await f.repo.loadStationContent('s');const original=first.episodesPage.nextCursor;const before=f.calls.length;
 const invalid=[{kind:'unknown'}, {kind:'timestamp',seconds:1,nanoseconds:1e9}, {kind:'number',value:'not-number'}, {kind:'bytes',base64:'%%%invalid'}, {kind:'geo',latitude:91,longitude:0}, {kind:'vector',values:[{}]}, {kind:'vector',values:Array(2049).fill(0)}, {kind:'reference',projectId:'other-project',database:'(default)',path:'collection/doc'}, {kind:'reference',projectId:'demo-hudhud-b12-cursor',database:'other-db',path:'collection/doc'}, {kind:'reference',projectId:'demo-hudhud-b12-cursor',database:'(default)',path:'odd'}, {kind:'map',entries:[['same',1],['same',2]]}, {kind:'array',items:['x'.repeat(8*1024*1024+1)]}];
 let nested=null;for(let i=0;i<22;i++)nested={kind:'array',items:[nested]};invalid.push(nested);
 const cycle={kind:'array',items:[]};cycle.items.push(cycle);invalid.push(cycle);
 for(const raw of invalid)await assert.rejects(f.repo.loadEpisodesPage('s',first.selectedProgram,{...original,after:[original.after[0],raw,original.after[2]]}));
 assert.equal(f.calls.length,before);
});
test('a large valid native byte value remains traversable within cursor bounds',async()=>{
 const raw=Bytes.fromUint8Array(new Uint8Array(256*1024).fill(127));
 const episodes=Array.from({length:51},(_,i)=>e(`e${String(i).padStart(3,'0')}`,i===49?{priority:raw,title:''}:{}));
 const f=await setup({episodes});const program=discovery.programFromSnapshot(snap(p('p')),'s');const first=await f.repo.loadEpisodesPage('s',program);
 const next=await f.repo.loadEpisodesPage('s',program,JSON.parse(JSON.stringify(first.nextCursor)));
 assert.equal(next.items[0].id,'e050');assert.ok(f.calls.at(-1).constraints.find(c=>c.kind==='startAfter').args[1].isEqual(raw));
});
