import test from 'node:test';
import assert from 'node:assert/strict';
import { stationFromSnapshot, sortStations, recentStation } from '../lib/stations.ts';
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
