import { readFile, writeFile, rename } from 'node:fs/promises';
const template = new URL('../dist/index.html', import.meta.url);
const html = await readFile(template, 'utf8');
if (!html.includes('<!--public-head-->') || !html.includes('<div id="root"></div>')) throw new Error('Public rendering markers missing.');
await rename(template, new URL('../../functions/public-web/index.html', import.meta.url));
await writeFile(new URL('../../functions/public-web/build.json', import.meta.url), JSON.stringify({ root: process.env.VITE_FIRESTORE_ROOT }));
