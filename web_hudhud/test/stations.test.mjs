import test from 'node:test';
import assert from 'node:assert/strict';
import { stationFromSnapshot, sortStations, recentStation, resolveStreamHealthState } from '../lib/stations.ts';
const map = (id,data)=>stationFromSnapshot({id,data:()=>data});
test('station mapping handles malformed optional fields',()=>{
 const station=map('a',{name:'  المحطة  ',nameEn:null,isActive:true,priority:Infinity,stats:{programsCount:'bad'}});
 assert.equal(station.name,'المحطة'); assert.equal(station.priority,0);
 assert.equal(station.stats.programsCount,0); assert.equal(station.nameEn,'');
 assert.equal(station.isActive,true);
});
test('featured stations precede priority and alphabetical ordering',()=>{
 const items=[map('low',{name:'B',priority:2}),map('featured',{name:'C',isFeatured:true}),map('high',{name:'A',priority:3})];
 assert.deepEqual(items.sort(sortStations).map(x=>x.id),['featured','high','low']);
});
test('recency selects latest available station and handles empty history',()=>{
 const items=[map('featured',{name:'C'}),map('latest',{name:'A'})];
 assert.equal(recentStation(items,[{stationId:'removed'},{stationId:'latest'},{stationId:'featured'}]).id,'latest');
 assert.equal(recentStation(items,[]).id,'featured'); assert.equal(recentStation([],[]),null);
});
test('resolveStreamHealthState accurately resolves status and 45-min freshness',()=>{
 const now = Date.now();
 const noSource = map('s1', { streamUrl: '', backupStreamUrl: '' });
 assert.equal(resolveStreamHealthState(noSource, now), 'noOnlineSource');

 const unchecked = map('s2', { streamUrl: 'https://stream.example/live' });
 assert.equal(resolveStreamHealthState(unchecked, now), 'unverified');

 const stale = map('s3', { streamUrl: 'https://stream.example/live', healthStatus: 'online', lastCheckedAt: now - 46 * 60 * 1000 });
 assert.equal(resolveStreamHealthState(stale, now), 'unverified');

 const stopped = map('s4', { streamUrl: 'https://stream.example/live', healthStatus: 'offline', lastCheckedAt: now - 10 * 60 * 1000 });
 assert.equal(resolveStreamHealthState(stopped, now), 'temporarilyStopped');

 const repeatedFailures = map('s5', { streamUrl: 'https://stream.example/live', healthStatus: 'online', consecutiveFailures: 3, lastCheckedAt: now - 10 * 60 * 1000 });
 assert.equal(resolveStreamHealthState(repeatedFailures, now), 'temporarilyStopped');

 const degradedBackup = map('s6', { streamUrl: 'https://stream.example/live', healthStatus: 'degraded', streamHealthSource: 'backup', lastCheckedAt: now - 10 * 60 * 1000 });
 assert.equal(resolveStreamHealthState(degradedBackup, now), 'backupAvailable');

 const online = map('s7', { streamUrl: 'https://stream.example/live', healthStatus: 'online', consecutiveFailures: 0, lastCheckedAt: now - 10 * 60 * 1000 });
 assert.equal(resolveStreamHealthState(online, now), 'available');
});
