import { spawn } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  symlink,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'hudhud-admin-emulators-'));
let child;
const interrupt = () => child?.kill('SIGINT');
const terminate = () => child?.kill('SIGTERM');
process.on('SIGINT', interrupt);
process.on('SIGTERM', terminate);
try {
  const source = join(temporary, 'functions');
  await mkdir(source);
  const pkg = JSON.parse(
    await readFile(join(root, 'functions/package.json'), 'utf8'),
  );
  await writeFile(
    join(source, 'package.json'),
    JSON.stringify({ ...pkg, main: 'index.js', scripts: {} }),
  );
  // Export the actual production callable, without registering unrelated event
  // handlers or loading any developer .env/.secret.local into the emulator.
  await writeFile(
    join(source, 'index.js'),
    `export { adminSaveContent, adminDeleteContent, adminReviewReport, adminUploadImage } from ${JSON.stringify(join(root, 'functions/index.js'))};\n`,
  );
  await symlink(
    join(root, 'functions/node_modules'),
    join(source, 'node_modules'),
    'dir',
  );
  await writeFile(
    join(temporary, 'firebase.json'),
    JSON.stringify({
      functions: { source: 'functions' },
      firestore: { rules: join(root, 'firestore.rules') },
      storage: { rules: join(root, 'storage.rules') },
      emulators: {
        auth: { port: 9099 },
        firestore: { port: 8180 },
        functions: { port: 5001 },
        storage: { port: 9199 },
        ui: { enabled: false },
        singleProjectMode: true,
      },
    }),
  );
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const result = await new Promise((resolve, reject) => {
    child = spawn(
      process.execPath,
      [
        join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
        'emulators:exec',
        '--config',
        join(temporary, 'firebase.json'),
        '--only',
        'auth,firestore,functions,storage',
        '--project',
        'demo-hudhud-admin-test',
        `node --experimental-strip-types --test ${quote(join(root, 'web_admin/test'))}/*.emulator.test.ts`,
      ],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          GEMINI_API_KEY: '',
          PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
        },
      },
    );
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  process.exitCode = result.code ?? (result.signal === 'SIGINT' ? 130 : 1);
} finally {
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', terminate);
  await rm(temporary, { recursive: true, force: true });
}
