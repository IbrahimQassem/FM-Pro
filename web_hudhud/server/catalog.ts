import { stationFromSnapshot, sortStations } from '../lib/stations.ts';
import { publicCities, type Catalog } from '../lib/seo.ts';
import { validId } from '../lib/discovery.ts';

type Value = { stringValue?: string; booleanValue?: boolean; integerValue?: string; doubleValue?: number; mapValue?: { fields?: Record<string, Value> } };
function decode(value: Value): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  return null;
}
// No Auth, Admin SDK, ambient credentials, or user cookies. Firestore Rules apply.
export function catalogReader(projectId: string, root: string, request: typeof fetch = fetch) {
  if (!/^[a-z0-9-]+$/.test(projectId) || !['HudHudDev', 'HudHudOfficial'].includes(root)) throw new Error('Invalid public catalog configuration.');
  return async (): Promise<Catalog> => {
    const signal = AbortSignal.timeout(8000);
    async function collection(name: 'stations' | 'locations') {
      const docs: { id: string; data(): Record<string, unknown> }[] = [];
      let token = '';
      const seen = new Set<string>();
      let pages = 0;
      do {
        if (++pages > 20) throw new Error('Public catalog exceeds rendering capacity.');
        const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${root}/${name}/${name}`);
        url.searchParams.set('pageSize', '300');
        if (token) url.searchParams.set('pageToken', token);
        const response = await request(url, { signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Public catalog unavailable.');
        const body = await response.json() as { documents?: { name: string; fields?: Record<string, Value> }[]; nextPageToken?: string };
        if (body.documents !== undefined && !Array.isArray(body.documents)) throw new Error('Invalid public catalog.');
        if ((body.documents?.length || 0) > 300) throw new Error('Invalid public catalog page.');
        for (const doc of body.documents || []) {
          const data = Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, decode(value)]));
          docs.push({ id: doc.name.split('/').at(-1) || '', data: () => data });
        }
        token = body.nextPageToken || '';
        if (token && seen.has(token)) throw new Error('Invalid public catalog pagination.');
        seen.add(token);
      } while (token);
      return docs;
    }
    const [stationDocs, locationDocs] = await Promise.all([collection('stations'), collection('locations').catch(() => null)]);
    const stations = stationDocs.filter(doc => !doc.data().adminDeletionToken).map(stationFromSnapshot).filter(s => s.isActive && s.name && validId(s.id)).sort(sortStations);
    return { stations, cities: locationDocs ? publicCities(locationDocs, stations) : [], ...(locationDocs ? {} : { citiesUnavailable: true }) };
  };
}
