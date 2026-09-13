import { useEffect, useRef, useState } from 'react';
import { AccountRepository, type AccountView } from './lib/account-repository';
import { BrowserAlerts, type AlertItem } from './lib/browser-alerts';
import { stationHref, type Follow } from './lib/discovery';
import type { Station } from './lib/stations';
export type AccountPort = Pick<AccountRepository, 'start' | 'call' | 'login' | 'register' | 'resetPassword' | 'verify' | 'refresh' | 'updateName' | 'follow' | 'logout' | 'deleteAccount' | 'dispose'>;
export function AccountPanel({ stations, selectedStationId, createRepository = () => new AccountRepository() }: { stations: Station[]; selectedStationId: string | null; createRepository?: () => AccountPort }) {
  const repository = useRef<AccountPort | null>(null);
  const alerts = useRef<BrowserAlerts | null>(null);
  const alive = useRef(false);
  const busyRef = useRef(false);
  const [account, setAccount] = useState<AccountView | null>(null);
  const [ready, setReady] = useState(false);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false); const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [stationId, setStationId] = useState(selectedStationId || '');
  const [supported, setSupported] = useState(false); const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [inbox, setInbox] = useState<AlertItem[]>([]);
  useEffect(() => { if (selectedStationId) setStationId(selectedStationId); }, [selectedStationId]);
  useEffect(() => {
    alive.current = true;
    const repo = createRepository(); repository.current = repo;
    const device = new BrowserAlerts((action, data) => repo.call(action, data)); alerts.current = device;
    void repo.start((view, subscriptions, error) => { if (!alive.current) return; setAccount(view); setFollows(subscriptions); setReady(true); if (view) setName(view.displayName); else { setInbox([]); setPassword(''); setDeleteOpen(false); } if (error) setMessage('تعذر تحديث الحساب أو المتابعات. أعد المحاولة.'); }).catch(() => { if (alive.current) { setReady(true); setMessage('تعذر الاتصال بخدمة الحساب. أعد فتح الصفحة للمحاولة.'); } });
    void device.supported().then(value => { if (alive.current) setSupported(value); }).catch(() => undefined);
    return () => { alive.current = false; device.dispose(); repo.dispose(); repository.current = null; alerts.current = null; };
    // Own one repository for this mounted account surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ready && location.hash === '#account') document.getElementById('account-title')?.focus(); }, [ready]);
  const active = account?.active === true && account.verified;
  useEffect(() => {
    if (!active || !supported) { setInbox([]); setDeviceEnabled(false); alerts.current?.dispose(); return; }
    let cancelled = false;
    const reconcile = () => { void alerts.current?.reconcile().then(() => { if (!cancelled) setDeviceEnabled(alerts.current?.optedIn() || false); }).catch(() => { if (!cancelled) setMessage('تعذر تحديث تنبيهات هذا المتصفح. أعد المحاولة قبل تسجيل الخروج.'); }); };
    alerts.current?.listen(item => { if (!cancelled) setInbox(items => [item, ...items.filter(i => i.href !== item.href)].slice(0, 20)); });
    reconcile(); window.addEventListener('focus', reconcile);
    return () => { cancelled = true; window.removeEventListener('focus', reconcile); alerts.current?.dispose(); };
  }, [active, supported]);
  async function run(action: () => Promise<unknown>, success = 'تم حفظ التغيير.') {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage('');
    try { await action(); if (alive.current) setMessage(success); }
    catch { if (alive.current) setMessage('تعذر إكمال الطلب. تحقق من البيانات والاتصال ثم أعد المحاولة.'); }
    finally { if (alive.current) { setBusy(false); setPassword(''); setCode(''); } busyRef.current = false; }
  }
  function follow(id: string, enabled: boolean, notifications = false) { void run(() => repository.current!.follow(id, enabled, notifications)); }
  return <section className="content-section account-panel" id="account" aria-labelledby="account-title"><div className="account-heading"><img className="account-avatar" src="/assets/images/mascot/mascot_avatar_default.webp" alt="" width={56} height={56} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} /><h2 id="account-title" tabIndex={-1}>حسابي ومحطاتي</h2></div><p>الاستماع متاح للجميع. المتابعة تحفظ المحطة في حسابك، والتنبيهات اختيار منفصل.</p>
    {!ready && <p role="status">جارٍ تحميل الحساب…</p>}<p role="status">{message}</p>
    {ready && !account && <><div className="detail-actions"><button onClick={() => setMode('login')} aria-pressed={mode === 'login'}>تسجيل الدخول</button><button onClick={() => setMode('register')} aria-pressed={mode === 'register'}>إنشاء حساب</button><button onClick={() => setMode('reset')} aria-pressed={mode === 'reset'}>نسيت كلمة المرور</button></div>
      <form onSubmit={event => { event.preventDefault(); void run(() => mode === 'register' ? repository.current!.register(email, password, name) : mode === 'reset' ? repository.current!.resetPassword(email) : repository.current!.login(email, password), mode === 'reset' ? 'إذا كان البريد مؤهلاً فستصلك رسالة لاستعادة الحساب.' : mode === 'register' ? 'تحقق من بريدك للحصول على رمز التوثيق.' : 'تم تسجيل الدخول.'); }}>
        <fieldset disabled={busy}><legend>{mode === 'register' ? 'حساب جديد' : mode === 'reset' ? 'استعادة الحساب' : 'بيانات الدخول'}</legend>
          {mode === 'register' && <label>الاسم<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} required autoComplete="name" /></label>}
          <label>البريد الإلكتروني<input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
          {mode !== 'reset' && <label>كلمة المرور<input type="password" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>}
          <button type="submit">{busy ? 'جارٍ التنفيذ…' : mode === 'register' ? 'إنشاء الحساب وإرسال رمز التوثيق' : mode === 'reset' ? 'إرسال رابط الاستعادة' : 'دخول'}</button>
        </fieldset>
      </form></>}
    {account && <><p>{account.displayName || 'حساب المستمع'} · <bdi>{account.email}</bdi> · {account.verified ? 'بريد موثّق' : 'البريد غير موثّق'}</p>
      {!account.verified && <form onSubmit={event => { event.preventDefault(); void run(() => repository.current!.verify(code), 'تم توثيق البريد.'); }}><fieldset disabled={busy}><legend>توثيق البريد</legend><label>رمز التوثيق<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} required /></label><button>تحقق من الرمز</button><button type="button" onClick={() => void run(() => repository.current!.call('requestEmailVerificationCode'), 'تم طلب رمز جديد. انتظر وصول البريد قبل المحاولة مجدداً.')}>إعادة إرسال الرمز</button></fieldset></form>}
      {!active && account.verified && <p>الحساب غير جاهز للمتابعة أو موقوف. <button disabled={busy} onClick={() => void run(() => repository.current!.refresh())}>تحديث حالة الحساب</button></p>}
      {active && <><form onSubmit={event => { event.preventDefault(); void run(() => repository.current!.updateName(name)); }}><fieldset disabled={busy}><legend>تعديل الملف</legend><label>الاسم<input value={name} minLength={2} maxLength={120} onChange={e => setName(e.target.value)} required /></label><button>حفظ الاسم</button></fieldset></form>
        <h3>متابعة محطة</h3><label>المحطة<select value={stationId} onChange={e => setStationId(e.target.value)}><option value="">اختر محطة</option>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button disabled={busy || !stationId || follows.some(f => f.stationId === stationId && f.isActive)} onClick={() => follow(stationId, true)}>متابعة بدون تنبيهات</button>
        <h3>محطاتي</h3>{!follows.some(f => f.isActive) && <p>لم تتابع أي محطة بعد.</p>}{follows.filter(f => f.isActive).map(f => { const station = stations.find(s => s.id === f.stationId); return <div className="follow-row" key={f.stationId}>{station ? <a href={stationHref(station.id)}>{station.name}</a> : <span>محطة غير متاحة</span>}<button disabled={busy} onClick={() => follow(f.stationId, false)}>إلغاء المتابعة</button><button disabled={busy || !station || (!f.notificationsEnabled && !deviceEnabled)} aria-pressed={f.notificationsEnabled} onClick={() => follow(f.stationId, true, !f.notificationsEnabled)}>{f.notificationsEnabled ? 'إيقاف تنبيهات المحطة' : 'تفعيل تنبيهات المحطة'}</button></div>; })}
        <h3>تنبيهات هذا المتصفح</h3><p>تفعيل المتصفح يطلب إذنك لتلقي إشعارات الحلقات الجديدة. بعدها اختر تنبيهات كل محطة على حدة. يمكنك إيقافها في أي وقت.</p>
        {!supported && <p>التنبيهات غير متاحة في هذا المتصفح أو لم تكتمل تهيئتها بعد. يمكنك متابعة المحطات دون تنبيهات.</p>}
        <button disabled={busy || (!supported && !deviceEnabled)} onClick={() => { if (busyRef.current) return; const operation = deviceEnabled ? alerts.current!.disable() : alerts.current!.enable(); void run(async () => { await operation; setDeviceEnabled(alerts.current?.optedIn() || false); }); }}>{deviceEnabled ? 'إيقاف تنبيهات المتصفح' : 'السماح بتنبيهات المتصفح'}</button>
        {inbox.length > 0 && <><h3>وصلت أثناء هذه الجلسة</h3>{inbox.map(item => <p key={item.href}><a href={item.href}>{item.title}</a></p>)}</>}
      </>}
      <div className="detail-actions"><button disabled={busy} onClick={() => void run(async () => { await alerts.current!.disable(); await repository.current!.logout(); }, 'تم تسجيل الخروج.')}>تسجيل الخروج</button><button disabled={busy} onClick={() => { setDeleteOpen(v => !v); setDeleteConfirmed(false); setPassword(''); }}>حذف الحساب</button></div>
      {deleteOpen && <form onSubmit={event => { event.preventDefault(); void run(async () => { await alerts.current!.disable(); await repository.current!.deleteAccount(password); }, 'تم حذف الحساب.'); }}><fieldset disabled={busy}><legend>تأكيد حذف الحساب</legend><p>سيُحذف الحساب المشترك وبياناته من بيئتي هدهد، بما فيها المتابعات والتعليقات. لا يمكن التراجع عن الحذف. تبقى علامة أمان مؤقتة لمدة 24 ساعة ويزيلها التنظيف الدوري بعد ذلك.</p><label><input type="checkbox" checked={deleteConfirmed} onChange={e => setDeleteConfirmed(e.target.checked)} required /> أفهم أن الحذف نهائي</label><label>كلمة المرور الحالية<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label><button disabled={!deleteConfirmed}>حذف حسابي نهائياً</button><button type="button" onClick={() => setDeleteOpen(false)}>إلغاء</button><p>إذا كان حسابك يستخدم مزود دخول اجتماعي، أكمل الحذف من التطبيق بعد إعادة المصادقة.</p></fieldset></form>}
    </>}
  </section>;
}
