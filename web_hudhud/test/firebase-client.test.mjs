import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, getApps } from 'firebase/app';
import { getPublicFirestore } from '../lib/firebase-client.ts';
test('a failed SDK initialization is retryable and concurrent initialization is shared', async () => {
 globalThis.__FIREBASE_CONFIG__ = {};
 const first = getPublicFirestore();
 assert.equal(getPublicFirestore(), first);
 await assert.rejects(first);
 await Promise.all(getApps().map(deleteApp));
 globalThis.__FIREBASE_CONFIG__ = {projectId:'demo-hudhud-sdk-test'};
 const retry = getPublicFirestore();
 assert.notEqual(retry,first); assert.equal(getPublicFirestore(),retry);
 assert.ok(await retry);
 await Promise.all(getApps().map(deleteApp));
 delete globalThis.__FIREBASE_CONFIG__;
});
