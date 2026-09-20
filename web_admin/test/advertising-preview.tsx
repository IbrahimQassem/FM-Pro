// Development-only synthetic fixture; no Firebase request or production entry import.
import { createRoot } from 'react-dom/client';
import { AdvertisingWorkspace } from '../components/admin/advertising-workspace';
import '../app/globals.css';

const records: Record<string, Record<string, unknown>[]> = {
  advertisers: [{ id: 'fixture-company', name: 'مؤسسة تجريبية', isActive: true, revision: 1 }],
  adCampaigns: [{ id: 'fixture-campaign', name: 'رعاية الصفحة الرئيسية', advertiserId: 'fixture-company', revision: 1,
    startAt: Date.now(), endAt: Date.now() + 86400000, status: 'draft', priority: 10, platforms: ['app', 'web'], placements: ['home.sponsor'],
    creative: { kind: 'sponsorship', title: 'أصوات تقرّبنا', body: 'مثال محلي لفحص الواجهة فقط', imageUrl: '', targetUrl: '' },
    agreementReference: 'DEMO-2026', agreementNotes: 'رعاية لمدة يوم؛ بيانات تجريبية.' }],
};
async function request<T>(data: Record<string, unknown>): Promise<T> {
  if (new URLSearchParams(location.search).get('state') === 'error') throw new Error('Synthetic unavailable service');
  let result: unknown;
  if (data.action === 'list') result = { items: records[data.kind as string], next: null };
  else if (data.action === 'report') result = { rows: [{ date: '2026-09-20', platform: 'app', placement: 'home.sponsor', impressions: 240, clicks: 12 }] };
  else {
    const kind = data.action === 'saveAdvertiser' ? 'advertisers' : 'adCampaigns';
    const value = data.value as Record<string, unknown>;
    const id = typeof data.id === 'string' ? data.id : `fixture-${records[kind].length}`;
    const index = records[kind].findIndex(row => row.id === id);
    const row = { ...value, id, revision: Number(data.revision || 0) + 1 };
    if (index >= 0) records[kind][index] = row; else records[kind].push(row);
    result = { id, version: 1 };
  }
  return result as T;
}
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-5xl p-5"><p className="mb-5">معاينة محلية — ليست حملات حقيقية</p><AdvertisingWorkspace request={request} /></main>);
