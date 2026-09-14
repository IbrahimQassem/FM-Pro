import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const output = new URL('./exports/', import.meta.url);
const slides = ['01-hero', '02-main-feature', '03-easy-experience', '04-second-feature', '05-control-benefits', '06-final'];
const files = [];
for (const [platform, width, height] of [['apple',1320,2868], ['google',1080,1920]]) {
  for (const slide of [...slides, 'overview']) {
    const name = `${platform}-${slide}.png`, png = await readFile(new URL(name, output));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', name);
    const dimensions = [png.readUInt32BE(16), png.readUInt32BE(20)];
    assert.deepEqual(dimensions, slide === 'overview' ? [1800, Math.round(280 * height / width) + 100] : [width, height], name);
    assert.equal(png[25], 2, `${name}: opaque RGB expected`);
    assert.ok(png.length > 10000, `${name}: unexpectedly small`);
    files.push({ name, width: dimensions[0], height: dimensions[1], bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') });
  }
}
await writeFile(new URL('manifest.json', output), JSON.stringify({
  verifiedAt: new Date().toISOString(), result: 'PASS',
  artworkCount: 12, overviewCount: 2, encoding: 'PNG / opaque RGB',
  sampleImages: 'Local Flutter widget-review fixtures; replace with current high-resolution release captures before store submission.',
  files
}, null, 2) + '\n');
console.log('PASS: 12 exact-size opaque PNG artworks + 2 overview boards. SHA-256 manifest saved.');
