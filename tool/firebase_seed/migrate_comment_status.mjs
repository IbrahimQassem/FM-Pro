import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareCommentCountMutation } from '../../functions/lib/comment-counts.js';

async function main() {
const { applicationDefault, initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');

const expectedProjectId = 'sanadev-fm';
const args = process.argv.slice(2);
const projectId = valueAfter('--project');
const shouldApply = args.includes('--apply');

if (projectId !== expectedProjectId) {
  throw new Error(`Refusing project ${projectId || '(missing)'}.`);
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const firestore = getFirestore(app);
const result = await migrateCanonicalCommentStatuses({ firestore, shouldApply, projectId });
if (result?.skipped) process.exit(0);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? (args[index + 1] ?? '') : '';
}
}

export async function migrateCanonicalCommentStatuses({ firestore, shouldApply = false, projectId = 'sanadev-fm', log = console.log }) {
  const canonical = document => {
    const parts = document.ref.path.split('/');
    return parts.length === 6 && parts[0] === 'HudHudDev' && parts[1] === 'episodes' && parts[2] === 'episodes' && parts[4] === 'comments';
  };
  const validStatus = value => value === undefined || ['published', 'hidden', 'removed'].includes(value);
  const pages = async function* () {
    let cursor = null;
    while (true) {
      let query = firestore.collectionGroup('comments').where('__name__', '>=', firestore.doc('HudHudDev/!'))
        .where('__name__', '<', firestore.doc('HudHudDev0/!')).orderBy('__name__').limit(25);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      if (!page.docs.length) return;
      yield page.docs.filter(canonical);
      if (page.docs.length < 25) return;
      cursor = page.docs.at(-1).ref;
    }
  };
  // Exhaust the complete bounded validation pass before ANY apply transaction.
  // No unbounded snapshot/pending list; a late pre-existing invalid value aborts all apply.
  let total = 0, pending = 0, invalid = 0;
  for await (const page of pages()) for (const document of page) {
    total++; if (!validStatus(document.get('status'))) invalid++;
    if (document.get('status') === undefined) pending++;
  }
  if (invalid) throw new Error(`Refusing migration: ${invalid} comments have invalid status values.`);
  log(`Comment status migration plan: project=${projectId}, canonical=${total}, pending=${pending}, apply=${shouldApply}.`);
  if (!shouldApply || !pending) {
    if (!shouldApply) log('Dry run only. Re-run with --apply to migrate.');
    return { skipped: true };
  }
  let migrated = 0;
  for await (const page of pages()) {
    // Revalidate each newly read page; concurrent invalid edits stop further work.
    if (page.some(document => !validStatus(document.get('status')))) throw new Error('Refusing migration: current comment status is invalid.');
    for (const document of page) {
      if (document.get('status') !== undefined) continue;
      const [, , , episodeId, , commentId] = document.ref.path.split('/');
      migrated += await firestore.runTransaction(async tx => {
        const result = await prepareCommentCountMutation(tx, firestore, { root: 'HudHudDev', episodeId, commentId,
          action: 'update', changes: current => {
            if (!validStatus(current.status)) throw new Error('Refusing migration: current comment status is invalid.');
            return current.status === undefined ? { status: 'published' } : null;
          } });
        for (const write of result.writes) write();
        return result.current && result.current.status === undefined && result.after?.status === 'published' ? 1 : 0;
      });
    }
  }
  log(`Migrated ${migrated} comments to status=published.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
