// Development-only fixture: real placement, synthetic data, no tracking service.
import { createRoot } from 'react-dom/client';
import { SponsoredPlacement } from '../sponsored-placement';
import type { SponsoredAd } from '../lib/advertising';
import '../styles.css';
const load = async (): Promise<SponsoredAd | null> => ({ kind: 'sponsorship', deliveryId: 'fixture', title: 'أصوات تقرّبنا',
  sponsor: 'مؤسسة تجريبية', body: 'رعاية تدعم المحتوى الذي تحبه، دون مقاطعة الاستماع.', imageUrl: '', targetUrl: '', validForMs: 60000, expiresAt: Date.now() + 60000 });
const record = async (_ad: SponsoredAd, event: string) => { document.getElementById('events')!.textContent = event === 'impression' ? 'تم رصد ظهور تجريبي واحد' : 'نقرة تجريبية'; };
createRoot(document.getElementById('root')!).render(<main><h1 style={{ padding: 24 }}>معاينة محلية لموضع الرعاية</h1><SponsoredPlacement load={load} record={record} /><output id="events" style={{ padding: 24 }}>بانتظار الظهور</output></main>);
