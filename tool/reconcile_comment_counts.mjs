#!/usr/bin/env node
import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { createRequire } from 'node:module';
import { constants } from 'node:fs';
import { open, realpath, lstat, rename, unlink } from 'node:fs/promises';
import { resolve, relative, join, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeCleanupValue, decodeCleanupValue } from './remove_old_locations.mjs';
import { materializeEpisodeCountBaseline, materializeCommentCountContribution, statusContribution } from '../functions/lib/comment-counts.js';
import { countRoot, countHash, countId, nativeTimestamp, sameCreateTime, compareNativeTime, validateCommentCountFence } from '../functions/lib/comment-count-maintenance.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { FieldPath } = require('firebase-admin/firestore');
const hash = value => createHash('sha256').update(JSON.stringify(encodeCleanupValue(value))).digest('hex');
const same = (a, b) => hash(a) === hash(b);
const HEX = /^[a-f0-9]{64}$/, recoveryWindow = 3600000;
const replayToken = Symbol('count-private-replay');
const backupToken = Symbol('count-private-backup'), backupStores = new WeakSet(), transports = new WeakMap();
const fail = (reason = 'count-maintenance-precondition') => { const error = new Error('Comment count reconciliation stopped safely.'); error.code = 'failed-precondition'; error.details = { reason }; throw error; };
const bodyHash = value => { const { hash: ignored, ...body } = value; void ignored; return hash(body); };
function validateBackupPayload(value) {
  if (!value || value.version !== 1 || !['comment-count-plan', 'comment-count-unit'].includes(value.kind) ||
      !countHash(value.hash) || bodyHash(value) !== value.hash || !/^[a-z][a-z0-9-]{4,62}$/.test(value.projectId ?? '')) fail();
  countRoot(value.root);
  if (value.kind === 'comment-count-unit') validateCountUnit(value);
  else validateCountManifest(value);
  return value;
}
/** Private, immutable count-specific backups; not a general storage framework. */
export class CommentCountBackupStore {
  #directory; #key; #expiresAt; #repositoryRoot; #now; #identity; #files = new Map();
  constructor(token, { directory, key, expiresAt, repositoryRoot, now }, identity) {
    if (token !== backupToken) fail();
    this.#identity = identity;
    if (!Buffer.isBuffer(key) || key.length !== 32 || !Number.isSafeInteger(expiresAt)) fail();
    this.#directory = resolve(directory); this.#key = Buffer.from(key); this.#expiresAt = expiresAt;
    this.#repositoryRoot = resolve(repositoryRoot); this.#now = now;
  }
  static async open(config) {
    const { directory, key, expiresAt, now = Date.now } = config;
    if (Object.hasOwn(config, 'repositoryRoot') || typeof directory !== 'string' || !isAbsolute(directory) || typeof now !== 'function') fail();
    const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
    const actual = await realpath(directory), stat = await lstat(directory);
    if (stat.isSymbolicLink()) fail();
    const store = new CommentCountBackupStore(backupToken, { directory: actual, key, expiresAt, repositoryRoot, now }, { dev: stat.dev, ino: stat.ino });
    await store.checkDirectory(); backupStores.add(store); return Object.freeze(store);
  }
  async checkDirectory() {
    const currentTime = this.#now();
    if (!Number.isSafeInteger(currentTime) || this.#expiresAt - currentTime < recoveryWindow || this.#expiresAt > currentTime + 30 * 86400000) fail();
    const stat = await lstat(this.#directory), actual = await realpath(this.#directory), repo = await realpath(this.#repositoryRoot);
    const inside = relative(repo, actual);
    if (stat.dev !== this.#identity.dev || stat.ino !== this.#identity.ino || actual !== this.#directory || !stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 ||
        (process.getuid && stat.uid !== process.getuid()) || !inside || (inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside)) ||
        actual.split('/').includes('.boss')) fail();
    return actual;
  }
  async writeVerified(manifest) {
    const directory = await this.checkDirectory();
    validateBackupPayload(manifest);
    const nonce = randomBytes(12), aad = Buffer.from(`comment-counts:1:${manifest.hash}:${this.#expiresAt}`);
    const cipher = createCipheriv('aes-256-gcm', this.#key, nonce); cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(manifest)), cipher.final()]);
    const bytes = JSON.stringify({ version: 1, hash: manifest.hash, expiresAt: this.#expiresAt,
      nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') });
    let handle;
    try {
      handle = await open(join(directory, `${manifest.hash}.counts-backup`), 'wx', 0o600);
      await handle.writeFile(bytes); await handle.sync();
    } catch (error) { if (error?.code !== 'EEXIST') throw error; }
    finally { await handle?.close(); }
    const folder = await open(directory, 'r'); try { await folder.sync(); } finally { await folder.close(); }
    if (!same(await this.readVerified(manifest.hash), manifest)) fail();
    return manifest.hash;
  }
  async readVerified(backupHash) {
    const directory = await this.checkDirectory(); if (!HEX.test(backupHash)) fail();
    const path = join(directory, `${backupHash}.counts-backup`), stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 ||
        (process.getuid && stat.uid !== process.getuid())) fail();
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    let envelope; try {
      const opened = await handle.stat(), prior = this.#files.get(backupHash);
      if (!opened.isFile() || (opened.mode & 0o077) !== 0 || (process.getuid && opened.uid !== process.getuid()) || opened.dev !== stat.dev || opened.ino !== stat.ino || (prior && (prior.dev !== opened.dev || prior.ino !== opened.ino))) fail();
      this.#files.set(backupHash, { dev: opened.dev, ino: opened.ino });
      envelope = JSON.parse(await handle.readFile('utf8'));
    } finally { await handle.close(); }
    await this.checkDirectory();
    if (envelope.version !== 1 || envelope.hash !== backupHash || envelope.expiresAt !== this.#expiresAt || envelope.expiresAt <= this.#now()) fail();
    const decipher = createDecipheriv('aes-256-gcm', this.#key, Buffer.from(envelope.nonce, 'base64'));
    decipher.setAAD(Buffer.from(`comment-counts:1:${backupHash}:${envelope.expiresAt}`));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const value = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
    if (value.hash !== backupHash || bodyHash(value) !== backupHash) fail();
    validateBackupPayload(value); return value;
  }
  async replaySession(token, binding, callback) {
    if (token !== replayToken) fail('untrusted-count-replay-capability');
    const directory = await this.checkDirectory(), bindingHash = hash(binding);
    const headKey = hash([binding.projectId, binding.root, binding.planHash]);
    const path = join(directory, `${headKey}.counts-replay`), lockPath = `${path}.lock`;
    let lock, lockIdentity; const lockToken = randomBytes(32);
    try {
      lock = await open(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
      lockIdentity = await lock.stat(); await lock.writeFile(lockToken); await lock.sync();
      const checkLock = async () => {
        await this.checkDirectory(); const stat = await lstat(lockPath);
        if (stat.dev !== lockIdentity.dev || stat.ino !== lockIdentity.ino || !stat.isFile() || stat.isSymbolicLink() ||
            (stat.mode & 0o077) || stat.size !== 32 || (process.getuid && stat.uid !== process.getuid())) fail('count-replay-lock-identity');
        const file = await open(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
          const opened = await file.stat();
          if (opened.dev !== stat.dev || opened.ino !== stat.ino || !(await file.readFile()).equals(lockToken)) fail('count-replay-lock-identity');
        } finally { await file.close(); }
      };
      const read = async () => {
        await this.checkDirectory(); let stat;
        try { stat = await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
        if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) fail('count-replay-custody');
        const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); let envelope;
        try {
          const opened = await file.stat();
          if (opened.dev !== stat.dev || opened.ino !== stat.ino) fail('count-replay-custody');
          envelope = JSON.parse(await file.readFile('utf8'));
        } finally { await file.close(); }
        if (envelope.version !== 1 || envelope.expiresAt !== this.#expiresAt || envelope.bindingHash !== bindingHash) fail('count-replay-binding');
        const decipher = createDecipheriv('aes-256-gcm', this.#key, Buffer.from(envelope.nonce, 'base64'));
        decipher.setAAD(Buffer.from(`comment-count-replay:1:${bindingHash}:${this.#identity.dev}:${this.#identity.ino}:${this.#expiresAt}`));
        decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
        const value = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
        if (hash(value) !== envelope.hash || !same(value.binding, binding) || value.expiresAt !== this.#expiresAt) fail('count-replay-binding');
        validateReplayState(value); return value;
      };
      await checkLock(); const before = await read(), result = await callback(before);
      if (!result?.state || !same(result.state.binding, binding)) fail('count-replay-checkpoint');
      const value = { ...result.state, version: 1, kind: 'comment-count-replay', expiresAt: this.#expiresAt,
        revision: (before?.revision ?? 0) + 1, predecessorHash: before ? hash(before) : null };
      validateReplayState(value); await this.checkDirectory();
      await checkLock(); if (!same(await read(), before)) fail('count-replay-cas');
      const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.#key, nonce);
      cipher.setAAD(Buffer.from(`comment-count-replay:1:${bindingHash}:${this.#identity.dev}:${this.#identity.ino}:${this.#expiresAt}`));
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
      const envelope = { version: 1, bindingHash, hash: hash(value), expiresAt: this.#expiresAt,
        nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
      const temp = `${path}.${randomUUID()}.new`, output = await open(temp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
      try { await output.writeFile(JSON.stringify(envelope)); await output.sync(); } finally { await output.close(); }
      await checkLock(); if (!same(await read(), before)) fail('count-replay-cas');
      await rename(temp, path); const folder = await open(directory, 'r'); try { await folder.sync(); } finally { await folder.close(); }
      await checkLock(); if (!same(await read(), value)) fail('count-replay-readback');
      return result.output;
    } catch (error) {
      if (error.code === 'EEXIST') fail('count-replay-lock-busy');
      throw error;
    } finally {
      if (lock) {
        try {
          let released = false;
          const current = await lstat(lockPath);
          if (current.dev === lockIdentity.dev && current.ino === lockIdentity.ino && !current.isSymbolicLink() && current.size === 32) {
            const check = await open(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW);
            try { const stat = await check.stat(); if (stat.dev === lockIdentity.dev && stat.ino === lockIdentity.ino && (await check.readFile()).equals(lockToken)) { await unlink(lockPath); released = true; } }
            finally { await check.close(); }
          }
          if (!released) fail('count-replay-lock-identity');
        } finally { await lock.close(); }
        const folder = await open(directory, 'r'); try { await folder.sync(); } finally { await folder.close(); }
      }
    }
  }

}

Object.freeze(CommentCountBackupStore.prototype);

function scope(input, firestore) {
  countRoot(input.root);
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(input.projectId ?? '') || firestore.projectId !== input.projectId) fail();
}
function demoHost(projectId, host) {
  const match = /^(127\.0\.0\.1|localhost|\[::1\]):(\d+)$/.exec(host ?? '');
  if (!projectId.startsWith('demo-') || !match || Number(match[2]) < 1 || Number(match[2]) > 65535) fail('production-count-mutation-unavailable');
  if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== host) fail('untrusted-count-transport');
  return host;
}
export function createCommentCountDemoFirestore({ projectId, emulatorHost = process.env.FIRESTORE_EMULATOR_HOST }) {
  const host = demoHost(projectId, emulatorHost), { Firestore } = require('firebase-admin/firestore'), client = new Firestore();
  client.settings({ projectId, host, ssl: false });
  const facade = Object.freeze({ projectId, doc: client.doc.bind(client), collection: client.collection.bind(client),
    collectionGroup: client.collectionGroup.bind(client), getAll: client.getAll.bind(client),
    runTransaction: client.runTransaction.bind(client), terminate: client.terminate.bind(client) });
  transports.set(facade, { projectId, host }); return facade;
}
function trusted(input, firestore) {
  scope(input, firestore); const binding = transports.get(firestore);
  if (!binding || binding.projectId !== input.projectId) fail('untrusted-count-transport');
  demoHost(input.projectId, binding.host);
}
const image = snapshot => snapshot.exists ? { exists: true, version: encodeCleanupValue(snapshot.updateTime),
  createTime: encodeCleanupValue(snapshot.createTime), data: encodeCleanupValue(snapshot.data()) } : { exists: false };
export async function previewCommentCountReconciliation({ firestore, projectId, root }) {
  scope({ projectId, root }, firestore);
  const before = await firestore.doc(`${root}/commentCountContributions`).get();
  if (before.exists) {
    const value = validateCommentCountFence(before.data());
    if (value.state !== 'active') fail('count-root-already-paused');
  }
  const body = { version: 1, kind: 'comment-count-plan', projectId, root, beforeRoot: image(before) };
  return { ...body, hash: hash(body) };
}
async function assertNoLegacyLedger(firestore, root) {
  // This range contains only the old private namespace, not canonical comments.
  // Empty results exhaust the scope. Any positive page refuses all mutations.
  const page = await firestore.collectionGroup('comments')
    .where(FieldPath.documentId(), '>=', firestore.doc(`${root}/commentCountContributions`))
    .where(FieldPath.documentId(), '<', firestore.doc(`${root}/commentCountContributions\uf8ff`))
    .orderBy(FieldPath.documentId()).limit(25).get();
  if (!page.empty) fail('old-count-ledger-present');
}

function acceptedEmptyActivation(snapshot, manifest) {
  if (!snapshot.exists) return false;
  const value = validateCommentCountFence(snapshot.data()), control = value.countMaintenance;
  return value.state === 'active' && value.planHash === manifest.hash && value.baselineManifestHash === manifest.hash &&
    control?.version === 1 && control.kind === 'empty-bootstrap' && control.phase === 'active' && control.complete === true &&
    control.inventoryCount === 0 && control.inventoryDigest === hash([]) && control.barrierPlanHash === manifest.hash &&
    Number.isSafeInteger(control.barrierGeneration) && control.barrierGeneration > 0 && value.generation === control.barrierGeneration + 1 &&
    control.barrierOwner === value.owner && nativeTimestamp(control.barrierVersion) &&
    sameCreateTime(value.activeFrom, control.barrierVersion) && nativeTimestamp(snapshot.createTime) &&
    compareNativeTime(snapshot.createTime, control.barrierVersion) <= 0 && compareNativeTime(snapshot.updateTime, control.barrierVersion) > 0;
}

/** Early04-T09 milestone only: real frozen, twice-exhausted EMPTY demo bootstrap. */
export async function bootstrapEmptyCommentCountRoot({ firestore, projectId, root, manifest, expectedManifestHash,
  backupStore, maxItems = 25, owner = randomUUID(), now = Date.now }) {
  const input = { projectId, root }; trusted(input, firestore); validateBackupPayload(manifest);
  if (manifest.kind !== 'comment-count-plan' || manifest.projectId !== projectId || manifest.root !== root ||
      manifest.hash !== expectedManifestHash || !backupStores.has(backupStore) || !countId(owner) ||
      !Number.isInteger(maxItems) || maxItems < 1 || maxItems > 25) fail();
  const verify = async () => {
    trusted(input, firestore);
    if (!same(await backupStore.readVerified(manifest.hash), manifest)) fail('count-backup-mismatch');
  };
  await verify(); await assertNoLegacyLedger(firestore, root);
  const fenceRef = firestore.doc(`${root}/commentCountContributions`), episodes = firestore.collection(`${root}/episodes/episodes`);
  const lease = await firestore.runTransaction(async tx => {
    const [current, catalog] = await Promise.all([tx.get(fenceRef), tx.get(episodes.orderBy(FieldPath.documentId()).limit(1))]);
    const value = current.exists ? current.data() : null;
    if (value) validateCommentCountFence(value);
    if (value?.state === 'active' && value.baselineManifestHash === manifest.hash && value.countMaintenance?.phase === 'active') {
      if (!acceptedEmptyActivation(current, manifest)) fail('count-activation-version-conflict');
      await verify(); return { active: true };
    }
    if (!catalog.empty) fail('empty-count-bootstrap-has-episodes');
    if (value?.state === 'paused') {
      if (value.planHash !== manifest.hash || value.countMaintenance?.kind !== 'empty-bootstrap') fail('count-plan-conflict');
      if (value.owner !== owner && value.leaseUntil > now()) fail('count-lease-busy');
    } else if (!same(image(current), manifest.beforeRoot)) fail('count-root-version-conflict');
    await verify();
    const next = { ...(value ?? {}), version: 1, state: 'paused', generation: (value?.generation ?? 0) + 1,
      owner, planHash: manifest.hash, leaseUntil: now() + 120000, writerProtocol: 1,
      countMaintenance: { version: 1, kind: 'empty-bootstrap', phase: 'inventory' } };
    validateCommentCountFence(next); tx.set(fenceRef, next); return next;
  });
  if (lease.active) return { status: 'active', alreadyActive: true };
  // First authoritative inventory happens only AFTER pause acquisition.
  await firestore.runTransaction(async tx => {
    const [current, catalog] = await Promise.all([tx.get(fenceRef), tx.get(episodes.orderBy(FieldPath.documentId()).limit(1))]);
    const value = current.exists ? validateCommentCountFence(current.data()) : null;
    if (!value || value.state !== 'paused' || value.owner !== owner || value.generation !== lease.generation ||
        value.planHash !== manifest.hash || value.leaseUntil <= now() || !catalog.empty) fail('count-frozen-inventory-conflict');
    await verify();
    if (value.leaseUntil <= now()) fail('count-lease-expired');
    tx.update(fenceRef, { countMaintenance: { version: 1, kind: 'empty-bootstrap', phase: 'verified',
      inventoryCount: 0, inventoryDigest: hash([]), complete: true } });
  });
  // Second exhausted inventory commits a native PAUSED barrier, never REQUEST_TIME.
  await firestore.runTransaction(async tx => {
    const [current, catalog] = await Promise.all([tx.get(fenceRef), tx.get(episodes.orderBy(FieldPath.documentId()).limit(1))]);
    const value = current.exists ? validateCommentCountFence(current.data()) : null;
    if (!value || value.state !== 'paused' || value.owner !== owner || value.generation !== lease.generation ||
        value.planHash !== manifest.hash || value.leaseUntil <= now() || !catalog.empty ||
        value.countMaintenance?.phase !== 'verified' || value.countMaintenance.inventoryCount !== 0 ||
        value.countMaintenance.inventoryDigest !== hash([]) || value.countMaintenance.complete !== true) fail('count-activation-conflict');
    await verify();
    if (value.leaseUntil <= now() || !Number.isSafeInteger(value.generation + 1)) fail('count-activation-epoch-conflict');
    tx.update(fenceRef, { countMaintenance: { ...value.countMaintenance, phase: 'activation-barrier',
      barrierPlanHash: manifest.hash, barrierGeneration: value.generation, barrierOwner: owner } });
  });
  // No legal writer may run in this gap. Release binds the literal barrier metadata.
  await firestore.runTransaction(async tx => {
    const [current, catalog] = await Promise.all([tx.get(fenceRef), tx.get(episodes.orderBy(FieldPath.documentId()).limit(1))]);
    const value = current.exists ? validateCommentCountFence(current.data()) : null, control = value?.countMaintenance;
    if (!value || value.state !== 'paused' || value.owner !== owner || value.generation !== lease.generation ||
        value.planHash !== manifest.hash || value.leaseUntil <= now() || !catalog.empty ||
        control?.phase !== 'activation-barrier' || control.barrierPlanHash !== manifest.hash ||
        control.barrierGeneration !== value.generation || control.barrierOwner !== owner ||
        control.inventoryCount !== 0 || control.inventoryDigest !== hash([]) || control.complete !== true ||
        !nativeTimestamp(current.updateTime)) fail('count-barrier-release-conflict');
    const barrierVersion = current.updateTime;
    await verify();
    if (value.leaseUntil <= now() || !Number.isSafeInteger(value.generation + 1)) fail('count-activation-epoch-conflict');
    tx.update(fenceRef, { state: 'active', generation: value.generation + 1, leaseUntil: 0,
      activeFrom: barrierVersion, baselineManifestHash: manifest.hash,
      countMaintenance: { ...control, phase: 'active', barrierVersion } });
  });
  const activated = await fenceRef.get(); await verify();
  if (!acceptedEmptyActivation(activated, manifest)) fail('count-activation-readback-conflict');
  return { status: 'active', alreadyActive: false };
}

// Full nonempty protocol. All mutable bookkeeping stays in the existing private namespace.
const jsonHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const emptyDigest = jsonHash([]), maxSequence = 999999999999;
const sequence = index => { if (!Number.isSafeInteger(index) || index < 0 || index > maxSequence) fail('count-sequence-overflow'); return String(index).padStart(12, '0'); };
const integer = value => Number.isSafeInteger(value) && value >= 0;
const sequenceNumber = value => integer(value) && value <= maxSequence;
const phases = ['inventory', 'staging', 'verifying', 'activation-barrier', 'active', 'restoring', 'restored-held'];
const stampParts = value => { const stamp = nativeTimestamp(value); if (!stamp) fail('count-native-identity'); return [stamp.seconds, stamp.nanoseconds]; };
const identityFold = (digest, id, stamp) => jsonHash([digest, id, ...stampParts(stamp)]);
const recordFold = (digest, id, value) => jsonHash([digest, id, hash(value)]);
const targetKey = (path, field = null) => jsonHash([path, field]);
const proofFold = (digest, snapshot) => jsonHash([digest, snapshot.id, hash(snapshot.data()), ...stampParts(snapshot.updateTime)]);
const decode = value => decodeCleanupValue(value);
const clone = value => decode(encodeCleanupValue(value));
const knownKeys = (value, allowed) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key));
const exactKeys = (value, keys) => knownKeys(value, keys) && keys.every(key => Object.hasOwn(value, key));
// Count custody accepts only canonical existing scalar/map/timestamp wire nodes.
function decodeCountValue(node) {
  if (!exactKeys(node, ['t', 'v'])) fail('count-encoded-purpose');
  if (node.t === 'timestamp') {
    if (!Array.isArray(node.v) || node.v.length !== 2 || !Number.isInteger(node.v[0]) || node.v[0] < -62135596800 || node.v[0] > 253402300799 ||
        !Number.isInteger(node.v[1]) || node.v[1] < 0 || node.v[1] > 999999999) fail('count-encoded-native');
  } else if (node.t === 'value') {
    if (node.v !== null && !['string', 'boolean'].includes(typeof node.v) && !Number.isSafeInteger(node.v)) fail('count-encoded-purpose');
  } else if (node.t === 'map') {
    if (!Array.isArray(node.v)) fail('count-encoded-purpose'); let previous = null;
    for (const pair of node.v) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || (previous !== null && pair[0] <= previous)) fail('count-encoded-purpose');
      previous = pair[0]; decodeCountValue(pair[1]);
    }
  } else fail('count-encoded-purpose');
  return decode(node);
}
const headKeys = ['version', 'kind', 'planHash', 'targetKey', 'targetPath', 'ownedField', 'latestApplyUnit', 'latestApplySlot', 'currentReceiptUnit', 'currentReceiptSlot', 'currentReceiptKind', 'currentImageHash'];
const episodeProofKeys = ['episodeId', 'episodeCreateTime', 'sourceVersion', 'expectedSourceHead', 'dataGeneration', 'commentCount', 'commentDigest', 'contributionCount', 'contributionDigest', 'publishedCount'];
const releaseProofKeys = ['version', 'kind', 'planHash', 'phase', 'nextUnit', 'complete', 'inventoryCount', 'inventoryDigest', 'barrierPlanHash', 'barrierGeneration', 'barrierOwner', 'episodeProofCount', 'episodeProofDigest', 'headProofCount', 'headProofDigest', 'proofTargetSlotCount', 'headChainTargetSlotCount', 'proofMaxUnit', 'proofReceiptCount', 'proofReceiptDigest', 'releaseUnit', 'barrierVersion'];
function validateProofImage(kind, value, root, planHash) {
  if (kind === 'episode') {
    if (!exactKeys(value, episodeProofKeys) || !countId(value.episodeId) || !nativeTimestamp(value.episodeCreateTime) || !nativeTimestamp(value.sourceVersion) ||
        !/^head-[a-f0-9]{64}$/.test(value.expectedSourceHead ?? '') || !countId(value.dataGeneration) ||
        ![value.commentCount, value.contributionCount, value.publishedCount].every(integer) || !countHash(value.commentDigest) || !countHash(value.contributionDigest)) fail('count-episode-proof-schema');
  } else if (kind === 'target-head') {
    if (!exactKeys(value, [...headKeys, 'chainTargetCount']) || !integer(value.chainTargetCount)) fail('count-head-proof-schema');
    const { chainTargetCount: ignored, ...head } = value; void ignored;
    headShape(head, { root, manifest: { hash: planHash } }, head.targetKey);
  } else if (kind === 'release') {
    if (!exactKeys(value, releaseProofKeys) || value.version !== 1 || value.kind !== 'reconciliation' || value.phase !== 'active' || value.planHash !== planHash || value.complete !== true ||
        !countId(value.barrierOwner) || value.barrierPlanHash !== planHash || !nativeTimestamp(value.barrierVersion) ||
        !['nextUnit', 'inventoryCount', 'barrierGeneration', 'episodeProofCount', 'headProofCount', 'proofTargetSlotCount', 'headChainTargetSlotCount', 'proofReceiptCount', 'releaseUnit'].every(key => integer(value[key])) ||
        !['inventoryDigest', 'episodeProofDigest', 'headProofDigest', 'proofReceiptDigest'].every(key => countHash(value[key])) ||
        (value.proofMaxUnit !== null && !integer(value.proofMaxUnit)) || value.proofReceiptCount !== (value.proofMaxUnit === null ? 0 : value.proofMaxUnit + 1) || value.releaseUnit !== value.proofReceiptCount || value.nextUnit !== value.releaseUnit + 1) fail('count-release-proof-schema');
  } else fail('count-proof-kind');
  return value;
}
function validateCountRootImage(value) {
  if (!knownKeys(value, ['version', 'state', 'generation', 'owner', 'planHash', 'leaseUntil', 'writerProtocol', 'activeFrom', 'baselineManifestHash', 'countMaintenance'])) fail('count-root-purpose');
  validateCommentCountFence(value);
  const control = value.countMaintenance; if (control === undefined) return;
  if (control?.kind === 'reconciliation') validateProofImage('release', control, null, value.planHash);
  else {
    const keys = ['version', 'kind', 'phase', 'inventoryCount', 'inventoryDigest', 'complete', 'barrierPlanHash', 'barrierGeneration', 'barrierOwner', 'barrierVersion'];
    if (!exactKeys(control, keys) || control.version !== 1 || control.kind !== 'empty-bootstrap' || control.phase !== 'active' || control.inventoryCount !== 0 ||
        !countHash(control.inventoryDigest) || control.complete !== true || control.barrierPlanHash !== value.planHash || !integer(control.barrierGeneration) ||
        !countId(control.barrierOwner) || !nativeTimestamp(control.barrierVersion)) fail('count-root-purpose');
  }
}
function validateCountManifest(value) {
  if (!exactKeys(value, ['version', 'kind', 'projectId', 'root', 'beforeRoot', 'hash'])) fail('count-plan-purpose');
  const before = value.beforeRoot;
  if (before?.exists === false) { if (!exactKeys(before, ['exists'])) fail('count-plan-purpose'); }
  else {
    if (before?.exists !== true || !exactKeys(before, ['exists', 'data', 'version', 'createTime']) || !nativeTimestamp(decodeCountValue(before.version)) || !nativeTimestamp(decodeCountValue(before.createTime))) fail('count-plan-purpose');
    const root = decodeCountValue(before.data); validateCountRootImage(root); if (root.state !== 'active') fail('count-plan-purpose');
  }
}
const privateBaselineKeys = ['version', 'state', 'origin', 'generation', 'baselineManifestHash', 'episodeCreateTime'];
const privateRowKeys = ['version', 'generation', 'baselineManifestHash', 'episodeCreateTime', 'contribution', 'commentVersion', 'commentMutation'];
function privateProjection(data, row) {
  if (!knownKeys(data, row ? privateRowKeys : privateBaselineKeys) || data.version !== 1 || !countId(data.generation) || !countHash(data.baselineManifestHash)) fail('count-private-schema');
  if (row) {
    if (![0, 1].includes(data.contribution) || typeof data.commentMutation !== 'boolean' || !nativeTimestamp(data.episodeCreateTime) ||
        (data.commentVersion !== null && !nativeTimestamp(data.commentVersion))) fail('count-private-schema');
  } else if (data.state !== 'active' || !['creation', 'baseline'].includes(data.origin) ||
    (data.origin === 'baseline' && !nativeTimestamp(data.episodeCreateTime)) || (data.origin === 'creation' && Object.hasOwn(data, 'episodeCreateTime'))) fail('count-private-schema');
  return data;
}
function ownedPath(root, path, field) {
  const parts = path?.split('/') ?? [];
  if (field === 'stats.commentsCount') {
    if (parts.length !== 4 || parts[0] !== root || parts[1] !== 'episodes' || parts[2] !== 'episodes' || !countId(parts[3])) fail('count-owned-target');
  } else if (field !== null || ![4, 6].includes(parts.length) || parts[0] !== root || parts[1] !== 'commentCountContributions' ||
    parts[2] !== 'episodes' || !countId(parts[3]) || (parts.length === 6 && (parts[4] !== 'contributions' || !countId(parts[5])))) fail('count-owned-target');
  return parts;
}
function projection(snapshot, field) {
  return { exists: snapshot.exists, data: snapshot.exists ? encodeCleanupValue(field ? snapshot.get(field) : snapshot.data()) : null };
}
function ownedImage(snapshot, field) {
  return snapshot.exists ? { ...projection(snapshot, field), version: encodeCleanupValue(snapshot.updateTime), createTime: encodeCleanupValue(snapshot.createTime) } : { exists: false, data: null };
}
function validateCountUnit(value) {
  if (!knownKeys(value, ['version', 'kind', 'projectId', 'root', 'planHash', 'index', 'unitKind', 'episodeId', 'commentId', 'source', 'targets', 'checkpoint', 'proofKind', 'proofImage', 'hash']) ||
      !knownKeys(value.checkpoint, ['rootBeforeHash', 'planBeforeHash', 'rootAfterHash', 'planAfterHash', 'episodeAfterHash']) ||
      !countHash(value.checkpoint.rootAfterHash) || !countHash(value.checkpoint.planAfterHash) ||
      [value.checkpoint.rootBeforeHash, value.checkpoint.planBeforeHash, value.checkpoint.episodeAfterHash].some(item => item !== null && !countHash(item))) fail('count-unit-purpose');
  if (Object.hasOwn(value, 'proofKind') || Object.hasOwn(value, 'proofImage')) {
    if (!Object.hasOwn(value, 'proofKind') || !Object.hasOwn(value, 'proofImage') || value.unitKind !== 'verify' || value.targets?.length) fail('count-proof-purpose');
    validateProofImage(value.proofKind, decodeCountValue(value.proofImage), value.root, value.planHash);
  }
  if (value.source !== null) {
    if (!exactKeys(value.source, ['episodeCreateTime', 'episodeVersion', 'commentVersion', 'commentContribution', 'originalBaseline']) ||
        !nativeTimestamp(decodeCountValue(value.source.episodeCreateTime)) || !nativeTimestamp(decodeCountValue(value.source.episodeVersion)) ||
        (value.source.commentVersion !== null && !nativeTimestamp(decodeCountValue(value.source.commentVersion))) || ![0, 1].includes(value.source.commentContribution)) fail('count-unit-source');
    const before = value.source.originalBaseline;
    if (typeof before?.exists !== 'boolean' || !exactKeys(before, before.exists ? ['exists', 'data', 'version', 'createTime'] : ['exists', 'data'])) fail('count-unit-source');
    if (before.exists) {
      if (!nativeTimestamp(decodeCountValue(before.version)) || !nativeTimestamp(decodeCountValue(before.createTime))) fail('count-unit-source');
      privateProjection(decodeCountValue(before.data), false);
    } else if (before.data !== null) fail('count-unit-source');
  }
  if (!countHash(value.planHash) || !integer(value.index) || value.index > maxSequence || !['inventory', 'comment', 'tombstone', 'episode-finalize', 'verify', 'restore'].includes(value.unitKind) ||
      !Array.isArray(value.targets) || value.targets.length > 3 || (value.episodeId !== null && !countId(value.episodeId)) || (value.commentId !== null && !countId(value.commentId))) fail('count-unit-schema');
  for (const item of value.targets) {
    if (!knownKeys(item, ['targetPath', 'ownedField', 'before', 'after'])) fail('count-unit-purpose');
    const parts = ownedPath(value.root, item.targetPath, item.ownedField);
    for (const [position, version] of [item.before, item.after].entries()) {
      if (typeof version?.exists !== 'boolean' || !exactKeys(version, position === 0 && version.exists ? ['exists', 'data', 'version', 'createTime'] : ['exists', 'data'])) fail('count-unit-schema');
      if (!version.exists) { if (version.data !== null) fail('count-unit-schema'); continue; }
      const data = decodeCountValue(version.data);
      if (item.ownedField) { if (!integer(data)) fail('count-counter-schema'); }
      else privateProjection(data, parts.length === 6);
    }
    if (item.before.exists && (!nativeTimestamp(decodeCountValue(item.before.version)) || !nativeTimestamp(decodeCountValue(item.before.createTime)))) fail('count-unit-native');
  }
}
function validateReplayState(value) {
  if (!exactKeys(value, ['binding', 'owner', 'phase', 'cursor', 'digest', 'targetSlots', 'receiptCount', 'episodeCount', 'episodeDigest', 'identityDigest', 'lastEpisode', 'headCount', 'headDigest', 'lastHead', 'ancestrySlots', 'pendingHead', 'version', 'kind', 'expiresAt', 'revision', 'predecessorHash']) || !exactKeys(value.binding, ['projectId', 'root', 'planHash', 'releaseIdentity', 'proof', 'releaseUnit'])) fail('count-replay-purpose');
  validateProofImage('release', decodeCountValue(value.binding.proof), value.binding.root, value.binding.planHash);
  if (value.version !== 1 || value.kind !== 'comment-count-replay' || !countId(value.owner) || !integer(value.revision) || value.revision < 1 ||
      (value.predecessorHash !== null && !countHash(value.predecessorHash)) || !integer(value.expiresAt) ||
      !['receipts', 'heads', 'complete'].includes(value.phase) || !integer(value.cursor) || !countHash(value.digest) || !integer(value.targetSlots) ||
      !countHash(value.binding?.planHash) || !integer(value.binding?.releaseUnit) || value.cursor > value.binding.releaseUnit + 1 ||
      !nativeTimestamp(decodeCountValue(value.binding.releaseIdentity)) || !integer(value.receiptCount) || !integer(value.episodeCount) || !integer(value.headCount) ||
      !integer(value.ancestrySlots) || !countHash(value.episodeDigest) || !countHash(value.identityDigest) || !countHash(value.headDigest)) fail('count-replay-schema');
  if ((value.lastEpisode !== null && !countId(value.lastEpisode)) || (value.lastHead !== null && !countHash(value.lastHead))) fail('count-replay-cursor-schema');
  countRoot(value.binding.root);
  if (value.phase === 'heads') {
    const pending = value.pendingHead;
    if (!exactKeys(pending, ['image', 'unit', 'slot', 'expectedHash', 'count']) || !integer(pending.count) || !integer(pending.image?.chainTargetCount) || pending.count > pending.image.chainTargetCount ||
        (pending.unit === null ? pending.slot !== null || pending.expectedHash !== null : !integer(pending.unit) || pending.unit >= value.binding.releaseUnit ||
          !Number.isInteger(pending.slot) || pending.slot < 0 || pending.slot > 2 || !countHash(pending.expectedHash))) fail('count-replay-head-progress');
    validateProofImage('target-head', pending.image, value.binding.root, value.binding.planHash);
  } else if (value.pendingHead !== null) fail('count-replay-head-progress');
  if (value.phase === 'complete' && value.cursor !== value.binding.releaseUnit + 1) fail('count-replay-completion-position');
}

function newBudget(maxItems) {
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 25) fail('count-work-budget');
  const meter = { maxItems, processed: 0, reads: 0, attempts: 0, controlTransactions: 0, otherReads: 0 };
  meter.charge = count => { if (!integer(count) || meter.reads + count > 1536) fail('count-invocation-read-budget'); meter.reads += count; };
  return meter;
}
async function outsideRead(ctx, ref, query = false) {
  if (++ctx.budget.otherReads > 32) fail('count-admission-read-budget');
  ctx.budget.charge(1); return ref.get();
}
async function transaction(ctx, callback, control = false) {
  if (control && ++ctx.budget.controlTransactions > 4) fail('count-control-transaction-budget');
  if (ctx.budget.reads + (control ? 48 : 51) > 1536) fail('count-invocation-read-budget');
  let attempts = 0;
  return ctx.firestore.runTransaction(async tx => {
    if (++attempts > 3) fail('count-attempt-budget'); ctx.budget.attempts++;
    let reads = 0; const cache = new Map();
    const read = async (ref, query = false) => {
      if (!query && cache.has(ref.path)) return cache.get(ref.path);
      if (++reads > (control ? 16 : 17)) fail('count-item-read-budget');
      ctx.budget.charge(1); const snapshot = await tx.get(ref);
      if (query) {
        if (snapshot.size > 1) fail('count-query-bound');
        for (const doc of snapshot.docs) cache.set(doc.ref.path, doc);
      } else cache.set(ref.path, snapshot);
      return snapshot;
    };
    return callback(tx, read);
  }, { maxAttempts: 3 });
}
const ordered = (ctx, path, cursor = null) => {
  let query = ctx.firestore.collection(path).orderBy(FieldPath.documentId()).limit(1);
  if (cursor !== null) query = query.startAfter(ctx.firestore.doc(`${path}/${cursor}`));
  return query;
};

const headQuery = (ctx, cursor = null) => {
  let query = ctx.firestore.collection(ctx.unitsPath).where(FieldPath.documentId(), '>=', ctx.firestore.doc(`${ctx.unitsPath}/head-`))
    .where(FieldPath.documentId(), '<', ctx.firestore.doc(`${ctx.unitsPath}/head-\uf8ff`)).orderBy(FieldPath.documentId()).limit(1);
  if (cursor !== null) query = query.startAfter(ctx.firestore.doc(`${ctx.unitsPath}/${cursor}`));
  return query;
};
function validateReceipt(snapshot, ctx) {
  const value = snapshot.exists ? snapshot.data() : null;
  const proofFields = value && (Object.hasOwn(value, 'proofKind') || Object.hasOwn(value, 'proofImage')) ? ['proofKind', 'proofImage'] : [];
  const restoreFields = value && Object.hasOwn(value, 'undoneApplyUnit') ? ['undoneApplyUnit'] : [];
  if (!exactKeys(value, ['version', 'planHash', 'unitId', 'index', 'kind', 'owner', 'generation', 'episodeId', 'commentId', 'backupHash', 'beforeHash', 'afterHash', 'rootHash', 'planImageHash', 'episodeCheckpointHash', 'targets', ...proofFields, ...restoreFields])) fail('count-receipt-purpose');
  if (!value || value.version !== 1 || value.planHash !== ctx.manifest.hash || value.unitId !== snapshot.id || sequence(value.index) !== snapshot.id ||
      !countId(value.owner) || !integer(value.generation) || value.generation < 1 || !countHash(value.backupHash) || !countHash(value.beforeHash) || !countHash(value.afterHash) ||
      !['inventory', 'comment', 'tombstone', 'episode-finalize', 'verify', 'restore'].includes(value.kind) || !Array.isArray(value.targets) || value.targets.length > 3 || !nativeTimestamp(snapshot.updateTime)) fail('count-receipt-schema');
  if ((value.episodeId !== null && !countId(value.episodeId)) || (value.commentId !== null && !countId(value.commentId)) ||
      !countHash(value.rootHash) || !countHash(value.planImageHash) || (value.episodeCheckpointHash !== null && !countHash(value.episodeCheckpointHash)) ||
      (Object.hasOwn(value, 'undoneApplyUnit') && (value.kind !== 'restore' || !sequenceNumber(value.undoneApplyUnit) || value.undoneApplyUnit >= value.index))) fail('count-receipt-scalar-schema');
  const keys = new Set();
  for (const [slot, item] of value.targets.entries()) {
    if (!exactKeys(item, ['targetKey', 'slot', 'targetPath', 'ownedField', 'createTime', 'beforeVersion', 'afterHash', 'previousUnit', 'previousSlot', 'created', 'changed', ...(value.kind === 'restore' ? ['undoneApplySlot', 'physicalPredecessorUnit', 'physicalPredecessorSlot', 'originalProjectionHash', 'restoredProjectionHash'] : [])])) fail('count-receipt-target-purpose');
    ownedPath(ctx.root, item.targetPath, item.ownedField);
    if (item.slot !== slot || item.targetKey !== targetKey(item.targetPath, item.ownedField) || keys.has(item.targetKey) ||
        typeof item.changed !== 'boolean' || typeof item.created !== 'boolean' || (item.beforeVersion !== null && !nativeTimestamp(item.beforeVersion)) ||
        (item.createTime !== null && !nativeTimestamp(item.createTime)) || !countHash(item.afterHash) ||
        (item.previousUnit === null && item.previousSlot !== null) ||
        (item.previousUnit !== null && (!integer(item.previousUnit) || item.previousUnit >= value.index || !Number.isInteger(item.previousSlot) || item.previousSlot < 0 || item.previousSlot > 2))) fail('count-receipt-target');
    if (value.kind === 'restore' && (!Number.isInteger(item.undoneApplySlot) || item.undoneApplySlot < 0 || item.undoneApplySlot > 2 ||
        (item.physicalPredecessorUnit === null ? item.physicalPredecessorSlot !== null : !sequenceNumber(item.physicalPredecessorUnit) || item.physicalPredecessorUnit >= value.index || !Number.isInteger(item.physicalPredecessorSlot) || item.physicalPredecessorSlot < 0 || item.physicalPredecessorSlot > 2) ||
        !countHash(item.originalProjectionHash) || item.restoredProjectionHash !== item.afterHash)) fail('count-restore-target');
    keys.add(item.targetKey);
  }
  if (value.proofKind !== undefined) validateProofImage(value.proofKind, value.proofImage, ctx.root, ctx.manifest.hash);
  if (value.proofKind !== undefined && (value.kind !== 'verify' || value.targets.length || !['episode', 'target-head', 'release'].includes(value.proofKind) || !value.proofImage || hash(value.proofImage) !== value.afterHash)) fail('count-proof-receipt');
  if (value.kind === 'restore' && value.undoneApplyUnit !== undefined && (!integer(value.undoneApplyUnit) || value.undoneApplyUnit >= value.index)) fail('count-restore-receipt');
  return value;
}
async function backupFor(ctx, receipt) {
  // Each unit file authenticates custody/expiry itself. Manifest readback remains
  // mandatory at admission and immediately before every mutation/publication.
  const value = await ctx.backupStore.readVerified(receipt.backupHash);
  if (value.kind !== 'comment-count-unit' || value.planHash !== ctx.manifest.hash || value.index !== receipt.index || value.projectId !== ctx.projectId || value.root !== ctx.root ||
      value.unitKind !== receipt.kind || value.targets.length !== receipt.targets.length || value.episodeId !== receipt.episodeId || value.commentId !== receipt.commentId ||
      value.checkpoint?.rootAfterHash !== receipt.rootHash || value.checkpoint?.planAfterHash !== receipt.planImageHash || value.checkpoint?.episodeAfterHash !== receipt.episodeCheckpointHash ||
      hash(value.targets.map(item => ({ exists: item.before.exists, data: item.before.data }))) !== receipt.beforeHash ||
      (receipt.proofKind ? value.proofKind !== receipt.proofKind || !same(decode(value.proofImage), receipt.proofImage) || hash(receipt.proofImage) !== receipt.afterHash :
        value.proofKind !== undefined || hash(value.targets.map(item => item.after)) !== receipt.afterHash)) fail('count-receipt-backup');
  for (const [slot, item] of value.targets.entries()) {
    const record = receipt.targets[slot];
    if (item.targetPath !== record.targetPath || item.ownedField !== record.ownedField || record.afterHash !== hash(item.after) ||
        record.changed !== !same({ exists: item.before.exists, data: item.before.data }, item.after) || record.created !== (!item.before.exists && item.after.exists) ||
        (item.before.exists ? !sameCreateTime(decode(item.before.version), record.beforeVersion) || !sameCreateTime(decode(item.before.createTime), record.createTime) : record.beforeVersion !== null || record.createTime !== null)) fail('count-backup-target-binding');
  }
  return value;
}

function headShape(value, ctx, key) {
  if (!exactKeys(value, headKeys) || value.version !== 1 || value.kind !== 'target-head' || value.planHash !== ctx.manifest.hash || value.targetKey !== key ||
      targetKey(value.targetPath, value.ownedField) !== key || !sequenceNumber(value.currentReceiptUnit) || !Number.isInteger(value.currentReceiptSlot) ||
      value.currentReceiptSlot < 0 || value.currentReceiptSlot > 2 || !['apply', 'restore'].includes(value.currentReceiptKind) || !countHash(value.currentImageHash)) fail('count-head-schema');
  if (value.latestApplyUnit === null ? value.latestApplySlot !== null : !sequenceNumber(value.latestApplyUnit) || !Number.isInteger(value.latestApplySlot) || value.latestApplySlot < 0 || value.latestApplySlot > 2) fail('count-head-schema');
  ownedPath(ctx.root, value.targetPath, value.ownedField); return value;
}
async function sealedHead(ctx, read, headSnapshot) {
  if (!headSnapshot.exists) fail('count-head-missing');
  const head = headShape(headSnapshot.data(), ctx, headSnapshot.id.slice(5));
  const proofSnapshot = await read(ctx.receiptRef(head.currentReceiptUnit)), proof = validateReceipt(proofSnapshot, ctx);
  if (!sameCreateTime(headSnapshot.updateTime, proofSnapshot.updateTime)) fail('count-head-native-seal');
  return { head, proofSnapshot, proof };
}
async function effectiveHead(ctx, read, snapshot, headSnapshot) {
  const { head, proofSnapshot, proof } = await sealedHead(ctx, read, headSnapshot), slot = proof.targets[head.currentReceiptSlot];
  if (!slot || slot.targetKey !== head.targetKey || slot.afterHash !== head.currentImageHash) fail('count-head-receipt');
  const backup = await backupFor(ctx, proof), after = backup.targets[head.currentReceiptSlot].after;
  const expectedVersion = after.exists ? slot.changed ? proofSnapshot.updateTime : slot.beforeVersion : null;
  const expectedCreate = after.exists ? slot.created ? proofSnapshot.updateTime : slot.createTime : null;
  if (!same(projection(snapshot, head.ownedField), after) || snapshot.exists !== after.exists ||
      (snapshot.exists && (!sameCreateTime(snapshot.updateTime, expectedVersion) || !sameCreateTime(snapshot.createTime, expectedCreate)))) fail('count-target-version-conflict');
  return { head, proof, proofSnapshot, slot, backup };
}
function fullResult(ctx, plan, status = 'in-progress') {
  return { status, phase: plan.phase, processed: ctx.budget.processed, cursor: { nextUnit: plan.nextUnit, episodeId: plan.currentEpisodeId },
    readEquivalents: ctx.budget.reads, transactionAttempts: ctx.budget.attempts };
}
async function fullContext(options) {
  if (Object.hasOwn(options, 'now')) fail('count-public-clock-unavailable');
  const { firestore, projectId, root, manifest, expectedManifestHash, backupStore, maxItems = 25, owner = randomUUID() } = options;
  const now = () => Date.now();
  trusted({ projectId, root }, firestore); const reviewedManifest = clone(manifest); validateBackupPayload(reviewedManifest);
  if (reviewedManifest.kind !== 'comment-count-plan' || reviewedManifest.projectId !== projectId || reviewedManifest.root !== root || reviewedManifest.hash !== expectedManifestHash ||
      !backupStores.has(backupStore) || !countId(owner) || typeof now !== 'function' || !integer(now())) fail('count-executor-scope');
  const ctx = { firestore, projectId, root, manifest: reviewedManifest, backupStore, owner, now, budget: newBudget(maxItems) };
  ctx.planPath = `${root}/commentCountContributions/maintenance/${reviewedManifest.hash}`; ctx.unitsPath = `${ctx.planPath}/units`;
  ctx.rootRef = firestore.doc(`${root}/commentCountContributions`); ctx.planRef = firestore.doc(ctx.planPath);
  ctx.receiptRef = index => firestore.doc(`${ctx.unitsPath}/${sequence(index)}`);
  ctx.episodeRef = id => firestore.doc(`${root}/episodes/episodes/${id}`);
  ctx.completionRef = id => firestore.doc(`${ctx.planPath}/episodes/${id}`);
  ctx.baselineRef = id => firestore.doc(`${root}/commentCountContributions/episodes/${id}`);
  ctx.verify = async () => { trusted(ctx, firestore); if (!same(await backupStore.readVerified(ctx.manifest.hash), ctx.manifest)) fail('count-backup-mismatch'); };
  ctx.bindBirth = async () => {
    if (ctx.planCreateTime) return;
    const plan = await outsideRead(ctx, ctx.planRef);
    if (!plan.exists) return;
    const first = await outsideRead(ctx, ctx.receiptRef(0)), receipt = validateReceipt(first, ctx);
    if (receipt.kind !== 'inventory' || receipt.index !== 0) fail('count-initial-receipt-binding');
    await backupFor(ctx, receipt);
    ctx.rootCreateTime = ctx.manifest.beforeRoot.exists ? decode(ctx.manifest.beforeRoot.createTime) : first.updateTime;
    ctx.planCreateTime = first.updateTime;
    if (!nativeTimestamp(ctx.rootCreateTime) || !sameCreateTime(plan.createTime, ctx.planCreateTime)) fail('count-plan-birth-identity');
  };
  await ctx.verify(); await ctx.bindBirth();
  const old = await outsideRead(ctx, firestore.collectionGroup('comments').where(FieldPath.documentId(), '>=', firestore.doc(`${root}/commentCountContributions`))
    .where(FieldPath.documentId(), '<', firestore.doc(`${root}/commentCountContributions\uf8ff`)).orderBy(FieldPath.documentId()).limit(1), true);
  if (!old.empty) fail('old-count-ledger-present');
  return ctx;
}

function validatePlan(value, ctx) {
  if (!Object.keys(initialPlan(ctx, null)).every(key => Object.hasOwn(value ?? {}, key))) fail('count-plan-required-fields');
  if (!knownKeys(value, ['version', 'kind', 'projectId', 'root', 'planHash', 'beforeRootHash', 'previousAcceptedManifestHash', 'owner', 'generation', 'phase', 'nextUnit', 'lastUnit', 'foldedUnit', 'receiptDigest', 'proofTargetSlotCount', 'inventoryCursor', 'inventoryCount', 'inventoryDigest', 'stageCursor', 'verifyCursor', 'verifyCount', 'verifyDigest', 'currentEpisodeId', 'episodeProofCount', 'episodeProofDigest', 'headProofCount', 'headProofDigest', 'headChainTargetSlotCount', 'verifyStage', 'headVerification', 'headCursor', 'receiptVerification', 'resumeMaxUnit', 'resumePhase', 'resumeHeadsComplete', 'resumeVerifyUnit', 'resumeHeadCursor', 'resumeChainUnit', 'resumeChainSlot', 'resumeExpectedHash', 'resumeChainCount', 'resumeReceiptDigest', 'resumeExpectedReceiptDigest', 'resumeSourceCursor', 'resumeSourceCount', 'resumeSourceDigest', 'resumeSource', 'restoreUnit', 'restoreMaxApplyUnit', 'backupPlanHash', 'proofMaxUnit', 'proofReceiptCount', 'proofReceiptDigest', 'releaseUnit', 'barrierVersion']) || value.version !== 1 || value.kind !== 'comment-count-reconciliation' || value.projectId !== ctx.projectId || value.root !== ctx.root || value.planHash !== ctx.manifest.hash ||
      !countId(value.owner) || !integer(value.generation) || value.generation < 1 || !phases.includes(value.phase) || !integer(value.nextUnit) || value.nextUnit > maxSequence + 1 ||
      (value.lastUnit !== null && (!integer(value.lastUnit) || value.lastUnit !== value.nextUnit - 1)) || !countHash(value.receiptDigest) || !countHash(value.inventoryDigest) ||
      !integer(value.inventoryCount) || !integer(value.verifyCount) || !countHash(value.verifyDigest) || value.backupPlanHash !== ctx.manifest.hash) fail('count-plan-schema');
  if (!countHash(value.beforeRootHash) || (value.previousAcceptedManifestHash !== null && !countHash(value.previousAcceptedManifestHash)) ||
      (value.lastUnit === null ? value.nextUnit !== 0 : !sequenceNumber(value.lastUnit)) ||
      value.foldedUnit !== (value.lastUnit === null || value.lastUnit === 0 ? null : value.lastUnit - 1) ||
      !['proofTargetSlotCount', 'headChainTargetSlotCount', 'episodeProofCount', 'headProofCount'].every(key => integer(value[key])) ||
      !countHash(value.episodeProofDigest) || !countHash(value.headProofDigest) ||
      (value.resumeExpectedHash !== null && !countHash(value.resumeExpectedHash)) ||
      (value.resumeExpectedReceiptDigest !== null && !countHash(value.resumeExpectedReceiptDigest))) fail('count-plan-scalar-schema');
  const releaseFields = ['proofMaxUnit', 'proofReceiptCount', 'proofReceiptDigest', 'releaseUnit', 'barrierVersion'];
  const hasRelease = releaseFields.some(key => Object.hasOwn(value, key));
  if ((value.phase === 'active' && !hasRelease) || (hasRelease && !['active', 'restoring', 'restored-held'].includes(value.phase)) || (hasRelease &&
      (!releaseFields.every(key => Object.hasOwn(value, key)) || (value.proofMaxUnit !== null && !sequenceNumber(value.proofMaxUnit)) ||
       !sequenceNumber(value.releaseUnit) || value.proofReceiptCount !== (value.proofMaxUnit === null ? 0 : value.proofMaxUnit + 1) ||
       value.releaseUnit !== value.proofReceiptCount || !countHash(value.proofReceiptDigest) || !nativeTimestamp(value.barrierVersion) || value.releaseUnit >= value.nextUnit))) fail('count-plan-release-schema');
  const unverifiedRollback = ['restoring', 'restored-held'].includes(value.phase) && !hasRelease && value.verifyStage === null;
  if ((['verifying', 'activation-barrier', 'active', 'restoring', 'restored-held'].includes(value.phase) && !['episodes', 'heads', 'receipts', 'complete'].includes(value.verifyStage) && !unverifiedRollback) ||
      (['inventory', 'staging'].includes(value.phase) && value.verifyStage !== null)) fail('count-verification-phase-schema');
  if (!['ready', 'receipts', 'heads'].includes(value.resumePhase) || typeof value.resumeHeadsComplete !== 'boolean' ||
      (!integer(value.resumeVerifyUnit) || value.resumeVerifyUnit > maxSequence + 1) || !integer(value.resumeChainCount) || !countHash(value.resumeReceiptDigest) ||
      !integer(value.resumeSourceCount) || !countHash(value.resumeSourceDigest) ||
      (value.resumeMaxUnit !== null && (!sequenceNumber(value.resumeMaxUnit) || value.resumeMaxUnit >= value.nextUnit)) ||
      (value.resumePhase !== 'ready' && (value.resumeMaxUnit === null || !countHash(value.resumeExpectedReceiptDigest) || value.resumeVerifyUnit > value.resumeMaxUnit + 1)) ||
      (value.resumeChainUnit === null ? value.resumeChainSlot !== null || value.resumeExpectedHash !== null : !sequenceNumber(value.resumeChainUnit) || value.resumeChainUnit >= value.nextUnit || !countHash(value.resumeExpectedHash) || !Number.isInteger(value.resumeChainSlot) || value.resumeChainSlot < 0 || value.resumeChainSlot > 2) ||
      (value.restoreMaxApplyUnit !== null && (!sequenceNumber(value.restoreMaxApplyUnit) || value.restoreMaxApplyUnit >= value.nextUnit)) ||
      (value.restoreUnit !== null && (!sequenceNumber(value.restoreUnit) || value.restoreMaxApplyUnit === null || value.restoreUnit > value.restoreMaxApplyUnit))) fail('count-plan-progress-schema');
  for (const cursor of [value.inventoryCursor, value.stageCursor, value.verifyCursor, value.currentEpisodeId, value.resumeSourceCursor]) if (cursor !== null && !countId(cursor)) fail('count-cursor-schema');
  for (const cursor of [value.headCursor, value.resumeHeadCursor]) if (cursor !== null && !/^head-[a-f0-9]{64}$/.test(cursor)) fail('count-head-cursor-schema');
  if (value.headVerification !== null) {
    const work = value.headVerification; if (!exactKeys(work, ['headId', 'image', 'unit', 'slot', 'expectedHash', 'chainTargetCount']) || !/^head-[a-f0-9]{64}$/.test(work.headId ?? '')) fail('count-head-progress-schema'); headShape(work.image, ctx, work.headId?.slice(5));
    if (!integer(work.chainTargetCount) || (work.unit === null ? work.slot !== null || work.expectedHash !== null : !sequenceNumber(work.unit) || work.unit >= value.nextUnit || !Number.isInteger(work.slot) || work.slot < 0 || work.slot > 2 || !countHash(work.expectedHash))) fail('count-head-progress-schema');
  }
  if (value.receiptVerification !== null) {
    const work = value.receiptVerification;
    if (!exactKeys(work, ['maxUnit', 'cursor', 'count', 'digest', 'targetSlots', 'expectedDigest']) || !sequenceNumber(work.maxUnit) || work.maxUnit >= value.nextUnit || !integer(work.cursor) || work.cursor > work.maxUnit + 1 || work.count !== work.cursor || !integer(work.targetSlots) || !countHash(work.digest) || !countHash(work.expectedDigest)) fail('count-prefix-progress-schema');
  }
  if (value.resumeSource !== null) { if (!exactKeys(value.resumeSource, ['episodeId', 'verification']) || !countId(value.resumeSource.episodeId)) fail('count-resume-source-schema'); verifyScratch(value.resumeSource.verification); }
  return value;
}
function verificationStart() {
  return { commentCursor: null, commentCount: 0, commentDigest: emptyDigest, contributionCursor: null, contributionCount: 0,
    contributionDigest: emptyDigest, publishedCount: 0, commentsComplete: false, contributionsComplete: false };
}
function verifyScratch(value) {
  if (!exactKeys(value, ['commentCursor', 'commentCount', 'commentDigest', 'contributionCursor', 'contributionCount', 'contributionDigest', 'publishedCount', 'commentsComplete', 'contributionsComplete']) || !integer(value.commentCount) || !integer(value.contributionCount) || !integer(value.publishedCount) || !countHash(value.commentDigest) || !countHash(value.contributionDigest) ||
      typeof value.commentsComplete !== 'boolean' || typeof value.contributionsComplete !== 'boolean' ||
      (value.commentCursor !== null && !countId(value.commentCursor)) || (value.contributionCursor !== null && !countId(value.contributionCursor))) fail('count-verification-schema');
  return value;
}
async function loadCompletion(ctx, read, id) {
  const snapshot = await read(ctx.completionRef(id)), data = snapshot.exists ? snapshot.data() : null;
  if (!exactKeys(data, ['version', 'episodeId', 'episodeCreateTime', 'sourceVersion', 'sourceCounter', 'expectedSourceHead', 'dataGeneration', 'previousBaselineHash', 'state', 'commentCursor', 'contributionCursor', 'commentsComplete', 'contributionsComplete', 'publishedCount', 'commentCount', 'commentDigest', 'contributionCount', 'contributionDigest', 'lastUnit', 'verification', 'proofUnit']) || data.version !== 1 || data.episodeId !== id || !nativeTimestamp(data.episodeCreateTime) || !nativeTimestamp(data.sourceVersion) || !integer(data.sourceCounter) ||
      !countId(data.dataGeneration) || !['inventoried', 'staging', 'staged', 'verifying', 'verified'].includes(data.state) || !integer(data.lastUnit)) fail('count-episode-checkpoint');
  if ((data.expectedSourceHead !== null && !/^head-[a-f0-9]{64}$/.test(data.expectedSourceHead)) ||
      (data.previousBaselineHash !== null && !countHash(data.previousBaselineHash)) ||
      [data.commentCursor, data.contributionCursor].some(cursor => cursor !== null && !countId(cursor)) ||
      typeof data.commentsComplete !== 'boolean' || typeof data.contributionsComplete !== 'boolean' ||
      ![data.publishedCount, data.commentCount, data.contributionCount].every(integer) || !countHash(data.commentDigest) || !countHash(data.contributionDigest) ||
      !sequenceNumber(data.lastUnit) || (data.proofUnit !== null && !sequenceNumber(data.proofUnit)) ||
      (!['verifying', 'verified'].includes(data.state) && data.verification !== null)) fail('count-episode-scalar-schema');
  const receiptSnapshot = await read(ctx.receiptRef(data.lastUnit)), receipt = validateReceipt(receiptSnapshot, ctx);
  if (!sameCreateTime(snapshot.updateTime, receiptSnapshot.updateTime) || receipt.episodeId !== id || receipt.episodeCheckpointHash !== hash(data)) fail('count-episode-checkpoint-version');
  await backupFor(ctx, receipt);
  if (['verifying', 'verified'].includes(data.state)) verifyScratch(data.verification);
  return { snapshot, data: clone(data) };
}
async function checkEpisode(ctx, read, record) {
  const episode = await read(ctx.episodeRef(record.episodeId));
  if (!episode.exists || !sameCreateTime(episode.createTime, record.episodeCreateTime) || episode.get('adminDeletionToken')) fail('count-episode-identity-conflict');
  if (record.expectedSourceHead) {
    const head = await read(ctx.firestore.doc(`${ctx.unitsPath}/${record.expectedSourceHead}`));
    if (!head.exists) fail('count-source-head-missing'); await effectiveHead(ctx, read, episode, head);
  } else if (!sameCreateTime(episode.updateTime, record.sourceVersion)) fail('count-episode-source-conflict');
  return episode;
}
async function control(ctx, read) {
  const [rootSnapshot, planSnapshot] = await Promise.all([read(ctx.rootRef), read(ctx.planRef)]);
  const root = rootSnapshot.exists ? validateCommentCountFence(rootSnapshot.data()) : null;
  const plan = planSnapshot.exists ? validatePlan(planSnapshot.data(), ctx) : null;
  if (!root || !plan || root.owner !== plan.owner || root.generation !== plan.generation || root.planHash !== ctx.manifest.hash ||
      (ctx.rootCreateTime && !sameCreateTime(rootSnapshot.createTime, ctx.rootCreateTime)) ||
      (ctx.planCreateTime && !sameCreateTime(planSnapshot.createTime, ctx.planCreateTime)) ||
      root.countMaintenance?.nextUnit !== plan.nextUnit || root.countMaintenance?.phase !== plan.phase || !sameCreateTime(rootSnapshot.updateTime, planSnapshot.updateTime)) fail('count-control-binding');
  if (plan.lastUnit !== null) {
    const receiptSnapshot = await read(ctx.receiptRef(plan.lastUnit)), receipt = validateReceipt(receiptSnapshot, ctx);
    if (!sameCreateTime(rootSnapshot.updateTime, receiptSnapshot.updateTime) || receipt.rootHash !== hash(root) || receipt.planImageHash !== hash(plan)) fail('count-control-version');
    await backupFor(ctx, receipt);
  }
  return { rootSnapshot, planSnapshot, root: clone(root), plan: clone(plan) };
}
function initialPlan(ctx, previous) {
  return { version: 1, kind: 'comment-count-reconciliation', projectId: ctx.projectId, root: ctx.root, planHash: ctx.manifest.hash,
    beforeRootHash: hash(ctx.manifest.beforeRoot), previousAcceptedManifestHash: previous?.baselineManifestHash ?? null,
    owner: ctx.owner, generation: (previous?.generation ?? 0) + 1, phase: 'inventory', nextUnit: 0, lastUnit: null,
    foldedUnit: null, receiptDigest: emptyDigest, proofTargetSlotCount: 0, inventoryCursor: null, inventoryCount: 0, inventoryDigest: emptyDigest,
    stageCursor: null, verifyCursor: null, verifyCount: 0, verifyDigest: emptyDigest, currentEpisodeId: null,
    episodeProofCount: 0, episodeProofDigest: emptyDigest, headProofCount: 0, headProofDigest: emptyDigest,
    headChainTargetSlotCount: 0, verifyStage: null, headVerification: null, headCursor: null, receiptVerification: null,
    resumeMaxUnit: null, resumePhase: 'ready', resumeHeadsComplete: false, resumeVerifyUnit: 0, resumeHeadCursor: null, resumeChainUnit: null, resumeChainSlot: null,
    resumeExpectedHash: null, resumeChainCount: 0, resumeReceiptDigest: emptyDigest, resumeExpectedReceiptDigest: null, resumeSourceCursor: null, resumeSourceCount: 0, resumeSourceDigest: emptyDigest, resumeSource: null,
    restoreUnit: null, restoreMaxApplyUnit: null, backupPlanHash: ctx.manifest.hash };
}
async function issueUnit(ctx, tx, read, state, description) {
  const { rootSnapshot, planSnapshot } = state, root = state.root, plan = state.plan;
  const originalLease = rootSnapshot?.exists ? rootSnapshot.get('leaseUntil') : root.leaseUntil;
  if (root.state !== 'paused' || root.owner !== ctx.owner || root.generation !== ctx.epoch || root.leaseUntil <= ctx.now()) fail('count-lease-lost');
  const index = plan.nextUnit, unitId = sequence(index), receiptRef = ctx.receiptRef(index), receiptBefore = await read(receiptRef);
  if (receiptBefore.exists) fail('count-unknown-unit-commit');
  if (plan.lastUnit !== null) {
    if (plan.lastUnit === 0 ? plan.foldedUnit !== null : plan.foldedUnit !== plan.lastUnit - 1) fail('count-digest-boundary');
    const last = await read(ctx.receiptRef(plan.lastUnit)); validateReceipt(last, ctx);
    plan.receiptDigest = proofFold(plan.receiptDigest, last); plan.foldedUnit = plan.lastUnit;
  }
  const targetData = [], descriptors = description.targets ?? [];
  for (const descriptor of descriptors) {
    const path = descriptor.path, field = descriptor.field ?? null, parts = ownedPath(ctx.root, path, field);
    const snapshot = await read(ctx.firestore.doc(path)), headRef = ctx.firestore.doc(`${ctx.unitsPath}/head-${targetKey(path, field)}`), prior = await read(headRef);
    if (snapshot.exists) {
      if (field) { if (!integer(snapshot.get(field))) fail('count-counter-schema'); }
      else privateProjection(snapshot.data(), parts.length === 6);
    }
    let physical = null;
    if (prior.exists) physical = await effectiveHead(ctx, read, snapshot, prior);
    const after = { exists: !descriptor.remove, data: descriptor.remove ? null : encodeCleanupValue(descriptor.value) };
    if (after.exists) { if (field) { if (!integer(descriptor.value)) fail('count-counter-schema'); } else privateProjection(descriptor.value, parts.length === 6); }
    const before = ownedImage(snapshot, field), changed = !same(projection(snapshot, field), after);
    const head = physical?.head;
    targetData.push({ descriptor, snapshot, headRef, before, after, physical, record: { targetKey: targetKey(path, field), slot: targetData.length,
      targetPath: path, ownedField: field, createTime: snapshot.exists ? snapshot.createTime : null, beforeVersion: snapshot.exists ? snapshot.updateTime : null,
      afterHash: hash(after), previousUnit: descriptor.undo ? descriptor.undo.previousUnit : head?.latestApplyUnit ?? null,
      previousSlot: descriptor.undo ? descriptor.undo.previousSlot : head?.latestApplySlot ?? null, created: !snapshot.exists && after.exists, changed,
      ...(descriptor.undo ? { undoneApplySlot: descriptor.undo.slot, physicalPredecessorUnit: head?.currentReceiptUnit ?? null,
        physicalPredecessorSlot: head?.currentReceiptSlot ?? null, originalProjectionHash: descriptor.originalProjectionHash, restoredProjectionHash: hash(after) } : {}) } });
  }
  if (targetData.length > 3 || new Set(targetData.map(item => item.record.targetKey)).size !== targetData.length) fail('count-target-bound');
  plan.nextUnit++; plan.lastUnit = index;
  if (description.kind !== 'restore') plan.proofTargetSlotCount += targetData.length;
  const episode = description.episode ?? null;
  if (episode) episode.lastUnit = index;
  root.leaseUntil = ctx.now() + 120000;
  root.countMaintenance = { version: 1, kind: 'reconciliation', planHash: ctx.manifest.hash, phase: plan.phase, nextUnit: plan.nextUnit };
  if (description.rootPatch) Object.assign(root, description.rootPatch);
  if (description.controlPatch) Object.assign(root.countMaintenance, description.controlPatch);
  validateCommentCountFence(root);
  const beforeHash = hash(targetData.map(item => ({ exists: item.before.exists, data: item.before.data })));
  const afterHash = description.proofImage ? hash(description.proofImage) : hash(targetData.map(item => item.after));
  const unitBody = { version: 1, kind: 'comment-count-unit', projectId: ctx.projectId, root: ctx.root, planHash: ctx.manifest.hash,
    index, unitKind: description.kind, episodeId: description.episodeId ?? null, commentId: description.commentId ?? null,
    source: description.source ?? null,
    ...(description.proofKind ? { proofKind: description.proofKind, proofImage: encodeCleanupValue(description.proofImage) } : {}),
    targets: targetData.map(item => ({ targetPath: item.record.targetPath, ownedField: item.record.ownedField, before: item.before, after: item.after })),
    checkpoint: { rootBeforeHash: rootSnapshot?.exists ? hash(rootSnapshot.data()) : null, planBeforeHash: planSnapshot?.exists ? hash(planSnapshot.data()) : null,
      rootAfterHash: hash(root), planAfterHash: hash(plan), episodeAfterHash: episode ? hash(episode) : null } };
  const backup = { ...unitBody, hash: hash(unitBody) }; await ctx.verify(); await ctx.backupStore.writeVerified(backup);
  if (!same(await ctx.backupStore.readVerified(backup.hash), backup)) fail('count-unit-backup-readback');
  const receipt = { version: 1, planHash: ctx.manifest.hash, unitId, index, kind: description.kind, owner: ctx.owner, generation: ctx.epoch,
    episodeId: description.episodeId ?? null, commentId: description.commentId ?? null, backupHash: backup.hash, beforeHash, afterHash,
    rootHash: hash(root), planImageHash: hash(plan), episodeCheckpointHash: episode ? hash(episode) : null, targets: targetData.map(item => item.record),
    ...(description.proofKind ? { proofKind: description.proofKind, proofImage: description.proofImage } : {}),
    ...(description.undoneApplyUnit !== undefined ? { undoneApplyUnit: description.undoneApplyUnit } : {}) };
  await ctx.verify();
  if ((description.newLease ? root.leaseUntil : originalLease) <= ctx.now()) fail('count-lease-expired');
  for (const item of targetData) {
    const { descriptor, record } = item, ref = ctx.firestore.doc(record.targetPath);
    if (record.changed) {
      if (descriptor.remove) { if (record.ownedField) fail('count-counter-removal-forbidden'); tx.delete(ref); }
      else if (record.ownedField) tx.update(ref, { [record.ownedField]: descriptor.value });
      else tx.set(ref, descriptor.value);
    }
    tx.set(item.headRef, { version: 1, kind: 'target-head', planHash: ctx.manifest.hash, targetKey: record.targetKey, targetPath: record.targetPath, ownedField: record.ownedField,
      latestApplyUnit: descriptor.undo ? record.previousUnit : index, latestApplySlot: descriptor.undo ? record.previousSlot : record.slot,
      currentReceiptUnit: index, currentReceiptSlot: record.slot, currentReceiptKind: description.kind === 'restore' ? 'restore' : 'apply', currentImageHash: record.afterHash });
  }
  if (episode) tx.set(ctx.completionRef(description.episodeId), episode);
  tx.create(receiptRef, receipt); tx.set(ctx.planRef, plan); tx.set(ctx.rootRef, root);
  return plan;
}
async function acquireFull(ctx, mode) {
  return transaction(ctx, async (tx, read) => {
    const [rootSnapshot, planSnapshot] = await Promise.all([read(ctx.rootRef), read(ctx.planRef)]);
    let root = rootSnapshot.exists ? clone(validateCommentCountFence(rootSnapshot.data())) : null;
    if (!planSnapshot.exists) {
      if (mode === 'restore' || !same(image(rootSnapshot), ctx.manifest.beforeRoot)) fail('count-plan-source-conflict');
      const plan = initialPlan(ctx, root); ctx.epoch = plan.generation;
      root = { ...(root ?? {}), version: 1, state: 'paused', generation: ctx.epoch, owner: ctx.owner, planHash: ctx.manifest.hash, leaseUntil: ctx.now() + 120000, writerProtocol: 1 };
      return issueUnit(ctx, tx, read, { rootSnapshot, planSnapshot, root, plan }, { kind: 'inventory', newLease: true });
    }
    const state = await control(ctx, read), plan = state.plan; root = state.root;
    if (root.state === 'active' && mode === 'apply') return plan;
    if (mode === 'apply' && ['restoring', 'restored-held'].includes(plan.phase)) fail('count-restored-plan-cannot-apply');
    if (root.state === 'paused' && root.owner !== ctx.owner && root.leaseUntil > ctx.now()) fail('count-lease-busy');
    if (root.state === 'paused' && root.owner === ctx.owner && root.leaseUntil > ctx.now() && !(mode === 'restore' && plan.phase !== 'restoring')) {
      ctx.epoch = root.generation; return plan;
    }
    const boundary = plan.nextUnit - 1;
    ctx.epoch = root.generation + 1; if (!Number.isSafeInteger(ctx.epoch)) fail('count-epoch-overflow');
    root.state = 'paused'; root.owner = ctx.owner; root.generation = ctx.epoch; root.leaseUntil = ctx.now() + 120000;
    plan.owner = ctx.owner; plan.generation = ctx.epoch;
    plan.resumeMaxUnit = boundary; plan.resumePhase = 'receipts'; plan.resumeHeadsComplete = false; plan.resumeVerifyUnit = 0;
    const pending = await read(ctx.receiptRef(plan.lastUnit));
    plan.resumeExpectedReceiptDigest = proofFold(plan.receiptDigest, pending); plan.resumeReceiptDigest = emptyDigest;
    plan.resumeHeadCursor = null; plan.resumeChainUnit = null; plan.resumeChainSlot = null; plan.resumeExpectedHash = null; plan.resumeChainCount = 0;
    plan.resumeSourceCursor = null; plan.resumeSourceCount = 0; plan.resumeSourceDigest = emptyDigest; plan.resumeSource = null;
    if (mode === 'restore' && !['restoring', 'restored-held'].includes(plan.phase)) { plan.restoreMaxApplyUnit = boundary; plan.restoreUnit = boundary; plan.phase = 'restoring'; }
    if (plan.phase === 'activation-barrier') plan.phase = 'verifying';
    return issueUnit(ctx, tx, read, state, { kind: 'verify', newLease: true });
  }, true);
}
async function mutateFull(ctx, operation) {
  const plan = await transaction(ctx, async (tx, read) => {
    const state = await control(ctx, read);
    if (state.root.state !== 'paused' || state.root.owner !== ctx.owner || state.root.generation !== ctx.epoch || state.root.leaseUntil <= ctx.now()) fail('count-lease-lost');
    const description = await operation(state, read);
    return issueUnit(ctx, tx, read, state, description);
  });
  ctx.budget.processed++; return plan;
}

function rowFor(ctx, record, comment) {
  return { version: 1, generation: record.dataGeneration, baselineManifestHash: ctx.manifest.hash, episodeCreateTime: record.episodeCreateTime,
    contribution: statusContribution(comment.exists ? comment.data() : null),
    commentVersion: comment.exists ? comment.updateTime : null, commentMutation: false };
}
const rowPath = (ctx, id, commentId) => `${ctx.root}/commentCountContributions/episodes/${id}/contributions/${commentId}`;
const commentRef = (ctx, id, commentId) => ctx.firestore.doc(`${ctx.root}/episodes/episodes/${id}/comments/${commentId}`);
const commentFold = (digest, snapshot) => jsonHash([digest, snapshot.id, ...stampParts(snapshot.createTime), ...stampParts(snapshot.updateTime), statusContribution(snapshot.data())]);
async function sourceFor(ctx, read, episode, comment = null) {
  const baseline = await read(ctx.baselineRef(episode.id));
  if (baseline.exists) privateProjection(baseline.data(), false);
  return { episodeCreateTime: encodeCleanupValue(episode.createTime), episodeVersion: encodeCleanupValue(episode.updateTime),
    commentVersion: comment?.exists ? encodeCleanupValue(comment.updateTime) : null,
    commentContribution: statusContribution(comment?.exists ? comment.data() : null),
    originalBaseline: ownedImage(baseline, null) };
}
async function inventoryStep(ctx) {
  return mutateFull(ctx, async (state, read) => {
    const { plan } = state, page = await read(ordered(ctx, `${ctx.root}/episodes/episodes`, plan.inventoryCursor), true);
    if (page.empty) { plan.phase = 'staging'; return { kind: 'inventory' }; }
    const episode = page.docs[0], id = episode.id;
    if (!countId(id) || !nativeTimestamp(episode.createTime) || !nativeTimestamp(episode.updateTime) || !integer(episode.get('stats.commentsCount')) || episode.get('adminDeletionToken')) fail('count-inventory-source');
    const existing = await read(ctx.completionRef(id)), baseline = await read(ctx.baselineRef(id));
    if (existing.exists) fail('count-inventory-repeat');
    if (baseline.exists) privateProjection(baseline.data(), false);
    const record = { version: 1, episodeId: id, episodeCreateTime: episode.createTime, sourceVersion: episode.updateTime,
      sourceCounter: episode.get('stats.commentsCount'), expectedSourceHead: null, dataGeneration: randomUUID(), previousBaselineHash: baseline.exists ? hash(ownedImage(baseline, null)) : null,
      state: 'inventoried', commentCursor: null, contributionCursor: null, commentsComplete: false, contributionsComplete: false,
      publishedCount: 0, commentCount: 0, commentDigest: emptyDigest, contributionCount: 0, contributionDigest: emptyDigest, lastUnit: 0, verification: null, proofUnit: null };
    plan.inventoryCursor = id; plan.inventoryCount++; plan.inventoryDigest = identityFold(plan.inventoryDigest, id, episode.createTime);
    return { kind: 'inventory', episodeId: id, episode: record };
  });
}
async function stagingStep(ctx) {
  return mutateFull(ctx, async (state, read) => {
    const { plan } = state;
    if (!plan.currentEpisodeId) {
      const page = await read(ordered(ctx, `${ctx.planPath}/episodes`, plan.stageCursor), true);
      if (page.empty) { plan.phase = 'verifying'; plan.verifyStage = 'episodes'; return { kind: 'verify' }; }
      const loaded = await loadCompletion(ctx, read, page.docs[0].id); loaded.data.state = 'staging';
      plan.currentEpisodeId = loaded.data.episodeId;
      await checkEpisode(ctx, read, loaded.data);
      return { kind: 'verify', episodeId: loaded.data.episodeId, episode: loaded.data };
    }
    const { data: record } = await loadCompletion(ctx, read, plan.currentEpisodeId), episode = await checkEpisode(ctx, read, record), id = record.episodeId;
    if (!record.commentsComplete) {
      const page = await read(ordered(ctx, `${ctx.root}/episodes/episodes/${id}/comments`, record.commentCursor), true);
      if (page.empty) { record.commentsComplete = true; return { kind: 'comment', episodeId: id, episode: record }; }
      const comment = page.docs[0]; if (!countId(comment.id) || !nativeTimestamp(comment.createTime) || !nativeTimestamp(comment.updateTime)) fail('count-comment-identity');
      const row = rowFor(ctx, record, comment);
      record.commentCursor = comment.id; record.commentCount++; record.commentDigest = commentFold(record.commentDigest, comment); record.publishedCount += row.contribution;
      return { kind: 'comment', episodeId: id, commentId: comment.id, episode: record, source: await sourceFor(ctx, read, episode, comment),
        targets: [{ path: rowPath(ctx, id, comment.id), value: row }] };
    }
    if (!record.contributionsComplete) {
      const page = await read(ordered(ctx, `${ctx.root}/commentCountContributions/episodes/${id}/contributions`, record.contributionCursor), true);
      if (page.empty) { record.contributionsComplete = true; return { kind: 'tombstone', episodeId: id, episode: record }; }
      const prior = page.docs[0]; if (!countId(prior.id)) fail('count-contribution-id'); privateProjection(prior.data(), true);
      const comment = await read(commentRef(ctx, id, prior.id)), row = rowFor(ctx, record, comment);
      record.contributionCursor = prior.id; record.contributionCount++; record.contributionDigest = recordFold(record.contributionDigest, prior.id, row);
      return { kind: 'tombstone', episodeId: id, commentId: prior.id, episode: record, source: await sourceFor(ctx, read, episode, comment),
        targets: [{ path: prior.ref.path, value: row }] };
    }
    const baseline = { version: 1, state: 'active', origin: 'baseline', generation: record.dataGeneration,
      baselineManifestHash: ctx.manifest.hash, episodeCreateTime: record.episodeCreateTime };
    record.state = 'staged'; record.expectedSourceHead = `head-${targetKey(episode.ref.path, 'stats.commentsCount')}`;
    plan.stageCursor = id; plan.currentEpisodeId = null;
    return { kind: 'episode-finalize', episodeId: id, episode: record, source: await sourceFor(ctx, read, episode),
      targets: [{ path: episode.ref.path, field: 'stats.commentsCount', value: record.publishedCount }, { path: ctx.baselineRef(id).path, value: baseline }] };
  });
}
function episodeProof(record) {
  return { episodeId: record.episodeId, episodeCreateTime: record.episodeCreateTime, sourceVersion: record.sourceVersion, expectedSourceHead: record.expectedSourceHead,
    dataGeneration: record.dataGeneration, commentCount: record.commentCount, commentDigest: record.commentDigest,
    contributionCount: record.contributionCount, contributionDigest: record.contributionDigest, publishedCount: record.publishedCount };
}
async function verifyEpisodePage(ctx, read, record, scratch) {
  const episode = await checkEpisode(ctx, read, record), id = record.episodeId;
  if (!scratch.commentsComplete) {
    const page = await read(ordered(ctx, `${ctx.root}/episodes/episodes/${id}/comments`, scratch.commentCursor), true);
    if (page.empty) {
      if (scratch.commentCount !== record.commentCount || scratch.commentDigest !== record.commentDigest || scratch.publishedCount !== record.publishedCount) fail('count-comment-inventory-conflict');
      scratch.commentsComplete = true;
    } else {
      const comment = page.docs[0], row = await read(ctx.firestore.doc(rowPath(ctx, id, comment.id)));
      if (!row.exists || !same(row.data(), rowFor(ctx, record, comment))) fail('count-comment-row-conflict');
      scratch.commentCursor = comment.id; scratch.commentCount++; scratch.commentDigest = commentFold(scratch.commentDigest, comment);
      scratch.publishedCount += statusContribution(comment.data());
    }
    return false;
  }
  if (!scratch.contributionsComplete) {
    const page = await read(ordered(ctx, `${ctx.root}/commentCountContributions/episodes/${id}/contributions`, scratch.contributionCursor), true);
    if (page.empty) {
      if (scratch.contributionCount !== record.contributionCount || scratch.contributionDigest !== record.contributionDigest) fail('count-contribution-inventory-conflict');
      scratch.contributionsComplete = true;
    } else {
      const row = page.docs[0], comment = await read(commentRef(ctx, id, row.id));
      if (!same(row.data(), rowFor(ctx, record, comment))) fail('count-contribution-row-conflict');
      scratch.contributionCursor = row.id; scratch.contributionCount++; scratch.contributionDigest = recordFold(scratch.contributionDigest, row.id, row.data());
    }
    return false;
  }
  const baseline = await read(ctx.baselineRef(id));
  if (!baseline.exists || !same(baseline.data(), { version: 1, state: 'active', origin: 'baseline', generation: record.dataGeneration,
    baselineManifestHash: ctx.manifest.hash, episodeCreateTime: record.episodeCreateTime }) || episode.get('stats.commentsCount') !== record.publishedCount) fail('count-complete-episode-proof');
  return true;
}
async function verificationStep(ctx) {
  return mutateFull(ctx, async (state, read) => {
    const { plan } = state;
    if (plan.verifyStage !== 'episodes') return verifyHeadsStep(ctx, state, read);
    if (!plan.currentEpisodeId) {
      const page = await read(ordered(ctx, `${ctx.root}/episodes/episodes`, plan.verifyCursor), true);
      if (page.empty) {
        if (plan.verifyCount !== plan.inventoryCount || plan.verifyDigest !== plan.inventoryDigest || plan.episodeProofCount !== plan.inventoryCount) fail('count-frozen-inventory-conflict');
        plan.verifyStage = 'heads'; return { kind: 'verify' };
      }
      const episode = page.docs[0], { data: record } = await loadCompletion(ctx, read, episode.id);
      if (record.state !== 'staged' || record.proofUnit !== null || !sameCreateTime(episode.createTime, record.episodeCreateTime)) fail('count-inventory-identity-conflict');
      record.state = 'verifying'; record.verification = verificationStart(); plan.currentEpisodeId = episode.id;
      plan.verifyCount++; plan.verifyDigest = identityFold(plan.verifyDigest, episode.id, episode.createTime);
      return { kind: 'verify', episodeId: episode.id, episode: record };
    }
    const { data: record } = await loadCompletion(ctx, read, plan.currentEpisodeId), scratch = verifyScratch(record.verification);
    if (!await verifyEpisodePage(ctx, read, record, scratch)) return { kind: 'verify', episodeId: record.episodeId, episode: record };
    const proof = episodeProof(record); record.state = 'verified'; record.proofUnit = plan.nextUnit;
    plan.episodeProofCount++; plan.episodeProofDigest = recordFold(plan.episodeProofDigest, record.episodeId, proof);
    plan.verifyCursor = record.episodeId; plan.currentEpisodeId = null;
    return { kind: 'verify', proofKind: 'episode', proofImage: proof, episodeId: record.episodeId, episode: record };
  });
}

async function ancestryLink(ctx, read, unit, slot, expectedKey, expectedHash) {
  const snapshot = await read(ctx.receiptRef(unit)), receipt = validateReceipt(snapshot, ctx), target = receipt.targets[slot];
  if (!target || target.targetKey !== expectedKey || target.afterHash !== expectedHash) fail('count-ancestry-slot');
  const backup = await backupFor(ctx, receipt), before = backup.targets[slot].before;
  const priorUnit = receipt.kind === 'restore' ? target.physicalPredecessorUnit : target.previousUnit;
  const priorSlot = receipt.kind === 'restore' ? target.physicalPredecessorSlot : target.previousSlot;
  if (priorUnit === null) return { unit: null, slot: null, hash: null };
  if (!integer(priorUnit) || priorUnit >= unit || !Number.isInteger(priorSlot) || priorSlot < 0 || priorSlot > 2) fail('count-ancestry-cycle');
  const priorSnapshot = await read(ctx.receiptRef(priorUnit)), prior = validateReceipt(priorSnapshot, ctx), predecessor = prior.targets[priorSlot];
  if (!predecessor || predecessor.targetKey !== expectedKey || predecessor.afterHash !== hash({ exists: before.exists, data: before.data })) fail('count-ancestry-image');
  const priorBackup = await backupFor(ctx, prior), priorAfter = priorBackup.targets[priorSlot].after;
  const version = priorAfter.exists ? predecessor.changed ? priorSnapshot.updateTime : predecessor.beforeVersion : null;
  const createTime = priorAfter.exists ? predecessor.created ? priorSnapshot.updateTime : predecessor.createTime : null;
  if (before.exists !== priorAfter.exists || (before.exists && (!sameCreateTime(decode(before.version), version) || !sameCreateTime(decode(before.createTime), createTime)))) fail('count-ancestry-version');
  return { unit: priorUnit, slot: priorSlot, hash: predecessor.afterHash };
}
async function verifyHeadSource(ctx, read, head, target) {
  const parts = ownedPath(ctx.root, head.targetPath, head.ownedField), { data: record } = await loadCompletion(ctx, read, parts[3]);
  const episode = await read(ctx.episodeRef(parts[3]));
  if (!episode.exists || !sameCreateTime(episode.createTime, record.episodeCreateTime)) fail('count-head-source-identity');
  if (parts.length === 6) {
    const comment = await read(commentRef(ctx, parts[3], parts[5]));
    if (!target.exists || !same(target.data(), rowFor(ctx, record, comment))) fail('count-head-comment-source');
  }
}
async function verifyHeadsStep(ctx, state, read) {
  const { plan } = state;
  if (plan.verifyStage === 'heads') {
    if (!plan.headVerification) {
      const page = await read(headQuery(ctx, plan.headCursor), true);
      if (page.empty) {
        if (plan.headChainTargetSlotCount !== plan.proofTargetSlotCount) fail('count-head-coverage');
        const last = await read(ctx.receiptRef(plan.lastUnit));
        plan.receiptVerification = { maxUnit: plan.lastUnit, cursor: 0, count: 0, digest: emptyDigest, targetSlots: 0,
          expectedDigest: proofFold(plan.receiptDigest, last) };
        plan.verifyStage = 'receipts'; return { kind: 'verify' };
      }
      const headSnapshot = page.docs[0], head = headShape(headSnapshot.data(), ctx, headSnapshot.id.slice(5));
      const target = await read(ctx.firestore.doc(head.targetPath)); await effectiveHead(ctx, read, target, headSnapshot); await verifyHeadSource(ctx, read, head, target);
      plan.headVerification = { headId: headSnapshot.id, image: head, unit: head.currentReceiptUnit, slot: head.currentReceiptSlot, expectedHash: head.currentImageHash, chainTargetCount: 0 };
      return { kind: 'verify' };
    }
    const work = plan.headVerification, currentHead = await read(ctx.firestore.doc(`${ctx.unitsPath}/${work.headId}`));
    await sealedHead(ctx, read, currentHead);
    if (!currentHead.exists || !same(currentHead.data(), work.image)) fail('count-head-changed-during-proof');
    if (work.unit !== null) {
      const link = await ancestryLink(ctx, read, work.unit, work.slot, work.image.targetKey, work.expectedHash);
      work.unit = link.unit; work.slot = link.slot; work.expectedHash = link.hash; work.chainTargetCount++;
      return { kind: 'verify' };
    }
    const proof = { ...work.image, chainTargetCount: work.chainTargetCount };
    plan.headProofCount++; plan.headProofDigest = recordFold(plan.headProofDigest, work.image.targetKey, proof); plan.headChainTargetSlotCount += work.chainTargetCount;
    plan.headCursor = work.headId; plan.headVerification = null;
    return { kind: 'verify', proofKind: 'target-head', proofImage: proof };
  }
  if (plan.verifyStage === 'receipts') {
    const work = plan.receiptVerification;
    if (!work || !integer(work.maxUnit) || !integer(work.cursor)) fail('count-receipt-verification-schema');
    if (work.cursor <= work.maxUnit) {
      const snapshot = await read(ctx.receiptRef(work.cursor)), receipt = validateReceipt(snapshot, ctx); await backupFor(ctx, receipt);
      work.digest = proofFold(work.digest, snapshot); work.count++; work.targetSlots += receipt.targets.length; work.cursor++;
      return { kind: 'verify' };
    }
    if (work.count !== work.maxUnit + 1 || work.digest !== work.expectedDigest || work.targetSlots !== plan.proofTargetSlotCount) fail('count-receipt-prefix-conflict');
    plan.verifyStage = 'complete'; return { kind: 'verify' };
  }
  if (plan.verifyStage !== 'complete') fail('count-verification-phase');
  plan.phase = 'activation-barrier';
  return { kind: 'verify', controlPatch: { complete: true, inventoryCount: plan.inventoryCount, inventoryDigest: plan.inventoryDigest,
    barrierPlanHash: ctx.manifest.hash, barrierGeneration: ctx.epoch, barrierOwner: ctx.owner,
    episodeProofCount: plan.episodeProofCount, episodeProofDigest: plan.episodeProofDigest, headProofCount: plan.headProofCount,
    headProofDigest: plan.headProofDigest, proofTargetSlotCount: plan.proofTargetSlotCount, headChainTargetSlotCount: plan.headChainTargetSlotCount } };
}
async function releaseFull(ctx) {
  return mutateFull(ctx, async (state, read) => {
    const { plan, root, rootSnapshot } = state, barrier = root.countMaintenance;
    if (plan.verifyStage !== 'complete' || !barrier.complete || barrier.barrierPlanHash !== ctx.manifest.hash || barrier.barrierGeneration !== ctx.epoch ||
        barrier.barrierOwner !== ctx.owner || plan.verifyCount !== plan.inventoryCount || plan.verifyDigest !== plan.inventoryDigest ||
        plan.episodeProofCount !== plan.inventoryCount || plan.headChainTargetSlotCount !== plan.proofTargetSlotCount) fail('count-activation-proof');
    const last = await read(ctx.receiptRef(plan.lastUnit)), digest = proofFold(plan.receiptDigest, last), releaseUnit = plan.nextUnit;
    const proof = { ...barrier, phase: 'active', nextUnit: releaseUnit + 1, proofMaxUnit: plan.lastUnit, proofReceiptCount: plan.nextUnit, proofReceiptDigest: digest,
      releaseUnit, barrierVersion: rootSnapshot.updateTime };
    plan.phase = 'active'; plan.generation = ctx.epoch + 1;
    Object.assign(plan, { proofMaxUnit: proof.proofMaxUnit, proofReceiptCount: proof.proofReceiptCount, proofReceiptDigest: digest,
      releaseUnit, barrierVersion: rootSnapshot.updateTime });
    return { kind: 'verify', proofKind: 'release', proofImage: proof,
      rootPatch: { state: 'active', generation: plan.generation, leaseUntil: 0, activeFrom: rootSnapshot.updateTime, baselineManifestHash: ctx.manifest.hash },
      controlPatch: { ...proof, phase: 'active', nextUnit: releaseUnit + 1 } };
  });
}
async function currentHeadSource(ctx, read, effective) {
  const source = effective.backup.source, proof = effective.proof;
  if (!source || !proof.episodeId) fail('count-head-source-missing');
  const episode = await read(ctx.episodeRef(proof.episodeId));
  if (!episode.exists || !sameCreateTime(episode.createTime, decode(source.episodeCreateTime))) fail('count-head-parent-changed');
  const counterKey = targetKey(episode.ref.path, 'stats.commentsCount'), counter = await read(ctx.firestore.doc(`${ctx.unitsPath}/head-${counterKey}`));
  if (counter.exists) await effectiveHead(ctx, read, episode, counter);
  else if (!sameCreateTime(episode.updateTime, decode(source.episodeVersion))) fail('count-head-unowned-parent-version');
  if (proof.commentId !== null) {
    const comment = await read(commentRef(ctx, proof.episodeId, proof.commentId));
    if (source.commentVersion === null ? comment.exists : !comment.exists || !sameCreateTime(comment.updateTime, decode(source.commentVersion))) fail('count-head-comment-changed');
    if ((statusContribution(comment.exists ? comment.data() : null)) !== source.commentContribution) fail('count-head-comment-contribution');
  }
}
async function resumeStep(ctx) {
  return mutateFull(ctx, async (state, read) => {
    const { plan } = state;
    if (plan.resumePhase === 'receipts') {
      if (plan.resumeVerifyUnit <= plan.resumeMaxUnit) {
        const snapshot = await read(ctx.receiptRef(plan.resumeVerifyUnit)), receipt = validateReceipt(snapshot, ctx); await backupFor(ctx, receipt);
        plan.resumeReceiptDigest = proofFold(plan.resumeReceiptDigest, snapshot); plan.resumeVerifyUnit++;
        return { kind: 'verify' };
      }
      if (plan.resumeReceiptDigest !== plan.resumeExpectedReceiptDigest) fail('count-resume-prefix-digest');
      plan.resumePhase = 'heads'; return { kind: 'verify' };
    }
    if (plan.resumePhase === 'heads' && !plan.resumeHeadsComplete) {
      if (plan.resumeChainUnit !== null) {
        const headSnapshot = await read(ctx.firestore.doc(`${ctx.unitsPath}/${plan.resumeHeadCursor}`)), head = headShape(headSnapshot.data(), ctx, plan.resumeHeadCursor.slice(5));
        await sealedHead(ctx, read, headSnapshot);
        const link = await ancestryLink(ctx, read, plan.resumeChainUnit, plan.resumeChainSlot, head.targetKey, plan.resumeExpectedHash);
        plan.resumeChainUnit = link.unit; plan.resumeChainSlot = link.slot; plan.resumeExpectedHash = link.hash; plan.resumeChainCount++;
        return { kind: 'verify' };
      }
      const page = await read(headQuery(ctx, plan.resumeHeadCursor), true);
      if (page.empty) { plan.resumeHeadsComplete = true; if (['restoring', 'restored-held'].includes(plan.phase)) plan.resumePhase = 'ready'; return { kind: 'verify' }; }
      const headSnapshot = page.docs[0], head = headShape(headSnapshot.data(), ctx, headSnapshot.id.slice(5)), target = await read(ctx.firestore.doc(head.targetPath));
      const effective = await effectiveHead(ctx, read, target, headSnapshot);
      await currentHeadSource(ctx, read, effective);
      plan.resumeHeadCursor = headSnapshot.id; plan.resumeChainUnit = head.currentReceiptUnit; plan.resumeChainSlot = head.currentReceiptSlot; plan.resumeExpectedHash = head.currentImageHash;
      return { kind: 'verify' };
    }
    if (plan.resumePhase === 'heads' && plan.resumeHeadsComplete) {
      // Completed staging needs a fresh bounded source pass after lease recovery.
      if (!['verifying', 'activation-barrier'].includes(plan.phase)) { plan.resumePhase = 'ready'; return { kind: 'verify' }; }
      if (!plan.resumeSource) {
        const page = await read(ordered(ctx, `${ctx.root}/episodes/episodes`, plan.resumeSourceCursor), true);
        if (page.empty) {
          if (plan.resumeSourceCount !== plan.inventoryCount || plan.resumeSourceDigest !== plan.inventoryDigest) fail('count-resume-inventory');
          plan.resumePhase = 'ready'; return { kind: 'verify' };
        }
        const episode = page.docs[0], { data: record } = await loadCompletion(ctx, read, episode.id);
        if (!sameCreateTime(episode.createTime, record.episodeCreateTime)) fail('count-resume-identity');
        plan.resumeSource = { episodeId: episode.id, verification: verificationStart() };
        plan.resumeSourceCount++; plan.resumeSourceDigest = identityFold(plan.resumeSourceDigest, episode.id, episode.createTime);
        return { kind: 'verify' };
      }
      const { data: record } = await loadCompletion(ctx, read, plan.resumeSource.episodeId);
      if (await verifyEpisodePage(ctx, read, record, verifyScratch(plan.resumeSource.verification))) {
        plan.resumeSourceCursor = record.episodeId; plan.resumeSource = null;
      }
      return { kind: 'verify' };
    }
    fail('count-resume-schema');
  });
}

function snapshotFromImage(value) {
  return { exists: value.exists, data: () => value.exists ? decode(value.data) : undefined,
    updateTime: value.exists ? decode(value.version) : undefined, createTime: value.exists ? decode(value.createTime) : undefined };
}
async function inverseProjection(ctx, read, original, item, episodeId, commentId) {
  const parts = ownedPath(ctx.root, item.targetPath, item.ownedField), episode = await read(ctx.episodeRef(episodeId));
  if (!episode.exists || !sameCreateTime(episode.createTime, decode(original.source.episodeCreateTime))) fail('count-restore-parent-identity');
  let comment;
  if (parts.length === 6) {
    comment = await read(commentRef(ctx, episodeId, commentId));
    if (original.source.commentVersion === null ? comment.exists : !comment.exists || !sameCreateTime(comment.updateTime, decode(original.source.commentVersion))) fail('count-restore-comment-changed');
    if (statusContribution(comment.exists ? comment.data() : null) !== original.source.commentContribution) fail('count-restore-comment-changed');
  }
  if (!item.before.exists) return { remove: true };
  const value = decode(item.before.data);
  if (item.ownedField) return { value };
  const previousFence = ctx.manifest.beforeRoot.exists ? decode(ctx.manifest.beforeRoot.data) : null;
  if (parts.length === 4) {
    if (value.origin !== 'creation') return { value };
    if (!previousFence) fail('count-restore-unproved-birth');
    return { value: materializeEpisodeCountBaseline(snapshotFromImage(item.before), episode, previousFence) };
  }
  if (value.commentMutation) {
    if (!previousFence || !original.source.originalBaseline?.exists) fail('count-restore-unproved-mutation');
    const baseline = materializeEpisodeCountBaseline(snapshotFromImage(original.source.originalBaseline), episode, previousFence);
    return { value: materializeCommentCountContribution(snapshotFromImage(item.before), comment, episode, baseline) };
  }
  if (!sameCreateTime(value.episodeCreateTime, episode.createTime) || value.contribution !== (statusContribution(comment.exists ? comment.data() : null)) ||
      (comment.exists ? !sameCreateTime(value.commentVersion, comment.updateTime) : value.commentVersion !== null)) fail('count-restore-stale-contribution');
  return { value };
}
async function restoreStep(ctx) {
  return mutateFull(ctx, async (state, read) => {
    const { plan } = state;
    if (plan.restoreUnit === null) {
      plan.phase = 'restored-held';
      return { kind: 'restore', rootPatch: { leaseUntil: 0 }, controlPatch: { previousAcceptedManifestHash: plan.previousAcceptedManifestHash, complete: true } };
    }
    const index = plan.restoreUnit, snapshot = await read(ctx.receiptRef(index)), receipt = validateReceipt(snapshot, ctx), original = await backupFor(ctx, receipt);
    if (index > plan.restoreMaxApplyUnit || receipt.kind === 'restore') fail('count-restore-boundary');
    const targets = [];
    for (const [slot, item] of original.targets.entries()) {
      const headSnapshot = await read(ctx.firestore.doc(`${ctx.unitsPath}/head-${receipt.targets[slot].targetKey}`));
      if (!headSnapshot.exists) fail('count-restore-head-missing');
      const head = headShape(headSnapshot.data(), ctx, receipt.targets[slot].targetKey), current = await read(ctx.firestore.doc(item.targetPath));
      if (head.latestApplyUnit !== index || head.latestApplySlot !== slot) fail('count-restore-logical-order');
      await effectiveHead(ctx, read, current, headSnapshot);
      if (!same(projection(current, item.ownedField), item.after)) fail('count-restore-owned-image');
      if (receipt.episodeId) {
        const episode = await read(ctx.episodeRef(receipt.episodeId));
        if (!episode.exists || !original.source || !sameCreateTime(episode.createTime, decode(original.source.episodeCreateTime))) fail('count-restore-parent-identity');
        const counterHead = await read(ctx.firestore.doc(`${ctx.unitsPath}/head-${targetKey(episode.ref.path, 'stats.commentsCount')}`));
        if (counterHead.exists) await effectiveHead(ctx, read, episode, counterHead);
        else if (!sameCreateTime(episode.updateTime, decode(original.source.episodeVersion))) fail('count-restore-unowned-parent-version');
      }
      const inverse = await inverseProjection(ctx, read, original, item, receipt.episodeId, receipt.commentId);
      targets.push({ path: item.targetPath, field: item.ownedField, ...inverse, undo: receipt.targets[slot], originalProjectionHash: hash({ exists: item.before.exists, data: item.before.data }) });
    }
    plan.restoreUnit = index === 0 ? null : index - 1;
    return { kind: 'restore', episodeId: receipt.episodeId, commentId: receipt.commentId, source: original.source, targets, undoneApplyUnit: index };
  });
}
function acceptedFull(state, ctx) {
  const { rootSnapshot, planSnapshot, root, plan } = state, proof = root?.countMaintenance;
  if (!root || !plan || root.state !== 'active' || plan.phase !== 'active' || root.baselineManifestHash !== ctx.manifest.hash || root.planHash !== ctx.manifest.hash ||
      !sameCreateTime(rootSnapshot.createTime, ctx.rootCreateTime) || !sameCreateTime(planSnapshot.createTime, ctx.planCreateTime) ||
    proof?.kind !== 'reconciliation' || proof.phase !== 'active' || proof.complete !== true || proof.barrierPlanHash !== ctx.manifest.hash ||
      proof.barrierOwner !== root.owner || proof.barrierGeneration + 1 !== root.generation || !nativeTimestamp(proof.barrierVersion) ||
      !sameCreateTime(root.activeFrom, proof.barrierVersion) || compareNativeTime(rootSnapshot.createTime, proof.barrierVersion) > 0 || compareNativeTime(rootSnapshot.updateTime, proof.barrierVersion) <= 0 ||
      !sameCreateTime(planSnapshot.updateTime, rootSnapshot.updateTime) || (proof.proofMaxUnit !== null && !integer(proof.proofMaxUnit)) || proof.proofReceiptCount !== (proof.proofMaxUnit === null ? 0 : proof.proofMaxUnit + 1) ||
      proof.releaseUnit !== (proof.proofMaxUnit === null ? 0 : proof.proofMaxUnit + 1) || proof.releaseUnit !== plan.lastUnit || !countHash(proof.proofReceiptDigest) ||
      proof.episodeProofCount !== proof.inventoryCount || proof.proofTargetSlotCount !== proof.headChainTargetSlotCount) fail('count-accepted-proof-binding');
  return { projectId: ctx.projectId, root: ctx.root, planHash: ctx.manifest.hash, releaseIdentity: encodeCleanupValue(rootSnapshot.updateTime),
    proof: encodeCleanupValue(proof), releaseUnit: proof.releaseUnit };
}
async function readActive(ctx) {
  const [rootSnapshot, planSnapshot] = await Promise.all([outsideRead(ctx, ctx.rootRef), outsideRead(ctx, ctx.planRef)]);
  const root = rootSnapshot.exists ? validateCommentCountFence(rootSnapshot.data()) : null, plan = planSnapshot.exists ? validatePlan(planSnapshot.data(), ctx) : null;
  return { rootSnapshot, planSnapshot, root, plan };
}
function replayStart(binding, owner) {
  return { binding, owner, phase: 'receipts', cursor: 0, digest: emptyDigest, targetSlots: 0, receiptCount: 0,
    episodeCount: 0, episodeDigest: emptyDigest, identityDigest: emptyDigest, lastEpisode: null,
    headCount: 0, headDigest: emptyDigest, lastHead: null, ancestrySlots: 0, pendingHead: null };
}
async function replayFull(ctx, state) {
  const binding = acceptedFull(state, ctx), proof = state.root.countMaintenance;
  const result = await ctx.backupStore.replaySession(replayToken, binding, async saved => {
    const work = saved && saved.phase !== 'complete' ? clone(saved) : replayStart(binding, ctx.owner);
    work.owner = ctx.owner;
    while (ctx.budget.processed < ctx.budget.maxItems) {
      let reads = 0; const cache = new Map();
      const read = async ref => {
        if (cache.has(ref.path)) return cache.get(ref.path);
        if (++reads > 17) fail('count-replay-item-read-budget');
        ctx.budget.charge(1); const snapshot = await ref.get(); cache.set(ref.path, snapshot); return snapshot;
      };
      if (work.phase === 'heads') {
        const pending = work.pendingHead;
        if (!pending || !countHash(pending.image.targetKey)) fail('count-replay-head-schema');
        if (pending.unit !== null) {
          const link = await ancestryLink(ctx, read, pending.unit, pending.slot, pending.image.targetKey, pending.expectedHash);
          pending.unit = link.unit; pending.slot = link.slot; pending.expectedHash = link.hash; pending.count++; work.ancestrySlots++;
        } else {
          if (pending.count !== pending.image.chainTargetCount) fail('count-replay-head-chain-count');
          work.headCount++; work.headDigest = recordFold(work.headDigest, pending.image.targetKey, pending.image);
          work.lastHead = pending.image.targetKey; work.pendingHead = null; work.phase = 'receipts';
        }
      } else if (work.cursor <= proof.releaseUnit) {
        const snapshot = await read(ctx.receiptRef(work.cursor)), receipt = validateReceipt(snapshot, ctx); await backupFor(ctx, receipt);
        if (receipt.index !== work.cursor) fail('count-replay-membership');
        if (proof.proofMaxUnit !== null && work.cursor <= proof.proofMaxUnit) { work.digest = proofFold(work.digest, snapshot); work.receiptCount++; work.targetSlots += receipt.targets.length; }
        if (receipt.proofKind === 'episode') {
          const image = receipt.proofImage;
          if (!image || !countId(image.episodeId) || (work.lastEpisode !== null && image.episodeId <= work.lastEpisode)) fail('count-replay-episode-order');
          work.episodeCount++; work.episodeDigest = recordFold(work.episodeDigest, image.episodeId, image); work.identityDigest = identityFold(work.identityDigest, image.episodeId, image.episodeCreateTime); work.lastEpisode = image.episodeId;
        } else if (receipt.proofKind === 'target-head') {
          const image = receipt.proofImage; validateProofImage('target-head', image, ctx.root, ctx.manifest.hash);
          if (!integer(image.chainTargetCount) || image.chainTargetCount < 1 || (work.lastHead !== null && image.targetKey <= work.lastHead)) fail('count-replay-head-order');
          work.pendingHead = { image, unit: image.currentReceiptUnit, slot: image.currentReceiptSlot, expectedHash: image.currentImageHash, count: 0 }; work.phase = 'heads';
        } else if (receipt.proofKind === 'release') {
          if (work.cursor !== proof.releaseUnit || receipt.kind !== 'verify' || receipt.targets.length || !same(receipt.proofImage, proof) ||
              !sameCreateTime(snapshot.updateTime, state.rootSnapshot.updateTime) || receipt.rootHash !== hash(state.root) || receipt.planImageHash !== hash(state.plan)) fail('count-replay-release');
        }
        work.cursor++;
      } else {
        if (work.receiptCount !== proof.proofReceiptCount || work.digest !== proof.proofReceiptDigest || work.episodeCount !== proof.episodeProofCount || work.episodeDigest !== proof.episodeProofDigest ||
            work.identityDigest !== proof.inventoryDigest || work.headCount !== proof.headProofCount || work.headDigest !== proof.headProofDigest ||
            work.targetSlots !== proof.proofTargetSlotCount || work.ancestrySlots !== proof.headChainTargetSlotCount) fail('count-replay-complete-proof');
        work.phase = 'complete';
      }
      ctx.budget.processed++;
      if (work.phase === 'complete') break;
    }
    const current = await readActive(ctx); if (!same(acceptedFull(current, ctx), binding)) fail('count-replay-release-changed');
    await ctx.verify();
    return { state: work, output: fullResult(ctx, state.plan, work.phase === 'complete' ? 'active' : 'in-progress') };
  });
  const current = await readActive(ctx); if (!same(acceptedFull(current, ctx), binding)) fail('count-replay-publication-binding');
  return { ...result, readEquivalents: ctx.budget.reads };
}

export async function applyCommentCountReconciliation(options) {
  const ctx = await fullContext(options); let plan = await acquireFull(ctx, 'apply'); await ctx.bindBirth();
  if (plan.phase === 'active') return replayFull(ctx, await readActive(ctx));
  while (ctx.budget.processed < ctx.budget.maxItems) {
    if (plan.resumePhase !== 'ready') plan = await resumeStep(ctx);
    else if (plan.phase === 'inventory') plan = await inventoryStep(ctx);
    else if (plan.phase === 'staging') plan = await stagingStep(ctx);
    else if (plan.phase === 'verifying') plan = await verificationStep(ctx);
    else if (plan.phase === 'activation-barrier') {
      plan = await releaseFull(ctx); const state = await readActive(ctx); acceptedFull(state, ctx);
      const receipt = await outsideRead(ctx, ctx.receiptRef(plan.releaseUnit)); validateReceipt(receipt, ctx);
      if (!sameCreateTime(receipt.updateTime, state.rootSnapshot.updateTime)) fail('count-release-native-readback');
      await backupFor(ctx, receipt.data());
      // Pin the reported release in the existing private plan-scoped durable head.
      // Cursor0 grants no historical replay credit; later replay must still exhaust proof.
      const binding = acceptedFull(state, ctx);
      await ctx.backupStore.replaySession(replayToken, binding, async before => ({ state: before ?? replayStart(binding, ctx.owner), output: null }));
      if (!same(acceptedFull(await readActive(ctx), ctx), binding)) fail('count-release-publication-binding');
      return fullResult(ctx, plan, 'active');
    } else fail('count-apply-phase');
  }
  return fullResult(ctx, plan);
}
export async function restoreCommentCountReconciliation(options) {
  const ctx = await fullContext(options); let plan = await acquireFull(ctx, 'restore'); await ctx.bindBirth();
  while (ctx.budget.processed < ctx.budget.maxItems) {
    if (plan.resumePhase !== 'ready') plan = await resumeStep(ctx);
    else if (plan.phase === 'restoring') plan = await restoreStep(ctx);
    else if (plan.phase === 'restored-held') return fullResult(ctx, plan, 'restored-held');
    else fail('count-restore-phase');
    if (plan.phase === 'restored-held' && plan.resumePhase === 'ready') return fullResult(ctx, plan, 'restored-held');
  }
  return fullResult(ctx, plan);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Operator key/manifest CLI loading is not an approved public contract.
  // Real demo execution is available only through the reviewed owned API above.
  console.error(JSON.stringify({ status: 'stopped', reason: 'count-direct-cli-mutation-unavailable' })); process.exitCode = 1;
}
