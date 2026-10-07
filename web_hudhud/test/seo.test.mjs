import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pageModel, publicCities, stationCanonical, cityCanonical, metadataHtml } from '../lib/seo.ts';
import { stationFromSnapshot } from '../lib/stations.ts';
import { publicResponse, renderPage, sitemap, robots } from '../server/render.ts';
import { catalogReader } from '../server/catalog.ts';
const station = stationFromSnapshot({ id: 'test & station', data: () => ({ name: 'محطة اختبار', description: 'وصف عام للاختبار', isActive: true, countryCode: 'YE', countryNameAr: 'اليمن', cityCode: 'aden', cityNameAr: 'عدن' }) });
const catalog = { stations: [station], cities: [{ code: 'aden', name: 'عدن' }] };
const template = '<html lang="ar" dir="rtl"><head><!--public-head--></head><body><div id="root"></div></body></html>';
const url = path => new URL(path, 'https://unpreferred.example');
test('stable canonical and complete metadata for home, station and city; episodes excluded', () => {
  const home = pageModel(url('/?utm_source=test'), catalog);
  assert.equal(home.canonical, 'https://www.hudhudfm.com/');
  const path = '/?station=test+%26+station';
  const stationPage = pageModel(url(path), catalog);
  assert.equal(stationPage.canonical, stationCanonical(station.id));
  assert.equal(pageModel(url(path), { stations: [], cities: [] }, 'loading').canonical, stationPage.canonical);
  assert.equal(stationPage.schema.name, station.name);
  assert.equal(stationPage.schema.description, station.description);
  assert.equal(pageModel(url('/?city=aden'), catalog).canonical, cityCanonical('aden'));
  for (const extra of ['&episode=e', '&program=p', '#account']) assert.equal(pageModel(url(path + extra), catalog).noindex, true);
  const html = metadataHtml(stationPage);
  for (const tag of ['og:url', 'og:image', 'og:title', 'og:description', 'twitter:card', 'application/ld+json']) assert.ok(html.includes(tag));
  assert.ok(metadataHtml(stationPage, true).includes('noindex,follow'));
});
test('initial Arabic HTML contains public facts and links; markup and JSON are escaped', () => {
  const evil = { ...station, name: '</script><script>alert(1)</script>', description: '"<&' };
  const page = renderPage(template, url('/?station=test+%26+station'), { ...catalog, stations: [evil] }, 'ready', false);
  assert.equal(page.status, 200);
  assert.ok(page.html.includes('&lt;/script&gt;'));
  assert.ok(!page.html.includes('<script>alert(1)'));
  assert.ok(page.html.includes('dir="rtl"'));
  assert.ok(page.html.includes('test+%26+station'));
  assert.ok(page.html.includes('عدن'));
  assert.ok(!page.html.includes('<!--public-head-->'));
});
test('HTTP status, content type, cache policy and removal lifecycle use fresh source', async () => {
  let calls = 0;
  let current = catalog;
  const reader = async () => { calls++; return current; };
  const live = await publicResponse('/?station=test+%26+station', template, reader, false);
  assert.equal(live.status, 200);
  current = { stations: [], cities: [] };
  const removed = await publicResponse('/?station=test+%26+station', template, reader, false);
  assert.equal(removed.status, 404);
  assert.match(removed.headers['X-Robots-Tag'], /noindex/);
  assert.equal(removed.headers['Cache-Control'], 'no-store');
  assert.ok(!removed.body.includes('rel="canonical"'));
  assert.equal(calls, 2);
  for (const path of ['/missing', '/?station=', '/?station=..', '/?city=missing', '/?station=x&station=y', '/?station=x&city=aden']) assert.equal((await publicResponse(path, template, reader, false)).status, 404);
  const failure = await publicResponse('/', template, async () => { throw Error('unavailable'); }, false);
  assert.equal(failure.status, 503);
  assert.equal(failure.headers['Retry-After'], '60');
  const xml = await publicResponse('/sitemap.xml', template, async () => catalog, false);
  assert.match(xml.headers['Content-Type'], /application\/xml/);
  assert.ok(xml.body.startsWith('<?xml'));
  assert.ok(sitemap(current).includes('<urlset'));
  assert.ok(!sitemap(current).includes('station='));
  const robot = await publicResponse('/robots.txt', template, reader, false);
  assert.match(robot.headers['Content-Type'], /text\/plain/);
  assert.match(robots(false), /User-agent: OAI-SearchBot\nAllow: \//);
  assert.ok(!robots(false).includes('GPTBot'));
  assert.ok(!robots(false).includes('Google-Extended'));
});
test('cities require active Yemen reference and matching catalog', () => {
  const d = patch => ({ data: () => ({ isActive: true, countryCode: 'YE', cityCode: 'aden', cityNameAr: 'عدن', ...patch }) });
  assert.deepEqual(publicCities([d({}), d({})], [station]), catalog.cities);
  for (const patch of [{ isActive: false }, { countryCode: 'XX' }, { cityCode: 'missing' }, { cityNameAr: '' }]) assert.deepEqual(publicCities([d(patch)], [station]), []);
});
test('anonymous REST reader paginates, filters inactive/deleting docs and never caches failures', async () => {
  const doc = (id, fields) => ({ name: `projects/demo/databases/(default)/documents/HudHudDev/stations/stations/${id}`, fields });
  const active = { name: { stringValue: 'اختبار' }, isActive: { booleanValue: true }, countryCode: { stringValue: 'YE' }, cityCode: { stringValue: 'aden' }, cityNameAr: { stringValue: 'عدن' } };
  const paths = [];
  const reader = catalogReader('demo-project', 'HudHudDev', async (path, options) => {
    paths.push(path.href);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.method, undefined);
    if (path.pathname.includes('/locations/')) return Response.json({ documents: [doc('location', active)] });
    if (path.searchParams.has('pageToken')) return Response.json({ documents: [doc('hidden', { ...active, isActive: { booleanValue: false } }), doc('deleting', { ...active, adminDeletionToken: { stringValue: 'pending' } })] });
    return Response.json({ documents: [doc('active', active)], nextPageToken: 'page2' });
  });
  assert.deepEqual((await reader()).stations.map(s => s.id), ['active']);
  assert.equal(paths.length, 3);
  assert.deepEqual((await reader()).cities, catalog.cities);
  assert.equal(paths.length, 6);
  await assert.rejects(catalogReader('demo-project', 'HudHudDev', async () => new Response('', { status: 403 }))());
  assert.throws(() => catalogReader('demo-project', 'legacy'));
});
test('public Hosting uses dynamic function while admin remains unchanged', async () => {
  const config = JSON.parse(await readFile(new URL('../../firebase.json', import.meta.url)));
  assert.equal(config.hosting.find(h => h.target === 'hudhud_public').rewrites[0].function.functionId, 'hudhudPublic');
  assert.equal(config.hosting.find(h => h.target === 'hudhud_admin').rewrites[0].destination, '/index.html');
});
test('catalog reading has a hard page bound and a real timeout; no partial success', async () => {
  let pages = 0;
  const reader = catalogReader('demo-project', 'HudHudDev', async path => {
    if (path.pathname.includes('/locations/')) return Response.json({});
    return Response.json({ nextPageToken: String(++pages) });
  });
  await assert.rejects(reader());
  assert.equal(pages, 20);
  const slow = catalogReader('demo-project', 'HudHudDev', (_path, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))));
  // Keep the event loop alive while AbortSignal's unref'ed deadline fires.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const response = await publicResponse('/', template, slow, false);
    assert.equal(response.status, 503);
    assert.match(response.headers['X-Robots-Tag'], /noindex/);
    assert.ok(!response.body.includes(station.name));
  } finally { clearInterval(keepAlive); }
});
test('location failure preserves stations but never publishes an incomplete city sitemap', async () => {
  const partial = { ...catalog, cities: [], citiesUnavailable: true };
  assert.equal((await publicResponse('/', template, async () => partial, false)).status, 200);
  assert.equal((await publicResponse('/?station=test+%26+station', template, async () => partial, false)).status, 200);
  for (const path of ['/?city=aden', '/sitemap.xml']) assert.equal((await publicResponse(path, template, async () => partial, false)).status, 503);
});
