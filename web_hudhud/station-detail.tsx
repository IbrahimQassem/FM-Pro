import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveStreamHealthState, streamHealthLabels, streamCheckedAt, type Station } from './lib/stations';
import { loadStationContent, loadProgramsPage, loadEpisodesPage, type ContentCursor, type StationContent } from './lib/content-repository';
import { scheduleStatus, stationHref, type Program, type Episode } from './lib/discovery';
import { StationAppBanner } from './app-cta';
const days = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function StationDetail({ station, onPlay, onEpisode, favorite, onFavorite, loadContent = loadStationContent, loadPrograms = loadProgramsPage, loadEpisodes = loadEpisodesPage }: { station: Station; onPlay(): void; onEpisode(episode: Episode): void; favorite: boolean; onFavorite(): void; loadContent?: typeof loadStationContent; loadPrograms?: typeof loadProgramsPage; loadEpisodes?: typeof loadEpisodesPage }) {
  const [content, setContent] = useState<StationContent | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [day, setDay] = useState(1);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { if (location.hash === '#station-detail') document.getElementById('detail-title')?.focus(); }, [station.id]);
  const [shareMessage, setShareMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const retry = useRef<(() => void) | null>(null);
  const [programBack, setProgramBack] = useState<(ContentCursor | null)[]>([]);
  const [episodeBack, setEpisodeBack] = useState<(ContentCursor | null)[]>([]);
  const [programCursor, setProgramCursor] = useState<ContentCursor | null>(null);
  const [episodeCursor, setEpisodeCursor] = useState<ContentCursor | null>(null);
  useEffect(() => {
    const request = ++generation.current; inFlight.current = true;
    setContent(null); setError(false); setBusy(true);
    setProgramBack([]); setEpisodeBack([]); setProgramCursor(null); setEpisodeCursor(null);
    retry.current = () => setAttempt(value => value + 1);
    const params = new URLSearchParams(location.search);
    void loadContent(station.id, value => { if (generation.current === request) setContent(value); }, { programId: params.get('program'), episodeId: params.get('episode') })
      .then(value => { if (generation.current === request) setContent(value); })
      .catch(() => { if (generation.current === request) setError(true); })
      .finally(() => { if (generation.current === request) { inFlight.current = false; setBusy(false); } });
    return () => { generation.current++; };
  }, [station.id, attempt, loadContent]);
  async function programsPage(cursor: ContentCursor | null, back: (ContentCursor | null)[]) {
    if (inFlight.current) return;
    inFlight.current = true;
    const request = ++generation.current; setBusy(true); setError(false);
    retry.current = () => { void programsPage(cursor, back); };
    try {
      const page = await loadPrograms(station.id, cursor);
      if (generation.current === request) {
        setContent(value => value ? { ...value, programs: page.items, programsPage: page, offline: value.episodesPage.offline } : value);
        setProgramCursor(cursor); setProgramBack(back.slice(-20));
      }
    } catch { if (generation.current === request) setError(true); }
    finally { if (generation.current === request) { inFlight.current = false; setBusy(false); } }
  }
  async function episodesPage(program: Program, cursor: ContentCursor | null, back: (ContentCursor | null)[]) {
    if (inFlight.current) return;
    inFlight.current = true;
    const request = ++generation.current; setBusy(true); setError(false);
    retry.current = () => { void episodesPage(program, cursor, back); };
    try {
      const page = await loadEpisodes(station.id, program, cursor);
      if (generation.current === request) {
        setContent(value => value ? { ...value, selectedProgram: program, selectedEpisode: value.selectedProgram?.id === program.id ? value.selectedEpisode : null, episodes: page.items, episodesPage: page, offline: value.programsPage.offline } : value);
        setEpisodeCursor(cursor); setEpisodeBack(back.slice(-20));
      }
    } catch { if (generation.current === request) setError(true); }
    finally { if (generation.current === request) { inFlight.current = false; setBusy(false); } }
  }
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  async function share() { const url = new URL(stationHref(station.id), location.href).href; try { if (navigator.share) await navigator.share({ title: station.name, url }); else { await navigator.clipboard.writeText(url); setShareMessage('تم نسخ رابط المحطة'); } } catch { setShareMessage('يمكنك نسخ رابط المحطة من شريط العنوان.'); } }
  const requestedProgram = new URLSearchParams(location.search).get('program');
  const requestedEpisode = new URLSearchParams(location.search).get('episode');
  const selectedEpisode = content?.selectedEpisode?.id ?? null;
  const grouped = useMemo(() => {
    const groups = new Map<string, Episode[]>();
    const episodes = content?.episodes ?? [];
    const linked = content?.selectedEpisode;
    for (const episode of (linked && !episodes.some(item => item.id === linked.id) ? [linked, ...episodes] : episodes).slice(0,100)) {
      const group = groups.get(episode.programId) ?? [];
      group.push(episode); groups.set(episode.programId, group);
    }
    return groups;
  }, [content?.episodes, content?.selectedEpisode]);
  const programs = content?.selectedProgram && !content.programs.some(program => program.id === content.selectedProgram?.id) ? [content.selectedProgram, ...content.programs] : content?.programs ?? [];
  const healthState = resolveStreamHealthState(station);
  const isStopped = healthState === 'temporarilyStopped';
  const noSource = healthState === 'noOnlineSource';
  const checkedAt = streamCheckedAt(station);
  return <section className="content-section detail-panel" id="station-detail" aria-labelledby="detail-title">
    <a href="?">العودة إلى كل المحطات</a><h1 id="detail-title" tabIndex={-1}>{station.name}</h1><p>{station.description || station.tagline || 'لا يوجد وصف لهذه المحطة حالياً.'}</p>
    <div className="detail-actions"><button onClick={onPlay} disabled={noSource}>{noSource ? 'لا يتوفر بث مباشر' : isStopped ? 'محاولة الاستماع' : 'استمع للبث المباشر'}</button><button aria-pressed={favorite} onClick={onFavorite}>{favorite ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}</button><button onClick={() => void share()}>مشاركة المحطة</button><a href="#account">متابعة المحطة وإدارة التنبيهات</a></div><p role="status">{shareMessage}</p>
    <p>{streamHealthLabels[healthState]}{checkedAt !== null ? ` — آخر فحص: ${new Date(checkedAt).toLocaleString('ar-YE', { timeZone: 'Asia/Aden' })}` : ''}</p>
    {noSource && <p role="note">لا يوجد رابط بث مباشر لهذه المحطة حاليًا؛ يمكنك استكشاف البرامج والحلقات المسجلة أدناه.</p>}
    {isStopped && (
      <aside className="stream-notice-card" role="note" aria-labelledby="stream-notice-title">
        <strong id="stream-notice-title">⚠️ تنويه البث المباشر:</strong>
        <p>البث المباشر لهذه الإذاعة متوقف حالياً من المصدر الإذاعي نفسه. هدهد إف إم منصة ناقلة ولا تتحمل مسؤولية الانقطاعات الفنية الصادرة من استوديوهات المحطة. بإمكانك تجربة إعادة الاتصال أو الاستماع إلى أرشيف البرامج والحلقات المسجلة.</p>
      </aside>
    )}
    <StationAppBanner />
    {!content && !error && <p role="status">جارٍ تحميل البرامج والحلقات…</p>}
    {error && <p role="alert">تعذر تحميل المحتوى. <button disabled={busy} onClick={() => retry.current?.()}>إعادة المحاولة</button></p>}
    {content && <>{content.offline && <p role="status">تُعرض نسخة محفوظة دون اتصال. <button onClick={() => setAttempt(v => v + 1)}>تحديث</button></p>}
      {requestedProgram && content.selectedProgram?.id !== requestedProgram && <p role="status">البرنامج المطلوب غير متاح؛ تُعرض برامج المحطة المتاحة.</p>}
      {requestedEpisode && !selectedEpisode && <p role="status">الحلقة المطلوبة غير متاحة؛ يمكنك تصفح محتوى المحطة.</p>}
      <div className="detail-actions"><h2>البرامج والحلقات</h2><button disabled={busy} onClick={() => setAttempt(value => value + 1)}>تحديث المحتوى</button></div>
      <nav aria-label="صفحات البرامج" className="detail-actions"><button disabled={busy || content.offline || !programBack.length} onClick={() => void programsPage(programBack.at(-1) ?? null, programBack.slice(0,-1))}>البرامج السابقة</button><button disabled={busy || content.offline || !content.programsPage.nextCursor} onClick={() => void programsPage(content.programsPage.nextCursor, [...programBack, programCursor])}>البرامج التالية</button></nav>
      {!programs.length && <p>لا توجد برامج متاحة حالياً.</p>}
      {programs.map(program => <article className="program-panel" key={program.id} id={`program-${program.id}`}><h3>{program.title}</h3><p>{program.description}</p><p>عدد الحلقات: {program.episodesCount ?? 0}</p>
        <button disabled={busy || content.offline} aria-pressed={content.selectedProgram?.id === program.id} onClick={() => void episodesPage(program, null, [])}>عرض حلقات البرنامج</button>
        {content.selectedProgram?.id === program.id && <>
          {!grouped.get(program.id)?.length && <p>لا توجد حلقات صالحة في هذه الصفحة.</p>}
          {(grouped.get(program.id) ?? []).map(episode => <div className={episode.id === selectedEpisode ? 'episode-row selected-episode' : 'episode-row'} key={episode.id}><div><h4>{episode.title}</h4><p>{episode.description}</p><time>{new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(episode.broadcastAt + episode.utcOffsetMinutes * 60000))} (UTC{episode.utcOffsetMinutes >= 0 ? '+' : ''}{episode.utcOffsetMinutes / 60})</time></div><button onClick={() => onEpisode(episode)} aria-label={`تشغيل الحلقة ${episode.title}`}>تشغيل الحلقة</button></div>)}
          <nav aria-label="صفحات الحلقات" className="detail-actions"><button disabled={busy || content.offline || !episodeBack.length} onClick={() => void episodesPage(program, episodeBack.at(-1) ?? null, episodeBack.slice(0,-1))}>الحلقات السابقة</button><button disabled={busy || content.offline || !content.episodesPage.nextCursor} onClick={() => void episodesPage(program, content.episodesPage.nextCursor, [...episodeBack, episodeCursor])}>الحلقات التالية</button></nav>
        </>}
      </article>)}
      {busy && <p role="status">جارٍ تحميل الصفحة…</p>}
      <p>الصفحات قد تتغير مع تحديث المحتوى؛ استخدم التحديث لرؤية العناصر المنقولة إلى صفحات سابقة.</p>
      <h2>جدول البرامج المعروضة</h2><label>اليوم <select value={day} onChange={e => setDay(Number(e.target.value))}>{days.map((label,index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
      {!programs.some(p => p.schedule?.weekdays.includes(day)) && <p>لا توجد مواعيد لهذا اليوم.</p>}
      {programs.filter(p => p.schedule?.weekdays.includes(day)).sort((a,b) => a.schedule!.startMinute - b.schedule!.startMinute).map(p => <p key={p.id}>{p.title} · <bdi>{clock(p.schedule!.startMinute)}–{clock(p.schedule!.endMinute)} (UTC{p.schedule!.utcOffsetMinutes >= 0 ? '+' : ''}{p.schedule!.utcOffsetMinutes / 60})</bdi> · {({ live: 'على الهواء الآن', next: 'يبدأ قريباً', upcoming: 'موعد قادم', ended: 'انتهى اليوم' })[day === (new Date(now + p.schedule!.utcOffsetMinutes * 60000).getUTCDay() || 7) ? scheduleStatus(p.schedule!, now) : 'upcoming']}</p>)}
    </>}
  </section>;
}
