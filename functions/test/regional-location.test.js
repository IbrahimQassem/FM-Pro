import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAdminContent } from '../lib/admin-content.js';
const regional = {
  cityCode: 'global-ar',
  cityNameAr: 'عربي',
  countryCode: 'ARAB',
  countryNameAr: 'العالم العربي',
  locationType: 'regional',
  sortOrder: 230,
  isActive: true,
};
test('the pan-Arab catalog has one explicit non-country regional scope', () => {
  assert.equal(
    validateAdminContent('locations', regional).locationType,
    'regional',
  );
  for (const patch of [
    { cityCode: 'aden' },
    { countryCode: 'YE' },
    { locationType: 'governorate' },
    { countryCode: 'EG' },
  ]) {
    assert.throws(
      () => validateAdminContent('locations', { ...regional, ...patch }),
      {
        code: 'invalid-argument',
      },
    );
  }
});
