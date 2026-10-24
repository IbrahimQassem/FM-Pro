import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import { normalizeAdminImage, uploadAdminImage } from '../lib/admin-images.js';
test('editorial images are decoded, bounded and re-encoded without metadata while retaining alpha', async () => {
  const original = await sharp({
    create: { width: 1800, height: 900, channels: 4, background: '#44556680' },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const output = await normalizeAdminImage(original.toString('base64'));
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 800);
  assert.equal(meta.hasAlpha, true);
  assert.equal(meta.exif, undefined);
  for (const value of [
    '',
    '%%%=',
    Buffer.from('<svg/>').toString('base64'),
    'A'.repeat(3_000_000),
  ])
    await assert.rejects(normalizeAdminImage(value), {
      code: 'invalid-argument',
    });
});
test('authentication, admin claim, role and target validation happen before file storage', async () => {
  let used = 0;
  const firestore = {
    runTransaction() {
      used++;
    },
  };
  const args = {
    firestore,
    bucket: () => {
      used++;
    },
    callerUid: 'synthetic-admin',
    callerRole: 'super_admin',
    callerClaims: { admin: true, role: 'super_admin' },
    data: {
      root: 'HudHudDev',
      kind: 'banners',
      field: 'imageUrl',
      operationId: '12345678-1234-4123-8123-123456789012',
      imageBase64: '',
    },
  };
  for (const change of [
    { callerUid: null },
    { callerClaims: {} },
    {
      callerRole: 'moderator',
      callerClaims: { admin: true, role: 'moderator' },
    },
    { data: { ...args.data, root: 'other' } },
    { data: { ...args.data, field: 'targetUrl' } },
  ])
    await assert.rejects(uploadAdminImage({ ...args, ...change }));
  assert.equal(used, 0);
});

test('large noisy images fit hard byte budgets and smaller field dimensions without originals', async () => {
  const input = await sharp(randomBytes(700 * 700 * 3), {
    raw: { width: 700, height: 700, channels: 3 },
  })
    .png()
    .toBuffer();
  for (const [field, edge, budget] of [
    ['logoUrl', 720, 64],
    ['thumbnailUrl', 480, 48],
    ['coverUrl', 1280, 160],
  ]) {
    const output = await normalizeAdminImage(input.toString('base64'), {
      field,
    });
    const meta = await sharp(output).metadata();
    assert.ok(meta.width <= edge && meta.height <= edge);
    assert.ok(output.length <= budget * 1024);
    assert.ok(output.length < input.length / 2);
  }
});

test('PNG animation controls are rejected instead of silently flattening an animated input', async () => {
  const { crc32 } = await import('node:zlib');
  const png = await sharp({
    create: { width: 8, height: 8, channels: 4, background: '#44556680' },
  })
    .png()
    .toBuffer();
  const data = Buffer.alloc(8);
  data.writeUInt32BE(2, 0);
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(8, 0);
  chunk.write('acTL', 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 16)), 16);
  const animated = Buffer.concat([
    png.subarray(0, 33),
    chunk,
    png.subarray(33),
  ]);
  await assert.rejects(normalizeAdminImage(animated.toString('base64')), {
    code: 'invalid-argument',
  });
});

test('notification uploads use bounded JPEG for cross-platform FCM compatibility', async () => {
  const input = await sharp({
    create: { width: 1800, height: 900, channels: 4, background: '#44556680' },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const output = await normalizeAdminImage(input.toString('base64'), {
    kind: 'notifications',
    field: 'imageUrl',
  });
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.ok(output.length <= 160 * 1024);
  assert.equal(meta.exif, undefined);
});
