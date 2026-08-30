import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const expectedProjectId = 'sanadev-fm';
const args = process.argv.slice(2);
const projectId = valueAfter('--project');
const email = valueAfter('--email').trim().toLowerCase();
const shouldApply = args.includes('--apply');

if (projectId !== expectedProjectId) {
  throw new Error(`Refusing project ${projectId || '(missing)'}.`);
}
if (!email || !email.includes('@')) {
  throw new Error('A valid --email is required.');
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  const code = typeof error?.code === 'string' ? error.code : 'unknown';
  console.error(`Admin account lookup failed (${code}).`);
  process.exit(1);
}
const alreadyAdmin = user.customClaims?.admin === true;

console.log(
  `Admin claim plan: project=${projectId}, accountFound=true, ` +
    `alreadyAdmin=${alreadyAdmin}, apply=${shouldApply}.`,
);

if (!shouldApply || alreadyAdmin) {
  if (!shouldApply) console.log('Dry run only. Re-run with --apply to grant.');
  process.exit(0);
}

try {
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims ?? {}),
    admin: true,
  });
} catch (error) {
  const code = typeof error?.code === 'string' ? error.code : 'unknown';
  console.error(`Admin claim update failed (${code}).`);
  process.exit(1);
}
console.log('Admin claim granted. Existing sessions must refresh their ID token.');

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? (args[index + 1] ?? '') : '';
}
