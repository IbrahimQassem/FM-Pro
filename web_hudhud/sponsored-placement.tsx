import { useEffect, useRef, useState } from 'react';
import { loadAd, recordAd, type SponsoredAd } from './lib/advertising';

export function SponsoredPlacement({ load = loadAd, record = recordAd }: {
  load?: () => Promise<SponsoredAd | null>; record?: typeof recordAd;
}) {
  const [ad, setAd] = useState<SponsoredAd | null>(null);
  const [ready, setReady] = useState(false);
  const element = useRef<HTMLElement>(null);
  useEffect(() => {
    let stopped = false, pending = false, next = 0;
    let expires = 0;
    async function refresh() {
      if (expires && Date.now() >= expires) { setAd(null); expires = 0; }
      if (stopped || pending || document.hidden || Date.now() < next) return;
      pending = true; next = Date.now() + 60000;
      try {
        const value = await load();
        if (!stopped && !document.hidden) { setAd(value); setReady(value?.kind === 'sponsorship'); expires = value?.expiresAt || 0; }
      } catch { if (!stopped) setAd(null); }
      finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 1000);
    const visibility = () => { void refresh(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [load]);
  useEffect(() => {
    if (!ad || !ready || !element.current || !('IntersectionObserver' in window)) return;
    let visible = false, sent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timer);
      if (visible && !document.hidden && !sent) timer = setTimeout(() => {
        if (document.hidden || Date.now() >= ad!.expiresAt) return;
        sent = true; void record(ad!, 'impression');
      }, 1000);
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= 0.5; schedule(); }, { threshold: [0, 0.5, 1] });
    observer.observe(element.current);
    document.addEventListener('visibilitychange', schedule);
    return () => { observer.disconnect(); clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [ad, ready, record]);
  if (!ad) return null;
  const content = <>{ad.kind === 'image' && <img key={ad.deliveryId} src={ad.imageUrl} alt="" onLoad={() => setReady(true)} onError={() => setAd(null)} referrerPolicy="no-referrer" />}<div><span className="sponsor-label">إعلان · {ad.sponsor}</span><h2>{ad.title}</h2>{ad.body && <p>{ad.body}</p>}{ad.targetUrl && <span>زيارة المعلن ↗</span>}</div></>;
  return <aside ref={element} className="sponsored-placement" aria-label="إعلان مدفوع">
    {ad.targetUrl ? <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer sponsored" aria-label={`${ad.title} — يفتح رابطًا خارجيًا`} onClick={event => {
      if (Date.now() >= ad.expiresAt) { event.preventDefault(); setAd(null); return; }
      void record(ad, 'click');
    }}>{content}</a> : content}
  </aside>;
}
