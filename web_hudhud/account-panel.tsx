import { useEffect, useRef, useState } from 'react';
import { AccountRepository, type AccountView } from './lib/account-repository';
import { BrowserAlerts, type AlertItem } from './lib/browser-alerts';
import { accountErrorMessage, deletionMethod, providerLabel, type ProfileUpdate } from './lib/account-profile';
import { ProfileAvatar } from './profile-avatar';
import { ProfileEditor } from './profile-editor';
import { stationHref, type Follow } from './lib/discovery';
import type { Station } from './lib/stations';
export type AccountPort = Pick<AccountRepository, 'start' | 'call' | 'login' | 'loginWithGoogle' | 'register' | 'resetPassword' | 'requestVerificationCode' | 'verify' | 'refresh' | 'updateAccountProfile' | 'follow' | 'logout' | 'deleteAccount' | 'dispose'>;
type AccountScreen = 'hub' | 'login' | 'register' | 'reset' | 'manage';
export function AccountPanel({ stations, selectedStationId, createRepository = () => new AccountRepository() }: { stations: Station[]; selectedStationId: string | null; createRepository?: () => AccountPort }) {
  const repository = useRef<AccountPort | null>(null);
  const alerts = useRef<BrowserAlerts | null>(null);
  const alive = useRef(false);
  const busyRef = useRef(false);
  const accountId = useRef<string | null>(null);
  const [account, setAccount] = useState<AccountView | null>(null);
  const [ready, setReady] = useState(false);
  const [startError, setStartError] = useState(false);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [screen, setScreen] = useState<AccountScreen>('hub');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false); const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [stationId, setStationId] = useState(selectedStationId || '');
  const [supported, setSupported] = useState(false); const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [inbox, setInbox] = useState<AlertItem[]>([]);
  useEffect(() => { if (selectedStationId) setStationId(selectedStationId); }, [selectedStationId]);
  useEffect(() => {
    alive.current = true;
    const repo = createRepository(); repository.current = repo;
    const device = new BrowserAlerts((action, data) => repo.call(action, data)); alerts.current = device;
    void repo.start((view, subscriptions, error) => {
      if (!alive.current) return;
      if (accountId.current !== (view?.id || null)) {
        accountId.current = view?.id || null;
        setEditing(false); setDeleteOpen(false); setDeleteConfirmed(false);
        setPassword(''); setCode(''); setName(''); setEmail(''); setVerificationEmail(''); setMessage(''); setInbox([]);
        setScreen(view && !view.verified ? 'manage' : 'hub');
      }
      setAccount(view); setFollows(subscriptions); setReady(true);
      if (error) setMessage('تعذر تحديث الحساب أو المتابعات. أعد المحاولة.');
    }).catch(() => { if (alive.current) { setStartError(true); setReady(true); setMessage('تعذر الاتصال بخدمة الحساب. أعد فتح الصفحة للمحاولة.'); } });
    void device.supported().then(value => { if (alive.current) setSupported(value); }).catch(() => undefined);
    return () => { alive.current = false; device.dispose(); repo.dispose(); repository.current = null; alerts.current = null; };
    // Own one repository for this mounted account surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ready && location.hash === '#account') document.getElementById('account-title')?.focus(); }, [ready, screen]);
  const active = account?.active === true && account.verified;
  useEffect(() => {
    if (!active || !supported) { setInbox([]); setDeviceEnabled(false); alerts.current?.dispose(); return; }
    let cancelled = false;
    const reconcile = () => { void alerts.current?.reconcile().then(() => { if (!cancelled) setDeviceEnabled(alerts.current?.optedIn() || false); }).catch(() => { if (!cancelled) setMessage('تعذر تحديث تنبيهات هذا المتصفح. أعد المحاولة قبل تسجيل الخروج.'); }); };
    alerts.current?.listen(item => { if (!cancelled) setInbox(items => [item, ...items.filter(i => i.href !== item.href)].slice(0, 20)); });
    reconcile(); window.addEventListener('focus', reconcile);
    return () => { cancelled = true; window.removeEventListener('focus', reconcile); alerts.current?.dispose(); };
  }, [active, supported, account?.id]);
  async function run(action: () => Promise<unknown>, success = 'تم حفظ التغيير.') {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage('');
    const startedAccount = accountId.current;
    const sameAccount = () => !startedAccount || !accountId.current || accountId.current === startedAccount;
    try { await action(); if (alive.current && sameAccount()) setMessage(success); }
    catch (error) { if (alive.current && sameAccount()) setMessage(accountErrorMessage(error)); }
    finally { if (alive.current) { setBusy(false); setPassword(''); setCode(''); } busyRef.current = false; }
  }
  function navigate(next: AccountScreen) {
    if (busyRef.current) return;
    setScreen(next); setPassword(''); setCode(''); setMessage(''); setDeleteOpen(false); setDeleteConfirmed(false);
  }
  async function saveProfile(update: ProfileUpdate) {
    if (busyRef.current) throw new Error('account-busy');
    busyRef.current = true; setBusy(true); setMessage('');
    try { await repository.current!.updateAccountProfile(update); if (alive.current) setMessage('تم تحديث الملف الشخصي.'); }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }
  function follow(id: string, enabled: boolean, notifications = false) { void run(() => repository.current!.follow(id, enabled, notifications)); }
  const method = deletionMethod(account?.providers || []);
  const title = ({ hub: 'حسابي ومحطاتي', manage: 'إدارة بيانات الحساب', login: 'تسجيل الدخول', register: 'إنشاء حساب جديد', reset: 'استعادة الحساب' })[screen];
  const googleButton = <button className="google-sign-in" disabled={busy} type="button" onClick={() => void run(() => repository.current!.loginWithGoogle(), 'تم تسجيل الدخول عبر Google.')}><span className="google-letter" aria-hidden="true">G</span> المتابعة باستخدام Google</button>;
  return <section className="content-section account-panel" id="account" aria-labelledby="account-title">
    <div className="account-heading"><h2 id="account-title" tabIndex={-1}>{title}</h2>{screen !== 'hub' && <button disabled={busy} onClick={() => navigate('hub')}>العودة إلى حسابي</button>}</div>
    <p>الاستماع متاح للجميع. المتابعة تحفظ المحطة في حسابك، والتنبيهات اختيار منفصل.</p>
    {!ready && <p role="status">جارٍ تحميل الحساب…</p>}
    <p role="status">{busy && !message ? 'جارٍ إكمال الطلب…' : message}</p>
    {startError && <button onClick={() => location.reload()}>إعادة تحميل الصفحة</button>}
    {ready && !startError && !account && (screen === 'hub' ? <div className="account-welcome">
      <img src="/assets/images/mascot/mascot_onboarding.webp" alt="" width={140} height={146} />
      <div><h3>أهلاً بك في هدهد</h3><p>سجّل الدخول لحفظ محطاتك وإدارة ملفك الشخصي من التطبيق والموقع.</p>
        <div className="detail-actions"><button className="account-primary" disabled={busy} onClick={() => navigate('login')}>تسجيل الدخول</button><button disabled={busy} onClick={() => navigate('register')}>إنشاء حساب جديد</button></div>{googleButton}
      </div>
    </div> : <div className="account-auth">
      {screen !== 'reset' && <>{googleButton}<p className="auth-divider">أو بالبريد الإلكتروني</p></>}
      <form onSubmit={event => { event.preventDefault(); void run(() => screen === 'register' ? repository.current!.register(email, password, name) : screen === 'reset' ? repository.current!.resetPassword(email) : repository.current!.login(email, password), screen === 'reset' ? 'إذا كان البريد مؤهلاً فستصلك رسالة لاستعادة الحساب.' : screen === 'register' ? 'تحقق من بريدك للحصول على رمز التوثيق.' : 'تم تسجيل الدخول.'); }}>
        <fieldset disabled={busy}><legend>{title}</legend>
          {screen === 'register' && <label>الاسم<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required autoComplete="name" /></label>}
          <label>البريد الإلكتروني<input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
          {screen !== 'reset' && <label>كلمة المرور<input type="password" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={screen === 'register' ? 'new-password' : 'current-password'} /></label>}
          <button className="account-primary" type="submit">{screen === 'register' ? 'إنشاء الحساب وإرسال رمز التوثيق' : screen === 'reset' ? 'إرسال رابط الاستعادة' : 'دخول'}</button>
        </fieldset>
      </form>
      <div className="detail-actions"><button disabled={busy} onClick={() => navigate(screen === 'register' ? 'login' : 'register')}>{screen === 'register' ? 'لديك حساب؟ تسجيل الدخول' : 'إنشاء حساب جديد'}</button>{screen !== 'reset' && <button disabled={busy} onClick={() => navigate('reset')}>نسيت كلمة المرور</button>}</div>
      <p className="profile-hint"><a href="https://hudhud-fm-admin-sanadev.web.app/privacy">سياسة الخصوصية</a> · <a href="https://hudhud-fm-admin-sanadev.web.app/terms">شروط الاستخدام</a></p>
    </div>)}
    {account && <>
      <div className="account-profile-card">
        <ProfileAvatar avatar={account.avatarUrl} className="profile-avatar-large" />
        <div><h3>{account.displayName || 'حساب المستمع'}</h3>{account.email && <p><bdi>{account.email}</bdi></p>}<span className={account.verified ? 'verification-badge verified' : 'verification-badge'}>{account.verified ? 'بريد موثّق' : 'البريد غير موثّق'}</span></div>
        {screen === 'hub' ? <button disabled={busy} onClick={() => navigate('manage')}>إدارة بيانات الحساب</button> : <button disabled={busy || !active} onClick={() => setEditing(true)}>تعديل الملف الشخصي</button>}
      </div>
      {account.profileStatus === 'loading' && <p role="status">جارٍ تحميل بيانات الملف الشخصي…</p>}
      {account.profileStatus === 'error' && <p>تعذر تحميل بيانات الحساب. <button disabled={busy} onClick={() => void run(() => repository.current!.refresh(), 'تم تحديث حالة الحساب.')}>إعادة المحاولة</button></p>}
      {!active && account.verified && account.profileStatus === 'ready' && <p>الحساب غير جاهز للمتابعة أو موقوف. <button disabled={busy} onClick={() => void run(() => repository.current!.refresh(), 'تم تحديث حالة الحساب.')}>تحديث حالة الحساب</button></p>}
      {!account.verified && (screen === 'hub' ? <p>وثّق بريدك لتعديل ملفك ومتابعة المحطات. <button disabled={busy} onClick={() => navigate('manage')}>توثيق البريد</button></p> : <form onSubmit={event => { event.preventDefault(); void run(() => repository.current!.verify(code), 'تم توثيق البريد.'); }}><fieldset disabled={busy}><legend>توثيق البريد</legend>
        <p>أدخل رمز التوثيق المكوّن من ستة أرقام المرسل إلى بريدك، أو اطلب رمزاً جديداً.</p>
        {!account.email && <label>بريد التوثيق<input type="email" dir="ltr" value={verificationEmail} onChange={e => setVerificationEmail(e.target.value)} autoComplete="email" /></label>}
        <label>رمز التوثيق<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} required /></label>
        <button className="account-primary">تحقق من الرمز</button><button type="button" disabled={!account.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail.trim())} onClick={() => void run(() => repository.current!.requestVerificationCode(account.email ? undefined : verificationEmail), 'تم طلب رمز جديد. انتظر وصول البريد قبل المحاولة مجدداً.')}>إرسال رمز التوثيق</button>
      </fieldset></form>)}
      {screen === 'manage' && <div className="account-methods"><h3>طرق تسجيل الدخول</h3><div className="provider-badges">{account.providers.map(provider => <span key={provider}>{providerLabel(provider)}</span>)}</div></div>}
      {screen === 'hub' && active && <div className="account-library">
        <h3>متابعة محطة</h3><label>المحطة<select value={stationId} onChange={e => setStationId(e.target.value)}><option value="">اختر محطة</option>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button disabled={busy || !stationId || follows.some(f => f.stationId === stationId && f.isActive)} onClick={() => follow(stationId, true)}>متابعة بدون تنبيهات</button>
        <h3>محطاتي</h3>{!follows.some(f => f.isActive) && <p>لم تتابع أي محطة بعد.</p>}{follows.filter(f => f.isActive).map(f => { const station = stations.find(s => s.id === f.stationId); return <div className="follow-row" key={f.stationId}>{station ? <a href={stationHref(station.id)}>{station.name}</a> : <span>محطة غير متاحة</span>}<button disabled={busy} onClick={() => follow(f.stationId, false)}>إلغاء المتابعة</button><button disabled={busy || !station || (!f.notificationsEnabled && !deviceEnabled)} aria-pressed={f.notificationsEnabled} onClick={() => follow(f.stationId, true, !f.notificationsEnabled)}>{f.notificationsEnabled ? 'إيقاف تنبيهات المحطة' : 'تفعيل تنبيهات المحطة'}</button></div>; })}
        <h3>تنبيهات هذا المتصفح</h3><p>تفعيل المتصفح يطلب إذنك لتلقي إشعارات الحلقات الجديدة. بعدها اختر تنبيهات كل محطة على حدة. يمكنك إيقافها في أي وقت.</p>
        {!supported && <p>التنبيهات غير متاحة في هذا المتصفح أو لم تكتمل تهيئتها بعد. يمكنك متابعة المحطات دون تنبيهات.</p>}
        <button disabled={busy || (!supported && !deviceEnabled)} onClick={() => { if (busyRef.current) return; const operation = deviceEnabled ? alerts.current!.disable() : alerts.current!.enable(); void run(async () => { await operation; setDeviceEnabled(alerts.current?.optedIn() || false); }); }}>{deviceEnabled ? 'إيقاف تنبيهات المتصفح' : 'السماح بتنبيهات المتصفح'}</button>
        {inbox.length > 0 && <><h3>وصلت أثناء هذه الجلسة</h3>{inbox.map(item => <p key={item.href}><a href={item.href}>{item.title}</a></p>)}</>}
      </div>}
      <div className="account-session-actions"><button disabled={busy} onClick={() => void run(async () => { await alerts.current!.disable(); await repository.current!.logout(); }, 'تم تسجيل الخروج.')}>تسجيل الخروج</button>
        {screen === 'manage' && <button className="account-delete" disabled={busy} onClick={() => { setDeleteOpen(v => !v); setDeleteConfirmed(false); setPassword(''); }}>حذف الحساب</button>}
      </div>
      {screen === 'manage' && deleteOpen && (method === 'app' ? <p>أكمل حذف الحساب من التطبيق بعد إعادة المصادقة بطريقة الدخول المرتبطة.</p> : <form onSubmit={event => { event.preventDefault(); if (!deleteConfirmed) return; void run(() => repository.current!.deleteAccount(password, () => alerts.current!.disable()), 'تم حذف الحساب.'); }}><fieldset disabled={busy}><legend>تأكيد حذف الحساب</legend>
        <p>سيُحذف حسابك وبياناته في التطبيق والموقع، بما فيها المتابعات والتعليقات والصور. لا يمكن التراجع عن الحذف. تبقى علامة أمان مؤقتة لمدة 24 ساعة ويزيلها التنظيف الدوري بعد ذلك.</p>
        <label className="checkbox-label"><input type="checkbox" checked={deleteConfirmed} onChange={e => setDeleteConfirmed(e.target.checked)} required /> أفهم أن الحذف نهائي</label>
        {method === 'password' ? <label>كلمة المرور الحالية<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label> : <p>ستفتح نافذة Google. اختر الحساب نفسه لتأكيد هويتك قبل الحذف.</p>}
        <button disabled={!deleteConfirmed}>{method === 'google' ? 'تأكيد عبر Google وحذف الحساب' : 'حذف حسابي نهائياً'}</button><button type="button" onClick={() => { setDeleteOpen(false); setDeleteConfirmed(false); setPassword(''); }}>إلغاء</button>
      </fieldset></form>)}
      {editing && <ProfileEditor key={account.id} displayName={account.displayName} avatarUrl={account.avatarUrl} onSave={saveProfile} onClose={() => setEditing(false)} />}
    </>}
  </section>;
}
