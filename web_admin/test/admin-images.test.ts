import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateImageFile,
  encodeImageFile,
  isAdminImageField,
  imageUploadError,
} from '../lib/admin-images.ts';
void test('only image-bearing fields use upload controls; file and MIME limits are explicit', async () => {
  assert.equal(isAdminImageField('stations', 'logoUrl'), true);
  assert.equal(isAdminImageField('episodes', 'coverUrl'), true);
  assert.equal(isAdminImageField('stations', 'websiteUrl'), false);
  assert.equal(isAdminImageField('episodes', 'audioUrl'), false);
  for (const file of [
    new File([], 'empty.png', { type: 'image/png' }),
    new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }),
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    }),
  ])
    assert.ok(validateImageFile(file));
  const png = new File([new Uint8Array([1, 2, 3])], 'example.png', {
    type: 'image/png',
  });
  assert.equal(validateImageFile(png), '');
  assert.equal(await encodeImageFile(png), 'AQID');
});
void test('upload error mapping never exposes provider URLs, tokens or raw messages', () => {
  for (const code of [
    'functions/permission-denied',
    'functions/resource-exhausted',
    'functions/failed-precondition',
    'functions/invalid-argument',
    'functions/aborted',
    'functions/unavailable',
  ]) {
    const message = imageUploadError({
      code,
      message: 'synthetic-private-provider-detail',
    });
    assert.ok(message);
    assert.equal(message.includes('synthetic-private'), false);
  }
});
