// Explicit development fixture. Not imported by the production entry point.
import { useState, useEffect } from 'react';
import type { AccountPort } from '../account-panel';
import type { AccountView } from '../lib/account-repository';
import type { Follow } from '../lib/discovery';
import { createRoot } from 'react-dom/client';
import { PublicHome } from '../public-home';
import { stationFromSnapshot } from '../lib/stations';
import '../styles.css';
const mode = new URLSearchParams(location.search).get('state');
const loadCatalog = async () => {
  if (mode === 'error') throw new Error('Synthetic unavailable catalog');
  if (mode === 'empty') return [];
  return ['صنعاء', 'عدن', 'تعز'].map((city, index) => stationFromSnapshot({
    id: `review-${index}`, data: () => ({ name: `إذاعة ${city} — صوت المجتمع والثقافة`, cityNameAr: city,
      cityCode: `city-${index}`, isActive: true, isFeatured: index === 0, isLive: true,
      description: 'بيانات تجريبية لفحص الواجهة فقط.', streamUrl: '', backupStreamUrl: '', }),
  }));
};
const loadContent = async (stationId: string) => {
 if (mode === 'content-error') throw new Error('Synthetic content failure');
 return { offline: mode === 'offline', programs: [{ id: 'p', stationId, title: 'حكايات المجتمع', description: 'برنامج تجريبي عن الثقافة والمجتمع.', priority: 1, schedule: { weekdays: [1,3,7], startMinute: 600, endMinute: 660, utcOffsetMinutes: 180 } }], episodes: [{ id: 'e', stationId, programId: 'p', title: 'الحلقة التجريبية الأولى', description: 'وصف تجريبي للحلقة.', audioUrl: 'https://example.invalid/fixture-audio', broadcastAt: Date.UTC(2026,8,13), utcOffsetMinutes: 180 }] };
};
const createAccount = (): AccountPort => {
 let changed: ((account: AccountView | null, follows: Follow[], error: boolean) => void) | null = null;
 let view: AccountView | null = mode === 'guest' ? null : { verified: mode !== 'unverified', active: mode !== 'disabled' && mode !== 'unverified', email: 'fixture@example.invalid', displayName: 'مستمع تجريبي' };
 let follows: Follow[] = [{stationId:'missing',isActive:true,notificationsEnabled:false}];
 const emit = () => changed?.(view, follows, false);
 return {
  async start(callback) { changed = callback; emit(); }, async call() { return {data:{}}; },
  async login() { view={verified:true,active:true,email:'fixture@example.invalid',displayName:'مستمع تجريبي'}; emit(); },
  async register() { view={verified:false,active:false,email:'fixture@example.invalid',displayName:'مستمع تجريبي'}; emit(); },
  async resetPassword() {}, async verify() { if(view) view={...view,verified:true,active:true}; emit(); }, async refresh() { emit(); },
  async updateName(displayName) { if(view) view={...view,displayName}; emit(); },
  async follow(stationId,isActive,notificationsEnabled) { if(mode === 'write-error') throw new Error('Synthetic write failure'); follows=[...follows.filter(f=>f.stationId!==stationId),{stationId,isActive,notificationsEnabled}]; emit(); },
  async logout() { view=null; follows=[]; emit(); }, async deleteAccount() { view=null; follows=[]; emit(); }, dispose() { changed=null; },
 };
};
const start = performance.now();
const pending: ((stations: Awaited<ReturnType<typeof loadCatalog>>) => void)[] = [];
const oldCatalog = () => new Promise<Awaited<ReturnType<typeof loadCatalog>>>(resolve => pending.push(resolve));
function Preview() {
 const [newer, setNewer] = useState(false);
 const [elapsed, setElapsed] = useState(0);
 useEffect(() => { const frame = requestAnimationFrame(() => setElapsed(performance.now() - start)); return () => cancelAnimationFrame(frame); }, []);
 return <><aside dir="rtl">واجهة اختبار محلية — لا اتصال بالحسابات أو البيانات الحقيقية. زمن أول إطار محلي: {elapsed.toFixed(1)} ms</aside>
 {mode === 'race' && <div><button onClick={() => setNewer(true)}>تحميل كتالوج أحدث</button><button onClick={() => pending.splice(0).forEach(resolve => resolve([]))}>إكمال الطلب القديم</button></div>}
 <PublicHome loadCatalog={mode === 'race' && !newer ? oldCatalog : loadCatalog} loadContent={loadContent} createAccount={createAccount} /></>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
