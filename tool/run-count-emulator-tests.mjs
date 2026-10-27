// Purpose-specific isolated demo harness; never copies developer env or secrets.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const suites = {
  admin: { projectId: 'demo-hudhud-admin-test', pattern: 'web_admin/test/*.emulator.test.ts',
    callables: ['adminGetUserCount', 'adminSaveContent', 'adminDeleteContent', 'adminReviewReport', 'adminUploadImage'] },
  editorial: { projectId: 'demo-hudhud-editorial', pattern: 'firebase_tests/firebase-emulators/editorial-*.test.js', callables: [] },
  'account-deletion': { projectId: 'demo-hudhud-fm-account-deletion', pattern: 'firebase_tests/firebase-emulators/account-deletion.test.js', callables: ['deleteAccountData', 'adminReviewReport'] },
};
export async function runCountEmulatorSuite(suite) {
  assert.match(process.versions.node, /^22\./, 'Use the validated Node22 runtime');
  assert.ok(Object.hasOwn(suites, suite), 'Choose an explicit supported demo suite');
  const configuration = suites[suite];
  const temporary = await mkdtemp(join(tmpdir(), 'hudhud-count-emulators-'));
  let child;
  const interrupt = () => child?.kill('SIGINT');
  const terminate = () => child?.kill('SIGTERM');
  process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
  try {
    const source = join(temporary, 'functions'); await mkdir(source);
    const pkg = JSON.parse(await readFile(join(root, 'functions/package.json'), 'utf8'));
    await writeFile(join(source, 'package.json'), JSON.stringify({ ...pkg, main: 'index.js', scripts: {} }));
    // The staged registration baseline contains real moderation and existing
    // callables. The new write handler is added only after its business RED.
    const exports = [...configuration.callables, 'moderateEpisodeComment', 'countEpisodeComments'];
    await writeFile(join(source, 'index.js'),
      `export { ${exports.join(', ')} } from ${JSON.stringify(join(root, 'functions/index.js'))};\n`);
    await symlink(join(root, 'functions/node_modules'), join(source, 'node_modules'), 'dir');
    await writeFile(join(temporary, 'firebase.json'), JSON.stringify({
      functions: { source: 'functions' }, firestore: { rules: join(root, 'firestore.rules') },
      storage: { rules: join(root, 'storage.rules') },
      emulators: { auth: { port: 9099 }, firestore: { port: 8180 }, functions: { port: 5001 },
        storage: { port: 9199 }, ui: { enabled: false }, singleProjectMode: true },
    }));
    const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
    const pattern = configuration.pattern.split('/'); const glob = pattern.pop();
    const discovery = `${quote(join(root, ...pattern))}/${glob}`;
    const command = `${quote(process.execPath)} ${quote(join(root, 'firebase_tests/support/comment-count-fixtures.mjs'))} && ` +
      `${quote(process.execPath)} --experimental-strip-types --test --test-concurrency=1 ${discovery}`;
    const env = { ...process.env, GCLOUD_PROJECT: configuration.projectId, GOOGLE_CLOUD_PROJECT: configuration.projectId,
      GEMINI_API_KEY: '', TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '',
      PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}` };
    // Do not forward explicit credential/config/secret overrides to the child.
    for (const name of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG', 'EMAIL_VERIFICATION_CONFIG',
      'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'STORAGE_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) delete env[name];
    env.FIREBASE_CONFIG = JSON.stringify({ projectId: configuration.projectId, storageBucket: `${configuration.projectId}.appspot.com` });
    const result = await new Promise((resolve, reject) => {
      child = spawn(process.execPath, [join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec',
        '--config', join(temporary, 'firebase.json'), '--only', 'auth,firestore,functions,storage',
        '--project', configuration.projectId, command], { cwd: root, stdio: 'inherit', env });
      child.once('error', reject); child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    return result.code ?? (result.signal === 'SIGINT' ? 130 : 1);
  } finally {
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', terminate);
    await rm(temporary, { recursive: true, force: true });
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert.equal(process.argv.length, 4, 'Expected --suite and one supported suite');
  assert.equal(process.argv[2], '--suite');
  process.exitCode = await runCountEmulatorSuite(process.argv[3]);
}
