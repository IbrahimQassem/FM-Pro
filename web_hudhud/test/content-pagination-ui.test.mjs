import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as discovery from '../lib/discovery.ts';
import * as stations from '../lib/stations.ts';

// Execute the actual TSX component. Only React's hook scheduler, environment and
// repository ports are substituted: these are behavioral tests, not source scans.
const require = createRequire(import.meta.url);
const program = id => ({ id, stationId: 's', title: id, description: '', priority: 0, episodesCount: 10000, schedule: null });
const episode = (id, programId = 'p') => ({ id, stationId: 's', programId, title: id, description: '', audioUrl: 'https://example.invalid/audio', broadcastAt: 10000, utcOffsetMinutes: 180 });
const cursor = id => ({ version:1,root:'HudHudDev',resource:'episodes',stationId:'s',programId:'p',order:'published:date-desc:priority-desc:id-asc',after:[{kind:'timestamp',seconds:1,nanoseconds:0},0,id] });
const page = (items, nextCursor=null, offline=false) => ({items,nextCursor,offline,rawReadCount:items.length,invalidCount:0});
function content(episodes = Array.from({length:50},(_,i)=>episode(`e${i}`)), options={}) {
 const p=program('p');return {programs:[p,program('other')],episodes,offline:false,programsPage:page([p,program('other')]),episodesPage:page(episodes,cursor('e49')),selectedProgram:p,selectedEpisode:null,...options};
}
async function setup(options={}) {
 const state=[], pendingEffects=[], memos=[], refs=[], effectDeps=[];let index=0,tree,props;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const cleanups=[];
 const hooks={
  useState(initial){const i=index++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},
  useRef(initial){const i=index++;return refs[i]??=( {current:initial} );},
  useMemo(callback,deps){const i=index++;if(!same(memos[i]?.deps,deps))memos[i]={deps,value:callback()};return memos[i].value;},
  useEffect(callback,deps){const i=index++;if(!same(effectDeps[i],deps)){effectDeps[i]=deps;pendingEffects.push(()=>{cleanups[i]?.();cleanups[i]=callback();});}},
 };
 const repository={loadStationContent:async()=>content(),loadProgramsPage:async()=>page([]),loadEpisodesPage:async()=>page([])};
 const source=await readFile(process.env.B12_UI_BASELINE || new URL('../station-detail.tsx',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const module={exports:{}};let timer;
 const location={search:options.search??'',hash:'',href:'https://example.invalid/?station=s'};
 const dependencies={'react':hooks,'./lib/content-repository':repository,'./lib/discovery':discovery,'./lib/stations':stations,'./app-cta':{StationAppBanner:()=>null}};
 runInNewContext(compiled,{module,exports:module.exports,require:name=>dependencies[name]??require(name),location,URL,URLSearchParams,Date,Map,Intl,document:{getElementById:()=>null},navigator:{},setInterval:callback=>{timer=callback;return 1;},clearInterval:()=>{}});
 const station=stations.stationFromSnapshot({id:'s',data:()=>({name:'Synthetic station',isActive:true})});
 const played=[];props={station,onPlay:()=>played.push('live'),onEpisode:value=>played.push(value.id),favorite:false,onFavorite:()=>{},...options};
 const render=()=>{index=0;tree=module.exports.StationDetail(props);pendingEffects.splice(0).forEach(run=>run());return tree;};
 const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));render();};
 render();await flush();
 const nodes=()=>{const all=[];function walk(node){if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object'||!('props'in node))return;all.push(node);walk(node.props.children);}walk(tree);return all;};
 const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
 const button=label=>nodes().find(node=>node.type==='button'&&text(node)===label);
 return {nodes,button,text,played,flush,render,clock:()=>{timer();render();},change:async patch=>{props={...props,...patch};render();await flush();},dispose:()=>cleanups.forEach(cleanup=>cleanup?.())};
}

test('actual detail never mounts more than100 episode rows from a10000 episode source',async()=>{
 const f=await setup({loadContent:async()=>content(Array.from({length:10000},(_,i)=>episode(`e${i}`)))});
 assert.ok(f.nodes().filter(node=>node.props.className?.startsWith('episode-row')).length<=100,'Mounted episode rows exceed100');assert.equal(f.played.length,0);f.dispose();
});
test('next/previous replace the episode window and retain canonical counts without autoplay',async()=>{
 const calls=[];const f=await setup({loadEpisodes:async(_station,p,after)=>{calls.push([p.id,after]);return page(Array.from({length:50},(_,i)=>episode(`e${(after?50:0)+i}`)),after?null:cursor('e49'));}});
 assert.equal(f.nodes().filter(n=>n.props.className?.startsWith('episode-row')).length,50);
 assert.equal(f.button('الحلقات السابقة').props.disabled,true);assert.equal(f.button('الحلقات التالية').props.disabled,false);
 f.button('الحلقات التالية').props.onClick();await f.flush();assert.equal(calls[0][1].after.at(-1),'e49');assert.ok(f.nodes().some(n=>n.type==='h4'&&f.text(n)==='e50'));assert.ok(!f.nodes().some(n=>n.type==='h4'&&f.text(n)==='e0'));assert.equal(f.button('الحلقات التالية').props.disabled,true);
 f.button('الحلقات السابقة').props.onClick();await f.flush();assert.equal(calls[1][1],null);assert.ok(f.nodes().some(n=>n.type==='p'&&f.text(n).includes('10000')));assert.equal(f.played.length,0);f.dispose();
});
test('later-page failure preserves loaded rows and retry repeats the failed page only',async()=>{
 let attempts=0;const f=await setup({loadEpisodes:async()=>{if(++attempts===1)throw Error('Synthetic network');return page([episode('next')]);}});
 f.button('الحلقات التالية').props.onClick();await f.flush();assert.ok(f.nodes().some(n=>n.props.role==='alert'));assert.ok(f.nodes().some(n=>n.type==='h4'&&f.text(n)==='e0'));
 f.button('إعادة المحاولة').props.onClick();await f.flush();assert.equal(attempts,2);assert.ok(f.nodes().some(n=>n.type==='h4'&&f.text(n)==='next'));assert.equal(f.nodes().some(n=>n.props.role==='alert'),false);f.dispose();
});
test('late page completion cannot overwrite another station generation',async()=>{
 let complete;const pending=new Promise(resolve=>{complete=resolve;});
 const loadContent=async id=>id==='s'?content():content([episode('new-station')]);
 const f=await setup({loadContent,loadEpisodes:async()=>pending});f.button('الحلقات التالية').props.onClick();f.render();
 await f.change({station:stations.stationFromSnapshot({id:'new',data:()=>({name:'New',isActive:true})})});complete(page([episode('stale')]));await f.flush();
 assert.ok(f.nodes().some(n=>n.type==='h4'&&f.text(n)==='new-station'));assert.ok(!f.nodes().some(n=>n.type==='h4'&&f.text(n)==='stale'));f.dispose();
});
test('offline pages expose refresh but cannot advance server cursors or switch parent',async()=>{
 const value=content();value.offline=true;value.episodesPage.offline=true;
 const f=await setup({loadContent:async()=>value});assert.equal(f.button('الحلقات التالية').props.disabled,true);assert.equal(f.button('البرامج التالية').props.disabled,true);assert.ok(f.button('تحديث المحتوى'));f.dispose();
});
test('program selection resets its cursor and distant links highlight without autoplay',async()=>{
 const value=content([], {selectedEpisode:episode('e9999')});const calls=[];
 const f=await setup({search:'?program=p&episode=e9999',loadContent:async(_id,_cache,selection)=>{assert.equal(selection.episodeId,'e9999');return value;},loadEpisodes:async(_id,p,c)=>{calls.push([p.id,c]);return page([episode('other-episode',p.id)]);}});
 assert.equal(f.nodes().filter(n=>n.props.className==='episode-row selected-episode').length,1);assert.equal(f.played.length,0);
 const picks=f.nodes().filter(n=>n.type==='button'&&f.text(n)==='عرض حلقات البرنامج');picks[1].props.onClick();await f.flush();assert.deepEqual(calls,[['other',null]]);assert.equal(f.nodes().some(n=>n.props.className==='episode-row selected-episode'),false);assert.equal(f.played.length,0);f.dispose();
});
test('clock ticks retain the page and do not reload or autoplay content',async()=>{
 let loads=0;const value=content();const f=await setup({loadContent:async()=>{loads++;return value;}});f.clock();f.clock();assert.equal(loads,1);assert.equal(f.nodes().filter(n=>n.props.className?.startsWith('episode-row')).length,50);assert.equal(f.played.length,0);f.dispose();
});
test('duplicate next actions share one in-flight page request',async()=>{
 let calls=0,complete;const pending=new Promise(resolve=>{complete=resolve;});const f=await setup({loadEpisodes:async()=>{calls++;return pending;}});
 const next=f.button('الحلقات التالية');next.props.onClick();next.props.onClick();assert.equal(calls,1);complete(page([episode('next')]));await f.flush();assert.equal(f.played.length,0);f.dispose();
});
