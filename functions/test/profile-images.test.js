import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { normalizeProfileImage, maxProfileImageBytes } from '../lib/profile-images.js';

test('re-encodes bounded images to JPEG without EXIF metadata', async () => {
  const input = await sharp({create:{width:1000,height:800,channels:3,background:'#8e3e63'}}).jpeg().withExif({IFD0:{Artist:'Private fixture'}}).toBuffer();
  const output = await normalizeProfileImage(input.toString('base64'));
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format,'jpeg');
  assert.equal(metadata.width,720);
  assert.equal(metadata.height,576);
  assert.equal(metadata.exif,undefined);
});
test('rejects malformed, excessive, non-image and unsupported image data', async () => {
  for (const input of ['', 'bad!', Buffer.from('not an image').toString('base64'), Buffer.alloc(maxProfileImageBytes+1).toString('base64'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>').toString('base64')]) {
    await assert.rejects(normalizeProfileImage(input), error => error.code === 'invalid-argument');
  }
});
