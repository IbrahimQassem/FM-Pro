#!/usr/bin/env node
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { constants } from 'node:fs';
import { open, realpath, lstat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, relative, isAbsolute, join, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizedSchedule, localTime, legacyDates, fingerprint } from '../functions/lib/program-notifications.js';
import { notificationFailure } from '../functions/lib/notification-delivery.js';
import { encodeCleanupValue } from './remove_old_locations.mjs';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const roots = ['HudHudDev', 'HudHudOfficial'];
const HEX = /^[0-9a-f]{64}$/;
const fail = () => { throw new Error('Program date migration scope, source, proof or backup precondition failed.'); };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fingerprintValue = value => hash(encodeCleanupValue(value));
const same = (a, b) => fingerprintValue(a) === fingerprintValue(b);
const id = value => typeof value === 'string' && value.length >= 1 && value.length <= 128 && value === value.trim() && !value.includes('/') && !['.', '..'].includes(value);
const native = value => value instanceof Timestamp && Number.isSafeInteger(value.seconds) && value.seconds >= -62135596800 && value.seconds <= 253402300799 &&
  Number.isInteger(value.nanoseconds) && value.nanoseconds >= 0 && value.nanoseconds < 1000000000;
const sameNative = (a, b) => native(a) && native(b) && a.seconds === b.seconds && a.nanoseconds === b.nanoseconds;
const canonicalDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '0001-01-01' && value <= '9999-12-31' &&
  Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const canonicalCutoff = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && canonicalDate(value.slice(0, 10)) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const nextDate = value => {
  const next = new Date(Date.parse(`${value}T00:00:00.000Z`) + 86400000);
  return next.getUTCFullYear() <= 9999 ? next.toISOString().slice(0, 10) : null;
};
const closed = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));

function scope(options, db) {
  const fields = ['mode', 'projectId', 'root', 'programId', 'fromLocalDate', 'toLocalDate', 'cutoverAt', 'cursor', 'maxItems', 'directory', 'keyFile', 'expiresAt', 'manifestHash', 'owner'];
  if (!options || typeof options !== 'object' || Object.keys(options).some(key => !fields.includes(key))) fail();
  if (!/^[a-z][a-z0-9-]{4,62}$/.test(options.projectId ?? '') || !roots.includes(options.root) || !id(options.programId) ||
    !canonicalDate(options.fromLocalDate) || !canonicalDate(options.toLocalDate) || options.toLocalDate < options.fromLocalDate ||
    Date.parse(`${options.toLocalDate}T00:00:00.000Z`) - Date.parse(`${options.fromLocalDate}T00:00:00.000Z`) > 30 * 86400000 ||
    !canonicalCutoff(options.cutoverAt) || (options.cursor !== undefined && (!canonicalDate(options.cursor) || options.cursor < options.fromLocalDate || options.cursor > options.toLocalDate)) ||
    (db && db.projectId !== options.projectId)) fail();
  const maxItems = options.maxItems ?? 25;
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 25 || !['preview', 'apply', 'restore'].includes(options.mode ?? 'preview')) fail();
  return maxItems;
}
export function parseProgramDateMigrationArgs(args) {
  const options = { mode: 'preview' }, names = { '--project': 'projectId', '--root': 'root', '--program': 'programId', '--from': 'fromLocalDate', '--to': 'toLocalDate',
    '--cutover-at': 'cutoverAt', '--cursor': 'cursor', '--max-items': 'maxItems', '--backup-dir': 'directory', '--key-file': 'keyFile', '--expires-at': 'expiresAt', '--manifest': 'manifestHash', '--owner': 'owner' };
  let selected;
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (['--dry-run', '--apply', '--restore'].includes(key)) {
      if (selected) fail(); selected = key; options.mode = key === '--dry-run' ? 'preview' : key.slice(2);
    } else if (names[key] && options[names[key]] === undefined && args[i + 1] && !args[i + 1].startsWith('--')) options[names[key]] = args[++i];
    else fail();
  }
  options.maxItems = Number(options.maxItems ?? 25);
  scope(options);
  if (options.expiresAt !== undefined) options.expiresAt = Number(options.expiresAt);
  if (options.owner !== undefined && !id(options.owner)) fail();
  if (options.mode !== 'preview' && (!HEX.test(options.manifestHash ?? '') || !options.directory || !options.keyFile || !Number.isSafeInteger(options.expiresAt))) fail();
  return options;
}

// Decode only the accepted notification-purpose codec. Generic cleanup codecs
// also support references/bytes/points; those are deliberately inadmissible here.
function decodePurpose(node) {
  if (!closed(node, ['t', 'v'])) fail();
  if (node.t === 'timestamp') {
    if (!Array.isArray(node.v) || node.v.length !== 2 || !Number.isSafeInteger(node.v[0]) || !Number.isInteger(node.v[1])) fail();
    const value = new Timestamp(...node.v); if (!native(value)) fail(); return value;
  }
  if (node.t === 'value') {
    if (node.v !== null && !['string', 'boolean', 'number'].includes(typeof node.v)) fail();
    if (typeof node.v === 'number' && !Number.isFinite(node.v)) fail(); return node.v;
  }
  if (node.t === 'array') { if (!Array.isArray(node.v)) fail(); return node.v.map(decodePurpose); }
  if (node.t === 'map') {
    if (!Array.isArray(node.v)) fail();
    let prior = null;
    for (const pair of node.v) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || (prior !== null && pair[0] <= prior)) fail(); prior = pair[0];
    }
    return Object.fromEntries(node.v.map(([key, value]) => [key, decodePurpose(value)]));
  }
  fail();
}
function image(snapshot, data = snapshot.data()) {
  if (!snapshot.exists) return { exists: false };
  if (!native(snapshot.createTime) || !native(snapshot.updateTime)) fail();
  return { exists: true, data: encodeCleanupValue(data), createTime: encodeCleanupValue(snapshot.createTime), updateTime: encodeCleanupValue(snapshot.updateTime) };
}
function decodeImage(value, validate) {
  if (value?.exists === false) { if (!closed(value, ['exists'])) fail(); return null; }
  if (!closed(value, ['exists', 'data', 'createTime', 'updateTime']) || value.exists !== true ||
    !native(decodePurpose(value.createTime)) || !native(decodePurpose(value.updateTime))) fail();
  const data = decodePurpose(value.data); validate(data); return data;
}
const select = (value, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
const programFields = ['stationId', 'isActive', 'schedule', 'lastNotifiedDate', 'lastNotifiedPolicyVersion', 'adminDeletionToken'];
const stationFields = ['isActive', 'adminDeletionToken'];
const receiptFields = ['status', 'phase', 'lease', 'fingerprint', 'leaseUntil', 'attempts', 'createdAt', 'updatedAt', 'expiresAt', 'cleanupAt', 'retryAt', 'retryable', 'reason', 'messageId', 'programCompatibility'];
function validateReceipt(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !receiptFields.includes(key))) fail();
  for (const [key, value] of Object.entries(data)) {
    if (['createdAt', 'updatedAt', 'expiresAt', 'cleanupAt', 'retryAt', 'leaseUntil'].includes(key)) { if (!native(value)) fail(); }
    else if (key === 'programCompatibility') validateCompatibility(value);
    else if (key === 'attempts') { if (!Number.isSafeInteger(value) || value < 0) fail(); }
    else if (key === 'retryable') { if (typeof value !== 'boolean') fail(); }
    else if (typeof value !== 'string' || value.length > (key === 'messageId' ? 256 : 128)) fail();
  }
}
function validateCompatibility(proof) {
  const base = ['version', 'manifestHash', 'cutoverAt', 'programCreateTime', 'scheduleFingerprint', 'legacyDates', 'legacyKeys', 'evidenceHashes', 'decision', 'recordedAt'];
  const carry = ['legacySourceKey', 'legacySourceCreateTime', 'legacySourceUpdateTime'];
  if (!proof || !closed(proof, proof.decision === 'suppressed' ? base : [...base, ...carry]) || proof.version !== 1 || !HEX.test(proof.manifestHash ?? '') ||
    !HEX.test(proof.scheduleFingerprint ?? '') || !native(proof.cutoverAt) || !native(proof.programCreateTime) || !native(proof.recordedAt) ||
    !['suppressed', 'carried-prepared', 'carried-retryable', 'carried-terminal-failed'].includes(proof.decision) ||
    !Array.isArray(proof.legacyDates) || proof.legacyDates.length < 1 || proof.legacyDates.length > 2 || !proof.legacyDates.every(canonicalDate) ||
    (proof.legacyDates.length === 2 && proof.legacyDates[0] >= proof.legacyDates[1]) || !Array.isArray(proof.legacyKeys) || proof.legacyKeys.length !== proof.legacyDates.length || !proof.legacyKeys.every(key => HEX.test(key)) ||
    !Array.isArray(proof.evidenceHashes) || proof.evidenceHashes.length > 3 || !proof.evidenceHashes.every(key => HEX.test(key)) ||
    (proof.decision !== 'suppressed' && (!HEX.test(proof.legacySourceKey ?? '') || !native(proof.legacySourceCreateTime) || !native(proof.legacySourceUpdateTime)))) fail();
}
function sourceProjection(snapshot, fields) { return image(snapshot, snapshot.exists ? select(snapshot.data(), fields) : undefined); }
function programShape(data) {
  if (!data || Object.keys(data).some(key => !programFields.includes(key)) || !id(data.stationId) || data.isActive !== true || data.adminDeletionToken ||
    !closed(data.schedule, ['weekdays', 'startMinute', 'endMinute', 'utcOffsetMinutes']) || !normalizedSchedule(data.schedule) ||
    (data.lastNotifiedDate !== undefined && (typeof data.lastNotifiedDate !== 'string' || data.lastNotifiedDate.length > 10)) ||
    (data.lastNotifiedPolicyVersion !== undefined && !Number.isSafeInteger(data.lastNotifiedPolicyVersion))) fail();
}
function stationShape(data) {
  if (!data || Object.keys(data).some(key => !stationFields.includes(key)) || data.isActive !== true || data.adminDeletionToken) fail();
}

const demoTransports = new WeakMap(), backupStores = new WeakSet(), backupToken = Symbol('program-date-backup');
const recoveryWindow = 3600000, leaseDuration = 120000;
const demoHost = (projectId, host) => {
  if (!/^demo-[a-z0-9-]{1,58}$/.test(projectId ?? '') || !/^(127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/.test(host ?? '') || Number(host.split(':').at(-1)) > 65535 ||
    (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== host)) fail();
};
export function createProgramDateDemoFirestore({ projectId, emulatorHost = process.env.FIRESTORE_EMULATOR_HOST }) {
  demoHost(projectId, emulatorHost);
  const { Firestore } = require('firebase-admin/firestore');
  const client = new Firestore(); client.settings({ projectId, host: emulatorHost, ssl: false });
  const facade = Object.freeze({ projectId, doc: client.doc.bind(client), runTransaction: client.runTransaction.bind(client), terminate: client.terminate.bind(client) });
  demoTransports.set(facade, { projectId, host: emulatorHost }); return facade;
}
function trustedDemo(options, db) {
  const binding = demoTransports.get(db);
  if (!binding || binding.projectId !== options.projectId) fail();
  demoHost(binding.projectId, binding.host);
}

/** Narrow immutable notification manifests; no operator clock/verification adapter. */
export class ProgramDateBackupStore {
  #directory; #key; #expiresAt; #identity; #files = new Map();
  constructor(token, config, identity) {
    if (token !== backupToken) fail();
    this.#directory = config.directory; this.#key = Buffer.from(config.key); this.#expiresAt = config.expiresAt; this.#identity = identity;
  }
  static async open(config) {
    if (!closed(config, ['directory', 'key', 'expiresAt']) || typeof config.directory !== 'string' || !isAbsolute(config.directory) ||
      !Buffer.isBuffer(config.key) || config.key.length !== 32 || !Number.isSafeInteger(config.expiresAt)) fail();
    const actual = await realpath(config.directory), stat = await lstat(config.directory);
    if (stat.isSymbolicLink()) fail();
    const store = new ProgramDateBackupStore(backupToken, { ...config, directory: actual }, { dev: stat.dev, ino: stat.ino });
    await store.#checkDirectory(); backupStores.add(store); return Object.freeze(store);
  }
  get expiresAt() { return this.#expiresAt; }
  async #checkDirectory() {
    const now = Date.now();
    if (!Number.isSafeInteger(now) || this.#expiresAt - now < recoveryWindow || this.#expiresAt > now + 30 * 86400000) fail();
    const actual = await realpath(this.#directory), stat = await lstat(this.#directory), repo = await realpath(fileURLToPath(new URL('../', import.meta.url)));
    const inside = relative(repo, actual);
    if (actual !== this.#directory || stat.dev !== this.#identity.dev || stat.ino !== this.#identity.ino || !stat.isDirectory() || stat.isSymbolicLink() ||
      (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid()) || !inside ||
      (inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside)) || actual.split('/').includes('.boss')) fail();
    let parent = actual;
    for (let depth = 0; depth < 64; depth++) {
      try { await lstat(join(parent, '.git')); fail(); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
      const next = dirname(parent); if (next === parent) return actual; parent = next;
    }
    fail();
  }
  async put(manifest) {
    validateProgramDateManifest(manifest);
    const directory = await this.#checkDirectory(), key = manifest.manifestHash;
    const nonce = randomBytes(12), aad = Buffer.from(JSON.stringify(['program-date-migration-backup', 1, key, this.#expiresAt]));
    const cipher = createCipheriv('aes-256-gcm', this.#key, nonce); cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(manifest)), cipher.final()]);
    const body = JSON.stringify({ version: 1, kind: 'program-date-migration-backup', manifestHash: key, expiresAt: this.#expiresAt,
      nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') });
    if (Buffer.byteLength(body) > 1048576) fail();
    let handle;
    try { handle = await open(join(directory, `${key}.program-date-backup`), 'wx', 0o600); await handle.writeFile(body); await handle.sync(); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
    finally { await handle?.close(); }
    const folder = await open(directory, 'r'); try { await folder.sync(); } finally { await folder.close(); }
    if (!same(await this.get(key), manifest)) fail(); return key;
  }
  async get(key) {
    if (!HEX.test(key ?? '')) fail();
    const directory = await this.#checkDirectory(), path = join(directory, `${key}.program-date-backup`), stat = await lstat(path);
    const valid = value => value.isFile() && !value.isSymbolicLink() && value.nlink === 1 && (value.mode & 0o077) === 0 &&
      (!process.getuid || value.uid === process.getuid()) && value.size <= 1048576;
    if (!valid(stat)) fail();
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); let envelope;
    try {
      const opened = await handle.stat(), prior = this.#files.get(key);
      if (!valid(opened) || opened.dev !== stat.dev || opened.ino !== stat.ino || (prior && (prior.dev !== opened.dev || prior.ino !== opened.ino))) fail();
      this.#files.set(key, { dev: opened.dev, ino: opened.ino });
      envelope = JSON.parse(await handle.readFile('utf8'));
    } finally { await handle.close(); }
    await this.#checkDirectory();
    if (!closed(envelope, ['version', 'kind', 'manifestHash', 'expiresAt', 'nonce', 'tag', 'ciphertext']) || envelope.version !== 1 || envelope.kind !== 'program-date-migration-backup' ||
      envelope.manifestHash !== key || envelope.expiresAt !== this.#expiresAt) fail();
    const bytes = (value, size) => {
      if (typeof value !== 'string') fail(); const result = Buffer.from(value, 'base64');
      if (result.toString('base64') !== value || (size !== undefined && result.length !== size)) fail(); return result;
    };
    const decipher = createDecipheriv('aes-256-gcm', this.#key, bytes(envelope.nonce, 12));
    decipher.setAAD(Buffer.from(JSON.stringify(['program-date-migration-backup', 1, key, this.#expiresAt]))); decipher.setAuthTag(bytes(envelope.tag, 16));
    const manifest = JSON.parse(Buffer.concat([decipher.update(bytes(envelope.ciphertext)), decipher.final()]).toString('utf8'));
    validateProgramDateManifest(manifest);
    if (manifest.manifestHash !== key) fail(); return manifest;
  }
}
Object.freeze(ProgramDateBackupStore.prototype);

function occurrenceDates(schedule, cursor, to, cap) {
  const dates = []; let date = cursor, nextCursor = null;
  for (let visited = 0; date && date <= to && visited < 31; visited++, date = nextDate(date)) {
    const weekday = localTime(Date.parse(`${date}T00:00:00.000Z`), 0).weekday;
    if (schedule.weekdays.includes(weekday)) {
      if (dates.length === cap) { nextCursor = date; break; }
      if (!legacyDates(date, schedule.utcOffsetMinutes)) fail();
      dates.push(date);
    }
  }
  return { dates, nextCursor };
}
function supportedReceipt(data) {
  if (!data || !['pending', 'failed'].includes(data.status) || !['claimed', 'sending'].includes(data.phase) ||
    !Number.isSafeInteger(data.attempts) || data.attempts < 1 || !['createdAt', 'updatedAt', 'expiresAt', 'cleanupAt'].every(field => native(data[field])) ||
    data.updatedAt.toMillis() < data.createdAt.toMillis() || data.expiresAt.toMillis() <= data.createdAt.toMillis() || data.cleanupAt.toMillis() < data.expiresAt.toMillis()) return false;
  if (data.status === 'pending') return id(data.lease) && native(data.leaseUntil);
  return typeof data.retryable === 'boolean' && native(data.retryAt) &&
    (['preparation-failed', 'ineligible', 'expired'].includes(data.reason) || notificationFailure({ code: data.reason }).status === 'failed');
}
function decision(manifest, item) {
  const program = decodeImage(manifest.program, programShape), schedule = normalizedSchedule(program.schedule);
  const target = decodeImage(item.before, validateReceipt), sources = item.legacy.map(value => decodeImage(value.before, validateReceipt));
  const now = decodePurpose(manifest.cutoverAt).toMillis();
  if (target && ['sent', 'unknown'].includes(target.status)) return { decision: 'existing-terminal', action: 'preserved-terminal' };
  let terminal = false;
  if (program.lastNotifiedDate !== undefined || program.lastNotifiedPolicyVersion !== undefined) {
    if (!canonicalDate(program.lastNotifiedDate) || ![undefined, 1, 2].includes(program.lastNotifiedPolicyVersion)) return { decision: 'blocked', action: 'blocked' };
    terminal = program.lastNotifiedPolicyVersion === 2 ? program.lastNotifiedDate === item.localDate : item.legacyDates.includes(program.lastNotifiedDate);
  }
  terminal ||= sources.some(data => data && (['sent', 'unknown'].includes(data.status) ||
    (data.status === 'pending' && data.phase === 'sending' && native(data.leaseUntil) && data.leaseUntil.toMillis() <= now)));
  if (terminal) {
    if (target && !supportedReceipt(target)) return { decision: 'blocked', action: 'blocked' };
    return { decision: 'terminal-suppression', action: target ? 'strengthened-suppression' : 'created-suppression' };
  }
  const present = sources.filter(Boolean);
  if (target) {
    if (!present.length && supportedReceipt(target) && target.fingerprint === item.fingerprint) return { decision: 'existing-v2', action: 'clear-noop' };
    return { decision: 'blocked', action: 'blocked' };
  }
  if (present.length > 1) return { decision: 'blocked', action: 'blocked' };
  if (present.length === 1) {
    const data = present[0];
    if (!supportedReceipt(data) || data.fingerprint !== undefined) return { decision: 'blocked', action: 'blocked' };
    if (data.status === 'pending') {
      if (data.phase === 'sending') return { decision: 'blocked', action: 'blocked' };
      if (data.expiresAt.toMillis() <= now) return data.leaseUntil.toMillis() > now ? { decision: 'blocked', action: 'blocked' } : { decision: 'terminal-failed', action: 'carried-terminal-failed' };
      return { decision: 'prepared', action: 'carried-prepared' };
    }
    if (!data.retryable || data.expiresAt.toMillis() <= now) return { decision: 'terminal-failed', action: 'carried-terminal-failed' };
    return { decision: 'retryable', action: 'carried-retryable' };
  }
  const endedAt = Date.parse(`${item.localDate}T00:00:00.000Z`) - schedule.utcOffsetMinutes * 60000 + (schedule.startMinute + 1) * 60000;
  return endedAt < now ? { decision: 'historical-uncertain', action: 'blocked' } : { decision: 'clear', action: 'clear-noop' };
}
const manifestFields = ['version', 'kind', 'projectId', 'root', 'programId', 'cutoverAt', 'fromLocalDate', 'toLocalDate', 'cursor', 'nextCursor', 'program', 'station', 'items', 'manifestHash'];
function manifestOptions(manifest) {
  const cutover = decodePurpose(manifest.cutoverAt);
  if (!native(cutover)) fail();
  return { projectId: manifest.projectId, root: manifest.root, programId: manifest.programId, fromLocalDate: manifest.fromLocalDate, toLocalDate: manifest.toLocalDate,
    cursor: manifest.cursor, cutoverAt: cutover.toDate().toISOString() };
}
const sourceHash = (manifest, item) => fingerprintValue([manifest.program, manifest.station, item.localDate, item.legacyDates, item.legacy, item.before]);
export function validateProgramDateManifest(manifest, options) {
  if (!closed(manifest, manifestFields) || manifest.version !== 1 || manifest.kind !== 'program-date-migration' || !HEX.test(manifest.manifestHash ?? '')) fail();
  const bound = manifestOptions(manifest); scope(bound);
  if (options) {
    scope(options);
    for (const field of ['projectId', 'root', 'programId', 'fromLocalDate', 'toLocalDate', 'cutoverAt']) if (options[field] !== bound[field]) fail();
    if ((options.cursor ?? options.fromLocalDate) !== bound.cursor) fail();
  }
  const program = decodeImage(manifest.program, programShape), station = decodeImage(manifest.station, stationShape);
  if (!program || !station || !Array.isArray(manifest.items) || manifest.items.length > 25) fail();
  const schedule = normalizedSchedule(program.schedule), expected = occurrenceDates(schedule, manifest.cursor, manifest.toLocalDate, manifest.items.length || 25);
  if (JSON.stringify(expected.dates) !== JSON.stringify(manifest.items.map(item => item.localDate)) || expected.nextCursor !== manifest.nextCursor) fail();
  for (const item of manifest.items) {
    if (!closed(item, ['localDate', 'v2Key', 'fingerprint', 'legacyDates', 'legacy', 'before', 'decision', 'action', 'sourceHash']) ||
      !canonicalDate(item.localDate) || item.v2Key !== hash(['program-start-v2', manifest.programId, item.localDate]) ||
      item.fingerprint !== fingerprint(manifest.programId, program, schedule) ||
      JSON.stringify(item.legacyDates) !== JSON.stringify(legacyDates(item.localDate, schedule.utcOffsetMinutes)) ||
      !Array.isArray(item.legacy) || item.legacy.length !== item.legacyDates.length) fail();
    decodeImage(item.before, validateReceipt);
    for (let i = 0; i < item.legacy.length; i++) {
      if (!closed(item.legacy[i], ['key', 'before']) || item.legacy[i].key !== hash([manifest.programId, item.legacyDates[i]])) fail();
      decodeImage(item.legacy[i].before, validateReceipt);
    }
    const expectedDecision = decision(manifest, item);
    if (item.decision !== expectedDecision.decision || item.action !== expectedDecision.action || item.sourceHash !== sourceHash(manifest, item)) fail();
  }
  const { manifestHash, ...body } = manifest;
  if (fingerprintValue(body) !== manifestHash) fail();
  return manifest;
}
export async function previewProgramNotificationDates(options, db) {
  const cap = scope(options, db);
  const programSnapshot = await db.doc(`${options.root}/programs/programs/${options.programId}`).get();
  const program = sourceProjection(programSnapshot, programFields), programData = decodeImage(program, programShape);
  if (!programData) fail();
  const stationSnapshot = await db.doc(`${options.root}/stations/stations/${programData.stationId}`).get();
  const station = sourceProjection(stationSnapshot, stationFields); if (!decodeImage(station, stationShape)) fail();
  const schedule = normalizedSchedule(programData.schedule), cursor = options.cursor ?? options.fromLocalDate;
  const chunk = occurrenceDates(schedule, cursor, options.toLocalDate, cap);
  const manifest = { version: 1, kind: 'program-date-migration', projectId: options.projectId, root: options.root, programId: options.programId,
    cutoverAt: encodeCleanupValue(Timestamp.fromMillis(Date.parse(options.cutoverAt))), fromLocalDate: options.fromLocalDate, toLocalDate: options.toLocalDate,
    cursor, nextCursor: chunk.nextCursor, program, station, items: [] };
  for (const date of chunk.dates) {
    const dates = legacyDates(date, schedule.utcOffsetMinutes), legacy = [];
    for (const day of dates) {
      const key = hash([options.programId, day]); legacy.push({ key, before: image(await db.doc(`${options.root}/notificationOperations/operations/${key}`).get()) });
    }
    const v2Key = hash(['program-start-v2', options.programId, date]);
    const item = { localDate: date, v2Key, fingerprint: fingerprint(options.programId, programData, schedule), legacyDates: dates, legacy,
      before: image(await db.doc(`${options.root}/notificationOperations/operations/${v2Key}`).get()) };
    Object.assign(item, decision(manifest, item)); item.sourceHash = sourceHash(manifest, item); manifest.items.push(item);
  }
  manifest.manifestHash = fingerprintValue(manifest);
  return validateProgramDateManifest(manifest, options);
}

const actions = ['created-suppression', 'strengthened-suppression', 'carried-prepared', 'carried-retryable', 'carried-terminal-failed', 'preserved-terminal', 'clear-noop'];
function targetBody(manifest, item) {
  if (['preserved-terminal', 'clear-noop'].includes(item.action)) return decodeImage(item.before, validateReceipt);
  const programBirth = decodePurpose(manifest.program.createTime);
  const carry = item.action.startsWith('carried-');
  const observed = item.legacy.find(value => value.before.exists);
  const proof = { version: 1, manifestHash: manifest.manifestHash, cutoverAt: decodePurpose(manifest.cutoverAt), programCreateTime: programBirth,
    scheduleFingerprint: item.fingerprint, legacyDates: [...item.legacyDates], legacyKeys: item.legacy.map(value => value.key),
    evidenceHashes: [fingerprintValue(manifest.program), ...item.legacy.map(value => fingerprintValue(value.before))],
    decision: carry ? item.action : 'suppressed', recordedAt: FieldValue.serverTimestamp() };
  if (carry) {
    const source = decodeImage(observed.before, validateReceipt);
    Object.assign(proof, { legacySourceKey: observed.key, legacySourceCreateTime: decodePurpose(observed.before.createTime), legacySourceUpdateTime: decodePurpose(observed.before.updateTime) });
    const body = { ...source, fingerprint: item.fingerprint, programCompatibility: proof };
    if (item.action === 'carried-terminal-failed' && source.expiresAt.toMillis() <= decodePurpose(manifest.cutoverAt).toMillis()) Object.assign(body, { status: 'failed', retryable: false, reason: 'expired' });
    return body;
  }
  const before = decodeImage(item.before, validateReceipt);
  return { ...(before ?? { phase: 'claimed', lease: `migration-${item.v2Key.slice(0, 32)}`, attempts: 0, fingerprint: item.fingerprint, createdAt: FieldValue.serverTimestamp() }),
    status: 'unknown', retryable: false, reason: 'legacy-compatibility-suppression', leaseUntil: Timestamp.fromMillis(0),
    updatedAt: FieldValue.serverTimestamp(), programCompatibility: proof };
}
function projectionHash(action, value) {
  if (value === null) return fingerprintValue(null);
  const body = { ...value };
  // This exact list follows the accepted action; callers cannot choose ignores.
  if (action === 'created-suppression') delete body.createdAt;
  if (['created-suppression', 'strengthened-suppression'].includes(action)) delete body.updatedAt;
  if (!['preserved-terminal', 'clear-noop'].includes(action)) {
    body.programCompatibility = { ...body.programCompatibility }; delete body.programCompatibility.recordedAt;
  }
  return fingerprintValue(body);
}
function itemReceipt(manifest, item, index) {
  const changed = !['preserved-terminal', 'clear-noop'].includes(item.action);
  return { version: 1, manifestHash: manifest.manifestHash, index, v2Key: item.v2Key, action: item.action, sourceHash: item.sourceHash,
    beforeHash: fingerprintValue(item.before), afterProjectionHash: projectionHash(item.action, targetBody(manifest, item)), targetChanged: changed,
    targetCreateTime: item.before.exists ? decodePurpose(item.before.createTime) : null, targetUpdateTime: item.before.exists ? decodePurpose(item.before.updateTime) : null };
}
function assertApplied(manifest, item, index, target, receipt) {
  const expected = itemReceipt(manifest, item, index);
  if (!receipt.exists || !native(receipt.createTime) || !sameNative(receipt.createTime, receipt.updateTime) || !same(receipt.data(), expected)) fail();
  if (!expected.targetChanged) {
    if (!same(image(target), item.before)) fail(); return;
  }
  if (!target.exists || !sameNative(target.createTime, expected.targetCreateTime ?? receipt.updateTime) || !sameNative(target.updateTime, receipt.updateTime)) fail();
  validateReceipt(target.data());
  if (projectionHash(item.action, target.data()) !== expected.afterProjectionHash) fail();
}
const nativeNotAfter = (a, b) => native(a) && native(b) && (a.seconds < b.seconds || (a.seconds === b.seconds && a.nanoseconds <= b.nanoseconds));
const jobFields = ['version', 'kind', 'manifestHash', 'projectId', 'root', 'programId', 'cutoverAt', 'fromLocalDate', 'toLocalDate', 'owner', 'generation',
  'leaseUntilMs', 'nextIndex', 'entryCount', 'status', 'backupExpiresAtMs', 'receiptVersions', 'pendingReceiptIndex'];
function validateJob(job, manifest, store) {
  if (!closed(job, jobFields) || job.version !== 1 || job.kind !== 'program-date-migration' || job.manifestHash !== manifest.manifestHash ||
    ['projectId', 'root', 'programId', 'fromLocalDate', 'toLocalDate'].some(key => job[key] !== manifest[key]) || !sameNative(job.cutoverAt, decodePurpose(manifest.cutoverAt)) ||
    !id(job.owner) || !Number.isSafeInteger(job.generation) || job.generation < 1 || !Number.isSafeInteger(job.leaseUntilMs) || job.leaseUntilMs < 0 ||
    !Number.isSafeInteger(job.nextIndex) || job.nextIndex < 0 || job.nextIndex > manifest.items.length || job.entryCount !== manifest.items.length ||
    !['applying', 'completed', 'rollback-held'].includes(job.status) || job.backupExpiresAtMs !== store.expiresAt ||
    !Array.isArray(job.receiptVersions) || job.receiptVersions.length > 25 || !job.receiptVersions.every(native)) fail();
  if (job.pendingReceiptIndex === null) {
    if (job.receiptVersions.length !== job.nextIndex || (job.status === 'completed' && job.nextIndex !== job.entryCount) ||
      (job.status === 'applying' && job.nextIndex >= job.entryCount)) fail();
  } else if (!Number.isSafeInteger(job.pendingReceiptIndex) || job.pendingReceiptIndex < 0 || job.pendingReceiptIndex >= job.entryCount ||
    job.pendingReceiptIndex !== job.nextIndex - 1 || job.receiptVersions.length !== job.pendingReceiptIndex || job.status !== 'applying') fail();
}
const transaction = (db, callback) => db.runTransaction(callback, { maxAttempts: 3 });
export async function executeProgramNotificationDateMigration(options, db, context) {
  const maxItems = scope(options, db); trustedDemo(options, db);
  if (!context || Object.keys(context).some(key => !['manifest', 'store', 'reviewedHash', 'owner'].includes(key))) fail();
  const { manifest, store, reviewedHash } = context, owner = context.owner ?? options.owner;
  if (!['apply', 'restore'].includes(options.mode) || !id(owner) || !backupStores.has(store)) fail();
  validateProgramDateManifest(manifest, options);
  if (reviewedHash !== manifest.manifestHash || manifest.items.some(item => !actions.includes(item.action))) fail();
  const verifyBackup = async () => { if (!same(await store.get(manifest.manifestHash), manifest)) fail(); };
  await verifyBackup();
  const programRef = db.doc(`${options.root}/programs/programs/${options.programId}`), stationId = decodeImage(manifest.program, programShape).stationId;
  const stationRef = db.doc(`${options.root}/stations/stations/${stationId}`), collection = `${options.root}/notificationOperations/operations`;
  const jobRef = db.doc(`${collection}/program_date_migration_${manifest.manifestHash}`);
  const targetRef = item => db.doc(`${collection}/${item.v2Key}`);
  const receiptRef = index => db.doc(`${jobRef.path}/items/${String(index).padStart(3, '0')}`);
  const verifyProgram = async tx => {
    const program = await tx.get(programRef), station = await tx.get(stationRef);
    if (!same(sourceProjection(program, programFields), manifest.program) || !same(sourceProjection(station, stationFields), manifest.station)) fail();
  };
  const verifyLegacy = async (tx, item) => {
    for (const legacy of item.legacy) if (!same(image(await tx.get(db.doc(`${collection}/${legacy.key}`))), legacy.before)) fail();
  };
  const verifyPrefix = async (tx, job, jobSnapshot) => {
    const observed = [];
    await verifyProgram(tx);
    for (let index = 0; index < manifest.items.length; index++) {
      const item = manifest.items[index]; await verifyLegacy(tx, item);
      const target = await tx.get(targetRef(item)), receipt = await tx.get(receiptRef(index));
      if (index < (job?.nextIndex ?? 0)) {
        assertApplied(manifest, item, index, target, receipt);
        if (!nativeNotAfter(jobSnapshot.createTime, receipt.createTime)) fail();
        const original = index < job.receiptVersions.length ? job.receiptVersions[index] :
          job.pendingReceiptIndex === index ? jobSnapshot.updateTime : null;
        if (!sameNative(receipt.createTime, original) || !sameNative(receipt.updateTime, original)) fail();
      } else if (receipt.exists || !same(image(target), item.before)) fail();
      observed.push({ target, receipt });
    }
    return observed;
  };
  const newJob = previous => {
    if ((previous?.generation ?? 0) >= Number.MAX_SAFE_INTEGER) fail();
    const now = Date.now(); if (!Number.isSafeInteger(now) || !Number.isSafeInteger(now + leaseDuration)) fail();
    return { version: 1, kind: 'program-date-migration', manifestHash: manifest.manifestHash, projectId: options.projectId, root: options.root, programId: options.programId,
      cutoverAt: decodePurpose(manifest.cutoverAt), fromLocalDate: manifest.fromLocalDate, toLocalDate: manifest.toLocalDate, owner,
      generation: (previous?.generation ?? 0) + 1, leaseUntilMs: now + leaseDuration, nextIndex: previous?.nextIndex ?? 0, entryCount: manifest.items.length,
      status: options.mode === 'restore' ? 'rollback-held' : previous?.status ?? (manifest.items.length ? 'applying' : 'completed'), backupExpiresAtMs: store.expiresAt,
      receiptVersions: previous?.receiptVersions ?? [], pendingReceiptIndex: null };
  };
  const sealedJob = (previous, originalVersion) => {
    const now = Date.now(), expired = previous.leaseUntilMs <= now;
    if (!Number.isSafeInteger(now) || !Number.isSafeInteger(now + leaseDuration) || previous.pendingReceiptIndex === null ||
      (!expired && previous.owner !== owner) || (expired && previous.generation >= Number.MAX_SAFE_INTEGER) || !native(originalVersion)) fail();
    return { ...previous, receiptVersions: [...previous.receiptVersions, originalVersion], pendingReceiptIndex: null,
      status: previous.nextIndex === previous.entryCount ? 'completed' : 'applying', owner,
      generation: previous.generation + (expired ? 1 : 0), leaseUntilMs: now + leaseDuration };
  };
  const acquired = await transaction(db, async tx => {
    const snapshot = await tx.get(jobRef), previous = snapshot.exists ? snapshot.data() : null;
    if (previous) validateJob(previous, manifest, store);
    if (previous && previous.owner !== owner && previous.leaseUntilMs > Date.now()) fail();
    if (options.mode === 'restore' && !previous) fail();
    if (options.mode === 'apply' && previous?.status === 'rollback-held') fail();
    await verifyPrefix(tx, previous, snapshot); await verifyBackup();
    // The untouched original job updateTime anchors an unsealed commit. Never
    // renew or transfer ownership first and then inspect a replacement receipt.
    if (previous?.pendingReceiptIndex !== null && previous?.pendingReceiptIndex !== undefined) {
      const data = sealedJob(previous, snapshot.updateTime); validateJob(data, manifest, store); tx.update(jobRef, data);
      return { data, unchanged: false, priorBirth: snapshot.createTime, priorVersion: snapshot.updateTime };
    }
    if (previous && ((options.mode === 'apply' && previous.status === 'completed') || (options.mode === 'restore' && previous.status === 'rollback-held'))) {
      return { data: previous, unchanged: true, priorBirth: snapshot.createTime, priorVersion: snapshot.updateTime };
    }
    const data = newJob(previous); validateJob(data, manifest, store); tx.set(jobRef, data);
    return { data, unchanged: false, priorBirth: snapshot.createTime, priorVersion: snapshot.updateTime };
  });
  const readback = (expected, birth, priorVersion, unchanged = false) => transaction(db, async tx => {
    const snapshot = await tx.get(jobRef);
    if (!snapshot.exists || !same(snapshot.data(), expected) || !native(snapshot.createTime) || !native(snapshot.updateTime) ||
      (birth && !sameNative(snapshot.createTime, birth)) ||
      (priorVersion && (unchanged ? !sameNative(snapshot.updateTime, priorVersion) : !nativeNotAfter(priorVersion, snapshot.updateTime) || sameNative(priorVersion, snapshot.updateTime)))) fail();
    validateJob(snapshot.data(), manifest, store); await verifyPrefix(tx, expected, snapshot); await verifyBackup(); return snapshot;
  });
  let current = acquired.data, snapshot = await readback(current, acquired.priorBirth, acquired.priorVersion, acquired.unchanged);
  let expectedVersion = snapshot.updateTime, birth = snapshot.createTime, applied = 0;
  if (options.mode === 'apply' && !acquired.unchanged) {
    const end = Math.min(manifest.items.length, current.nextIndex + maxItems);
    while (current.nextIndex < end) {
      const index = current.nextIndex, item = manifest.items[index];
      const result = await transaction(db, async tx => {
        const jobSnapshot = await tx.get(jobRef), job = jobSnapshot.exists ? jobSnapshot.data() : null;
        validateJob(job, manifest, store);
        if (!sameNative(jobSnapshot.createTime, birth) || !sameNative(jobSnapshot.updateTime, expectedVersion) || !same(job, current) || job.owner !== owner ||
          job.generation !== current.generation || job.leaseUntilMs <= Date.now() || job.status !== 'applying' || job.nextIndex !== index || job.pendingReceiptIndex !== null) fail();
        const observed = await verifyPrefix(tx, job, jobSnapshot);
        const { target, receipt } = observed[index];
        if (receipt.exists || !same(image(target), item.before)) fail();
        if (['carried-prepared', 'carried-retryable'].includes(item.action)) {
          const source = item.legacy.find(legacy => legacy.before.exists);
          if (decodeImage(source.before, validateReceipt).expiresAt.toMillis() <= Date.now()) fail();
        }
        await verifyBackup();
        if (job.leaseUntilMs <= Date.now()) fail();
        const expectedReceipt = itemReceipt(manifest, item, index), body = targetBody(manifest, item);
        const next = { ...job, nextIndex: index + 1, pendingReceiptIndex: index, status: 'applying', leaseUntilMs: Date.now() + leaseDuration };
        validateJob(next, manifest, store);
        if (expectedReceipt.targetChanged) {
          if (target.exists) tx.set(targetRef(item), body); else tx.create(targetRef(item), body);
        }
        tx.create(receiptRef(index), expectedReceipt); tx.update(jobRef, next); return next;
      });
      // With pending set, prefix readback proves original receipt create/update
      // equals this job's native updateTime, even for a genuine no-op target.
      snapshot = await readback(result, birth, expectedVersion);
      current = result; expectedVersion = snapshot.updateTime;
      const sealed = await transaction(db, async tx => {
        const jobSnapshot = await tx.get(jobRef), job = jobSnapshot.exists ? jobSnapshot.data() : null;
        validateJob(job, manifest, store);
        if (!same(job, current) || !sameNative(jobSnapshot.createTime, birth) || !sameNative(jobSnapshot.updateTime, expectedVersion) ||
          job.owner !== owner || job.generation !== current.generation) fail();
        await verifyPrefix(tx, job, jobSnapshot); await verifyBackup();
        const next = sealedJob(job, jobSnapshot.updateTime); validateJob(next, manifest, store); tx.update(jobRef, next); return next;
      });
      snapshot = await readback(sealed, birth, expectedVersion);
      current = sealed; expectedVersion = snapshot.updateTime; applied++;
    }
  }
  if (options.mode === 'restore' && current.status !== 'rollback-held') {
    const held = await transaction(db, async tx => {
      const jobSnapshot = await tx.get(jobRef), job = jobSnapshot.exists ? jobSnapshot.data() : null;
      validateJob(job, manifest, store);
      if (!same(job, current) || !sameNative(jobSnapshot.createTime, birth) || !sameNative(jobSnapshot.updateTime, expectedVersion) ||
        job.owner !== owner || job.generation !== current.generation || job.leaseUntilMs <= Date.now() || job.pendingReceiptIndex !== null) fail();
      await verifyPrefix(tx, job, jobSnapshot); await verifyBackup();
      if (job.leaseUntilMs <= Date.now()) fail();
      const next = { ...job, status: 'rollback-held' }; validateJob(next, manifest, store); tx.update(jobRef, next); return next;
    });
    snapshot = await readback(held, birth, expectedVersion); current = held; expectedVersion = snapshot.updateTime;
  }
  await transaction(db, async tx => {
    const final = await tx.get(jobRef);
    if (!final.exists || !same(final.data(), current) || !sameNative(final.createTime, birth) || !sameNative(final.updateTime, expectedVersion)) fail();
    validateJob(final.data(), manifest, store);
    if (current.pendingReceiptIndex !== null || (!acquired.unchanged && (current.owner !== owner || current.leaseUntilMs <= Date.now()))) fail();
    await verifyPrefix(tx, current, final); await verifyBackup();
  });
  const chunkCompleted = options.mode === 'restore' || current.nextIndex === manifest.items.length;
  return { mode: options.mode, status: current.status, applied, total: manifest.items.length, nextIndex: current.nextIndex, chunkCompleted,
    completed: options.mode === 'apply' && chunkCompleted && manifest.nextCursor === null, nextCursor: manifest.nextCursor };
}

async function readPrivateKey(path, directory) {
  if (typeof path !== 'string') fail();
  const actual = await realpath(path), stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size !== 32 || (stat.mode & 0o077) !== 0 ||
    (process.getuid && stat.uid !== process.getuid()) || actual.split('/').includes('.boss')) fail();
  const repositoryRoot = await realpath(fileURLToPath(new URL('../', import.meta.url))), backupRoot = await realpath(directory);
  for (const forbidden of [repositoryRoot, backupRoot]) {
    const inside = relative(forbidden, actual);
    if (!inside || (inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside))) fail();
  }
  let parent = dirname(actual), outside = false;
  for (let depth = 0; depth < 64; depth++) {
    try { await lstat(join(parent, '.git')); fail(); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    const next = dirname(parent); if (next === parent) { outside = true; break; } parent = next;
  }
  if (!outside) fail();
  const handle = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino || opened.size !== 32 || opened.nlink !== 1 ||
      (opened.mode & 0o077) !== 0 || (process.getuid && opened.uid !== process.getuid())) fail();
    const key = await handle.readFile(); if (key.length !== 32) { key.fill(0); fail(); } return key;
  } finally { await handle.close(); }
}
async function main() {
  const options = parseProgramDateMigrationArgs(process.argv.slice(2));
  // Production mutations fail before key/backup access or any SDK initialization.
  if (options.mode !== 'preview') demoHost(options.projectId, process.env.FIRESTORE_EMULATOR_HOST);
  if (!options.directory || !options.keyFile || !Number.isSafeInteger(options.expiresAt) || (options.mode !== 'preview' && !id(options.owner))) fail();
  const key = await readPrivateKey(options.keyFile, options.directory); let store;
  try { store = await ProgramDateBackupStore.open({ directory: options.directory, key, expiresAt: options.expiresAt }); }
  finally { key.fill(0); }
  let db;
  try {
    if (options.mode === 'preview') {
      const { initializeApp } = require('firebase-admin/app');
      db = require('firebase-admin/firestore').getFirestore(initializeApp({ projectId: options.projectId }));
      const manifest = await previewProgramNotificationDates(options, db); await store.put(manifest);
      console.log(JSON.stringify({ mode: 'preview', manifestHash: manifest.manifestHash, total: manifest.items.length,
        blockers: manifest.items.filter(item => item.action === 'blocked').length, nextCursor: manifest.nextCursor, rangeExhausted: manifest.nextCursor === null }));
    } else {
      db = createProgramDateDemoFirestore({ projectId: options.projectId });
      const manifest = await store.get(options.manifestHash);
      console.log(JSON.stringify(await executeProgramNotificationDateMigration(options, db, { manifest, store, reviewedHash: options.manifestHash, owner: options.owner })));
    }
  } finally { await db?.terminate?.(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('Program date migration stopped: explicit scope, reviewed proof, private backup or source preconditions failed.'); process.exitCode = 1;
});
