import { useEffect, useState } from 'react';
import type { Station } from './lib/stations';
import { loadStationContent, type StationContent } from './lib/content-repository';
import { scheduleStatus, stationHref, type Episode } from './lib/discovery';
const days = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function StationDetail({ station, onPlay, onEpisode, favorite, onFavorite, loadContent = loadStationContent }: { station: Station; onPlay(): void; onEpisode(episode: Episode): void; favorite: boolean; onFavorite(): void; loadContent?: typeof loadStationContent }) {
  const [content, setContent] = useState<StationContent | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [day, setDay] = useState(1);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { if (location.hash === '#station-detail') document.getElementById('detail-title')?.focus(); }, [station.id]);
  const [shareMessage, setShareMessage] = useState('');
  useEffect(() => { let active = true; setContent(null); setError(false); void loadContent(station.id, value => { if (active) setContent(value); }).then(value => { if (active) setContent(value); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [station.id, attempt, loadContent]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  async function share() { const url = new URL(stationHref(station.id), location.href).href; try { if (navigator.share) await navigator.share({ title: station.name, url }); else { await navigator.clipboard.writeText(url); setShareMessage('تم نسخ رابط المحطة'); } } catch { setShareMessage('يمكنك نسخ رابط المحطة من شريط العنوان.'); } }
  const selectedProgram = new URLSearchParams(location.search).get('program');
  const requestedEpisode = new URLSearchParams(location.search).get('episode');
  const selectedEpisode = content?.episodes.some(e => e.id === requestedEpisode && (!selectedProgram || e.programId === selectedProgram)) ? requestedEpisode : null;
  return <section className="content-section detail-panel" id="station-detail" aria-labelledby="detail-title">
    <a href="?">العودة إلى كل المحطات</a><h1 id="detail-title" tabIndex={-1}>{station.name}</h1><p>{station.description || station.tagline || 'لا يوجد وصف لهذه المحطة حالياً.'}</p>
    <div className="detail-actions"><button onClick={onPlay}>استمع للبث المباشر</button><button aria-pressed={favorite} onClick={onFavorite}>{favorite ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}</button><button onClick={() => void share()}>مشاركة المحطة</button><a href="#account">متابعة المحطة وإدارة التنبيهات</a></div><p role="status">{shareMessage}</p>
    {!content && !error && <p role="status">جارٍ تحميل البرامج والحلقات…</p>}
    {error && <p role="alert">تعذر تحميل المحتوى. <button onClick={() => setAttempt(value => value + 1)}>إعادة المحاولة</button></p>}
    {content && <>{content.offline && <p role="status">تُعرض نسخة محفوظة دون اتصال. <button onClick={() => setAttempt(v => v + 1)}>تحديث</button></p>}
      {selectedProgram && !content.programs.some(p => p.id === selectedProgram) && <p role="status">البرنامج المطلوب غير متاح؛ تُعرض برامج المحطة المتاحة.</p>}
      {requestedEpisode && !selectedEpisode && <p role="status">الحلقة المطلوبة غير متاحة؛ يمكنك تصفح محتوى المحطة.</p>}
      <h2>البرامج والحلقات</h2>{!content.programs.length && <p>لا توجد برامج متاحة حالياً.</p>}
      {content.programs.map(program => <article className="program-panel" key={program.id} id={`program-${program.id}`}><h3>{program.title}</h3><p>{program.description}</p>
        {!content.episodes.some(e => e.programId === program.id) && <p>لا توجد حلقات منشورة لهذا البرنامج.</p>}
        {content.episodes.filter(e => e.programId === program.id).sort((a,b) => Number(b.id === selectedEpisode) - Number(a.id === selectedEpisode)).map(episode => <div className={episode.id === selectedEpisode ? 'episode-row selected-episode' : 'episode-row'} key={episode.id}><div><h4>{episode.title}</h4><p>{episode.description}</p><time>{new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(episode.broadcastAt + episode.utcOffsetMinutes * 60000))} (UTC{episode.utcOffsetMinutes >= 0 ? '+' : ''}{episode.utcOffsetMinutes / 60})</time></div><button onClick={() => onEpisode(episode)} aria-label={`تشغيل الحلقة ${episode.title}`}>تشغيل الحلقة</button></div>)}
      </article>)}
      <h2>جدول البرامج</h2><label>اليوم <select value={day} onChange={e => setDay(Number(e.target.value))}>{days.map((label,index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
      {!content.programs.some(p => p.schedule?.weekdays.includes(day)) && <p>لا توجد مواعيد لهذا اليوم.</p>}
      {content.programs.filter(p => p.schedule?.weekdays.includes(day)).sort((a,b) => a.schedule!.startMinute - b.schedule!.startMinute).map(p => <p key={p.id}>{p.title} · <bdi>{clock(p.schedule!.startMinute)}–{clock(p.schedule!.endMinute)} (UTC{p.schedule!.utcOffsetMinutes >= 0 ? '+' : ''}{p.schedule!.utcOffsetMinutes / 60})</bdi> · {({ live: 'على الهواء الآن', next: 'يبدأ قريباً', upcoming: 'موعد قادم', ended: 'انتهى اليوم' })[day === (new Date(now + p.schedule!.utcOffsetMinutes * 60000).getUTCDay() || 7) ? scheduleStatus(p.schedule!, now) : 'upcoming']}</p>)}
    </>}
  </section>;
}
