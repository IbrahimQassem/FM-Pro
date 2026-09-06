import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

type FirestoreRoot = 'HudHudDev' | 'HudHudOfficial';

function resolveRoot(value: string | undefined, isDevelopment: boolean): FirestoreRoot {
  const root = value?.trim() || (isDevelopment ? 'HudHudDev' : '');
  if (root !== 'HudHudDev' && root !== 'HudHudOfficial') {
    throw new Error('Set VITE_FIRESTORE_ROOT explicitly to HudHudDev or HudHudOfficial.');
  }
  return root;
}

const firebaseKeys = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
} as const;

export default defineConfig(({ command, mode }) => {
  // The public site shares the existing admin_web environment file locally.
  // Values are still injected at build time and only the normal Firebase Web
  // configuration reaches the browser; no admin credentials are read.
  const envDir = fileURLToPath(new URL('../admin_web', import.meta.url));
  const env = loadEnv(mode, envDir, '');
  const root = resolveRoot(
    process.env.VITE_FIRESTORE_ROOT || env.VITE_FIRESTORE_ROOT,
    command === 'serve' && mode === 'development',
  );
  const firebaseConfig = Object.fromEntries(
    Object.entries(firebaseKeys).map(([key, envKey]) => [
      key,
      (process.env[envKey] || env[envKey] || '').trim(),
    ]),
  );
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Firebase configuration is incomplete: ${missing.join(', ')}`);
  }

  return {
    envDir,
    plugins: [react()],
    define: {
      __FIRESTORE_ROOT__: JSON.stringify(root),
      __FIREBASE_CONFIG__: JSON.stringify(firebaseConfig),
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
    },
  };
});
