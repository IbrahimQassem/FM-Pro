// Explicit development fixture. Not imported by the production entry point.
import { useState, useEffect } from 'react';
import type { AccountPort } from '../account-panel';
import type { AccountView } from '../lib/account-repository';
import type { Follow, Program, Episode } from '../lib/discovery';
import type { ContentPage, ContentCursor, ContentSelection } from '../lib/content-repository';
import { createRoot } from 'react-dom/client';
import { PublicHome } from '../public-home';
import { stationFromSnapshot } from '../lib/stations';
import '../styles.css';
import { publicCities } from '../lib/seo';
const mode = new URLSearchParams(location.search).get('state');
const loadCatalog = async () => {
  if (mode === 'error') throw new Error('Synthetic unavailable catalog');
  if (mode === 'empty') return [];
  return ['صنعاء', 'عدن', 'تعز'].map((city, index) => stationFromSnapshot({
    id: `review-${index}`, data: () => ({ name: `إذاعة ${city} — صوت المجتمع والثقافة`, cityNameAr: mode === 'regional' && index === 2 ? 'عربي' : city,
      cityCode: mode === 'regional' && index === 2 ? 'global-ar' : `city-${index}`, countryCode: mode === 'regional' && index === 2 ? 'ARAB' : 'YE', isActive: true, isFeatured: index === 0, isLive: true,
      description: 'بيانات تجريبية لفحص الواجهة فقط.', streamUrl: mode === 'working' && index < 2 ? 'https://example.invalid/fixture-live' : '', backupStreamUrl: '',
      ...(mode === 'working' ? { healthStatus: 'online', consecutiveFailures: 0, lastCheckedAt: index === 0 ? Date.now() : Date.now() - 46 * 60000 } : {}), }),
  }));
};
const loadCityCatalog = async () => mode === 'regional' ? publicCities([{ data: () => ({ countryCode: 'ARAB', cityCode: 'global-ar', cityNameAr: 'عربي', isActive: true }) }, ...['صنعاء', 'عدن'].map((cityNameAr, i) => ({ data: () => ({ countryCode: 'YE', cityCode: `city-${i}`, cityNameAr, isActive: true }) }))], await loadCatalog()) : ['صنعاء', 'عدن', 'تعز'].map((name, i) => ({ code: `city-${i}`, name }));
// Pagination mode supplies a complete synthetic 10,000-item source only here.
const previewProgram = (stationId: string): Program => ({ id: 'p', stationId, title: 'حكايات المجتمع', description: 'برنامج تجريبي عن الثقافة والمجتمع.', priority: 1, isFeatured: true, episodesCount: mode === 'pagination' ? 10000 : 1, schedule: { weekdays: [1,3,7], startMinute: 600, endMinute: 660, utcOffsetMinutes: 180 } });
const previewEpisodes = (stationId: string): Episode[] => Array.from({ length: mode === 'pagination' ? 10000 : 1 }, (_, index) => ({ id: mode === 'pagination' ? `e${index}` : 'e', stationId, programId: 'p', title: `الحلقة التجريبية ${index + 1}`, description: 'وصف تجريبي للحلقة.', audioUrl: 'https://example.invalid/fixture-audio', broadcastAt: Date.UTC(2026,8,13) - index * 60000, utcOffsetMinutes: 180 }));
const previewPrograms = async (stationId: string): Promise<ContentPage<Program>> => ({ items: [previewProgram(stationId)], nextCursor: null, offline: mode === 'offline', rawReadCount: 1, invalidCount: 0 });
const previewEpisodePage = async (stationId: string, _program: Program, cursor: ContentCursor | null = null): Promise<ContentPage<Episode>> => {
 const episodes = previewEpisodes(stationId);
 const start = cursor ? episodes.findIndex(episode => episode.id === cursor.after.at(-1)) + 1 : 0;
 const items = episodes.slice(start, start + 50), last = items.at(-1);
 return { items, offline: mode === 'offline', rawReadCount: Math.min(51, episodes.length - start), invalidCount: 0, nextCursor: mode !== 'offline' && last && start + 50 < episodes.length ? { version: 1, root: 'HudHudDev', resource: 'episodes', stationId, programId: 'p', order: 'published:date-desc:priority-desc:id-asc', after: [{ kind: 'timestamp', seconds: last.broadcastAt / 1000, nanoseconds: 0 }, 0, last.id] } : null };
};
const loadContent = async (stationId: string, _cached?: unknown, selection: ContentSelection = {}) => {
 if (mode === 'content-error') throw new Error('Synthetic content failure');
 const programsPage = await previewPrograms(stationId), selectedProgram = programsPage.items[0];
 const episodesPage = await previewEpisodePage(stationId, selectedProgram);
 const selectedEpisode = previewEpisodes(stationId).find(episode => episode.id === selection.episodeId) ?? null;
 return { offline: mode === 'offline', programs: programsPage.items, episodes: episodesPage.items, programsPage, episodesPage, selectedProgram, selectedEpisode };
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
 const [metadata, setMetadata] = useState('');
 useEffect(() => {
   const update = () => setMetadata([document.title, document.querySelector('link[rel=canonical]')?.getAttribute('href'), document.querySelector('meta[name=robots]')?.getAttribute('content')].join(' | '));
   const observer = new MutationObserver(update); observer.observe(document.head, { childList: true, subtree: true, attributes: true }); update();
   return () => observer.disconnect();
 }, []);
 useEffect(() => { const frame = requestAnimationFrame(() => setElapsed(performance.now() - start)); return () => cancelAnimationFrame(frame); }, []);
 return <><aside dir="rtl">واجهة اختبار محلية — لا اتصال بالحسابات أو البيانات الحقيقية. زمن أول إطار محلي: {elapsed.toFixed(1)} ms</aside>
 <div><button onClick={() => window.history.back()}>رجوع للاختبار</button><button onClick={() => window.history.forward()}>تقدم للاختبار</button><output aria-label="بيانات البحث للاختبار">{metadata}</output></div>
 {mode === 'race' && <div><button onClick={() => setNewer(true)}>تحميل كتالوج أحدث</button><button onClick={() => pending.splice(0).forEach(resolve => resolve([]))}>إكمال الطلب القديم</button></div>}
 <PublicHome publicPath="/" loadCityCatalog={loadCityCatalog} loadCatalog={mode === 'race' && !newer ? oldCatalog : loadCatalog} loadContent={loadContent} loadPrograms={previewPrograms} loadEpisodes={previewEpisodePage} createAccount={createAccount} /></>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
