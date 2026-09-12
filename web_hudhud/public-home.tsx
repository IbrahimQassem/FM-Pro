import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  CircleAlert,
  Headphones,
  MapPin,
  Menu,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import { loadPublicStations } from '@/lib/station-repository';
import { RadioPlayer, isHttpUrl, type PlaybackState } from '@/lib/radio-player';
import { recentStation, type Station } from '@/lib/stations';

type LoadState = 'loading' | 'ready' | 'error';
type ListeningEntry = { stationId: string; playedAt: string };

const HISTORY_STORAGE_KEY = 'hudhud.listeningHistory';
const LAST_STATION_STORAGE_KEY = 'hudhud.lastPlayedStationId';

function initials(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase('ar') || 'ه';
}

function readListeningHistory(): ListeningEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is ListeningEntry => (
      typeof entry === 'object' && entry !== null &&
      typeof (entry as ListeningEntry).stationId === 'string' &&
      typeof (entry as ListeningEntry).playedAt === 'string'
    )).slice(0, 30);
  } catch {
    return [];
  }
}

function rememberSuccessfulPlay(stationId: string): ListeningEntry[] {
  const next = [
    { stationId, playedAt: new Date().toISOString() },
    ...readListeningHistory().filter((entry) => entry.stationId !== stationId),
  ].slice(0, 30);
  try {
    localStorage.setItem(LAST_STATION_STORAGE_KEY, stationId);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local storage can be disabled; playback should still work.
  }
  return next;
}

export function PublicHome({ loadCatalog = loadPublicStations }: { loadCatalog?: () => Promise<Station[]> } = {}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [history, setHistory] = useState<ListeningEntry[]>(readListeningHistory);
  const [playback, setPlayback] = useState<PlaybackState>({ stationId: null, status: 'idle' });
  const currentStationId = playback.stationId;
  const isPlaying = playback.status === 'playing';
  const playerError = playback.status === 'error' ? 'البث غير متاح حالياً. حاول مرة أخرى.' : '';
  const player = useRef<RadioPlayer | null>(null);
  const loadEpoch = useRef(0);
  const menuButton = useRef<HTMLButtonElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const controller = new RadioPlayer(() => new Audio(), setPlayback,
      (id) => setHistory(rememberSuccessfulPlay(id)));
    player.current = controller;
    return () => { controller.dispose(); player.current = null; };
  }, []);

  const loadStations = useCallback(async () => {
    const epoch = ++loadEpoch.current;
    setLoadState('loading');
    setLoadError('');
    try {
      const activeStations = await loadCatalog();
      if (epoch !== loadEpoch.current) return;
      setSelectedCity((city) => activeStations.some((station) => (station.cityCode || station.cityNameAr) === city) ? city : 'all');
      setStations(activeStations);
      setLoadState('ready');
    } catch {
      if (epoch !== loadEpoch.current) return;
      setLoadState('error');
      setLoadError('تعذر تحميل المحطات الآن. تحقق من الاتصال وحاول مرة أخرى.');
    }
  }, [loadCatalog]);

  useEffect(() => {
    void loadStations();
    return () => { loadEpoch.current++; };
  }, [loadStations]);

  const featuredStations = useMemo(
    () => stations.filter((station) => station.isFeatured),
    [stations],
  );
  const cityOptions = useMemo(() => {
    const cities = new Map<string, string>();
    stations.forEach((station) => {
      const key = station.cityCode || station.cityNameAr;
      if (key && station.cityNameAr) cities.set(key, station.cityNameAr);
    });
    return [...cities.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }, [stations]);
  const filteredStations = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ar');
    return stations.filter((station) => {
      const matchesCity = selectedCity === 'all' || station.cityCode === selectedCity ||
        (!station.cityCode && station.cityNameAr === selectedCity);
      if (!matchesCity) return false;
      if (!query) return true;
      return [
        station.name,
        station.nameEn,
        station.cityNameAr,
        station.frequency,
        station.tagline,
        station.description,
      ].some((value) => value.toLocaleLowerCase('ar').includes(query));
    });
  }, [searchQuery, selectedCity, stations]);
  const liveCount = stations.filter((station) => station.isLive).length;
  const currentStation = stations.find((station) => station.id === currentStationId) || null;
  useEffect(() => {
    if (loadState === 'ready' && currentStationId && !currentStation) player.current?.stop();
  }, [loadState, currentStationId, currentStation]);
  const recommendation = useMemo(() => recentStation(stations, history), [history, stations]);

  function playStation(station: Station) { player.current?.select(station); }
  function stopPlayback() { player.current?.stop(); }

  return (
    <div className="public-site" dir="rtl" onKeyDown={(event) => { if (event.key === 'Escape' && mobileMenuOpen) { setMobileMenuOpen(false); menuButton.current?.focus(); } }}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="هدهد FM، الصفحة الرئيسية">
          <span className="brand-mark"><Radio size={23} strokeWidth={2.4} /></span>
          <span><strong>هدهد</strong><small>FM</small></span>
        </a>
        <nav id="public-navigation" className={mobileMenuOpen ? 'site-nav is-open' : 'site-nav'} aria-label="التنقل الرئيسي">
          <a href="#featured" onClick={() => setMobileMenuOpen(false)}>المميز</a>
          <a href="#stations" onClick={() => setMobileMenuOpen(false)}>كل المحطات</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>عن هدهد</a>
        </nav>
        <div className="header-actions">
          <a className="header-search" href="#stations" aria-label="ابحث عن محطة">
            <Search size={18} />
            <span>ابحث عن محطة</span>
          </a>
          <button ref={menuButton} className="menu-button" type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-controls="public-navigation" aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> صوت قريب منك</div>
            <h1>اكتشف صوت اليمن<br /><em>في مكان واحد.</em></h1>
            <p>استمع إلى محطاتك المفضلة، وتعرّف على أصوات جديدة من كل مدينة. بثّ مباشر، واضح، ويمشي مع يومك.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#stations">استكشف المحطات <ArrowLeft size={17} /></a>
              <a className="quiet-button" href="#about"><Headphones size={17} /> كيف يعمل هدهد؟</a>
            </div>
            <div className="hero-note"><span className="live-pulse" /> بث مباشر من محطات موثوقة</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="sound-wave wave-one" />
            <div className="sound-wave wave-two" />
            <div className="sound-wave wave-three" />
            <div className="hero-radio-card">
              <span className="mini-live"><i /> مباشر الآن</span>
              <div className="hero-radio-icon"><Radio size={40} /></div>
              <strong>صوتك يبدأ من هنا</strong>
              <span>موسيقى، أخبار، وحكايات</span>
              <div className="equalizer"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
            <div className="floating-chip chip-top"><MapPin size={14} /> من كل مدينة</div>
            <div className="floating-chip chip-bottom"><Volume2 size={14} /> استمع براحتك</div>
          </div>
        </section>

        <section className="stats-strip" aria-label="إحصاءات المحطات">
          <StatItem value={loadState === 'ready' ? stations.length : '—'} label="محطة نشطة" icon={<Radio size={19} />} />
          <StatItem value={loadState === 'ready' ? cityOptions.length : '—'} label="مدينة على الخريطة" icon={<MapPin size={19} />} />
          <StatItem value={loadState === 'ready' ? liveCount : '—'} label="تبث الآن" icon={<Volume2 size={19} />} />
          <div className="stats-message"><Sparkles size={18} /><span>تجربة استماع عربية، مصممة لك</span></div>
        </section>

        <section className="content-section featured-section" id="featured">
          <SectionHeading eyebrow="اختيارات هدهد" title="محطات تستحق أن تسمعها" description="محطات مميزة اختارتها لك هدهد — ابدأ الاستماع بضغطة واحدة." />
          {loadState === 'loading' && <div className="featured-grid"><FeaturedSkeleton /><FeaturedSkeleton /><FeaturedSkeleton /></div>}
          {loadState === 'error' && <ErrorState message={loadError} onRetry={() => void loadStations()} />}
          {loadState === 'ready' && featuredStations.length === 0 && <EmptyState compact title="لا توجد محطات مميزة حالياً" description="ستظهر هنا المحطات التي يختارها فريق هدهد." />}
          {loadState === 'ready' && featuredStations.length > 0 && (
            <div className="featured-grid">
              {featuredStations.slice(0, 3).map((station, index) => (
                <FeaturedCard key={station.id} station={station} index={index} isPlaying={isPlaying && currentStationId === station.id} onPlay={() => void playStation(station)} />
              ))}
            </div>
          )}
        </section>

        {loadState === 'ready' && stations.length > 0 && recommendation && (
          <section className="recommendation-section" aria-labelledby="recommendation-title">
            <div className="recommendation-copy">
              <span className="recommendation-icon"><Sparkles size={21} /></span>
              <div><span className="section-eyebrow">{history.length ? 'استمعت إليها مؤخراً' : 'من محطات هدهد'}</span><h2 id="recommendation-title">تابع الاستماع إلى محطاتك</h2><p>{history.length > 0 ? 'عُد إلى آخر محطة متاحة استمعت إليها على هذا الجهاز.' : 'ابدأ بمحطة من الكتالوج. يُحفظ آخر استماع على هذا الجهاز فقط.'}</p></div>
            </div>
            <button className="recommendation-station" type="button" onClick={() => void playStation(recommendation)}>
              <StationArtwork station={recommendation} size="small" />
              <span><strong>{recommendation.name || 'محطة إذاعية'}</strong><small>{recommendation.cityNameAr || 'من محطات هدهد'}</small></span>
              <span className="round-play">{isPlaying && currentStationId === recommendation.id ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}</span>
            </button>
          </section>
        )}

        <section className="content-section stations-section" id="stations">
          <div className="stations-heading"><SectionHeading eyebrow="الكتالوج الكامل" title="كل المحطات، أقرب إلى أذنك" description="ابحث باسم المحطة أو المدينة أو التردد، ثم اختر ما يناسب لحظتك." /><span className="count-badge">{loadState === 'ready' ? `${stations.length} محطة` : '...'}</span></div>
          <div className="filters-bar">
            <label className="search-field"><Search size={19} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث عن محطة، مدينة، أو تردد..." aria-label="البحث في المحطات" />{searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="مسح البحث"><X size={16} /></button>}</label>
            <div className="city-filters" aria-label="تصفية حسب المدينة">
              <button className={selectedCity === 'all' ? 'city-filter active' : 'city-filter'} type="button" aria-pressed={selectedCity === 'all'} onClick={() => setSelectedCity('all')}>كل المدن</button>
              {cityOptions.map(([code, label]) => <button className={selectedCity === code ? 'city-filter active' : 'city-filter'} key={code} type="button" aria-pressed={selectedCity === code} onClick={() => setSelectedCity(code)}>{label}</button>)}
            </div>
          </div>
          {loadState === 'loading' && <div className="station-grid"><StationSkeleton /><StationSkeleton /><StationSkeleton /><StationSkeleton /></div>}
          {loadState === 'error' && <ErrorState message={loadError} onRetry={() => void loadStations()} />}
          {loadState === 'ready' && stations.length === 0 && <EmptyState title="لا توجد محطات نشطة حالياً" description="لم يتم العثور على محطات مفعّلة في الكتالوج. حاول مرة أخرى لاحقاً." />}
          {loadState === 'ready' && stations.length > 0 && filteredStations.length === 0 && <EmptyState title="لم نعثر على محطة بهذا البحث" description="جرّب اسماً آخر أو أزل فلتر المدينة للبحث في كل المحطات." actionLabel="إظهار كل المحطات" onAction={() => { setSearchQuery(''); setSelectedCity('all'); }} />}
          {loadState === 'ready' && filteredStations.length > 0 && <div className="station-grid">{filteredStations.map((station) => <StationCard key={station.id} station={station} isPlaying={isPlaying && currentStationId === station.id} onPlay={() => void playStation(station)} />)}</div>}
        </section>

        <section className="about-section" id="about">
          <div className="about-mark"><Radio size={28} /></div>
          <div><span className="section-eyebrow">هدهد FM</span><h2>صوت محلي، بتجربة أبسط.</h2><p>هدهد يجمع المحطات النشطة من الكتالوج الرسمي في مكان واحد. بيانات المحطات تُقرأ مباشرة من المصدر الرسمي للمنصة.</p></div>
          <a className="about-link" href="#top">العودة إلى الأعلى <ChevronLeft size={17} /></a>
        </section>
      </main>

      {currentStation && <div className={playerError ? 'player-dock has-error' : 'player-dock'} role="status">
        <StationArtwork station={currentStation} size="tiny" />
        <div className="player-info"><strong>{currentStation.name || 'محطة إذاعية'}</strong><span>{playerError || (playback.status === 'connecting' ? 'جارٍ الاتصال بالبث…' : isPlaying ? 'يُبث الآن من هدهد' : 'البث متوقف مؤقتاً')}</span></div>
        {playerError && <span className="player-error"><CircleAlert size={15} /> {playerError}</span>}
        <button className="player-toggle" type="button" disabled={playback.status === 'connecting'} onClick={() => void playStation(currentStation)} aria-label={isPlaying ? 'إيقاف البث' : 'تشغيل البث'}>{isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button>
        <button className="player-close" type="button" onClick={stopPlayback} aria-label="إغلاق المشغل"><X size={17} /></button>
      </div>}
    </div>
  );
}

function StatItem({ value, label, icon }: { value: number | string; label: string; icon: React.ReactNode }) {
  return <div className="stat-item"><span className="stat-icon">{icon}</span><strong>{value}</strong><span>{label}</span></div>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-heading"><span className="section-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function StationArtwork({ station, size = 'normal' }: { station: Station; size?: 'tiny' | 'small' | 'normal' }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [station.logoUrl]);
  const validLogo = isHttpUrl(station.logoUrl);
  return <div className={`station-art ${size} palette-${station.id.charCodeAt(0) % 5}`}>
    {validLogo && !imageFailed ? <img src={station.logoUrl} alt={`شعار ${station.name || 'المحطة'}`} onLoad={() => setImageFailed(false)} onError={() => setImageFailed(true)} /> : <span aria-label={`حرف ${station.name || 'المحطة'}`}>{initials(station.name || 'هدهد')}</span>}
  </div>;
}

function FeaturedCard({ station, index, isPlaying, onPlay }: { station: Station; index: number; isPlaying: boolean; onPlay: () => void }) {
  return <article className={`featured-card featured-${index}`}><div className="featured-top"><span className="featured-label"><Star size={13} fill="currentColor" /> مميز</span><span className="live-label">{station.isLive ? <><i /> مباشر</> : 'استماع'}</span></div><StationArtwork station={station} size="normal" /><div className="featured-details"><h3>{station.name || 'محطة إذاعية'}</h3><span>{station.cityNameAr || 'من محطات هدهد'}{station.frequency ? ` · ${station.frequency}` : ''}</span><p>{station.tagline || station.description || 'استمع إلى هذه المحطة من هدهد FM.'}</p></div><button className="card-play" type="button" onClick={onPlay} aria-label={`${isPlaying ? 'إيقاف' : 'تشغيل'} ${station.name || 'المحطة'}`}>{isPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</button></article>;
}

function StationCard({ station, isPlaying, onPlay }: { station: Station; isPlaying: boolean; onPlay: () => void }) {
  return <article className="station-card"><div className="station-card-visual"><StationArtwork station={station} size="normal" /><span className={station.isLive ? 'card-status live' : 'card-status'}>{station.isLive && <i />}{station.isLive ? 'على الهواء' : 'متاح للاستماع'}</span><button className="card-play" type="button" onClick={onPlay} aria-label={`${isPlaying ? 'إيقاف' : 'تشغيل'} ${station.name || 'المحطة'}`}>{isPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</button></div><div className="station-card-content"><div><h3>{station.name || 'محطة إذاعية'}</h3>{station.nameEn && <span className="name-en">{station.nameEn}</span>}</div><span className="city-name"><MapPin size={14} /> {station.cityNameAr || 'غير محدد'}{station.frequency ? ` · ${station.frequency}` : ''}</span><p>{station.tagline || station.description || 'استمع إلى صوت هذه المحطة عبر هدهد FM.'}</p><div className="card-footer"><span>{station.isVerified ? 'موثقة من هدهد' : 'من كتالوج هدهد'}</span><ChevronLeft size={16} /></div></div></article>;
}

function EmptyState({ title, description, compact = false, actionLabel, onAction }: { title: string; description: string; compact?: boolean; actionLabel?: string; onAction?: () => void }) {
  return <div className={compact ? 'state-panel compact' : 'state-panel'}><span className="state-icon"><Radio size={22} /></span><h3>{title}</h3><p>{description}</p>{actionLabel && onAction && <button className="text-button" type="button" onClick={onAction}>{actionLabel} <ArrowLeft size={15} /></button>}</div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="state-panel error-panel"><span className="state-icon error"><CircleAlert size={22} /></span><h3>تعذر تحميل المحطات</h3><p>{message}</p><button className="retry-button" type="button" onClick={onRetry}><RefreshCw size={16} /> إعادة المحاولة</button></div>;
}

function FeaturedSkeleton() {
  return <div className="featured-card skeleton-card"><span /><span /><div /><div /><div /></div>;
}

function StationSkeleton() {
  return <div className="station-card skeleton-station"><div /><section><span /><span /><span /><span /></section></div>;
}
