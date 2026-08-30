import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const firebaseKeys = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
} as const;

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', 'FIREBASE_');
  const firebaseConfig = Object.fromEntries(
    Object.entries(firebaseKeys).map(([key, environmentKey]) => [
      key,
      environment[environmentKey]?.trim() ?? '',
    ]),
  );
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Firebase configuration is incomplete: ${missing.join(', ')}`,
    );
  }

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    define: {
      __FIREBASE_CONFIG__: JSON.stringify(firebaseConfig),
    },
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
    },
  };
});
