// Preview the exact packaged renderer and assets without Firebase emulators/writes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { render } from '../../functions/public-web/renderer.mjs';
const template = await readFile(new URL('../../functions/public-web/index.html', import.meta.url), 'utf8');
const assets = resolve('dist');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const file = resolve(assets, '.' + decodeURIComponent(url.pathname));
    if (file.startsWith(assets + '/') && url.pathname !== '/index.html') {
      try { const body = await readFile(file); response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); response.end(body); return; } catch { /* dynamic route */ }
    }
    if (url.pathname === '/index.html') { response.writeHead(301, { Location: '/' + url.search }); response.end(); return; }
    const result = await render(request.url, template);
    response.writeHead(result.status, result.headers); response.end(request.method === 'HEAD' ? '' : result.body);
  } catch { response.writeHead(503); response.end('Preview unavailable'); }
}).listen(4175, '127.0.0.1', () => process.stdout.write('Public SSR preview: http://127.0.0.1:4175\n'));
