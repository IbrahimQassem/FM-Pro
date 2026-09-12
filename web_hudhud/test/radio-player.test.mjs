import test from 'node:test';
import assert from 'node:assert/strict';
import { RadioPlayer } from '../lib/radio-player.ts';

class FakeAudio extends EventTarget {
  src = ''; preload = ''; pauses = 0; loads = 0;
  pending = Promise.withResolvers();
  play() { return this.pending.promise; }
  pause() { this.pauses++; this.dispatchEvent(new Event('pause')); }
  load() { this.loads++; }
  removeAttribute() { this.src = ''; }
  emit(name) { this.dispatchEvent(new Event(name)); }
}
const station = (id, primary = 'https://example.test/live', backup = 'https://example.test/backup') => ({id, streamUrl:primary, backupStreamUrl:backup});
function setup() {
 const audio = [], states = [], history = [];
 const player = new RadioPlayer(() => { const item = new FakeAudio(); audio.push(item); return item; }, state => states.push(state), id=>history.push(id));
 return {player,audio,states,history};
}
const flush = () => new Promise(resolve=>setImmediate(resolve));

test('rapid switch ignores old play rejection and queued events', async()=>{
 const {player,audio,states,history}=setup();
 player.select(station('a')); player.select(station('b'));
 audio[0].pending.reject(new Error('old source'));
 audio[0].emit('playing'); audio[0].emit('error');
 await flush();
 assert.equal(audio.length,2);
 assert.equal(audio[0].src,'');
 audio[1].emit('playing');
 assert.deepEqual(states.at(-1),{stationId:'b',status:'playing'});
 assert.deepEqual(history,['b']);
 player.dispose();
});
test('invalid stream selection releases current playback',()=>{
 const {player,audio,states}=setup();
 player.select(station('a')); audio[0].emit('playing');
 player.select(station('invalid','javascript:bad',''));
 assert.equal(audio[0].src,''); assert.ok(audio[0].pauses);
 assert.deepEqual(states.at(-1),{stationId:'invalid',status:'error'});
 player.dispose();
});
test('primary error and rejection start only one backup; backup failure is terminal',async()=>{
 const {player,audio,states}=setup();
 player.select(station('a')); audio[0].emit('error');
 audio[0].pending.reject(new Error('same failure')); await flush();
 assert.equal(audio.length,2); assert.equal(audio[1].src,'https://example.test/backup');
 audio[1].emit('error');
 assert.deepEqual(states.at(-1),{stationId:'a',status:'error'});
 assert.equal(audio.length,2); player.dispose();
});
test('stop and dispose invalidate pending work',async()=>{
 const {player,audio,states}=setup();
 player.select(station('a')); player.stop();
 audio[0].pending.reject(new Error('stopped')); await flush();
 assert.deepEqual(states.at(-1),{stationId:null,status:'idle'});
 player.select(station('b')); player.dispose(); const count=states.length;
 audio[1].pending.reject(new Error('disposed')); audio[1].emit('playing'); await flush();
 assert.equal(states.length,count); assert.equal(audio[1].src,'');
});
test('duplicate loading clicks and repeated playing events do not duplicate work/history',()=>{
 const {player,audio,history,states}=setup();
 player.select(station('a')); player.select(station('a')); assert.equal(audio.length,1);
 audio[0].emit('playing'); audio[0].emit('playing'); assert.deepEqual(history,['a']);
 player.select(station('a')); assert.equal(states.at(-1).status,'paused');
 player.select(station('a')); assert.equal(audio.length,2); player.dispose();
});
test('browser permission rejection allows retry without trying backup',async()=>{
 const {player,audio,states}=setup(); player.select(station('a'));
 const denied=new Error('permission'); denied.name='NotAllowedError'; audio[0].pending.reject(denied); await flush();
 assert.equal(audio.length,1); assert.equal(states.at(-1).status,'paused');
 player.select(station('a')); assert.equal(audio.length,2); player.dispose();
});
test('backup-only station and buffering state remain observable',()=>{
 const {player,audio,states}=setup(); player.select(station('a','','https://example.test/backup'));
 assert.equal(audio[0].src,'https://example.test/backup'); audio[0].emit('playing'); audio[0].emit('waiting');
 assert.equal(states.at(-1).status,'connecting'); player.stop();
});
