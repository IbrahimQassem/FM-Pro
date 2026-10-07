import type { Station } from './stations.ts';
import { stationHref, validId } from './discovery.ts';

export const canonicalOrigin = 'https://www.hudhudfm.com';
export const homeTitle = 'هدهد إف إم — إذاعات اليمن كلها .. في مكان واحد';
export const homeDescription = 'اكتشف المحطات النشطة في هدهد إف إم، وتصفح معلوماتها واستمع إلى البث المباشر.';
export type City = { code: string; name: string };
export type Catalog = { stations: Station[]; cities: City[]; citiesUnavailable?: boolean };
export const cityHref = (code: string) => `?${new URLSearchParams({ city: code })}#stations`;
export const stationCanonical = (id: string) => `${canonicalOrigin}/${stationHref(id).split('#')[0]}`;
export const cityCanonical = (code: string) => `${canonicalOrigin}/${cityHref(code).split('#')[0]}`;
export function publicCities(docs: { data(): Record<string, unknown> }[], stations: Station[]): City[] {
  const cities = new Map<string, City>();
  for (const doc of docs) {
    const d = doc.data();
    if (d.isActive === true && d.countryCode === 'YE' && validId(d.cityCode) && typeof d.cityNameAr === 'string' && d.cityNameAr.trim() && stations.some(s => s.countryCode === 'YE' && s.cityCode === d.cityCode)) {
      cities.set(d.cityCode, { code: d.cityCode, name: d.cityNameAr.trim() });
    }
  }
  return [...cities.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}
export function pageModel(url: URL, catalog: Catalog, state: 'ready' | 'loading' | 'error' = 'ready') {
  const params = url.searchParams;
  const stationId = params.get('station');
  const cityCode = params.get('city');
  const station = catalog.stations.find(s => s.id === stationId);
  const city = catalog.cities.find(c => c.code === cityCode);
  const invalid = url.pathname !== '/' || params.getAll('station').length > 1 || params.getAll('city').length > 1 ||
    (params.has('station') && !validId(stationId)) || (params.has('city') && !validId(cityCode)) ||
    (params.has('station') && params.has('city'));
  const missing = invalid || (state === 'ready' && ((params.has('station') && !station) || (params.has('city') && !city)));
  const status = missing ? 404 : state === 'error' ? 503 : 200;
  const title = status === 404 ? 'الصفحة غير متاحة | هدهد إف إم' : status === 503 ? 'تعذر تحميل المحطات | هدهد إف إم' : station ? `${station.name} | هدهد إف إم` : city ? `إذاعات ${city.name} | هدهد إف إم` : stationId ? 'تفاصيل المحطة | هدهد إف إم' : homeTitle;
  const description = status !== 200 ? 'عد إلى دليل المحطات أو حاول مرة أخرى لاحقاً.' : station ? station.description || station.tagline || `استمع إلى ${station.name} على هدهد إف إم.` : city ? `تصفح محطات ${city.name} النشطة في هدهد إف إم واستمع إلى بثها المباشر.` : homeDescription;
  const canonical = status === 404 ? null : stationId && validId(stationId) ? stationCanonical(stationId) : cityCode && validId(cityCode) ? cityCanonical(cityCode) : `${canonicalOrigin}/`;
  const noindex = status !== 200 || params.has('episode') || params.has('program') || url.hash === '#account';
  const stations = status !== 200 ? [] : station ? [station] : city ? catalog.stations.filter(s => s.countryCode === 'YE' && s.cityCode === city.code) : catalog.stations;
  const image = `${canonicalOrigin}/assets/images/branding/app_icon_1024.png`;
  const schema = status !== 200 ? null : station ? { '@context': 'https://schema.org', '@type': 'RadioStation', name: station.name, description, url: canonical, ...(station.cityNameAr ? { address: { '@type': 'PostalAddress', addressLocality: station.cityNameAr, addressCountry: station.countryNameAr } } : {}) } : { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: canonical, inLanguage: 'ar', mainEntity: { '@type': 'ItemList', itemListElement: stations.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: stationCanonical(s.id) })) } };
  return { status, title, description, canonical, noindex, image, schema, stations, city, station };
}
export type PageModel = ReturnType<typeof pageModel>;
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
export function metadataHtml(page: PageModel, development = false): string {
  const meta = (name: string, value: string, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value)}">`;
  return `<title>${escapeHtml(page.title)}</title>${meta('description', page.description)}${meta('robots', page.noindex || development ? 'noindex,follow' : 'index,follow')}${page.canonical ? `<link rel="canonical" href="${escapeHtml(page.canonical)}">` : ''}${meta('og:title', page.title, true)}${meta('og:description', page.description, true)}${meta('og:type', 'website', true)}${meta('og:locale', 'ar_YE', true)}${meta('og:site_name', 'هدهد إف إم', true)}${page.canonical ? meta('og:url', page.canonical, true) : ''}${meta('og:image', page.image, true)}${meta('twitter:card', 'summary')}${meta('twitter:title', page.title)}${meta('twitter:description', page.description)}${meta('twitter:image', page.image)}${page.schema ? `<script type="application/ld+json" id="public-schema">${safeJson(page.schema)}</script>` : ''}`;
}
export function updateMetadata(page: PageModel, development: boolean) {
  document.head.querySelectorAll('title, meta[name="description"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], #public-schema').forEach(node => node.remove());
  document.head.insertAdjacentHTML('beforeend', metadataHtml(page, development));
}
