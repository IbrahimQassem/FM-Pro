import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const expectedProjectId = 'sanadev-fm';
const args = process.argv.slice(2);
const projectId = valueAfter('--project');
const shouldApply = args.includes('--apply');

if (projectId !== expectedProjectId) {
  throw new Error(`Refusing project ${projectId || '(missing)'}.`);
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const firestore = getFirestore(app);
const snapshot = await firestore.collectionGroup('comments').get();
const canonical = snapshot.docs.filter((document) => {
  const parts = document.ref.path.split('/');
  return (
    parts.length === 6 &&
    parts[0] === 'HudHudDev' &&
    parts[1] === 'episodes' &&
    parts[2] === 'episodes' &&
    parts[4] === 'comments'
  );
});
const invalid = canonical.filter((document) => {
  const status = document.get('status');
  return status !== undefined &&
    !['published', 'hidden', 'removed'].includes(status);
});
if (invalid.length > 0) {
  throw new Error(
    `Refusing migration: ${invalid.length} comments have invalid status values.`,
  );
}
const pending = canonical.filter(
  (document) => document.get('status') === undefined,
);

console.log(
  `Comment status migration plan: project=${projectId}, ` +
    `canonical=${canonical.length}, pending=${pending.length}, apply=${shouldApply}.`,
);
if (!shouldApply || pending.length === 0) {
  if (!shouldApply) console.log('Dry run only. Re-run with --apply to migrate.');
  process.exit(0);
}

for (let index = 0; index < pending.length; index += 400) {
  const batch = firestore.batch();
  for (const document of pending.slice(index, index + 400)) {
    batch.update(document.ref, { status: 'published' });
  }
  await batch.commit();
}
console.log(`Migrated ${pending.length} comments to status=published.`);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? (args[index + 1] ?? '') : '';
}
