import test from 'node:test';
import assert from 'node:assert/strict';
import { stationFromSnapshot, isWorkingStream, nextStreamHealthChange, resolveStreamHealthState } from '../lib/stations.ts';
import { publicCities, pageModel } from '../lib/seo.ts';
import { filterDiscoveryStations } from '../lib/discovery.ts';
const now = Date.parse('2026-10-24T12:00:00Z');
const station = (id, patch = {}) => stationFromSnapshot({ id, data: () => ({ name: `Station ${id}`, countryCode: 'YE', cityCode: 'aden', cityNameAr: 'عدن', isActive: true, streamUrl: 'https://radio.example/live', healthStatus: 'online', consecutiveFailures: 0, lastCheckedAt: now, ...patch }) });
test('working-stream classification is freshness-bound and conservative about failures and source availability', () => {
  assert.equal(isWorkingStream(station('edge', { lastCheckedAt: now - 45 * 60000 }), now), true);
  for (const patch of [{ lastCheckedAt: now - 45 * 60000 - 1 }, { lastCheckedAt: null }, { lastCheckedAt: 'invalid' }, { consecutiveFailures: 1 }, { consecutiveFailures: -1 }, { healthStatus: 'offline' }, { healthStatus: 'degraded', streamHealthSource: 'backup' }, { streamUrl: '' }]) assert.equal(isWorkingStream(station('excluded', patch), now), false);
});
test('default discovery retains archives; health combines with city, search, favorites and recency', () => {
  const items = [station('match'), station('other'), station('city', { cityCode: 'sanaa' }), station('archive', { streamUrl: '', lastCheckedAt: null })];
  const base = { search: '', city: 'all', library: 'all', favorites: ['match', 'archive'], history: [{ stationId: 'other' }, { stationId: 'match' }], now };
  assert.equal(filterDiscoveryStations(items, base).length, 4);
  assert.deepEqual(filterDiscoveryStations(items, { ...base, workingOnly: true, city: 'aden', library: 'favorites', search: 'match' }).map(item => item.id), ['match']);
  assert.deepEqual(filterDiscoveryStations(items, { ...base, workingOnly: true, library: 'recent' }).map(item => item.id), ['other', 'match']);
  assert.deepEqual(filterDiscoveryStations(items, { ...base, workingOnly: true, search: 'archive' }), []);
});
test('refresh deadlines include exact expiry and future-clock entry', () => {
  assert.equal(nextStreamHealthChange(station('edge', { lastCheckedAt: now - 45 * 60000 }), now), now + 1);
  assert.equal(nextStreamHealthChange(station('future', { lastCheckedAt: now + 50 * 60000 }), now), now + 5 * 60000);
  assert.equal(nextStreamHealthChange(station('unknown', { lastCheckedAt: null }), now), null);
});

test('malformed stored failure counters do not become a healthy zero', () => {
  for (const value of ['bad', '', true, 0.5, NaN, Infinity]) {
    const item = station('malformed', { consecutiveFailures: value });
    assert.equal(isWorkingStream(item, now), false); assert.equal(resolveStreamHealthState(item, now), 'unverified');
  }
});

test('out-of-range stored dates stay unknown and do not schedule impossible deadlines', () => {
  const item = station('bad-date', { lastCheckedAt: 1e99 });
  assert.equal(resolveStreamHealthState(item, now), 'unverified');
  assert.equal(nextStreamHealthChange(item, now), null);
});

test('regional stations remain discoverable by their stable city code after migration', () => {
  const item = station('regional', { countryCode: 'ARAB', cityCode: 'global-ar', locationType: 'regional' });
  const base = { search: '', city: 'global-ar', library: 'all', favorites: [], history: [], now };
  assert.deepEqual(filterDiscoveryStations([item], base).map(s => s.id), ['regional']);
});

test('the regional catalog appears in city links without a fabricated country address', () => {
  const item = station('regional', { countryCode: 'ARAB', cityCode: 'global-ar', countryNameAr: 'العالم العربي', cityNameAr: 'عربي' });
  const cities = publicCities([{ data: () => ({ countryCode: 'ARAB', cityCode: 'global-ar', cityNameAr: 'عربي', isActive: true }) }], [item]);
  assert.deepEqual(cities, [{ code: 'global-ar', name: 'عربي' }]);
  const catalog = { cities, stations: [item] };
  assert.equal(pageModel(new URL('https://www.hudhudfm.com/?city=global-ar'), catalog).stations.length, 1);
  assert.equal('address' in pageModel(new URL('https://www.hudhudfm.com/?station=regional'), catalog).schema, false);
});
