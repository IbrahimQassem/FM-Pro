import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatUserDate } from '../lib/user-date.ts';

void test('formatUserDate returns fallback when date is missing, null, or invalid', () => {
  assert.equal(formatUserDate(null), '');
  assert.equal(formatUserDate(undefined), '');
  assert.equal(formatUserDate(null, 'غير متوفر'), 'غير متوفر');
  assert.equal(formatUserDate(undefined, 'غير متوفر'), 'غير متوفر');
  assert.equal(formatUserDate('', 'غير متوفر'), 'غير متوفر');
  assert.equal(formatUserDate('invalid-date-string', 'غير متوفر'), 'غير متوفر');
  assert.equal(formatUserDate({}, 'غير متوفر'), 'غير متوفر');
  assert.equal(formatUserDate({ foo: 'bar' }, 'غير متوفر'), 'غير متوفر');
});

void test('formatUserDate formats Firestore Timestamp-like objects', () => {
  const tsObj = {
    toDate: () => new Date('2026-09-18T10:00:00Z'),
  };
  const result = formatUserDate(tsObj, 'غير متوفر');
  assert.notEqual(result, 'غير متوفر');
  assert.match(result, /(2026|٢٠٢٦)/);
});

void test('formatUserDate formats seconds-based objects', () => {
  const secondsObj = {
    seconds: Math.floor(new Date('2026-09-18T10:00:00Z').getTime() / 1000),
  };
  const result = formatUserDate(secondsObj, 'غير متوفر');
  assert.notEqual(result, 'غير متوفر');
  assert.match(result, /(2026|٢٠٢٦)/);
});

void test('formatUserDate formats ISO strings and millisecond numbers', () => {
  const isoResult = formatUserDate('2026-09-18T10:00:00Z', 'غير متوفر');
  assert.notEqual(isoResult, 'غير متوفر');
  assert.match(isoResult, /(2026|٢٠٢٦)/);

  const millisResult = formatUserDate(1789732800000, 'غير متوفر');
  assert.notEqual(millisResult, 'غير متوفر');
  assert.match(millisResult, /(2026|٢٠٢٦)/);
});

void test('user role filtering correctly categorizes roles and handles missing roles gracefully', () => {
  const users = [
    { id: 'u1', data: { role: 'admin', displayName: 'Admin User' } },
    { id: 'u2', data: { role: 'editor', displayName: 'Editor User' } },
    { id: 'u3', data: { role: 'listener', displayName: 'Listener User' } },
    { id: 'u4', data: { displayName: 'User with no role specified' } },
    { id: 'u5', data: { role: undefined, displayName: 'User with undefined role' } },
  ];

  // Count distribution
  let adminCount = 0;
  let editorCount = 0;
  let listenerCount = 0;
  for (const u of users) {
    const role = typeof u.data.role === 'string' ? u.data.role : 'listener';
    if (role === 'admin') adminCount++;
    else if (role === 'editor') editorCount++;
    else listenerCount++;
  }

  assert.equal(adminCount, 1);
  assert.equal(editorCount, 1);
  assert.equal(listenerCount, 3); // u3, u4, u5 all count as listener

  // Filter by admin
  const admins = users.filter((u) => u.data.role === 'admin');
  assert.equal(admins.length, 1);
  assert.equal(admins[0]?.id, 'u1');

  // Filter by editor
  const editors = users.filter((u) => u.data.role === 'editor');
  assert.equal(editors.length, 1);
  assert.equal(editors[0]?.id, 'u2');

  // Filter by listener (including missing / undefined)
  const listeners = users.filter(
    (u) =>
      !u.data.role ||
      u.data.role === 'listener' ||
      (u.data.role !== 'admin' && u.data.role !== 'editor'),
  );
  assert.equal(listeners.length, 3);
  assert.deepEqual(
    listeners.map((u) => u.id),
    ['u3', 'u4', 'u5'],
  );
});

void test('role and isSuperAdmin resolution correctly distinguishes super_admin from station_admin', () => {
  function resolveAdminRole(claims: Record<string, unknown>) {
    const r = typeof claims.role === 'string' ? claims.role : '';
    const adminClaim = claims.admin === true;
    const isSuper =
      r === 'super_admin' ||
      (adminClaim && r !== 'station_admin' && r !== 'moderator');
    const role =
      r === 'super_admin' || isSuper
        ? 'super_admin'
        : r === 'station_admin'
          ? 'station_admin'
          : r === 'moderator'
            ? 'moderator'
            : 'admin';
    return { isSuperAdmin: isSuper, role };
  }

  // Super admin with general admin: true
  assert.deepEqual(resolveAdminRole({ admin: true }), {
    isSuperAdmin: true,
    role: 'super_admin',
  });

  // Explicit super_admin
  assert.deepEqual(resolveAdminRole({ admin: true, role: 'super_admin' }), {
    isSuperAdmin: true,
    role: 'super_admin',
  });

  // Station admin (e.g. naderlahmzi@gmail.com)
  assert.deepEqual(
    resolveAdminRole({ admin: true, role: 'station_admin', allStations: true }),
    {
      isSuperAdmin: false,
      role: 'station_admin',
    },
  );

  // Moderator
  assert.deepEqual(resolveAdminRole({ admin: true, role: 'moderator' }), {
    isSuperAdmin: false,
    role: 'moderator',
  });
});

void test('notifications manager gating restricts composition and deletion for non-super admins', () => {
  function canComposeOrDeleteNotifications(isSuperAdmin: boolean) {
    return isSuperAdmin;
  }
  assert.equal(canComposeOrDeleteNotifications(true), true);
  assert.equal(canComposeOrDeleteNotifications(false), false);
});

void test('banners and advertising gating restricts editing/creating to super_admin', () => {
  function checkPermissions(key: string, isSuperAdmin: boolean) {
    const canCreate =
      isSuperAdmin || (key !== 'stations' && key !== 'banners');
    const canEdit = isSuperAdmin || key !== 'banners';
    const canDelete =
      isSuperAdmin || (key !== 'stations' && key !== 'banners');
    return { canCreate, canEdit, canDelete };
  }

  // Super admin can create, edit, delete banners
  assert.deepEqual(checkPermissions('banners', true), {
    canCreate: true,
    canEdit: true,
    canDelete: true,
  });

  // Non-super admin can only read banners (cannot create, edit, or delete)
  assert.deepEqual(checkPermissions('banners', false), {
    canCreate: false,
    canEdit: false,
    canDelete: false,
  });

  // Non-super admin can create and edit programs/episodes
  assert.deepEqual(checkPermissions('programs', false), {
    canCreate: true,
    canEdit: true,
    canDelete: true,
  });

  // Non-super admin cannot create/delete stations, but can edit assigned station
  assert.deepEqual(checkPermissions('stations', false), {
    canCreate: false,
    canEdit: true,
    canDelete: false,
  });
});

void test('user session avatar sanitization and fallback resolution', () => {
  function resolveSessionAvatar(
    userProfile: { avatarUrl?: string; stationLogoUrl?: string },
    authPhotoUrl?: string | null,
  ) {
    const raw =
      userProfile.avatarUrl || authPhotoUrl || userProfile.stationLogoUrl || '';
    const clean =
      typeof raw === 'string' &&
      (raw.trim().startsWith('http://') ||
        raw.trim().startsWith('https://') ||
        raw.trim().startsWith('/') ||
        raw.trim().startsWith('data:image/'))
        ? raw.trim()
        : '';
    return clean;
  }

  // Uses profile avatar if available
  assert.equal(
    resolveSessionAvatar(
      { avatarUrl: 'https://example.com/avatar.jpg' },
      'https://auth.com/pic.jpg',
    ),
    'https://example.com/avatar.jpg',
  );

  // Falls back to auth photoUrl if profile has none
  assert.equal(
    resolveSessionAvatar({}, 'https://auth.com/pic.jpg'),
    'https://auth.com/pic.jpg',
  );

  // Falls back to station logo if station admin without avatar
  assert.equal(
    resolveSessionAvatar({ stationLogoUrl: 'https://cdn.station.com/logo.png' }),
    'https://cdn.station.com/logo.png',
  );

  // Rejects invalid javascript: or malformed URLs
  assert.equal(
    resolveSessionAvatar({ avatarUrl: 'javascript:alert(1)' }),
    '',
  );
});

