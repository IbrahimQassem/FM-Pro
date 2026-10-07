import { readFile } from 'node:fs/promises';

// Loaded lazily so unrelated callable/emulator workflows do not need a web build.
export async function servePublicWeb(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.set('Allow', 'GET, HEAD').status(405).end();
    return;
  }
  try {
    const [{ render, firestoreRoot }, template] = await Promise.all([
      import('../public-web/renderer.mjs'),
      readFile(new URL('../public-web/index.html', import.meta.url), 'utf8'),
    ]);
    if (process.env.FUNCTIONS_EMULATOR !== 'true' && firestoreRoot !== 'HudHudOfficial') throw new Error('Production public renderer requires official root.');
    const result = await render(request.originalUrl || request.url, template);
    response.set(result.headers).status(result.status).send(request.method === 'HEAD' ? '' : result.body);
  } catch {
    response.set({ 'Cache-Control': 'no-store', 'Retry-After': '60', 'X-Robots-Tag': 'noindex' }).status(503).send('تعذر تحميل المحطات الآن. حاول مرة أخرى لاحقاً.');
  }
}
