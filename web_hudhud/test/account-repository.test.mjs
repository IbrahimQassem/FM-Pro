import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import * as profile from '../lib/account-profile.ts';

// Compile the actual repository and substitute only SDK boundaries. No Firebase
// configuration, network, real users, credentials or writes are used by this test.
async function setup(options={}) {
  const calls=[]; const views=[]; const auth={currentUser:null};
  let listener, snapshot, stopped=0;
  const user={uid:'synthetic-user',email:'fixture@example.invalid',displayName:'Listener',photoURL:'https://example.invalid/provider.jpg',emailVerified:true,providerData:[{providerId:'google.com'}],reload:async()=>{},getIdToken:async()=>{},...options.user};
  const authExports={
    browserSessionPersistence:{},getAuth:()=>auth,setPersistence:async()=>{},onIdTokenChanged:(_auth,changed)=>{listener=changed;return()=>{};},
    GoogleAuthProvider:class { setCustomParameters(value){this.parameters=value;} },
    EmailAuthProvider:{credential:(_email,_password)=>({kind:'password'})},
    signInWithPopup:async(_auth,provider)=>{calls.push(['google',provider.parameters]);if(options.popupError)throw options.popupError;},
    reauthenticateWithPopup:async()=>{calls.push(['reauth-google']);if(options.reauthError)throw options.reauthError;if(options.switchOnReauth)auth.currentUser={...user,uid:'other'};},
    reauthenticateWithCredential:async()=>{calls.push(['reauth-password']);},
    signOut:async()=>{calls.push(['signout']);auth.currentUser=null;},
    createUserWithEmailAndPassword:async()=>({user}),sendPasswordResetEmail:async()=>{},signInWithEmailAndPassword:async()=>{},updateProfile:async()=>{},
  };
  const dependencies={
    'firebase/auth':authExports,
    'firebase/firestore':{doc:(_db,path)=>path,collection:(_db,path)=>path,getDocFromServer:async()=>({get:key=>({displayName:'Saved name',avatarUrl:profile.defaultAvatar,isActive:true})[key]}),onSnapshot:(_ref,callback)=>{snapshot=callback;return()=>{stopped++;};}},
    'firebase/functions':{getFunctions:()=>({}),httpsCallable:(_functions,name)=>async data=>{calls.push([name,data]);if(name==='ensureAccountProfile'&&options.ensure)await options.ensure;if(name==='deleteAccountData'&&options.deleteError)throw options.deleteError;return {data:{updated:options.updated!==false}};}},
    './firebase-client':{getPublicApp:()=>({}),getPublicFirestore:async()=>({})},
    './firestore-environment':{firestoreRoot:'HudHudDev'},
    './discovery':{resolveFollows:docs=>docs},
    './account-profile':profile,
  };
  const source=await readFile(new URL('../lib/account-repository.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  const module=new SourceTextModule(compiled);
  await module.link(async specifier=>{const exports=dependencies[specifier];assert.ok(exports,`Unexpected dependency: ${specifier}`);return new SyntheticModule(Object.keys(exports),function(){for(const [name,value]of Object.entries(exports))this.setExport(name,value);});});
  await module.evaluate();
  const repository=new module.namespace.AccountRepository();
  await repository.start((view,follows,error)=>views.push({view,follows,error}));
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  return {repository,auth,user,calls,views,flush,stopped:()=>stopped,emit:async(value=user)=>{auth.currentUser=value;listener(value);await flush();},snapshot:docs=>snapshot({docs})};
}
test('Google popup is opened directly and cancellation does not call the backend',async()=>{
  const error={code:'auth/popup-closed-by-user'};const f=await setup({popupError:error});
  const result=f.repository.loginWithGoogle();
  assert.equal(f.calls[0][0],'google');assert.equal(f.calls[0][1].prompt,'select_account');
  await assert.rejects(result,value=>value===error);assert.equal(f.calls.length,1);f.repository.dispose();
});
test('unverified Google users cannot create a profile or submit profile changes',async()=>{
  const f=await setup({user:{emailVerified:false}});await f.emit();
  assert.equal(f.views.at(-1).view.verified,false);assert.equal(f.views.at(-1).view.active,false);
  await assert.rejects(f.repository.updateAccountProfile({displayName:'New name'}));
  assert.equal(f.calls.length,0);f.repository.dispose();
});
test('verified account reads the canonical avatar and clears subscriptions on sign-out',async()=>{
  const f=await setup();await f.emit();
  assert.equal(f.views.at(-1).view.avatarUrl,profile.defaultAvatar);assert.equal(f.views.at(-1).view.profileStatus,'ready');
  assert.equal(f.calls[0][1].root,'HudHudDev');f.snapshot([{stationId:'review'}]);assert.equal(f.views.at(-1).follows.length,1);
  await f.emit(null);assert.equal(f.stopped(),1);assert.equal(f.views.at(-1).view,null);f.repository.dispose();
});
test('late profile completion cannot restore a signed-out account',async()=>{
  let resolve;const ensure=new Promise(done=>resolve=done);const f=await setup({ensure});
  await f.emit();await f.emit(null);resolve();await f.flush();
  assert.equal(f.views.at(-1).view,null);assert.equal(f.stopped(),0);f.repository.dispose();
});
test('name-only and avatar saves use the callable and reject unconfirmed updates',async()=>{
  const f=await setup();await f.emit();await f.repository.updateAccountProfile({displayName:' New name '});
  const data=f.calls.find(call=>call[0]==='updateAccountProfile')[1];assert.equal(data.displayName,'New name');assert.equal(data.root,'HudHudDev');assert.ok(!('avatarUrl'in data));f.repository.dispose();
  const failure=await setup({updated:false});await failure.emit();await assert.rejects(failure.repository.updateAccountProfile({displayName:'New name'}));failure.repository.dispose();
});
test('Google deletion reauthenticates before device cleanup, then deletes and signs out',async()=>{
  const f=await setup();await f.emit();f.calls.length=0;
  await f.repository.deleteAccount('',async()=>{f.calls.push(['cleanup']);});
  assert.deepEqual(f.calls.map(c=>c[0]),['reauth-google','cleanup','deleteAccountData','signout']);f.repository.dispose();
});
test('cancelled or mismatched Google reauthentication never deletes or signs out',async()=>{
  for(const options of [{reauthError:{code:'auth/popup-closed-by-user'}},{switchOnReauth:true}]){
    const f=await setup(options);await f.emit();f.calls.length=0;await assert.rejects(f.repository.deleteAccount('',async()=>{f.calls.push(['cleanup']);}));
    assert.deepEqual(f.calls.map(c=>c[0]),['reauth-google']);f.repository.dispose();
  }
});
test('cleanup and deletion failures keep the account signed in; password users retain password reauth',async()=>{
  for(const stage of ['cleanup','delete']){
    const f=await setup({user:{providerData:[{providerId:'password'}]},deleteError:stage==='delete'?new Error('synthetic'):undefined});await f.emit();f.calls.length=0;
    await assert.rejects(f.repository.deleteAccount('synthetic',async()=>{if(stage==='cleanup')throw new Error('synthetic');}));
    assert.equal(f.calls[0][0],'reauth-password');assert.ok(!f.calls.some(c=>c[0]==='signout'));assert.equal(f.auth.currentUser,f.user);f.repository.dispose();
  }
});
