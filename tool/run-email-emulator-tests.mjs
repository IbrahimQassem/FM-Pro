import { spawn } from 'node:child_process';
import { closeSync, fstatSync, lstatSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = fileURLToPath(new URL('../', import.meta.url));
const overridePath = join(projectDirectory, 'functions', '.secret.local');
const fakeConfig = {
  resendApiKey: 'test-key',
  from: 'HudHud Test <test@example.test>',
  otpPepper: 'test-pepper-with-at-least-thirty-two-characters',
  apiUrl: 'http://127.0.0.1:8787/emails',
};
let createdFile;
let descriptor;
let child;
let requestedSignal;

function forwardSignal(signal) {
  requestedSignal = signal;
  child?.kill(signal);
}
const onInterrupt = () => forwardSignal('SIGINT');
const onTerminate = () => forwardSignal('SIGTERM');
process.on('SIGINT', onInterrupt);
process.on('SIGTERM', onTerminate);

try {
  // Exclusive creation refuses any existing local secret file, including symlinks.
  // Neither its contents nor any real credentials are read by this runner.
  descriptor = openSync(overridePath, 'wx', 0o600);
  createdFile = fstatSync(descriptor);
  writeFileSync(descriptor, `EMAIL_VERIFICATION_CONFIG=${JSON.stringify(fakeConfig)}\n`);
  closeSync(descriptor);
  descriptor = undefined;

  const result = await new Promise((resolve, reject) => {
    child = spawn(process.execPath, [
      join(projectDirectory, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'),
      'emulators:exec',
      '--only', 'auth,firestore,functions',
      '--project', 'demo-hudhud-fm-email-verification',
      'node --test firebase_tests/firebase-emulators/email-verification.test.js',
    ], {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: {
        ...process.env,
        PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
        EMAIL_VERIFICATION_CONFIG: JSON.stringify(fakeConfig),
      },
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
    if (requestedSignal) child.kill(requestedSignal);
  });
  process.exitCode = result.code ?? (result.signal === 'SIGINT' ? 130 : 1);
} catch (error) {
  console.error(error?.code === 'EEXIST'
    ? 'Email emulator tests stopped: functions/.secret.local already exists. Move it aside before running; this runner will not read or overwrite it.'
    : 'Email emulator tests could not complete. Check local dependencies and emulator availability.');
  process.exitCode = 1;
} finally {
  if (descriptor !== undefined) closeSync(descriptor);
  if (createdFile) {
    try {
      const current = lstatSync(overridePath);
      if (current.dev === createdFile.dev && current.ino === createdFile.ino) unlinkSync(overridePath);
      else {
        console.error('The emulator override was replaced during execution; the replacement was left untouched.');
        process.exitCode = 1;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.error('The temporary emulator override could not be removed. Remove functions/.secret.local before committing.');
        process.exitCode = 1;
      }
    }
  }
  process.removeListener('SIGINT', onInterrupt);
  process.removeListener('SIGTERM', onTerminate);
}
