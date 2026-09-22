import test from 'node:test';
import assert from 'node:assert/strict';
import { readIds, toggleId, stationHref, alertHref, programFromSnapshot, episodeFromSnapshot, scheduleStatus, resolveFollows } from '../lib/discovery.ts';
const doc = (id, data) => ({ id, data: () => data });
const schedule = { weekdays: [7], startMinute: 180, endMinute: 240, utcOffsetMinutes: 180 };
const program = { stationId: 's', title: 'Program', isActive: true, schedule };
test('local favorites tolerate corrupt/denied storage, deduplicate and bound IDs', () => {
 assert.deepEqual(readIds({getItem(){throw Error();}},'k'), []);
 assert.deepEqual(readIds({getItem:()=>'{broken'},'k'), []);
 assert.deepEqual(readIds({getItem:()=>JSON.stringify(['s','s','../',null,''])},'k'), ['s']);
 const ids = Array.from({length:100},(_,i)=>String(i)); assert.equal(toggleId(ids,'new').length,100); assert.deepEqual(toggleId(['s'],'s'),[]);
});
test('notification routes reject wrong roots, versions and unsafe IDs', () => {
 for (const root of ['HudHudDev','HudHudOfficial']) {
  const payload = {version:'1',type:'episode',root,stationId:'s',programId:'p',episodeId:'e'};
  assert.equal(alertHref(payload,root),stationHref('s','p','e'));
  for (const patch of [{root:'unknown'},{version:'2'},{episodeId:'../x'},{stationId:''},{type:'url'},{programId:'x'.repeat(129)}]) assert.equal(alertHref({...payload,...patch},root),null);
 }
 assert.ok(stationHref('space & station').includes('station=space+%26+station'));
});
test('content hides removed/mismatched data and rejects invalid schedules/audio/timestamps', () => {
 const p=programFromSnapshot(doc('p',program),'s'); assert.ok(p);
 for (const patch of [{isActive:false},{stationId:'other'},{adminDeletionToken:'pending'},{schedule:{...schedule,endMinute:180}},{schedule:{...schedule,weekdays:[0]}}]) assert.equal(programFromSnapshot(doc('p',{...program,...patch}),'s'),null);
 const episode={stationId:'s',programId:'p',title:'Episode',isPublished:true,audioUrl:'https://example.test/audio',broadcastAt:{toMillis:()=>123},utcOffsetMinutes:180};
 assert.ok(episodeFromSnapshot(doc('e',episode),'s',[p]));
 const httpEpisode = episodeFromSnapshot(doc('e',{...episode,audioUrl:'http://example.test/a'}),'s',[p]);
 assert.equal(httpEpisode?.audioUrl, 'http://example.test/a');
 for(const patch of [{isPublished:false},{programId:'missing'},{audioUrl:'ftp://example.test/a'},{broadcastAt:'yesterday'},{utcOffsetMinutes:1000}]) assert.equal(episodeFromSnapshot(doc('e',{...episode,...patch}),'s',[p]),null);
});
test('schedule uses explicit offset across midnight and exact interval boundaries',()=>{
 assert.equal(scheduleStatus(schedule,Date.parse('2026-09-12T23:59:00Z')),'next');
 assert.equal(scheduleStatus(schedule,Date.parse('2026-09-13T00:00:00Z')),'live');
 assert.equal(scheduleStatus(schedule,Date.parse('2026-09-13T01:00:00Z')),'ended');
 assert.equal(scheduleStatus({...schedule,weekdays:[1]},Date.parse('2026-09-13T00:00:00Z')),'upcoming');
});
test('canonical subscription opt-out overrides newer legacy enablement',()=>{
 const base={targetType:'station',targetId:'s',isActive:true,notificationsEnabled:true};
 const results=resolveFollows([doc('legacy',{...base,updatedAt:{toMillis:()=>200}}),doc('station_s',{...base,isActive:false,notificationsEnabled:false})]);
 assert.deepEqual(results,[{stationId:'s',isActive:false,notificationsEnabled:false}]);
 assert.deepEqual(resolveFollows([doc('old',base),doc('new',{...base,notificationsEnabled:false,updatedAt:{toMillis:()=>100}})])[0].notificationsEnabled,false);
});
