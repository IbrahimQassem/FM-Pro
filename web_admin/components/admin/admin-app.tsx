import { firestoreRoot, assertSelectedRoot } from '@/lib/firestore-root';
import { ContentEditor, RelationPicker } from './content-editor';
import { ScheduleAgenda } from './schedule-agenda';
import { BannerStatusBadge } from './banner-status-badge';
import { WorkspaceOverview, ScreenCoverage } from './workspace-overview';
import {
  isContentKind,
  editableFingerprint,
} from '@/lib/content-form';
import { loadRelationLabels, reportCommentPath } from '@/lib/admin-relations';
import { deleteEpisode } from '@/lib/delete-episode';
import { reviewReport } from '@/lib/review-report';
import { saveWithRelations } from '@/lib/save-content';

import { resourceQuery } from '@/lib/admin-query';
import { belongsToRoot } from '@/lib/firestore-environment';

import { useEffect, useMemo, useRef, useState } from 'react';
import { assertCounterAdjustment } from '@/lib/relationship-counter';
import { createAdminSessionGuard } from '@/lib/admin-session';
import { useAdminHash } from '@/lib/use-admin-hash';
import {
  readResourceStatus,
  readResourceParent,
  readResourceSearch,
  readReportType,
  resourceParentFilter,
  resourceStatusChoices,
  type StatusChoice,
} from '@/lib/resource-filters';
import {
  BarChart3,
  Sun,
  Moon,
  Monitor,
  MapPin,
  PanelsTopLeft,
  CalendarDays,
  CheckCircle2,
  EyeOff,
  Heart,
  Flag,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Pencil,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  UserX,
} from 'lucide-react';
import {
  type User,
  getIdTokenResult,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  startAfter,
  type QueryDocumentSnapshot,
  collection,
  doc,
  where,
  increment,
  limit,
  onSnapshot,
  query,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  resourceDefinitions,
  type ResourceDefinition,
  type ResourceKey,
} from '@/lib/admin-resources';
import { getFirebaseServices } from '@/lib/firebase-client';

type Section = 'overview' | 'coverage' | 'schedule' | ResourceKey;
type AdminRecord = {
  id: string;
  path: string;
  data: Record<string, unknown>;
  reference: DocumentReference;
  relationLabel?: string;
};
const navigation: Array<{
  section: Section;
  label: string;
  icon: typeof Radio;
}> = [
  { section: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { section: 'stations', label: 'المحطات', icon: Radio },
  { section: 'programs', label: 'البرامج والجداول', icon: CalendarDays },
  { section: 'schedule', label: 'الجدول الأسبوعي', icon: CalendarDays },
  { section: 'episodes', label: 'الحلقات', icon: PlayCircle },
  { section: 'banners', label: 'الإعلانات', icon: Megaphone },
  { section: 'locations', label: 'المدن والمناطق', icon: MapPin },
  { section: 'coverage', label: 'تجربة التطبيق', icon: PanelsTopLeft },
  { section: 'users', label: 'المستخدمون', icon: Users },
  { section: 'comments', label: 'التعليقات', icon: MessageSquare },
  { section: 'reports', label: 'طابور الإشراف', icon: Flag },
  { section: 'favorites', label: 'المفضلة', icon: Heart },
  { section: 'subscriptions', label: 'الاشتراكات', icon: BarChart3 },
];

export function AdminApp() {
  const [firestore, setFirestore] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<
    'loading' | 'signed-out' | 'admin' | 'denied' | 'config-error'
  >('loading');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    let cancelled = false;
    let disposeGuard = () => {};
    getFirebaseServices()
      .then((services) => {
        if (cancelled) return;
        setFirestore(services.firestore);
        const guard = createAdminSessionGuard<User>({
          // Read the delivered token: forcing refresh here recurses into the observer.
          isAdmin: async (nextUser) =>
            (await getIdTokenResult(nextUser)).claims.admin === true,
          signOut: () => signOut(services.auth),
          emit: (state) => {
            setUser(state.user);
            setAuthStatus(state.status);
            if (state.status === 'denied')
              setAuthError(
                state.reason === 'claims'
                  ? 'الحساب صحيح لكنه لا يحمل صلاحية admin.'
                  : 'تعذر التحقق من صلاحيات الحساب.',
              );
            else if (state.status === 'admin') setAuthError('');
          },
        });
        disposeGuard = () => guard.dispose();
        unsubscribe = onIdTokenChanged(services.auth, (nextUser) => {
          void guard.changed(nextUser);
        });
      })
      .catch(() => {
        if (!cancelled) setAuthStatus('config-error');
      });
    return () => {
      cancelled = true;
      disposeGuard();
      unsubscribe();
    };
  }, []);

  if (authStatus === 'loading') return <LoadingScreen />;
  if (authStatus !== 'admin' || !user || !firestore) {
    return (
      <SignInScreen
        status={authStatus === 'admin' ? 'signed-out' : authStatus}
        initialError={authError}
      />
    );
  }
  return <Dashboard firestore={firestore} user={user} />;
}

function SignInScreen({
  status,
  initialError,
}: {
  status: 'signed-out' | 'denied' | 'config-error';
  initialError: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const { auth } = await getFirebaseServices();
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError('تعذر تسجيل الدخول. تحقق من البيانات وصلاحية الحساب.');
    }
  }

  async function resetPassword() {
    const normalizedEmail = email.trim();
    setError('');
    setNotice('');
    if (!normalizedEmail) {
      setError('اكتب بريد حساب المشرف أولًا.');
      return;
    }

    setIsResetting(true);
    try {
      const { auth } = await getFirebaseServices();
      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: window.location.origin,
      });
      setNotice(
        'إذا كان البريد مرتبطًا بحساب فستصلك رسالة إعادة تعيين خلال دقائق.',
      );
    } catch (resetError) {
      const code =
        typeof resetError === 'object' &&
        resetError !== null &&
        'code' in resetError
          ? String(resetError.code)
          : '';
      if (code === 'auth/invalid-email') {
        setError('صيغة البريد الإلكتروني غير صحيحة.');
      } else if (
        code === 'auth/network-request-failed' ||
        code === 'auth/too-many-requests'
      ) {
        setError('تعذر إرسال الرسالة الآن. حاول مرة أخرى بعد قليل.');
      } else {
        setNotice(
          'إذا كان البريد مرتبطًا بحساب فستصلك رسالة إعادة تعيين خلال دقائق.',
        );
      }
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main
      className="grid min-h-screen place-items-center bg-background p-5"
      dir="rtl"
    >
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-[0_24px_80px_rgb(15_38_34/12%)] md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-primary p-10 text-primary-foreground md:flex md:flex-col md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/12">
              <Radio />
            </div>
            <div>
              <p className="text-xl font-bold">هدهد FM</p>
              <p className="text-xs text-white/65">مركز إدارة المحتوى</p>
            </div>
          </div>
          <div>
            <ShieldCheck className="mb-5 size-10 text-amber-300" />
            <h1 className="max-w-sm text-3xl font-bold leading-[1.4]">
              كل عمليات المحتوى في مساحة واحدة محمية.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
              إدارة المحطات والبرامج والجداول والحلقات والإعلانات، ومتابعة تفاعل
              الجمهور من مساحة عمل واحدة.
            </p>
          </div>
          <p className="text-xs text-white/50">{firestoreRoot}</p>
        </section>
        <section className="p-7 md:p-10">
          <div className="mb-8 md:hidden">
            <Radio className="text-primary" />
            <p className="mt-3 text-xl font-bold">إدارة هدهد FM</p>
          </div>
          <Badge variant="outline" className="mb-4">
            دخول إداري فقط
          </Badge>
          <h2 className="text-2xl font-bold">مرحبًا بعودتك</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            سجّل الدخول بحساب المشرف المعتمد.
          </p>
          {status === 'config-error' && (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>الإعداد غير مكتمل</AlertTitle>
              <AlertDescription>
                تعذر تهيئة الاتصال. تواصل مع مسؤول النظام.
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>تعذر الدخول</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {notice && (
            <Alert className="mt-5">
              <CheckCircle2 />
              <AlertTitle>تم استلام الطلب</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}
          <form className="mt-7 space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">كلمة المرور</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  disabled={status === 'config-error' || isResetting}
                  onClick={resetPassword}
                >
                  {isResetting ? 'جارٍ الإرسال…' : 'نسيت كلمة المرور؟'}
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={status === 'config-error'}
            >
              تسجيل الدخول الآمن
            </Button>
          </form>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            للحصول على صلاحية الإدارة، تواصل مع مسؤول النظام.
          </p>
        </section>
      </div>
    </main>
  );
}

function Dashboard({ firestore, user }: { firestore: Firestore; user: User }) {
  const readSection = (): Section => {
    const value = location.hash.slice(1).split('?')[0];
    return navigation.some((n) => n.section === value)
      ? (value as Section)
      : 'overview';
  };
  const [section, setSection] = useState<Section>(readSection);
  const acceptedHash = useRef(window.location.hash);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const t = localStorage.getItem('hudhud-admin-theme');
      return t === 'light' || t === 'dark' ? t : 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const changed = () => {
      const next = readSection();
      if (
        window.location.hash !== acceptedHash.current &&
        !window.dispatchEvent(
          new Event('admin-before-navigate', { cancelable: true }),
        )
      ) {
        window.history.replaceState(
          null,
          '',
          acceptedHash.current || '#overview',
        );
        return;
      }
      acceptedHash.current = window.location.hash;
      setSection(next);
    };
    window.addEventListener('hashchange', changed, true);
    return () => window.removeEventListener('hashchange', changed, true);
  }, [section]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && media.matches),
      );
    apply();
    media.addEventListener('change', apply);
    try {
      localStorage.setItem('hudhud-admin-theme', theme);
    } catch {
      /* Theme still works without storage. */
    }
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  const navigate = (key: Section) => {
    window.location.assign(`#${key}`);
  };
  const current = navigation.find((n) => n.section === section)!;
  return (
    <main className="min-h-screen bg-background text-foreground" dir="rtl">
      <a
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('workspace-content')?.focus();
        }}
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-card focus:p-4"
      >
        انتقل إلى المحتوى
      </a>
      <div className="mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[248px_1fr]">
        <aside className="hidden border-e bg-sidebar px-4 py-7 lg:flex lg:flex-col">
          <div className="mb-9 flex items-center gap-3 px-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Radio />
            </span>
            <div>
              <p className="text-xl font-bold">هدهد FM</p>
              <p className="mt-1 text-xs text-muted-foreground">
                مساحة إدارة المحتوى
              </p>
            </div>
          </div>
          <nav className="space-y-1" aria-label="التنقل الرئيسي">
            {navigation.map(({ section: key, label, icon: Icon }) => (
              <button
                key={key}
                aria-current={section === key ? 'page' : undefined}
                onClick={() => navigate(key)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-start text-sm transition-colors ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="size-[18px]" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <div className="rounded-2xl border bg-card p-4">
              <ShieldCheck className="mb-3 size-5 text-primary" />
              <p className="text-sm font-semibold">إدارة مسؤولة، محتوى موثوق</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                قرارات واضحة تحافظ على المحتوى والمجتمع.
              </p>
            </div>
          </div>
        </aside>
        <section className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-24 flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-5 py-4 backdrop-blur-xl md:px-9">
            <div>
              <p className="text-xs text-muted-foreground">
                مساحة العمل / {current.label}
              </p>
              <h1 className="mt-2 text-xl font-bold">{current.label}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  firestoreRoot === 'HudHudOfficial'
                    ? 'border-destructive text-destructive'
                    : 'border-primary text-primary'
                }
              >
                {firestoreRoot === 'HudHudOfficial' ? 'الإنتاج' : 'التطوير'}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                aria-label={`المظهر: ${theme === 'system' ? 'تلقائي' : theme === 'dark' ? 'داكن' : 'فاتح'}. تغيير المظهر`}
                onClick={() =>
                  setTheme((t) =>
                    t === 'system'
                      ? 'light'
                      : t === 'light'
                        ? 'dark'
                        : 'system',
                  )
                }
              >
                {theme === 'system' ? (
                  <Monitor />
                ) : theme === 'light' ? (
                  <Sun />
                ) : (
                  <Moon />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="تسجيل الخروج"
                onClick={async () => {
                  const { auth } = await getFirebaseServices();
                  await signOut(auth);
                }}
              >
                <LogOut />
              </Button>
            </div>
          </header>
          <nav
            className="border-b px-5 py-3 lg:hidden"
            aria-label="أقسام الإدارة"
          >
            <label className="sr-only" htmlFor="mobile-section">
              القسم
            </label>
            <select
              id="mobile-section"
              className="min-h-12 w-full rounded-xl border bg-card px-3"
              value={section}
              onChange={(e) => navigate(e.target.value as Section)}
            >
              {navigation.map((n) => (
                <option key={n.section} value={n.section}>
                  {n.label}
                </option>
              ))}
            </select>
          </nav>
          <div id="workspace-content" tabIndex={-1} className="p-5 md:p-9">
            {section === 'overview' ? (
              <WorkspaceOverview firestore={firestore} onNavigate={navigate} />
            ) : section === 'schedule' ? (
              <ScheduleAgenda
                firestore={firestore}
                onEdit={() => navigate('programs')}
              />
            ) : section === 'coverage' ? (
              <ScreenCoverage onNavigate={navigate} />
            ) : (
              <ResourcePanel
                key={section}
                firestore={firestore}
                user={user}
                resource={section}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ResourcePanel({
  firestore,
  user,
  resource,
}: {
  firestore: Firestore;
  user: User;
  resource: ResourceKey;
}) {
  const hash = useAdminHash();
  const status = readResourceStatus(resource, hash);
  const choices = resourceStatusChoices(resource);
  const parent = readResourceParent(resource, hash);
  const reportType = readReportType(resource, hash);
  const parentFilter = resourceParentFilter(resource);
  const changeParent = (value: string) => {
    const params = new URLSearchParams(hash.split('?')[1] ?? '');
    if (value) params.set('parent', value);
    else params.delete('parent');
    window.location.hash = resource + (params.size ? `?${params}` : '');
  };
  return (
    <div className="space-y-5">
      {choices.length > 0 && (
        <label className="flex flex-wrap items-center gap-3 text-sm">
          تصفية حسب الحالة
          <select
            className="min-h-12 rounded-xl border bg-card px-3"
            aria-label="تصفية حسب الحالة"
            value={status?.value ?? ''}
            onChange={(event) => {
              const params = new URLSearchParams(hash.split('?')[1] ?? '');
              if (event.target.value) params.set('status', event.target.value);
              else params.delete('status');
              window.location.hash =
                resource + (params.size ? `?${params}` : '');
            }}
          >
            <option value="">كل الحالات</option>
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">
            التصفية تشمل جميع سجلات البيئة قبل تقسيم الصفحات.
          </span>
        </label>
      )}
      {resource === 'reports' && (
        <label className="flex flex-wrap items-center gap-3 text-sm">
          نوع البلاغ
          <select
            aria-label="نوع البلاغ"
            className="min-h-12 rounded-xl border bg-card px-3"
            value={reportType}
            onChange={(event) => {
              const params = new URLSearchParams(hash.split('?')[1] ?? '');
              if (event.target.value) params.set('type', event.target.value);
              else params.delete('type');
              window.location.hash =
                resource + (params.size ? `?${params}` : '');
            }}
          >
            <option value="">كل الأنواع</option>
            <option value="comment">بلاغات التعليقات</option>
            <option value="user">بلاغات المستخدمين</option>
          </select>
        </label>
      )}
      {parentFilter && (
        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="px-2 text-sm font-medium">
            {parentFilter.label}
          </legend>
          <RelationPicker
            key={resource}
            firestore={firestore}
            kind={parentFilter.kind}
            selected={parent}
            onSelect={(option) =>
              changeParent(
                parentFilter.kind === 'locations'
                  ? String(option.data.cityCode)
                  : option.id,
              )
            }
          />
          {parent && (
            <Button variant="outline" onClick={() => changeParent('')}>
              إلغاء تصفية الارتباط
            </Button>
          )}
        </fieldset>
      )}
      <ResourcePage
        key={`${resource}:${status?.value ?? ''}:${parent}:${reportType}`}
        firestore={firestore}
        user={user}
        resource={resource}
        status={status}
        parent={parent}
        reportType={reportType}
      />
    </div>
  );
}
function ResourcePage({
  firestore,
  user,
  resource,
  status,
  parent,
  reportType,
}: {
  firestore: Firestore;
  user: User;
  resource: ResourceKey;
  status?: StatusChoice;
  parent: string;
  reportType: ReturnType<typeof readReportType>;
}) {
  const statusField = status?.field;
  const statusMatch = status?.match;
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [comments, setComments] = useState<AdminRecord[]>([]);
  const [commentContext, setCommentContext] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [cursors, setCursors] = useState<QueryDocumentSnapshot[]>([]);
  const [last, setLast] = useState<QueryDocumentSnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [more, setMore] = useState(false);
  const [cached, setCached] = useState(false);
  useEffect(() => {
    let active = true;
    let contextVersion = 0;
    const cursor = cursors.at(-1);
    const parentFilter = resourceParentFilter(resource);
    const request = query(
      resourceQuery(firestore, resource),
      ...(statusField ? [where(statusField, '==', statusMatch)] : []),
      ...(reportType ? [where('targetType', '==', reportType)] : []),
      ...(parent && parentFilter
        ? [where(parentFilter.field, '==', parent)]
        : []),
      ...(parent && resource === 'stations'
        ? [where('countryCode', '==', 'YE')]
        : []),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(50),
    );
    const unsubscribe = onSnapshot(
      request,
      { includeMetadataChanges: true },
      async (snapshot) => {
        if (!active) return;
        const version = ++contextVersion;
        setError('');
        const next = snapshot.docs
          .filter((d) => belongsToRoot(d.ref.path, firestoreRoot))
          .map((d) => ({
            id: d.id,
            path: d.ref.path,
            data: d.data(),
            reference: d.ref,
          }));
        setRecords(next);
        if (resource === 'reports') {
          setComments([]);
          setCommentContext('loading');
        }
        setLast(snapshot.docs.at(-1));
        setMore(snapshot.size === 50);
        setCached(snapshot.metadata.fromCache);
        setLoading(false);
        if (next.length > 0) {
          try {
            const labels = await loadRelationLabels(
              firestore,
              firestoreRoot,
              resource,
              next,
            );
            if (active && version === contextVersion)
              setRecords(
                next.map((record) => ({
                  ...record,
                  relationLabel: labels.get(record.path),
                })),
              );
          } catch {
            if (active && version === contextVersion)
              setError(
                'تعذر تحميل أسماء الارتباطات. البيانات الأساسية ما زالت متاحة.',
              );
          }
        }
        if (resource === 'reports') {
          const paths = [
            ...new Set(
              next.flatMap((record) => {
                const path = reportCommentPath(firestoreRoot, record.data);
                return path ? [path] : [];
              }),
            ),
          ];
          const result = await Promise.allSettled(
            paths.map((path) => getDocFromServer(doc(firestore, path))),
          );
          if (!active || version !== contextVersion) return;
          setComments(
            result.flatMap((r) =>
              r.status === 'fulfilled' && r.value.exists()
                ? [
                    {
                      id: r.value.id,
                      path: r.value.ref.path,
                      data: r.value.data(),
                      reference: r.value.ref,
                    },
                  ]
                : [],
            ),
          );
          const failed = result.some((r) => r.status === 'rejected');
          setCommentContext(failed ? 'error' : 'ready');
          if (failed) setError('تعذر تحميل بعض سياق البلاغات. أعد المحاولة.');
        }
      },
      () => {
        if (active) {
          setLoading(false);
          setError('تعذر تحميل البيانات. تحقق من الاتصال والصلاحيات.');
        }
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    firestore,
    resource,
    cursors,
    reload,
    statusField,
    statusMatch,
    parent,
    reportType,
  ]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {cached
            ? 'نسخة مخزنة — قد لا تعكس أحدث البيانات'
            : 'بيانات البيئة المحددة'}{' '}
          · الصفحة {(cursors.length + 1).toLocaleString('ar-YE')}
        </span>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setReload((v) => v + 1);
          }}
        >
          <RefreshCw /> تحديث
        </Button>
      </div>
      {loading ? (
        <output className="grid min-h-64 place-items-center rounded-2xl border bg-card text-muted-foreground">
          جارٍ تحميل المحتوى…
        </output>
      ) : resource === 'reports' ? (
        <ModerationQueue
          firestore={firestore}
          adminUid={user.uid}
          reports={records}
          comments={comments}
          commentContext={commentContext}
          error={error}
        />
      ) : (
        <ResourceView
          firestore={firestore}
          definition={resourceDefinitions[resource]}
          records={records}
          error={error}
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={loading || !cursors.length}
          onClick={() => {
            setLoading(true);
            setCursors((c) => c.slice(0, -1));
          }}
        >
          الصفحة السابقة
        </Button>
        <span className="text-xs text-muted-foreground">
          حتى ٥٠ سجلًا في الصفحة · البحث داخل الصفحة الحالية
        </span>
        <Button
          variant="outline"
          disabled={loading || !more || !last}
          onClick={() => {
            if (last) {
              setLoading(true);
              setCursors((c) => [...c, last]);
            }
          }}
        >
          الصفحة التالية
        </Button>
      </div>
    </div>
  );
}

function ModerationQueue({
  firestore,
  adminUid,
  reports,
  comments,
  commentContext,
  error,
}: {
  firestore: Firestore;
  adminUid: string;
  reports: AdminRecord[];
  comments: AdminRecord[];
  commentContext: 'loading' | 'ready' | 'error';
  error?: string;
}) {
  const [busyPath, setBusyPath] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const visibleReports = useMemo(
    () =>
      reports.toSorted((a, b) => {
        const statusOrder =
          Number(a.data.status !== 'open') - Number(b.data.status !== 'open');
        if (statusOrder !== 0) return statusOrder;
        return (
          timestampMillis(b.data.createdAt) - timestampMillis(a.data.createdAt)
        );
      }),
    [reports],
  );

  function sourceComment(report: AdminRecord) {
    return comments.find(
      (comment) =>
        comment.id === report.data.commentId &&
        comment.data.episodeId === report.data.episodeId,
    );
  }

  async function review(
    report: AdminRecord,
    resolution:
      | 'commentHidden'
      | 'commentRemoved'
      | 'userDisabled'
      | 'noAction',
  ) {
    if (
      resolution !== 'noAction' &&
      !window.confirm(
        resolution === 'userDisabled'
          ? 'سيُعطّل الحساب ويُمنع من نشر تعليقات جديدة. هل تريد المتابعة؟'
          : resolution === 'commentHidden'
            ? 'سيُخفى التعليق عن الجمهور مع الاحتفاظ به للمراجعة. هل تريد المتابعة؟'
            : 'سيُزال التعليق من الجمهور ويُغلق كل بلاغ مفتوح مرتبط به. هل تريد المتابعة؟',
      )
    )
      return;
    setBusyPath(report.path);
    setFeedback(null);
    try {
      assertSelectedRoot(report.reference.path);
      await reviewReport(
        firestore,
        firestoreRoot,
        report.reference,
        resolution,
        adminUid,
      );
      setFeedback({
        type: 'success',
        message:
          resolution === 'commentHidden'
            ? 'أُخفي التعليق وأُغلقت بلاغاته المفتوحة.'
            : resolution === 'commentRemoved'
              ? 'أُزيل التعليق وأُغلقت بلاغاته المفتوحة.'
              : resolution === 'userDisabled'
                ? 'عُطّل الحساب وحُسمت بلاغاته المفتوحة.'
                : 'أُغلق البلاغ دون اتخاذ إجراء.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error && error.name === 'ContentError'
            ? error.message
            : 'تعذر حفظ قرار الإشراف. أعد تحميل البلاغ للتحقق من حالته قبل المحاولة مجددًا.',
      });
    } finally {
      setBusyPath('');
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold">طابور الإشراف</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reports.filter((item) => item.data.status === 'open').length} بلاغًا
            مفتوحًا في الصفحة الحالية · لا تظهر هوية المبلّغ في هذه الواجهة
          </p>
        </div>
      </section>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>تعذر تحميل البلاغات</AlertTitle>
          <AlertDescription>
            تحقق من صلاحية admin وقواعد collection group للبلاغات.
          </AlertDescription>
        </Alert>
      )}
      {feedback && (
        <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>
            {feedback.type === 'error' ? 'لم يكتمل القرار' : 'تم حفظ القرار'}
          </AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4">
        {visibleReports.map((report) => {
          const comment = sourceComment(report);
          const isOpen = report.data.status === 'open';
          const validContext =
            reportCommentPath(firestoreRoot, report.data) !== null;
          const unavailable = !validContext
            ? 'ارتباط التعليق غير صالح. راجع بيانات البلاغ.'
            : commentContext === 'loading'
              ? 'جارٍ تحميل التعليق…'
              : commentContext === 'error'
                ? 'تعذر التحقق من التعليق. استخدم تحديث لإعادة المحاولة.'
                : 'التعليق غير موجود أو حُذف سابقًا.';
          const decisionDisabled =
            busyPath === report.path ||
            !validContext ||
            commentContext !== 'ready';
          return (
            <Card key={report.path}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Badge variant={isOpen ? 'destructive' : 'secondary'}>
                    {isOpen ? 'مفتوح' : reportStatusLabel(report.data.status)}
                  </Badge>
                  {report.data.targetType === 'user'
                    ? 'بلاغ مستخدم'
                    : 'بلاغ تعليق'}{' '}
                  · {reportReasonLabel(report.data.reason)}
                </CardTitle>
                <CardDescription>
                  {formatAdminTimestamp(report.data.createdAt)} · الحلقة{' '}
                  <span>
                    {report.relationLabel ??
                      readString(report.data, 'episodeId')}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    التعليق المبلّغ عنه
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {comment
                      ? readString(comment.data, 'content')
                      : unavailable}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    الكاتب:{' '}
                    {comment ? readString(comment.data, 'authorName') : '—'}
                  </p>
                </div>
                {readString(report.data, 'details') && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      تفاصيل المبلّغ
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {readString(report.data, 'details')}
                    </p>
                  </div>
                )}
                {!isOpen && (
                  <section
                    aria-label="القرار المسجّل"
                    className="rounded-xl border p-4 text-sm"
                  >
                    <h3 className="font-semibold">القرار المسجّل</h3>
                    <p className="mt-2">
                      {reportResolutionLabel(report.data.resolution)}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      وقت المراجعة:{' '}
                      {formatAdminTimestamp(report.data.reviewedAt)}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      معرّف المسؤول:{' '}
                      <span dir="ltr">
                        {readString(report.data, 'reviewedBy') || 'غير مسجّل'}
                      </span>
                    </p>
                  </section>
                )}
                {isOpen && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      disabled={decisionDisabled}
                      onClick={() => review(report, 'noAction')}
                    >
                      رفض البلاغ
                    </Button>
                    <Button
                      variant="outline"
                      disabled={
                        decisionDisabled ||
                        !comment ||
                        comment.data.status !== 'published'
                      }
                      onClick={() => review(report, 'commentHidden')}
                    >
                      <EyeOff /> إخفاء التعليق
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={
                        decisionDisabled ||
                        !comment ||
                        comment.data.status !== 'published'
                      }
                      onClick={() => review(report, 'commentRemoved')}
                    >
                      <Trash2 /> إزالة التعليق
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={decisionDisabled}
                      onClick={() => review(report, 'userDisabled')}
                    >
                      <UserX /> تعطيل الحساب
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {visibleReports.length === 0 && (
          <Card>
            <CardContent className="grid min-h-52 place-items-center text-sm text-muted-foreground">
              لا توجد بلاغات في هذا العرض.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ResourceView({
  firestore,
  definition,
  records,
  error,
}: {
  firestore: Firestore;
  definition: ResourceDefinition;
  records: AdminRecord[];
  error?: string;
}) {
  const hash = useAdminHash();
  const search = readResourceSearch(definition.key, hash);
  const setSearch = (value: string) => {
    const params = new URLSearchParams(hash.split('?')[1] ?? '');
    if (value) params.set('q', value.slice(0, 200));
    else params.delete('q');
    window.history.replaceState(
      null,
      '',
      '#' + definition.key + (params.size ? `?${params}` : ''),
    );
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  const [editor, setEditor] = useState<AdminRecord | 'new' | null>(null);
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      `${record.id} ${readString(record.data, definition.titleField)} ${readString(record.data, definition.relationField)} ${record.relationLabel ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [definition, records, search]);

  async function remove(record: AdminRecord) {
    if (
      !window.confirm(
        `هل تريد حذف ${definition.singular} «${recordTitle(record, definition)}»؟`,
      )
    )
      return;
    setBusyId(record.id);
    setFeedback(null);
    try {
      await deleteWithRelations(firestore, definition.key, record);
      setFeedback({
        type: 'success',
        message: 'تم الحذف وتحديث العلاقات بنجاح.',
      });
    } catch (caught) {
      setFeedback({
        type: 'error',
        message: caught instanceof Error ? caught.message : 'تعذر الحذف.',
      });
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold">{definition.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.length} سجلًا في الصفحة الحالية
          </p>
        </div>
        {definition.creatable && (
          <Button onClick={() => setEditor('new')}>
            <Plus /> إضافة {definition.singular}
          </Button>
        )}
      </section>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>تعذر تحميل البيانات</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {feedback && (
        <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>
            {feedback.type === 'error' ? 'لم تكتمل العملية' : 'تمت العملية'}
          </AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}
      <Card className="border-none shadow-[0_1px_2px_rgb(15_38_34/5%),0_10px_32px_rgb(15_38_34/5%)]">
        <CardHeader className="border-b">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-9"
              aria-label={`البحث في ${definition.label} بالصفحة الحالية`}
              placeholder={`ابحث في هذه الصفحة…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y md:hidden">
            {filtered.map((record) => (
              <article key={record.path} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words font-semibold">
                    {recordTitle(record, definition)}
                  </h3>
                  {definition.key === 'banners' ? (
                    <BannerStatusBadge data={record.data} />
                  ) : (
                    definition.statusField && (
                      <Badge
                        variant={
                          recordIsActive(record, definition)
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {recordStatus(record, definition)}
                      </Badge>
                    )
                  )}
                </div>
                <p className="break-words text-sm text-muted-foreground">
                  {record.relationLabel ||
                    readString(record.data, definition.relationField) ||
                    '—'}
                </p>
                <p
                  dir="ltr"
                  className="break-all text-right font-mono text-xs text-muted-foreground"
                >
                  {record.id}
                </p>
                {(definition.editable || definition.deletable) && (
                  <div className="flex gap-2">
                    {definition.editable && (
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={() => setEditor(record)}
                      >
                        <Pencil /> تعديل
                      </Button>
                    )}
                    {definition.deletable && (
                      <Button
                        variant="destructive"
                        className="min-h-11"
                        disabled={busyId === record.id}
                        onClick={() => remove(record)}
                      >
                        <Trash2 /> حذف
                      </Button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 text-right">
                    الاسم/المحتوى
                  </TableHead>
                  <TableHead className="text-right">معرّف السجل</TableHead>
                  <TableHead className="text-right">الارتباط</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="px-4 text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((record) => (
                  <TableRow key={record.path}>
                    <TableCell className="max-w-[340px] truncate px-4 font-medium">
                      {recordTitle(record, definition)}
                    </TableCell>
                    <TableCell
                      dir="ltr"
                      className="text-right text-xs text-muted-foreground"
                    >
                      {record.id}
                    </TableCell>
                    <TableCell>
                      {record.relationLabel ||
                        readString(record.data, definition.relationField) ||
                        '—'}
                    </TableCell>
                    <TableCell>
                      {definition.key === 'banners' ? (
                        <BannerStatusBadge data={record.data} />
                      ) : definition.statusField ? (
                        <Badge
                          variant={
                            recordIsActive(record, definition)
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {recordStatus(record, definition)}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {definition.editable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="تعديل"
                            onClick={() => setEditor(record)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {definition.deletable && (
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label="حذف"
                            disabled={busyId === record.id}
                            onClick={() => remove(record)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
              {search
                ? 'لا توجد نتائج في هذه الصفحة. جرّب صفحة أخرى أو امسح البحث.'
                : 'لا توجد سجلات في هذه الصفحة.'}
            </div>
          )}
        </CardContent>
      </Card>
      {editor !== null && (
        <ResourceEditor
          firestore={firestore}
          definition={definition}
          record={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setFeedback({
              type: 'success',
              message: 'تم حفظ البيانات والتحقق من العلاقات.',
            });
          }}
        />
      )}
    </div>
  );
}

function ResourceEditor({
  firestore,
  definition,
  record,
  onClose,
  onSaved,
}: {
  firestore: Firestore;
  definition: ResourceDefinition;
  record: AdminRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [id] = useState(
    () =>
      record?.id ??
      (definition.path ? doc(collection(firestore, definition.path)).id : ''),
  );
  const [initial] = useState(
    () =>
      record?.data ?? {
        ...definition.template,
        ...(definition.key === 'episodes'
          ? { broadcastAt: new Date().toISOString() }
          : {}),
      },
  );
  if (!isContentKind(definition.key)) return null;
  return (
    <ContentEditor
      firestore={firestore}
      kind={definition.key}
      label={definition.singular}
      initial={initial}
      isNew={!record}
      onClose={onClose}
      onSave={async (data) => {
        if (!definition.path) return;
        const location = await validateRelations(
          firestore,
          definition.key,
          data,
        );
        await saveWithRelations(
          firestore,
          firestoreRoot,
          definition.key,
          definition.path,
          id,
          fromEditable(data) as Record<string, unknown>,
          record,
          location,
          definition.template?.stats,
        );
        onSaved();
      }}
    />
  );
}

function contentError(message: string): Error {
  const error = new Error(message);
  error.name = 'ContentError';
  return error;
}
async function validateRelations(
  firestore: Firestore,
  key: ResourceKey,
  data: Record<string, unknown>,
) {
  if (key === 'programs' || key === 'episodes') {
    const kind = key === 'programs' ? 'stations' : 'programs';
    const id = readString(data, key === 'programs' ? 'stationId' : 'programId');
    if (!id || id.includes('/')) throw contentError('اختر ارتباطًا صالحًا.');
    const parent = await getDocFromServer(
      doc(firestore, `${firestoreRoot}/${kind}/${kind}`, id),
    );
    if (!parent.exists())
      throw contentError('السجل المرتبط لم يعد موجودًا. اختر سجلًا آخر.');
    if (key === 'episodes' && parent.data().stationId !== data.stationId)
      throw contentError('تغيّرت محطة البرنامج. أعد اختيار البرنامج.');
  }
  if (key === 'stations') {
    const locations = await getDocsFromServer(
      query(
        collection(firestore, `${firestoreRoot}/locations/locations`),
        where('cityCode', '==', data.cityCode),
        where('countryCode', '==', data.countryCode),
        limit(2),
      ),
    );
    if (locations.size !== 1)
      throw contentError('اختر مدينة موجودة برمز فريد في المرجع.');
    return locations.docs[0].ref;
  }
}

async function deleteWithRelations(
  firestore: Firestore,
  key: ResourceKey,
  record: AdminRecord,
) {
  assertSelectedRoot(record.reference.path);
  if (
    key === 'stations' &&
    (
      await getDocsFromServer(
        query(
          collection(firestore, `${firestoreRoot}/programs/programs`),
          where('stationId', '==', record.id),
          limit(1),
        ),
      )
    ).size > 0
  )
    throw new Error(
      'لا يمكن حذف محطة مرتبطة ببرامج. انقل البرامج أو احذفها أولًا.',
    );
  if (
    key === 'programs' &&
    (
      await getDocsFromServer(
        query(
          collection(firestore, `${firestoreRoot}/episodes/episodes`),
          where('programId', '==', record.id),
          limit(1),
        ),
      )
    ).size > 0
  )
    throw new Error(
      'لا يمكن حذف برنامج مرتبط بحلقات. انقل الحلقات أو احذفها أولًا.',
    );
  if (key === 'episodes')
    return deleteEpisode(firestore, record.reference, record.data);
  await runTransaction(firestore, async (transaction) => {
    const current = await transaction.get(record.reference);
    if (!current.exists()) return;
    const data = current.data();
    if (editableFingerprint(data) !== editableFingerprint(record.data))
      throw contentError('تغيّر السجل منذ تحميله. أعد تحميل الصفحة قبل الحذف.');
    const counter =
      key === 'stations'
        ? 'programsCount'
        : key === 'programs'
          ? 'episodesCount'
          : null;
    if (counter && Number(data.stats?.[counter] ?? 0) > 0)
      throw contentError('لا يمكن حذف سجل مرتبط بمحتوى آخر.');
    if (key === 'programs') {
      const parentKind = 'stations';
      const relation = 'stationId';
      const count = 'programsCount';
      const parent = doc(
        firestore,
        `${firestoreRoot}/${parentKind}/${parentKind}`,
        readString(data, relation),
      );
      const snapshot = await transaction.get(parent);
      if (!snapshot.exists())
        throw contentError(
          'الارتباط السابق غير موجود. راجع البيانات قبل الحذف.',
        );
      assertCounterAdjustment(snapshot.get(`stats.${count}`), -1);
      transaction.update(parent, { [`stats.${count}`]: increment(-1) });
    }
    transaction.delete(record.reference);
  });
}

function fromEditable(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((item) => fromEditable(item));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        fromEditable(childValue, childKey),
      ]),
    );
  if (
    typeof value === 'string' &&
    /(At|Date)$/.test(key) &&
    Number.isFinite(Date.parse(value))
  )
    return Timestamp.fromDate(new Date(value));
  return value;
}

function timestampMillis(value: unknown) {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

function formatAdminTimestamp(value: unknown) {
  return value instanceof Timestamp
    ? value.toDate().toLocaleString('ar-YE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'وقت غير متاح';
}

function reportReasonLabel(value: unknown) {
  const labels: Record<string, string> = {
    harassment: 'إساءة أو تحرش',
    hate: 'كراهية أو تمييز',
    sexualContent: 'محتوى جنسي أو استغلال',
    violence: 'تهديد أو عنف',
    spam: 'رسائل مزعجة أو تضليل',
    privacy: 'خصوصية أو انتحال هوية',
    other: 'سبب آخر',
  };
  return labels[String(value)] ?? 'سبب غير معروف';
}

function reportStatusLabel(value: unknown) {
  return value === 'resolved' ? 'تمت المعالجة' : 'مرفوض';
}

function recordIsActive(record: AdminRecord, definition: ResourceDefinition) {
  const status = record.data[definition.statusField ?? ''];
  return status === true || status === 'published';
}
function recordStatus(record: AdminRecord, definition: ResourceDefinition) {
  const status = record.data[definition.statusField ?? ''];
  if (definition.key === 'episodes')
    return status === true ? 'منشورة' : 'مسودة';
  if (definition.key === 'comments')
    return (
      (
        { published: 'منشور', hidden: 'مخفي', removed: 'مزال' } as Record<
          string,
          string
        >
      )[typeof status === 'string' ? status : ''] ?? 'حالة غير معروفة'
    );
  return status === true ? 'نشط' : 'غير نشط';
}
function recordTitle(record: AdminRecord, definition: ResourceDefinition) {
  return readString(record.data, definition.titleField) || record.id;
}
function readString(data: Record<string, unknown>, field?: string) {
  const value = field ? data[field] : '';
  return typeof value === 'string' ? value : '';
}
function LoadingScreen() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-background"
      dir="rtl"
    >
      <div className="text-center">
        <div className="mx-auto grid size-14 animate-pulse place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Radio />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          جارٍ تأمين جلسة الإدارة...
        </p>
      </div>
    </main>
  );
}

function reportResolutionLabel(value: unknown) {
  switch (value) {
    case 'noAction':
      return 'أُغلق البلاغ دون اتخاذ إجراء.';
    case 'commentHidden':
      return 'أُخفي التعليق عن الجمهور.';
    case 'commentRemoved':
      return 'أُزيل التعليق من الجمهور.';
    case 'userDisabled':
      return 'عُطّل حساب المستخدم.';
    default:
      return 'تفاصيل القرار غير مسجّلة.';
  }
}
