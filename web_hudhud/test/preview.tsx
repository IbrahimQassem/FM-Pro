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
 const baseView: AccountView = { id: 'fixture-listener', verified: true, active: true, profileStatus: 'ready', email: 'fixture@example.invalid', displayName: 'مستمع تجريبي', avatarUrl: 'assets/images/mascot/mascot_avatar_default.webp', providers: ['password'] };
 let view: AccountView | null = ['guest', 'google-cancel', 'google-blocked', 'google-conflict'].includes(mode || '') ? null : { ...baseView, verified: mode !== 'unverified' && mode !== 'missing-email', active: !['disabled', 'unverified', 'missing-email'].includes(mode || ''), email: mode === 'missing-email' ? '' : baseView.email, providers: mode === 'google' ? ['google.com'] : ['password'] };
 let follows: Follow[] = [{stationId:'missing',isActive:true,notificationsEnabled:false}];
 const emit = () => changed?.(view, follows, false);
 return {
  async start(callback) { changed = callback; emit(); }, async call() { return {data:{}}; },
  async login() { view={...baseView}; emit(); },
  async loginWithGoogle() {
    const failure = ({ 'google-cancel': 'auth/popup-closed-by-user', 'google-blocked': 'auth/popup-blocked', 'google-conflict': 'auth/account-exists-with-different-credential' } as Record<string, string>)[mode || ''];
    if (failure) throw { code: failure };
    view={...baseView,providers:['google.com']}; emit();
  },
  async register() { view={...baseView,verified:false,active:false}; emit(); },
  async resetPassword() {}, async requestVerificationCode(email) { if(view && email) view={...view,email}; emit(); }, async verify() { if(view) view={...view,verified:true,active:true}; emit(); }, async refresh() { emit(); },
  async updateAccountProfile(update) {
    if(mode === 'profile-error') throw new Error('Synthetic profile failure');
    if(view) view={...view,displayName:update.displayName,...(update.avatarUrl !== undefined ? {avatarUrl:update.avatarUrl} : {})}; emit();
  },
  async follow(stationId,isActive,notificationsEnabled) { if(mode === 'write-error') throw new Error('Synthetic write failure'); follows=[...follows.filter(f=>f.stationId!==stationId),{stationId,isActive,notificationsEnabled}]; emit(); },
  async logout() { view=null; follows=[]; emit(); }, async deleteAccount(_password,beforeDelete) { await beforeDelete(); view=null; follows=[]; emit(); }, dispose() { changed=null; },
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
