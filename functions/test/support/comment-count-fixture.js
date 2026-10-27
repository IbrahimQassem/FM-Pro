import { isDeepStrictEqual } from 'node:util';
import assert from 'node:assert/strict';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
export { FieldValue, Timestamp };
const clone = value => value instanceof Timestamp || value?.constructor?.name?.endsWith('Transform') ? value :
  value instanceof Date ? new Date(value) : Array.isArray(value) ? value.map(clone) :
    value && typeof value === 'object' && !value.firestore ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const get = (value, key) => key.split('.').reduce((item, field) => item?.[field], value);
const transform = (value, current, stamp) => {
  if (value?.constructor?.name === 'ServerTimestampTransform') return new Timestamp(stamp.seconds, Math.floor(stamp.nanoseconds / 1000000) * 1000000);
  if (value?.constructor?.name === 'NumericIncrementTransform') return (Number(current) || 0) + value.operand;
  if (Array.isArray(value)) return value.map(item => transform(item, undefined, stamp));
  if (value && typeof value === 'object' && !(value instanceof Timestamp) && !(value instanceof Date) && !value.firestore)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transform(item, current?.[key], stamp)]));
  return clone(value);
};
function patch(current, changes, stamp) {
  const next = clone(current ?? {});
  for (const [key, value] of Object.entries(changes)) {
    const fields = key.split('.'), last = fields.pop(); let owner = next;
    for (const field of fields) { owner[field] ??= {}; owner = owner[field]; }
    if (value?.constructor?.name === 'DeleteTransform') delete owner[last];
    else owner[last] = transform(value, owner[last], stamp);
  }
  return next;
}
class MemorySnapshot {
  constructor(db, path) { this.ref = db.doc(path); this.id = this.ref.id; this.record = clone(db.records.get(path)); this.exists = !!this.record; }
  data() { return clone(this.record?.data); }
  get(field) { return get(this.record?.data, field); }
  get createTime() { return this.record?.createTime; }
  get updateTime() { return this.record?.updateTime; }
}
/** Unit-only storage/metadata model. No count/fence arithmetic is implemented here. */
export class MemoryFirestore {
  constructor(projectId = 'demo-hudhud-count-unit', { fineMetadata = false } = {}) {
    this.fineMetadata = fineMetadata;
    this.projectId = projectId; this.records = new Map(); this.writes = []; this.reads = []; this.serial = 0;
    this.queue = Promise.resolve(); this.failNextCommit = false;
  }
  settings(options) { this.projectId = options.projectId; this.settingsValue = { ...options }; }
  terminate() {}
  stamp() { const serial = this.serial++; return this.fineMetadata ? new Timestamp(1800000000 + Math.floor((123 + serial) / 1000000), ((123 + serial) % 1000000) * 1000) : Timestamp.fromMillis(1800000000000 + serial); }
  seed(path, data) {
    const time = this.stamp(), previous = this.records.get(path);
    const next = transform(data, previous?.data, time);
    if (!previous || !isDeepStrictEqual(previous.data, next)) this.records.set(path, { data: next, createTime: previous?.createTime ?? time, updateTime: time });
    return this.snapshot(path);
  }
  snapshot(path) { return new MemorySnapshot(this, path); }
  doc(path) {
    const db = this;
    return { firestore: db, path, id: path.split('/').at(-1),
      get parent() { return db.collection(path.split('/').slice(0, -1).join('/')); },
      collection: name => db.collection(`${path}/${name}`), get: async () => db.snapshot(path),
      set: (data, options) => db.runTransaction(tx => tx.set(db.doc(path), data, options)),
      update: data => db.runTransaction(tx => tx.update(db.doc(path), data)),
      delete: () => db.runTransaction(tx => tx.delete(db.doc(path))) };
  }
  collection(path) { return this.query({ path }); }
  collectionGroup(group) { return this.query({ group }); }
  query({ path, group, filters = [], order = [], cursor = null, size = Infinity }) {
    const db = this, next = changes => db.query({ path, group, filters, order, cursor, size, ...changes });
    return { _query: true, path, doc: id => db.doc(`${path}/${id}`),
      where: (field, op, value) => next({ filters: [...filters, [typeof field === 'string' ? field : '__name__', op, value]] }),
      orderBy: (field, direction = 'asc') => next({ order: [...order, [typeof field === 'string' ? field : '__name__', direction]] }),
      startAfter: value => next({ cursor: value?.path ?? value?.ref?.path ?? value }), limit: value => next({ size: value }),
      get: async () => {
        db.reads.push({ path, group, size, cursor });
        const docs = [...db.records.keys()].filter(key => group ? key.split('/').at(-2) === group : key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1)
          .filter(key => filters.every(([field, op, value]) => {
            const actual = field === '__name__' ? key : get(db.records.get(key).data, field), expected = value?.path ?? value;
            return op === '==' ? actual === expected : op === '>=' ? actual >= expected : op === '<=' ? actual <= expected : op === '<' ? actual < expected : op === '>' ? actual > expected : false;
          })).sort((a, b) => {
            for (const [field, direction] of order) { const av = field === '__name__' ? a : get(db.records.get(a).data, field), bv = field === '__name__' ? b : get(db.records.get(b).data, field); if (av !== bv) return (av < bv ? -1 : 1) * (direction === 'desc' ? -1 : 1); }
            return a < b ? -1 : a > b ? 1 : 0;
          }).filter(key => cursor === null || key > (String(cursor).includes('/') ? cursor : `${path}/${cursor}`)).slice(0, size).map(key => db.snapshot(key));
        return { docs, size: docs.length, empty: docs.length === 0 };
      } };
  }
  async getAll(...refs) { return refs.map(ref => this.snapshot(ref.path)); }
  runTransaction(callback) {
    const operation = this.queue.then(async () => {
      const staged = [];
      const tx = { get: async ref => { assert.equal(staged.length, 0, 'All reads precede writes'); return ref._query ? ref.get() : this.snapshot(ref.path); },
        set: (ref, data, options) => staged.push({ path: ref.path, data, kind: 'set', options }),
        create: (ref, data) => staged.push({ path: ref.path, data, kind: 'create' }),
        update: (ref, data) => staged.push({ path: ref.path, data, kind: 'update' }), delete: ref => staged.push({ path: ref.path, kind: 'delete' }) };
      const result = await callback(tx);
      if (this.failNextCommit) { this.failNextCommit = false; throw new Error('Synthetic commit failure'); }
      const stamp = this.stamp();
      for (const write of staged) {
        const old = this.records.get(write.path);
        if (write.kind === 'create') assert.equal(!!old, false, 'Create precondition');
        if (write.kind === 'update') assert.equal(!!old, true, 'No resurrection');
        if (write.kind === 'delete') this.records.delete(write.path);
        else {
          const data = write.kind === 'update' || write.options?.merge ? patch(old?.data, write.data, stamp) : transform(write.data, old?.data, stamp);
          if (!old || !isDeepStrictEqual(old.data, data)) this.records.set(write.path, { createTime: old?.createTime ?? stamp, updateTime: stamp, data });
        }
        this.writes.push(write);
      }
      if (staged.length) await this.afterCommit?.(staged);
      return result;
    }); this.queue = operation.catch(() => {}); return operation;
  }
}
