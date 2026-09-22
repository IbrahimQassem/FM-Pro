import { firestoreRoot, assertSelectedRoot } from '@/lib/firestore-root';
import { ContentEditor, RelationPicker } from './content-editor';
import { ScheduleAgenda } from './schedule-agenda';
import { AdvertisingWorkspace } from './advertising-workspace';
import { BannerStatusBadge } from './banner-status-badge';
import { WorkspaceOverview, ScreenCoverage } from './workspace-overview';
import { UserActionsModal, formatUserDate } from './user-actions-modal';
import { NotificationsManager } from './notifications-manager';
import { StationLogo } from './station-logo';
import { ResourceThumbnail } from './resource-thumbnail';
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
  matchRecordSearch,
  sortRecords,
  stationSortChoices,
  genericSortChoices,
  type StatusChoice,
} from '@/lib/resource-filters';
import {
  ArrowUpDown,
  BarChart3,
  Bell,
  Sun,
  Moon,
  Monitor,
  MapPin,
  PanelsTopLeft,
  CalendarDays,
  Calendar,
  CheckCircle2,
  EyeOff,
  Heart,
  Flag,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Pause,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  User as UserIcon,
  UserX,
  X,
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

type Section = 'overview' | 'coverage' | 'schedule' | 'advertising' | ResourceKey;
export type AdminRecord = {
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
  { section: 'notifications', label: 'الإشعارات والتنبيهات', icon: Bell },
  { section: 'advertising', label: 'الشراكات والحملات', icon: Megaphone },
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
          <div className="mt-auto space-y-3 pt-6">
            <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/15 font-bold text-primary">
                  {user.email ? (
                    user.email.charAt(0).toUpperCase()
                  ) : (
                    <UserIcon className="size-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-xs font-semibold text-foreground"
                    title={user.email || user.uid}
                  >
                    {user.email || 'حساب المدير'}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[11px] text-muted-foreground"
                    title={user.uid}
                  >
                    UID: {user.uid.slice(0, 10)}...
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <ShieldCheck className="size-3.5" /> مدير النظام
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const { auth } = await getFirebaseServices();
                    await signOut(auth);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                  title="تسجيل الخروج"
                >
                  <LogOut className="size-3" />
                  خروج
                </button>
              </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-1.5 text-xs shadow-xs"
                title={`مسجل بحساب: ${user.email || user.uid}`}
              >
                <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary">
                  <UserIcon className="size-3.5" />
                </span>
                <span className="max-w-[180px] truncate font-medium text-foreground sm:max-w-[240px]">
                  {user.email || user.displayName || user.uid}
                </span>
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  مدير النظام
                </Badge>
              </div>
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
            ) : section === 'notifications' ? (
              <NotificationsManager firestore={firestore} user={user} />
            ) : section === 'advertising' ? (
              <AdvertisingWorkspace />
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
    <div className="space-y-6">
      {resource === 'reports' && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 text-sm shadow-xs">
          {choices.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="font-medium">الحالة:</span>
              <select
                className="h-10 rounded-xl border bg-background px-3"
                aria-label="تصفية حسب الحالة"
                value={status?.value ?? ''}
                onChange={(event) => {
                  const params = new URLSearchParams(hash.split('?')[1] ?? '');
                  if (event.target.value)
                    params.set('status', event.target.value);
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
            </label>
          )}
          <label className="flex items-center gap-2">
            <span className="font-medium">نوع البلاغ:</span>
            <select
              aria-label="نوع البلاغ"
              className="h-10 rounded-xl border bg-background px-3"
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
        </div>
      )}
      {parentFilter && (
        <section aria-label={parentFilter.label} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {parentFilter.label}
            </span>
            {parent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeParent('')}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                إلغاء تصفية الارتباط
              </Button>
            )}
          </div>
          <RelationPicker
            key={resource}
            firestore={firestore}
            kind={parentFilter.kind}
            selected={parent}
            borderless
            onSelect={(option) => changeParent(option.id)}
          />
        </section>
      )}
      <ResourcePage
        key={`${resource}:${status?.value ?? ''}:${parent}:${reportType}`}
        firestore={firestore}
        user={user}
        resource={resource}
        status={status}
        choices={choices}
        parent={parent}
        reportType={reportType}
      />
    </div>
  );
}

function resourceCountLabel(key: ResourceKey, count: number): string {
  const formatted = count.toLocaleString('ar-YE');
  switch (key) {
    case 'stations':
      return `${formatted} محطة`;
    case 'programs':
      return `${formatted} برنامج`;
    case 'users':
      return `${formatted} مستخدم`;
    case 'locations':
      return `${formatted} ${count === 1 ? 'مدينة' : count === 2 ? 'مدينتان' : count >= 3 && count <= 10 ? 'مدن' : 'مدينة'}`;
    case 'episodes':
      return `${formatted} حلقة`;
    case 'banners':
      return `${formatted} إعلان`;
    case 'reports':
      return `${formatted} بلاغ`;
    case 'comments':
      return `${formatted} تعليق`;
    case 'favorites':
      return `${formatted} عنصر بالمفضلة`;
    case 'subscriptions':
      return `${formatted} اشتراك`;
    default:
      return `${formatted} سجل`;
  }
}

function ResourcePage({
  firestore,
  user,
  resource,
  status,
  choices,
  parent,
  reportType,
}: {
  firestore: Firestore;
  user: User;
  resource: ResourceKey;
  status?: StatusChoice;
  choices?: StatusChoice[];
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
    const isReports = resource === 'reports';
    const cursor = cursors.at(-1);
    const parentFilter = resourceParentFilter(resource);
    const request = query(
      resourceQuery(firestore, resource),
      ...(statusField ? [where(statusField, '==', statusMatch)] : []),
      ...(reportType ? [where('targetType', '==', reportType)] : []),
      ...(parent && parentFilter
        ? [where(parentFilter.field, '==', parent)]
        : []),
      ...(isReports && cursor ? [startAfter(cursor)] : []),
      limit(isReports ? 50 : 2000),
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
        setMore(isReports ? snapshot.size === 50 : false);
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
      {resource === 'reports' && (
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
            <RefreshCw className={loading ? 'animate-spin' : ''} /> تحديث
          </Button>
        </div>
      )}
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
          key={resource}
          firestore={firestore}
          definition={resourceDefinitions[resource]}
          records={records}
          error={error}
          onRefresh={() => {
            setLoading(true);
            setReload((v) => v + 1);
          }}
          loading={loading}
          isCached={cached}
          status={status}
          statusChoices={choices}
          onStatusChange={(val) => {
            const params = new URLSearchParams(
              window.location.hash.split('?')[1] ?? '',
            );
            if (val) params.set('status', val);
            else params.delete('status');
            window.location.hash =
              resource + (params.size ? `?${params}` : '');
          }}
        />
      )}
      {resource === 'reports' && (
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
            حتى ٥٠ بلاغاً في الصفحة · الصفحة {(cursors.length + 1).toLocaleString('ar-YE')}
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
      )}
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
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 shadow-2xs">
              إجمالي البلاغات: {resourceCountLabel('reports', reports.length)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              المفتوحة: {reports.filter((item) => item.data.status === 'open').length.toLocaleString('ar-YE')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              المعالجة: {reports.filter((item) => item.data.status !== 'open').length.toLocaleString('ar-YE')}
            </span>
          </div>
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
  onRefresh,
  loading,
  isCached,
  status,
  statusChoices,
  onStatusChange,
}: {
  firestore: Firestore;
  definition: ResourceDefinition;
  records: AdminRecord[];
  error?: string;
  onRefresh?: () => void;
  loading?: boolean;
  isCached?: boolean;
  status?: StatusChoice;
  statusChoices?: StatusChoice[];
  onStatusChange?: (value: string) => void;
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
  const [actionUser, setActionUser] = useState<AdminRecord | null>(null);
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [playingStation, setPlayingStation] = useState<{
    id: string;
    name: string;
    url: string;
    logoUrl?: unknown;
    thumbnailUrl?: unknown;
  } | null>(null);
  const stationAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = stationAudioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      setPlayingStation(null);
    };
  }, [definition.key]);

  function togglePlayStation(record: AdminRecord) {
    const rawUrl =
      (typeof record.data.streamUrl === 'string' &&
        record.data.streamUrl.trim()) ||
      (typeof record.data.backupStreamUrl === 'string' &&
        record.data.backupStreamUrl.trim()) ||
      '';

    if (!rawUrl || rawUrl === 'https://' || rawUrl === 'http://') {
      setFeedback({
        type: 'error',
        message: `المحطة «${recordTitle(record, definition)}» لا تحتوي على رابط بث صالح.`,
      });
      return;
    }

    if (playingStation?.id === record.id) {
      if (stationAudioRef.current) {
        stationAudioRef.current.pause();
        stationAudioRef.current.removeAttribute('src');
        stationAudioRef.current.load();
      }
      setPlayingStation(null);
    } else {
      const name = recordTitle(record, definition);
      setPlayingStation({
        id: record.id,
        name,
        url: rawUrl,
        logoUrl: record.data.logoUrl,
        thumbnailUrl: record.data.thumbnailUrl,
      });
      setFeedback(null);
      if (stationAudioRef.current) {
        stationAudioRef.current.src = rawUrl;
        stationAudioRef.current.play().catch(() => {
          setFeedback({
            type: 'error',
            message:
              'تعذر تشغيل البث في المتصفح. تأكد من أن رابط البث يعمل ويدعم HTTPS.',
          });
          setPlayingStation(null);
        });
      }
    }
  }

  const [featureFilter, setFeatureFilter] = useState<
    'all' | 'live' | 'featured' | 'verified'
  >('all');
  const [userRoleFilter, setUserRoleFilter] = useState<
    'all' | 'super_admin' | 'station_admin' | 'moderator' | 'listener'
  >('all');
  const [sortBy, setSortBy] = useState('newest');

  const featureCounts = useMemo(() => {
    if (definition.key !== 'stations') {
      return { live: 0, featured: 0, verified: 0 };
    }
    let live = 0;
    let featured = 0;
    let verified = 0;
    for (const r of records) {
      if (r.data.isLive === true) live++;
      if (r.data.isFeatured === true) featured++;
      if (r.data.isVerified === true) verified++;
    }
    return { live, featured, verified };
  }, [definition.key, records]);

  const userRoleCounts = useMemo(() => {
    if (definition.key !== 'users') {
      return { super_admin: 0, station_admin: 0, moderator: 0, listener: 0 };
    }
    let super_admin = 0;
    let station_admin = 0;
    let moderator = 0;
    let listener = 0;
    for (const r of records) {
      const role = typeof r.data.role === 'string' ? r.data.role : 'listener';
      if (role === 'super_admin') super_admin++;
      else if (role === 'station_admin') station_admin++;
      else if (role === 'moderator') moderator++;
      else listener++;
    }
    return { super_admin, station_admin, moderator, listener };
  }, [definition.key, records]);


  const filterKey = `${search}:${featureFilter}:${userRoleFilter}:${sortBy}:${status?.value ?? ''}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const currentPage = pageState.key === filterKey ? pageState.page : 1;
  const setCurrentPage = (updater: number | ((p: number) => number)) => {
    setPageState((prev) => {
      const active = prev.key === filterKey ? prev.page : 1;
      const next = typeof updater === 'function' ? updater(active) : updater;
      return { key: filterKey, page: next };
    });
  };
  const pageSize = 50;

  const filteredAndSorted = useMemo(() => {
    let list = records.filter((record) =>
      matchRecordSearch(record, search, definition.key),
    );

    if (definition.key === 'stations') {
      if (featureFilter === 'live') {
        list = list.filter((r) => r.data.isLive === true);
      } else if (featureFilter === 'featured') {
        list = list.filter((r) => r.data.isFeatured === true);
      } else if (featureFilter === 'verified') {
        list = list.filter((r) => r.data.isVerified === true);
      }
    } else if (definition.key === 'users') {
      if (userRoleFilter === 'super_admin') {
        list = list.filter((r) => r.data.role === 'super_admin');
      } else if (userRoleFilter === 'station_admin') {
        list = list.filter((r) => r.data.role === 'station_admin');
      } else if (userRoleFilter === 'moderator') {
        list = list.filter((r) => r.data.role === 'moderator');
      } else if (userRoleFilter === 'listener') {
        list = list.filter(
          (r) =>
            !r.data.role ||
            r.data.role === 'listener' ||
            (r.data.role !== 'super_admin' && r.data.role !== 'station_admin' && r.data.role !== 'moderator'),
        );
      }
    }

    return sortRecords(list, sortBy, definition.key);
  }, [records, search, definition.key, featureFilter, userRoleFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const hasActiveFilters = Boolean(
    search ||
      featureFilter !== 'all' ||
      userRoleFilter !== 'all' ||
      sortBy !== 'newest' ||
      Boolean(status),
  );

  const resetFilters = () => {
    setSearch('');
    setFeatureFilter('all');
    setUserRoleFilter('all');
    setSortBy('newest');
    if (onStatusChange) onStatusChange('');
  };

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
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">
              {isCached ? 'نسخة مخزنة' : 'بيانات البيئة المحددة'}
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {definition.label}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 shadow-2xs">
              إجمالي {definition.label}: {resourceCountLabel(definition.key, records.length)}
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                المعروض حسب التصفية: {resourceCountLabel(definition.key, filteredAndSorted.length)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <Button
              variant="outline"
              disabled={loading}
              onClick={onRefresh}
              className="min-h-11 shadow-xs"
              aria-label="تحديث البيانات"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              تحديث
            </Button>
          )}
          {definition.creatable && (
            <Button
              onClick={() => setEditor('new')}
              className="min-h-11 font-medium shadow-xs"
            >
              <Plus /> إضافة {definition.singular}
            </Button>
          )}
        </div>
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
        <CardHeader className="space-y-4 border-b p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                className="pr-10 pl-9 h-11 rounded-xl border bg-background text-sm shadow-xs focus-visible:ring-2"
                aria-label={`البحث في ${definition.label}`}
                placeholder={
                  definition.key === 'stations'
                    ? 'ابحث في جميع المحطات (الاسم، التردد، المدينة، المعرّف)…'
                    : definition.key === 'users'
                      ? 'ابحث في جميع المستخدمين (الاسم، البريد، المعرّف)…'
                      : definition.key === 'locations'
                        ? 'ابحث في جميع المدن والمناطق…'
                        : definition.key === 'programs'
                          ? 'ابحث في جميع البرامج والمقدمين…'
                          : `ابحث في جميع سجلات ${definition.label}…`
                }
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => setSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {statusChoices && statusChoices.length > 0 && onStatusChange && (
                <div className="flex items-center">
                  <select
                    aria-label="تصفية حسب الحالة"
                    className="h-11 rounded-xl border bg-background px-3 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                    value={status?.value ?? ''}
                    onChange={(e) => onStatusChange(e.target.value)}
                  >
                    <option value="">كل الحالات</option>
                    {statusChoices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {definition.key === 'stations' && (
                <select
                  aria-label="نوع المحطة والمميزات"
                  className="h-11 rounded-xl border bg-background px-3 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  value={featureFilter}
                  onChange={(e) =>
                    setFeatureFilter(
                      e.target.value as 'all' | 'live' | 'featured' | 'verified',
                    )
                  }
                >
                  <option value="all">كل المميزات</option>
                  <option value="live">بث مباشر فقط</option>
                  <option value="featured">المحطات المميزة</option>
                  <option value="verified">المحطات الموثقة</option>
                </select>
              )}

              {definition.key === 'users' && (
                <select
                  aria-label="تصفية حسب الصلاحية"
                  className="h-11 rounded-xl border bg-background px-3 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                  value={userRoleFilter}
                  onChange={(e) =>
                    setUserRoleFilter(
                      e.target.value as 'all' | 'super_admin' | 'station_admin' | 'moderator' | 'listener',
                    )
                  }
                >
                  <option value="all">كل الصلاحيات ({records.length})</option>
                  <option value="super_admin">مدير عام ({userRoleCounts.super_admin})</option>
                  <option value="station_admin">مدير محطة ({userRoleCounts.station_admin})</option>
                  <option value="moderator">مشرف ({userRoleCounts.moderator})</option>
                  <option value="listener">مستمع ({userRoleCounts.listener})</option>
                </select>
              )}

              <div className="flex items-center gap-1.5 rounded-xl border bg-background px-2.5 shadow-xs">
                <ArrowUpDown className="size-4 text-muted-foreground shrink-0" />
                <select
                  aria-label="ترتيب السجلات"
                  className="h-11 bg-transparent pr-1 pl-2 text-sm focus-visible:outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {definition.key === 'stations'
                    ? stationSortChoices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))
                    : genericSortChoices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                </select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-11 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5 ms-1" />
                  إعادة تعيين
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                {hasActiveFilters ? (
                  <>
                    تم العثور على{' '}
                    <strong className="font-semibold text-foreground">
                      {filteredAndSorted.length.toLocaleString('ar-YE')}
                    </strong>{' '}
                    من أصل {resourceCountLabel(definition.key, records.length)}
                  </>
                ) : (
                  <>
                    إجمالي السجلات المسجلة:{' '}
                    <strong className="font-semibold text-foreground">
                      {resourceCountLabel(definition.key, records.length)}
                    </strong>
                  </>
                )}
              </span>
              {status && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary text-[11px] font-medium">
                  {status.label}
                </span>
              )}
            </div>
            {definition.key === 'stations' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground ml-1">
                  تصفية سريعة:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFeatureFilter((f) => (f === 'live' ? 'all' : 'live'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    featureFilter === 'live'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  بث مباشر ({featureCounts.live})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFeatureFilter((f) =>
                      f === 'featured' ? 'all' : 'featured',
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    featureFilter === 'featured'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="size-3 text-amber-500" />
                  مميزة ({featureCounts.featured})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFeatureFilter((f) =>
                      f === 'verified' ? 'all' : 'verified',
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    featureFilter === 'verified'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 className="size-3 text-blue-500" />
                  موثقة ({featureCounts.verified})
                </button>
              </div>
            )}
            {definition.key === 'users' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground ml-1">
                  تصفية سريعة:
                </span>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter('all')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    userRoleFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  الكل ({records.length})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setUserRoleFilter((r) => (r === 'super_admin' ? 'all' : 'super_admin'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    userRoleFilter === 'super_admin'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldCheck className="size-3 text-red-500" />
                  مدير عام ({userRoleCounts.super_admin})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setUserRoleFilter((r) => (r === 'station_admin' ? 'all' : 'station_admin'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    userRoleFilter === 'station_admin'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Radio className="size-3 text-amber-500" />
                  مدير محطة ({userRoleCounts.station_admin})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setUserRoleFilter((r) => (r === 'moderator' ? 'all' : 'moderator'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    userRoleFilter === 'moderator'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldCheck className="size-3 text-blue-500" />
                  مشرف ({userRoleCounts.moderator})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setUserRoleFilter((r) => (r === 'listener' ? 'all' : 'listener'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    userRoleFilter === 'listener'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserIcon className="size-3 text-muted-foreground" />
                  مستمع ({userRoleCounts.listener})
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y md:hidden">
            {paginatedRecords.map((record) => {
              const isPlaying = playingStation?.id === record.id;
              const isStation = definition.key === 'stations';
              const isUser = definition.key === 'users';
              const isUserActive = isUser ? record.data.isActive !== false : false;
              const userRole = isUser
                ? (typeof record.data.role === 'string' ? record.data.role : 'listener')
                : '';
              const frequency = isStation && typeof record.data.frequency === 'string'
                ? record.data.frequency.trim()
                : '';
              const cityName = isStation && typeof record.data.cityNameAr === 'string'
                ? record.data.cityNameAr.trim()
                : '';
              return (
                <article
                  key={record.path}
                  className={`space-y-3 p-4 transition-colors ${
                    isPlaying ? 'bg-primary/5 dark:bg-primary/10 border-s-4 border-s-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 flex items-start gap-3">
                      <ResourceThumbnail
                        resource={definition.key}
                        record={record}
                        title={recordTitle(record, definition)}
                        className="size-11"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="break-words font-semibold text-base">
                            {recordTitle(record, definition)}
                          </h3>
                          {isUser && typeof record.data.username === 'string' && record.data.username && (
                            <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border" dir="ltr">
                              @{record.data.username}
                            </span>
                          )}
                          {frequency && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-secondary font-semibold text-secondary-foreground">
                              {frequency}
                            </span>
                          )}
                        </div>
                        {definition.key === 'users' && typeof record.data.email === 'string' && record.data.email && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">
                            {record.data.email}
                          </p>
                        )}
                        {typeof record.data.nameEn === 'string' && record.data.nameEn && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {record.data.nameEn}
                          </p>
                        )}
                      </div>
                    </div>
                    {definition.key === 'banners' ? (
                      <BannerStatusBadge data={record.data} />
                    ) : isUser ? (
                      <Badge
                        variant={isUserActive ? 'outline' : 'destructive'}
                        className={
                          isUserActive
                            ? 'text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1'
                            : 'text-[11px] gap-1'
                        }
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            isUserActive ? 'bg-emerald-500' : 'bg-destructive-foreground'
                          }`}
                        />
                        {isUserActive ? 'حساب نشط' : 'حساب معطل'}
                      </Badge>
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

                  {isStation ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {cityName && (
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <MapPin className="size-3 text-muted-foreground" />
                          {cityName}
                        </span>
                      )}
                      {record.data.isLive === true && (
                        <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1 py-0">
                          <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                          بث حي
                        </Badge>
                      )}
                      {record.data.isFeatured === true && (
                        <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-500/30 bg-amber-500/10 gap-1 py-0">
                          <Sparkles className="size-2.5" />
                          مميزة
                        </Badge>
                      )}
                      {record.data.isVerified === true && (
                        <Badge variant="outline" className="text-[11px] text-blue-600 border-blue-500/30 bg-blue-500/10 gap-1 py-0">
                          <CheckCircle2 className="size-2.5" />
                          موثقة
                        </Badge>
                      )}
                    </div>
                  ) : isUser ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-muted-foreground/70 shrink-0" />
                        <span>
                          تاريخ التسجيل:{' '}
                          <strong className={record.data.createdAt ? 'font-medium text-foreground' : 'font-normal italic text-muted-foreground/70'}>
                            {formatUserDate(record.data.createdAt, 'غير متوفر')}
                          </strong>
                        </span>
                      </div>
                      <div>
                        {userRole === 'super_admin' ? (
                          <Badge variant="default" className="text-[11px] gap-1 py-0">
                            <ShieldCheck className="size-2.5 text-red-400" />
                            مدير عام
                          </Badge>
                        ) : userRole === 'station_admin' ? (
                          <Badge variant="secondary" className="text-[11px] gap-1 py-0">
                            <Radio className="size-2.5 text-amber-500" />
                            مدير محطة
                          </Badge>
                        ) : userRole === 'moderator' ? (
                          <Badge variant="secondary" className="text-[11px] gap-1 py-0">
                            <ShieldCheck className="size-2.5 text-blue-500" />
                            مشرف
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] gap-1 py-0 text-muted-foreground">
                            <UserIcon className="size-2.5 text-muted-foreground" />
                            مستمع
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="break-words text-sm text-muted-foreground">
                      {record.relationLabel ||
                        readString(record.data, definition.relationField) ||
                        '—'}
                    </p>
                  )}

                  {!isUser && (
                    <p
                      dir="ltr"
                      className="break-all text-right font-mono text-xs text-muted-foreground"
                    >
                      {record.id}
                    </p>
                  )}

                  {(definition.editable ||
                    isStation ||
                    definition.key === 'users' ||
                    definition.deletable) && (
                    <div className="flex gap-2 pt-1 flex-wrap">
                      {definition.key === 'users' && (
                        <Button
                          variant="outline"
                          className="min-h-11 flex-1 shadow-xs border-primary/30 hover:bg-primary/5 text-primary"
                          onClick={() => setActionUser(record)}
                        >
                          <ShieldCheck className="size-4" /> إدارة الحساب
                        </Button>
                      )}
                      {definition.editable && (
                        <Button
                          variant="outline"
                          className="min-h-11 flex-1 shadow-xs"
                          onClick={() => setEditor(record)}
                        >
                          <Pencil className="size-4" /> تعديل
                        </Button>
                      )}
                      {isStation ? (
                        <Button
                          variant={isPlaying ? 'default' : 'outline'}
                          className={`min-h-11 flex-1 shadow-xs ${
                            isPlaying ? 'bg-primary text-primary-foreground animate-pulse' : ''
                          }`}
                          onClick={() => togglePlayStation(record)}
                        >
                          {isPlaying ? (
                            <Pause className="size-4" />
                          ) : (
                            <Play className="size-4" />
                          )}
                          {isPlaying ? 'إيقاف البث' : 'تشغيل البث'}
                        </Button>
                      ) : (
                        definition.deletable && (
                          <Button
                            variant="destructive"
                            className="min-h-11"
                            disabled={busyId === record.id}
                            onClick={() => remove(record)}
                          >
                            <Trash2 /> حذف
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 text-right">
                    {definition.key === 'stations'
                      ? 'المحطة والتردد'
                      : definition.key === 'users'
                        ? 'المستخدم'
                        : 'الاسم/المحتوى'}
                  </TableHead>
                  <TableHead className="text-right">
                    {definition.key === 'users' ? 'تاريخ التسجيل' : 'معرّف السجل'}
                  </TableHead>
                  <TableHead className="text-right">
                    {definition.key === 'stations'
                      ? 'المدينة'
                      : definition.key === 'users'
                        ? 'الصلاحية والنطاق'
                        : 'الارتباط'}
                  </TableHead>
                  <TableHead className="text-right">
                    {definition.key === 'stations'
                      ? 'الحالة والمميزات'
                      : definition.key === 'users'
                        ? 'حالة الحساب'
                        : 'الحالة'}
                  </TableHead>
                  <TableHead className="px-4 text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map((record) => {
                  const isPlaying = playingStation?.id === record.id;
                  const isStation = definition.key === 'stations';
                  const isUser = definition.key === 'users';
                  const frequency = isStation && typeof record.data.frequency === 'string'
                    ? record.data.frequency.trim()
                    : '';
                  const cityName = isStation && typeof record.data.cityNameAr === 'string'
                    ? record.data.cityNameAr.trim()
                    : '';

                  return (
                    <TableRow
                      key={record.path}
                      className={`transition-colors ${
                        isPlaying
                          ? 'bg-primary/5 dark:bg-primary/10 border-s-4 border-s-primary'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <TableCell className="max-w-[340px] px-4">
                        <div className="flex items-center gap-3">
                          <ResourceThumbnail
                            resource={definition.key}
                            record={record}
                            title={recordTitle(record, definition)}
                            className="size-10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground truncate">
                                {recordTitle(record, definition)}
                              </span>
                              {isUser && typeof record.data.username === 'string' && record.data.username && (
                                <span className="text-[11px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded border" dir="ltr">
                                  @{record.data.username}
                                </span>
                              )}
                              {frequency && (
                                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-semibold inline-flex items-center gap-1">
                                  {frequency}
                                </span>
                              )}
                            </div>
                            {isUser && typeof record.data.email === 'string' && record.data.email && (
                              <p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
                                {record.data.email}
                              </p>
                            )}
                            {isStation && typeof record.data.nameEn === 'string' && record.data.nameEn && (
                              <p className="text-xs text-muted-foreground truncate">
                                {record.data.nameEn}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        dir={isUser ? 'rtl' : 'ltr'}
                        className={
                          isUser
                            ? 'text-right text-xs text-muted-foreground'
                            : 'text-right text-xs font-mono text-muted-foreground'
                        }
                      >
                        {isUser ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
                            <span
                              className={
                                !record.data.createdAt
                                  ? 'text-muted-foreground/60 italic'
                                  : 'font-medium text-foreground/90'
                              }
                            >
                              {formatUserDate(record.data.createdAt, 'غير متوفر')}
                            </span>
                          </div>
                        ) : (
                          record.id
                        )}
                      </TableCell>
                      <TableCell>
                        {isStation ? (
                          cityName ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                              <MapPin className="size-3.5 text-muted-foreground" />
                              {cityName}
                            </span>
                          ) : (
                            '—'
                          )
                        ) : isUser ? (
                          (() => {
                            const role = typeof record.data.role === 'string' ? record.data.role : 'listener';
                            const allStations = record.data.allStations === true;
                            const assignedStations = Array.isArray(record.data.assignedStationIds)
                              ? record.data.assignedStationIds
                              : [];
                            if (role === 'super_admin') {
                              return (
                                <Badge variant="default" className="text-xs gap-1">
                                  <ShieldCheck className="size-3 text-red-400" />
                                  مدير عام
                                </Badge>
                              );
                            }
                            if (role === 'station_admin') {
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <Badge variant="secondary" className="text-xs gap-1 w-fit">
                                    <Radio className="size-3 text-amber-500" />
                                    مدير محطة
                                  </Badge>
                                  <span className="text-[11px] text-muted-foreground">
                                    {allStations
                                      ? 'جميع المحطات'
                                      : assignedStations.length > 0
                                        ? `${assignedStations.length} محطات`
                                        : 'بدون محطات مخصصة'}
                                  </span>
                                </div>
                              );
                            }
                            if (role === 'moderator') {
                              return (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <ShieldCheck className="size-3 text-blue-500" />
                                  مشرف
                                </Badge>
                              );
                            }
                            return (
                              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                                <UserIcon className="size-3 text-muted-foreground" />
                                مستمع
                              </Badge>
                            );

                          })()
                        ) : (
                          record.relationLabel ||
                          readString(record.data, definition.relationField) ||
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {definition.key === 'banners' ? (
                            <BannerStatusBadge data={record.data} />
                          ) : isUser ? (
                            (() => {
                              const isUserActive = record.data.isActive !== false;
                              return (
                                <Badge
                                  variant={isUserActive ? 'outline' : 'destructive'}
                                  className={
                                    isUserActive
                                      ? 'text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1'
                                      : 'text-xs gap-1'
                                  }
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      isUserActive ? 'bg-emerald-500' : 'bg-destructive-foreground'
                                    }`}
                                  />
                                  {isUserActive ? 'حساب نشط' : 'حساب معطل'}
                                </Badge>
                              );
                            })()
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

                          {isStation && record.data.isLive === true && (
                            <Badge
                              variant="outline"
                              className="text-[11px] text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1"
                            >
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              مباشر
                            </Badge>
                          )}
                          {isStation && record.data.isFeatured === true && (
                            <Badge
                              variant="outline"
                              className="text-[11px] text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1"
                            >
                              <Sparkles className="size-3" />
                              مميزة
                            </Badge>
                          )}
                          {isStation && record.data.isVerified === true && (
                            <Badge
                              variant="outline"
                              className="text-[11px] text-blue-700 dark:text-blue-400 border-blue-500/30 bg-blue-500/10 gap-1"
                            >
                              <CheckCircle2 className="size-3" />
                              موثقة
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          {isStation ? (
                            <Button
                              variant={isPlaying ? 'default' : 'outline'}
                              size="sm"
                              aria-label={isPlaying ? 'إيقاف البث' : 'تشغيل البث'}
                              title={isPlaying ? 'إيقاف البث' : 'تشغيل البث'}
                              onClick={() => togglePlayStation(record)}
                              className={`h-9 gap-1.5 px-3 shadow-xs ${
                                isPlaying
                                  ? 'bg-primary text-primary-foreground animate-pulse'
                                  : 'hover:border-primary hover:text-primary'
                              }`}
                            >
                              {isPlaying ? (
                                <Pause className="size-3.5" />
                              ) : (
                                <Play className="size-3.5" />
                              )}
                              <span>{isPlaying ? 'إيقاف' : 'تشغيل'}</span>
                            </Button>
                          ) : (
                            definition.deletable && (
                              <Button
                                variant="destructive"
                                size="icon"
                                aria-label="حذف"
                                title="حذف"
                                disabled={busyId === record.id}
                                onClick={() => remove(record)}
                              >
                                <Trash2 />
                              </Button>
                            )
                          )}
                          {definition.key === 'users' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="إدارة المستخدم والصلاحيات"
                              title="إدارة المستخدم والصلاحيات"
                              onClick={() => setActionUser(record)}
                              className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"
                            >
                              <ShieldCheck className="size-4" />
                            </Button>
                          )}
                          {definition.editable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="تعديل"
                              title="تعديل"
                              onClick={() => setEditor(record)}
                              className="h-9 w-9 rounded-xl hover:bg-muted"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredAndSorted.length === 0 && (
            <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'لا توجد نتائج مطابقة للبحث أو التصفية الحالية. جرّب مسح البحث أو تغيير الفلتر.'
                : 'لا توجد سجلات مسجلة في هذا القسم حتى الآن.'}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-9 text-xs font-medium"
              >
                الصفحة السابقة
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                الصفحة {currentPage.toLocaleString('ar-YE')} من {totalPages.toLocaleString('ar-YE')} · عرض {((currentPage - 1) * pageSize + 1).toLocaleString('ar-YE')} إلى {Math.min(currentPage * pageSize, filteredAndSorted.length).toLocaleString('ar-YE')} من أصل {resourceCountLabel(definition.key, filteredAndSorted.length)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-9 text-xs font-medium"
              >
                الصفحة التالية
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {playingStation && (
        <aside
          aria-label="مشغل البث المباشر"
          className="fixed bottom-4 start-4 end-4 z-40 mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-background/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 sm:bottom-6 sm:p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <StationLogo
                  name={playingStation.name}
                  logoUrl={playingStation.logoUrl}
                  thumbnailUrl={playingStation.thumbnailUrl}
                  className="size-11"
                  iconClassName="size-5"
                />
                <span className="absolute -top-1 -end-1 flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                    بث مباشر يعمل الآن
                  </span>
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-primary rounded-full animate-pulse h-3" />
                    <span className="w-0.5 bg-primary rounded-full animate-pulse h-2" />
                    <span className="w-0.5 bg-primary rounded-full animate-pulse h-3.5" />
                    <span className="w-0.5 bg-primary rounded-full animate-pulse h-2" />
                  </div>
                </div>
                <p className="truncate text-sm font-bold text-foreground">
                  {playingStation.name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                ref={stationAudioRef}
                src={playingStation.url}
                controls
                autoPlay
                preload="none"
                className="h-9 max-w-[210px] sm:max-w-[240px]"
                aria-label={`بث محطة ${playingStation.name}`}
                onError={() => {
                  setFeedback({
                    type: 'error',
                    message:
                      'تعذر تشغيل البث في المتصفح. تحقق من صلاحية الرابط وسياسات HTTPS.',
                  });
                  setPlayingStation(null);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="إيقاف وإغلاق المشغل"
                title="إغلاق المشغل"
                onClick={() => {
                  if (stationAudioRef.current) {
                    stationAudioRef.current.pause();
                    stationAudioRef.current.removeAttribute('src');
                    stationAudioRef.current.load();
                  }
                  setPlayingStation(null);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </aside>
      )}
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
          onDeleted={() => {
            if (
              typeof editor !== 'string' &&
              editor?.id === playingStation?.id
            ) {
              if (stationAudioRef.current) {
                stationAudioRef.current.pause();
                stationAudioRef.current.removeAttribute('src');
                stationAudioRef.current.load();
              }
              setPlayingStation(null);
            }
            setEditor(null);
            setFeedback({
              type: 'success',
              message: 'تم الحذف وتحديث العلاقات بنجاح.',
            });
          }}
        />
      )}
      {definition.key === 'users' && (
        <UserActionsModal
          user={
            actionUser
              ? {
                  id: actionUser.id,
                  data: actionUser.data as Record<string, unknown>,
                }
              : null
          }
          open={actionUser !== null}
          onClose={() => setActionUser(null)}
          onSuccess={() => {
            setActionUser(null);
            onRefresh?.();
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
  onDeleted,
}: {
  firestore: Firestore;
  definition: ResourceDefinition;
  record: AdminRecord | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
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
      recordId={record?.id}
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
      onDelete={
        record && (definition.key === 'stations' || definition.deletable)
          ? async () => {
              await deleteWithRelations(firestore, definition.key, record);
              onDeleted?.();
            }
          : undefined
      }
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
  if (definition.key === 'users') {
    const name =
      readString(record.data, 'displayName') ||
      readString(record.data, 'username') ||
      readString(record.data, 'email');
    return name || 'مستخدم بدون اسم';
  }
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
