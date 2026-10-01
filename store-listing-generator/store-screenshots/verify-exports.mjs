import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const output = new URL('./exports/', import.meta.url);
const slides = ['01-hero', '02-main-feature', '03-easy-experience', '04-second-feature', '05-control-benefits', '06-final'];
const files = [];
for (const locale of ['ar', 'en']) {
  for (const appearance of ['dark', 'light']) {
    for (const [platform, width, height] of [['apple', 1320, 2868], ['google', 1080, 1920]]) {
      const variant = locale === 'ar' && appearance === 'dark' ? '' : `-${locale}-${appearance}`;
      for (const slide of [...slides, 'overview']) {
        const name = `${platform}${variant}-${slide}.png`, png = await readFile(new URL(name, output));
        assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), name);
        const dimensions = [png.readUInt32BE(16), png.readUInt32BE(20)];
        assert.deepEqual(dimensions, slide === 'overview' ? [1800, Math.round(280 * height / width) + 100] : [width, height], name);
        assert.equal(png[25], 2, `${name}: opaque RGB expected`);
        assert.ok(png.length > 10000, `${name}: unexpectedly small`);
        files.push({ name, locale, appearance, platform, width: dimensions[0], height: dimensions[1], bytes: png.length, sha256: createHash('sha256').update(png).digest('hex') });
      }
    }
  }
}
assert.equal(new Set(files.map(file => file.sha256)).size, 56, 'Every variant must produce distinct artwork');
await writeFile(new URL('manifest.json', output), JSON.stringify({
  verifiedAt: new Date().toISOString(), result: 'PASS',
  artworkCount: 48, overviewCount: 8, encoding: 'PNG / opaque RGB',
  variants: 'Arabic + English × dark + light × Apple App Store + Google Play',
  sampleImages: 'Real Flutter UI with development fixtures, rendered at 3× for each locale/theme/platform. Replace fixture content with release captures before store submission.',
  deviceFrames: 'iPhone 17 Pro + Galaxy S26 Ultra; licensed standard-resolution Mobile FIRST assets (800px high), scaled in artwork.',
  files
}, null, 2) + '\n');
console.log('PASS: 48 exact-size opaque PNG artworks + 8 overview boards, all distinct. SHA-256 manifest saved.');
