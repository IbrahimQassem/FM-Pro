// Read-only guard, invoked only by a separately authorized Hosting publication.
import { readFile, access } from 'node:fs/promises';
const base = new URL('../../functions/public-web/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('build.json', base), 'utf8'));
if (manifest.root !== 'HudHudOfficial') throw new Error('Rebuild public web explicitly with VITE_FIRESTORE_ROOT=HudHudOfficial before publication.');
await access(new URL('renderer.mjs', base));
const template = await readFile(new URL('index.html', base), 'utf8');
for (const [, path] of template.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)) await access(new URL(`../dist${path}`, import.meta.url));
try { await access(new URL('../dist/index.html', import.meta.url)); } catch { process.exit(0); }
throw new Error('Static index.html would bypass public rendering; rebuild the public web.');
