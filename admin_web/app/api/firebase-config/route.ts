const keys = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
} as const;

export async function GET() {
  const config = Object.fromEntries(
    Object.entries(keys).map(([key, environmentKey]) => [
      key,
      process.env[environmentKey]?.trim() ?? '',
    ]),
  );
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    return Response.json(
      { error: 'Firebase configuration is incomplete.', missing },
      { status: 503 },
    );
  }
  return Response.json(config, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  });
}
