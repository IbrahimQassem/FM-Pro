import test from 'node:test';
import assert from 'node:assert/strict';
import { DeviceRegistration } from '../lib/device-registration.ts';
test('rotation unregisters the old device before registering the replacement',async()=>{
 const calls=[]; const registration=new DeviceRegistration(async(name,data)=>calls.push([name,data.token]),async()=>calls.push(['deleteSdk']));
 await registration.replace('synthetic-a'); await registration.replace('synthetic-b'); await registration.clear(true);
 assert.deepEqual(calls,[['registerStationAlertDevice','synthetic-a'],['unregisterStationAlertDevice','synthetic-a'],['registerStationAlertDevice','synthetic-b'],['unregisterStationAlertDevice','synthetic-b'],['deleteSdk']]);
});
test('failed unregister blocks cleanup and retains enough state to retry',async()=>{
 let fail=true, deleted=0, unregistered=0;
 const registration=new DeviceRegistration(async name=>{ if(name==='unregisterStationAlertDevice'){unregistered++;if(fail)throw Error('Synthetic');}},async()=>deleted++);
 await registration.replace('synthetic'); await assert.rejects(registration.clear(true)); assert.equal(deleted,0);
 fail=false; await registration.clear(true); assert.equal(unregistered,2); assert.equal(deleted,1);
});
test('ambiguous registration failure still cleans the transient token',async()=>{
 const calls=[];
 const registration=new DeviceRegistration(async(name,data)=>{calls.push([name,data.token]);if(name==='registerStationAlertDevice')throw Error('Synthetic');},async()=>{});
 await assert.rejects(registration.replace('synthetic')); await registration.clear(false);
 assert.deepEqual(calls.map(c=>c[0]),['registerStationAlertDevice','unregisterStationAlertDevice']);
});
test('restart without an in-memory token deletes SDK registration without persisting token data',async()=>{
 let deleted=0; const registration=new DeviceRegistration(async()=>assert.fail('No invented token'),async()=>deleted++);
 await registration.clear(true); assert.equal(deleted,1);
});
