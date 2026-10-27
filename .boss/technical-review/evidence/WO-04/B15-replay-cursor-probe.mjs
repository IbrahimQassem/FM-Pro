import{mkdtemp,rm,readdir,readFile,writeFile,lstat}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{createRequire}from'node:module';import{createHash,randomBytes,createCipheriv,createDecipheriv}from'node:crypto';import assert from'node:assert/strict';
import{MemoryFirestore}from'/tmp/hudhud-b15-nonempty-revision/functions/test/support/comment-count-fixture.js';
import{CommentCountBackupStore,createCommentCountDemoFirestore,previewCommentCountReconciliation,applyCommentCountReconciliation}from'/tmp/hudhud-b15-nonempty-revision/tool/reconcile_comment_counts.mjs';
import{encodeCleanupValue}from'/tmp/hudhud-b15-nonempty-revision/tool/remove_old_locations.mjs';
const require=createRequire('/tmp/hudhud-b15-nonempty-revision/functions/package.json'),sdkPath=require.resolve('firebase-admin/firestore'),sdk=require(sdkPath),saved=require.cache[sdkPath].exports,raw=new MemoryFirestore('demo-review-count',{fineMetadata:true});let firestore;
try{require.cache[sdkPath].exports={...sdk,Firestore:class{constructor(){return raw;}}};firestore=createCommentCountDemoFirestore({projectId:raw.projectId,emulatorHost:'127.0.0.1:8180'});}finally{require.cache[sdkPath].exports=saved;}
const directory=await mkdtemp(join(tmpdir(),'count-review-replay-cursor-'));const key=Buffer.alloc(32,7);
try{
const backupStore=await CommentCountBackupStore.open({directory,key,expiresAt:Date.now()+86400000});
const input={firestore,projectId:raw.projectId,root:'HudHudDev',backupStore,owner:'cursor-review',maxItems:25};raw.seed('HudHudDev/episodes/episodes/e',{stats:{commentsCount:0}});
const manifest=await previewCommentCountReconciliation(input);await backupStore.writeVerified(manifest);Object.assign(input,{manifest,expectedManifestHash:manifest.hash});
let complete=false;for(let n=0;n<3000;n++){if((await applyCommentCountReconciliation(input)).status==='active'){complete=true;break;}}assert.equal(complete,true);
const file=join(directory,(await readdir(directory)).find(name=>name.endsWith('.counts-replay'))),identity=await lstat(directory);
function openEnvelope(envelope){const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.nonce,'base64'));decipher.setAAD(Buffer.from(`comment-count-replay:1:${envelope.bindingHash}:${identity.dev}:${identity.ino}:${envelope.expiresAt}`));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]).toString('utf8'));}
const envelope=JSON.parse(await readFile(file,'utf8')),value=openEnvelope(envelope);assert.equal(value.cursor,0);
value.lastEpisode={content:'Synthetic invalid replay cursor content',authorId:'synthetic-only-author'};value.lastHead=['Synthetic invalid head cursor'];
const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(`comment-count-replay:1:${envelope.bindingHash}:${identity.dev}:${identity.ino}:${envelope.expiresAt}`));const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
await writeFile(file,JSON.stringify({...envelope,hash:createHash('sha256').update(JSON.stringify(encodeCleanupValue(value))).digest('hex'),nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}));
const before=raw.writes.length,result=await applyCommentCountReconciliation({...input,maxItems:1});const after=openEnvelope(JSON.parse(await readFile(file,'utf8')));
console.log(JSON.stringify({result:result.status,expected:'reject invalid cursor types before accepting/publishing local progress',lastEpisodeType:typeof after.lastEpisode,lastHeadIsArray:Array.isArray(after.lastHead),nestedContentRepublished:Object.hasOwn(after.lastEpisode,'content'),firestoreWritesAdded:raw.writes.length-before,storage:'existing isolated MemoryFirestore; genuine AES-GCM private custody; synthetic data only'}));
}finally{key.fill(0);await rm(directory,{recursive:true,force:true});}
