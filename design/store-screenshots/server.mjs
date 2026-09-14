// Dependency-free, loopback-only preview and explicit PNG export service.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.SCREENSHOT_STUDIO_PORT || 4186);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
const names = ['01-hero', '02-main-feature', '03-easy-experience', '04-second-feature', '05-control-benefits', '06-final', 'overview'];
const allowed = new Set(['apple', 'google'].flatMap(type => names.map(name => `${type}-${name}.png`)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
await mkdir(path.join(root, 'exports'), { recursive: true });
createServer(async (req, res) => {
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) { res.writeHead(403).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'POST' && pathname.startsWith('/export/')) {
      const origin = req.headers.origin;
      if (![ `http://127.0.0.1:${port}`, `http://localhost:${port}` ].includes(origin) || req.headers['content-type'] !== 'image/png') { res.writeHead(403).end(); return; }
      const name = pathname.slice('/export/'.length);
      if (!allowed.has(name)) { res.writeHead(400).end(); return; }
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 24 * 1024 * 1024) { res.writeHead(413).end(); return; } chunks.push(chunk); }
      const png = Buffer.concat(chunks);
      if (!png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) { res.writeHead(400).end(); return; }
      await writeFile(path.join(root, 'exports', name), png);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ saved: name })); return;
    }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root + path.sep) || pathname.split('/').some(part => part.startsWith('.'))) { res.writeHead(403).end(); return; }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Screenshot studio: http://127.0.0.1:${port}`));
