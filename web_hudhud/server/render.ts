import { canonicalOrigin, cityHref, escapeHtml as esc, metadataHtml, pageModel, safeJson, stationCanonical, cityCanonical, type Catalog } from '../lib/seo.ts';
import { stationHref } from '../lib/discovery.ts';

export function renderPage(template: string, url: URL, catalog: Catalog, state: 'ready' | 'error', development: boolean) {
  const page = pageModel(url, catalog, state);
  const content = `<main class="content-section" id="top"><a href="/">هدهد إف إم — دليل المحطات</a><h1>${esc(page.title)}</h1><p>${esc(page.description)}</p>${page.status === 200 ? `<nav aria-label="المدن">${catalog.cities.map(city => `<a href="/${esc(cityHref(city.code))}">${esc(city.name)}</a>`).join(' · ')}</nav><section id="stations" aria-label="المحطات">${page.stations.map(station => `<article><h2><a href="/${esc(stationHref(station.id))}">${esc(station.name)}</a></h2><p>${esc([station.cityNameAr, station.countryNameAr, station.frequency].filter(Boolean).join(' · '))}</p><p>${esc(station.description || station.tagline)}</p><a href="/${esc(stationHref(station.id))}">افتح المحطة للاستماع</a></article>`).join('') || '<p>لا توجد محطات نشطة حالياً.</p>'}</section><p>يمكنك تصفح المحطات دون حساب. يتطلب تشغيل الصوت متصفحاً يدعم JavaScript.</p>` : '<p><a href="/">العودة إلى المحطات</a></p>'}</main>`;
  // Only mapped public fields reach the browser; no raw documents or account data.
  const bootstrap = `<script type="application/json" id="public-catalog">${safeJson({ ...catalog, status: page.status })}</script>`;
  const html = template.replace('<!--public-head-->', metadataHtml(page, development)).replace('<div id="root"></div>', `<div id="root">${content}</div>${bootstrap}`);
  return { status: page.status, html };
}
export function sitemap(catalog: Catalog) {
  const urls = [`${canonicalOrigin}/`, ...catalog.stations.map(s => stationCanonical(s.id)), ...catalog.cities.map(c => cityCanonical(c.code))];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url => `<url><loc>${esc(url)}</loc></url>`).join('')}</urlset>`;
}
export function robots(development: boolean) {
  // Search access is explicit. No new GPTBot/Google-Extended training preference.
  return `User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\n${development ? '' : `Sitemap: ${canonicalOrigin}/sitemap.xml\n`}`;
}
export async function publicResponse(path: string, template: string, readCatalog: () => Promise<Catalog>, development: boolean) {
  const url = new URL(path, canonicalOrigin);
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8' };
  if (development) headers['X-Robots-Tag'] = 'noindex, nofollow';
  if (url.pathname === '/robots.txt') return { status: 200, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }, body: robots(development) };
  const empty: Catalog = { stations: [], cities: [] };
  if (url.pathname !== '/' && url.pathname !== '/sitemap.xml') {
    const page = renderPage(template, url, empty, 'ready', development);
    return { status: 404, headers: { ...headers, 'X-Robots-Tag': 'noindex' }, body: page.html };
  }
  try {
    const catalog = await readCatalog();
    if (catalog.citiesUnavailable && (url.pathname === '/sitemap.xml' || url.searchParams.has('city'))) throw new Error('City catalog unavailable.');
    if (url.pathname === '/sitemap.xml') return { status: 200, headers: { ...headers, 'Content-Type': 'application/xml; charset=utf-8' }, body: sitemap(catalog) };
    const page = renderPage(template, url, catalog, 'ready', development);
    return { status: page.status, headers: { ...headers, ...(pageModel(url, catalog).noindex ? { 'X-Robots-Tag': 'noindex, follow' } : {}) }, body: page.html };
  } catch {
    const page = renderPage(template, url, empty, 'error', development);
    return { status: 503, headers: { ...headers, 'Retry-After': '60', 'X-Robots-Tag': 'noindex' }, body: page.html };
  }
}
