import test from 'node:test';
import assert from 'node:assert/strict';
import { mascotAvatars, defaultAvatar, avatarSource, sanitizeAvatar, profilePayload, deletionMethod, accountErrorMessage, maxProfileImageBytes } from '../lib/account-profile.ts';

test('portable app avatars resolve on the web without saving web-specific paths', () => {
  for (const {value} of mascotAvatars) {
    assert.equal(sanitizeAvatar(value), value);
    assert.equal(avatarSource(value), `/${value}`);
    assert.equal(profilePayload({displayName:'مستمع', avatarUrl:value}).avatarUrl,value);
  }
  for (const value of ['javascript:alert(1)', 'data:image/png;base64,YQ==', 'blob:local', '/assets/images/mascot/mascot_onboarding.webp', 'assets/private.webp', 'https://user:secret@example.invalid/x', 'http://example.invalid/a', null]) {
    assert.equal(sanitizeAvatar(value),''); assert.equal(avatarSource(value),`/${defaultAvatar}`);
  }
  assert.equal(sanitizeAvatar('https://example.invalid/photo.jpg'),'https://example.invalid/photo.jpg');
});
test('profile payload preserves existing photo on name-only save and validates image sources', () => {
  assert.deepEqual(profilePayload({displayName:'  مستمع  '}),{displayName:'مستمع'});
  assert.deepEqual(profilePayload({displayName:'مستمع',avatarUrl:''}),{displayName:'مستمع',avatarUrl:''});
  for (const displayName of [' ', ' أ ', 'x'.repeat(121)]) assert.throws(()=>profilePayload({displayName}));
  for (const imageBase64 of ['', 'invalid!', 'data:image/png;base64,YQ==', Buffer.alloc(maxProfileImageBytes+1).toString('base64')]) assert.throws(()=>profilePayload({displayName:'مستمع',imageBase64}));
  assert.throws(()=>profilePayload({displayName:'مستمع',avatarUrl:defaultAvatar,imageBase64:'YQ=='}));
  assert.throws(()=>profilePayload({displayName:'مستمع',avatarUrl:'file:///private/photo.jpg'}));
  const imageBase64=Buffer.alloc(maxProfileImageBytes).toString('base64');
  assert.equal(profilePayload({displayName:'مستمع',imageBase64}).imageBase64,imageBase64);
});
test('deletion selects an actually linked provider and never invents a password for Google users',()=>{
  assert.equal(deletionMethod(['google.com']),'google');
  assert.equal(deletionMethod(['google.com','password']),'password');
  assert.equal(deletionMethod(['facebook.com']),'app');
  assert.equal(deletionMethod([]),'app');
});
test('provider errors distinguish cancel, blocked and conflicts without exposing provider details',()=>{
  const errors=['auth/popup-closed-by-user','auth/popup-blocked','auth/account-exists-with-different-credential','auth/unauthorized-domain'];
  const messages=errors.map(code=>accountErrorMessage({code,message:'private provider details'}));
  assert.equal(new Set(messages).size,4);
  for(const message of messages) assert.ok(!message.includes('private') && !message.includes('auth/'));
  assert.ok(!accountErrorMessage(new Error('private provider details')).includes('private'));
});
