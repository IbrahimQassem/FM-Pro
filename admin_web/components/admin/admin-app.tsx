'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Database,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Mic2,
  Pencil,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import {
  type User,
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  increment,
  limit,
  onSnapshot,
  query,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import {
  resourceDefinitions,
  type ResourceDefinition,
  type ResourceKey,
} from '@/lib/admin-resources';
import { getFirebaseServices } from '@/lib/firebase-client';

type Section = 'overview' | ResourceKey;
type AdminRecord = {
  id: string;
  path: string;
  data: Record<string, unknown>;
  reference: DocumentReference;
};
type RecordsState = Record<ResourceKey, AdminRecord[]>;

const emptyRecords: RecordsState = {
  stations: [],
  programs: [],
  episodes: [],
  banners: [],
  users: [],
  comments: [],
  favorites: [],
  subscriptions: [],
};

const navigation: Array<{
  section: Section;
  label: string;
  icon: typeof Radio;
}> = [
  { section: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { section: 'stations', label: 'المحطات', icon: Radio },
  { section: 'programs', label: 'البرامج والجداول', icon: CalendarDays },
  { section: 'episodes', label: 'الحلقات', icon: PlayCircle },
  { section: 'banners', label: 'الإعلانات', icon: Megaphone },
  { section: 'users', label: 'المستخدمون', icon: Users },
  { section: 'comments', label: 'التعليقات', icon: MessageSquare },
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
    getFirebaseServices()
      .then((services) => {
        if (cancelled) return;
        setFirestore(services.firestore);
        unsubscribe = onAuthStateChanged(services.auth, async (nextUser) => {
          if (!nextUser) {
            setUser(null);
            setAuthStatus('signed-out');
            return;
          }
          try {
            const token = await getIdTokenResult(nextUser, true);
            if (token.claims.admin !== true) {
              setAuthStatus('denied');
              setAuthError('الحساب صحيح لكنه لا يحمل صلاحية admin.');
              await signOut(services.auth);
              return;
            }
            setUser(nextUser);
            setAuthStatus('admin');
          } catch {
            setAuthStatus('denied');
            setAuthError('تعذر التحقق من صلاحيات الحساب.');
          }
        });
      })
      .catch(() => setAuthStatus('config-error'));
    return () => {
      cancelled = true;
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
        'إذا كان البريد مرتبطًا بحساب Firebase فستصلك رسالة إعادة تعيين خلال دقائق.',
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
          'إذا كان البريد مرتبطًا بحساب Firebase فستصلك رسالة إعادة تعيين خلال دقائق.',
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
              الجمهور دون تجاوز عقود Firebase.
            </p>
          </div>
          <p className="text-xs text-white/50">sanadev-fm · HudHudDev</p>
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
            استخدم حساب Firebase Auth الذي يحمل custom claim باسم admin.
          </p>
          {status === 'config-error' && (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>الإعداد غير مكتمل</AlertTitle>
              <AlertDescription>
                متغيرات Firebase غير متاحة في بيئة التشغيل.
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
            لا توفر اللوحة إنشاء حسابات إدارية. منح الصلاحية يتم من أداة خادم
            موثوقة فقط.
          </p>
        </section>
      </div>
    </main>
  );
}

function Dashboard({ firestore, user }: { firestore: Firestore; user: User }) {
  const [section, setSection] = useState<Section>('overview');
  const [records, setRecords] = useState<RecordsState>(emptyRecords);
  const [errors, setErrors] = useState<Partial<Record<ResourceKey, string>>>(
    {},
  );
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribers = Object.values(resourceDefinitions).map(
      (definition) => {
        const source = definition.path
          ? collection(firestore, definition.path)
          : collectionGroup(firestore, definition.group!);
        return onSnapshot(
          query(source, limit(250)),
          (snapshot) => {
            const next = snapshot.docs.map((document) => ({
              id: document.id,
              path: document.ref.path,
              data: document.data(),
              reference: document.ref,
            }));
            setRecords((current) => ({ ...current, [definition.key]: next }));
            setErrors((current) => ({
              ...current,
              [definition.key]: undefined,
            }));
            setLastSync(new Date());
          },
          () =>
            setErrors((current) => ({
              ...current,
              [definition.key]: 'تعذر قراءة هذه البيانات.',
            })),
        );
      },
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [firestore]);

  const currentDefinition =
    section === 'overview' ? null : resourceDefinitions[section];
  return (
    <main className="min-h-screen bg-background text-foreground" dir="rtl">
      <div className="mx-auto grid min-h-screen max-w-[1680px] lg:grid-cols-[264px_1fr]">
        <aside className="hidden border-l border-sidebar-border bg-sidebar px-5 py-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Radio className="size-5" />
            </div>
            <div>
              <p className="text-lg font-bold">هدهد FM</p>
              <p className="text-xs text-muted-foreground">
                مركز إدارة المحتوى
              </p>
            </div>
          </div>
          <nav className="mt-9 space-y-1" aria-label="التنقل الرئيسي">
            {navigation.map(({ section: itemSection, label, icon: Icon }) => (
              <button
                key={itemSection}
                type="button"
                onClick={() => setSection(itemSection)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-medium transition-colors ${section === itemSection ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
              >
                <Icon className="size-[18px]" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-sidebar-border bg-background/70 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">بيئة التشغيل</span>
              <Badge className="bg-emerald-100 text-emerald-800">
                Development
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              sanadev-fm · HudHudDev
            </p>
          </div>
        </aside>
        <section className="min-w-0">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b bg-background/90 px-5 backdrop-blur-xl md:px-8">
            <div>
              <p className="text-xs font-semibold text-primary">
                {currentDefinition?.label ?? 'مركز العمليات'}
              </p>
              <h1 className="mt-1 text-xl font-bold">
                {currentDefinition
                  ? `إدارة ${currentDefinition.label}`
                  : 'لوحة التحكم'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex">
                {user.email}
              </Badge>
              <Button variant="outline" size="icon" aria-label="الإشعارات">
                <Bell />
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
          <div className="border-b px-5 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {navigation.map(({ section: itemSection, label }) => (
                <Button
                  key={itemSection}
                  size="sm"
                  variant={section === itemSection ? 'default' : 'outline'}
                  onClick={() => setSection(itemSection)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-5 md:p-8">
            {section === 'overview' ? (
              <Overview
                records={records}
                errors={errors}
                lastSync={lastSync}
                onNavigate={setSection}
              />
            ) : (
              <ResourceView
                firestore={firestore}
                definition={resourceDefinitions[section]}
                records={records[section]}
                allRecords={records}
                error={errors[section]}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Overview({
  records,
  errors,
  lastSync,
  onNavigate,
}: {
  records: RecordsState;
  errors: Partial<Record<ResourceKey, string>>;
  lastSync: Date | null;
  onNavigate: (section: Section) => void;
}) {
  const metrics = [
    {
      key: 'stations' as const,
      label: 'المحطات النشطة',
      value: records.stations.filter((item) => item.data.isActive === true)
        .length,
      detail: `${records.stations.length} إجمالي`,
      icon: Radio,
    },
    {
      key: 'programs' as const,
      label: 'البرامج',
      value: records.programs.length,
      detail: `${records.programs.filter((item) => item.data.schedule).length} جداول`,
      icon: Mic2,
    },
    {
      key: 'episodes' as const,
      label: 'الحلقات المنشورة',
      value: records.episodes.filter((item) => item.data.isPublished === true)
        .length,
      detail: `${records.comments.length} تعليقًا`,
      icon: PlayCircle,
    },
    {
      key: 'banners' as const,
      label: 'الإعلانات النشطة',
      value: records.banners.filter((item) => item.data.isActive === true)
        .length,
      detail: `${records.banners.length} إجمالي`,
      icon: Megaphone,
    },
  ];
  const stationCoverage = new Set(
    records.programs.map((item) => item.data.stationId),
  ).size;
  const scheduledPrograms = records.programs.filter(
    (item) => item.data.schedule,
  ).length;
  const playableEpisodes = records.episodes.filter(
    (item) =>
      typeof item.data.audioUrl === 'string' &&
      item.data.audioUrl.startsWith('https://'),
  ).length;
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            نظرة تشغيلية مباشرة
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            الأرقام أدناه تُقرأ لحظيًا من Firestore.
          </p>
        </div>
        <Badge
          variant="outline"
          className="h-7 border-emerald-200 bg-emerald-50 px-3 text-emerald-700"
        >
          <RefreshCw className="size-3" />{' '}
          {lastSync
            ? `آخر مزامنة ${lastSync.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}`
            : 'جارٍ الاتصال'}
        </Badge>
      </section>
      {Object.values(errors).some(Boolean) && (
        <Alert variant="destructive">
          <Database />
          <AlertTitle>بعض المؤشرات غير متاحة</AlertTitle>
          <AlertDescription>
            راجع قواعد Firestore وصلاحية admin للمجموعات الجديدة.
          </AlertDescription>
        </Alert>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, label, value, detail, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-label={`فتح ${label}`}
            className="text-right"
            onClick={() => onNavigate(key)}
          >
            <Card className="h-full border-none shadow-[0_1px_2px_rgb(15_38_34/5%),0_10px_32px_rgb(15_38_34/5%)] transition-transform hover:-translate-y-0.5">
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardAction className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </CardAction>
                <CardTitle className="text-3xl font-bold">{value}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {detail}
              </CardContent>
            </Card>
          </button>
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card className="border-none shadow-[0_1px_2px_rgb(15_38_34/5%),0_10px_32px_rgb(15_38_34/5%)]">
          <CardHeader className="border-b">
            <CardTitle>صحة المحتوى</CardTitle>
            <CardDescription>
              اكتمال العلاقات المطلوبة في التطبيق
            </CardDescription>
            <CardAction>
              <Badge className="bg-emerald-100 text-emerald-800">
                <CheckCircle2 /> مباشر
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5 pt-1">
            {[
              [
                'المحطات المرتبطة ببرامج',
                `${stationCoverage} من ${records.stations.length}`,
                percentage(stationCoverage, records.stations.length),
              ],
              [
                'البرامج ذات جدول بث',
                `${scheduledPrograms} من ${records.programs.length}`,
                percentage(scheduledPrograms, records.programs.length),
              ],
              [
                'الحلقات ذات ملفات صوت',
                `${playableEpisodes} من ${records.episodes.length}`,
                percentage(playableEpisodes, records.episodes.length),
              ],
            ].map(([label, value, width]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-none bg-primary text-primary-foreground shadow-[0_16px_50px_rgb(22_79_69/20%)]">
          <CardHeader>
            <CardDescription className="text-primary-foreground/65">
              نشاط الجمهور
            </CardDescription>
            <CardTitle className="text-xl">المفضلة والاشتراكات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('favorites')}
                className="rounded-xl bg-white/10 p-4 text-right hover:bg-white/15"
              >
                <Heart className="mb-5 size-5" />
                <p className="text-2xl font-bold">{records.favorites.length}</p>
                <p className="mt-1 text-xs text-white/65">عناصر مفضلة</p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('subscriptions')}
                className="rounded-xl bg-white/10 p-4 text-right hover:bg-white/15"
              >
                <BarChart3 className="mb-5 size-5" />
                <p className="text-2xl font-bold">
                  {
                    records.subscriptions.filter(
                      (item) => item.data.isActive !== false,
                    ).length
                  }
                </p>
                <p className="mt-1 text-xs text-white/65">اشتراكات فعالة</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ResourceView({
  firestore,
  definition,
  records,
  allRecords,
  error,
}: {
  firestore: Firestore;
  definition: ResourceDefinition;
  records: AdminRecord[];
  allRecords: RecordsState;
  error?: string;
}) {
  const [search, setSearch] = useState('');
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
      `${record.id} ${readString(record.data, definition.titleField)} ${readString(record.data, definition.relationField)}`
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
      await deleteWithRelations(firestore, definition.key, record, allRecords);
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
            {records.length} سجلًا · حد العرض 250 سجلًا
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
              placeholder={`ابحث في ${definition.label}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 text-right">الاسم/المحتوى</TableHead>
                <TableHead className="text-right">المعرّف</TableHead>
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
                    {readString(record.data, definition.relationField) || '—'}
                  </TableCell>
                  <TableCell>
                    {definition.statusField ? (
                      <Badge
                        variant={
                          record.data[definition.statusField] === true
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {record.data[definition.statusField] === true
                          ? 'نشط'
                          : 'غير نشط'}
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
                          size="icon-sm"
                          aria-label="تعديل"
                          onClick={() => setEditor(record)}
                        >
                          <Pencil />
                        </Button>
                      )}
                      {definition.deletable && (
                        <Button
                          variant="destructive"
                          size="icon-sm"
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
          {filtered.length === 0 && (
            <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
              لا توجد سجلات مطابقة.
            </div>
          )}
        </CardContent>
      </Card>
      {editor !== null && (
        <ResourceEditor
          firestore={firestore}
          definition={definition}
          record={editor === 'new' ? null : editor}
          allRecords={allRecords}
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
  allRecords,
  onClose,
  onSaved,
}: {
  firestore: Firestore;
  definition: ResourceDefinition;
  record: AdminRecord | null;
  allRecords: RecordsState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [documentId, setDocumentId] = useState(record?.id ?? '');
  const [json, setJson] = useState(() =>
    JSON.stringify(
      toEditable(record?.data ?? definition.template ?? {}),
      null,
      2,
    ),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setError('');
    setSaving(true);
    try {
      if (!definition.path) throw new Error('هذا المورد غير قابل للتحرير.');
      const id = (record?.id ?? documentId).trim();
      if (!id || id.includes('/'))
        throw new Error('المعرّف مطلوب ولا يجوز أن يحتوي /.');
      const parsed = JSON.parse(json) as Record<string, unknown>;
      validateResource(definition.key, parsed, allRecords);
      const normalized = fromEditable(parsed);
      if (
        !normalized ||
        typeof normalized !== 'object' ||
        Array.isArray(normalized)
      ) {
        throw new Error('جذر الوثيقة يجب أن يكون object.');
      }
      await saveWithRelations(
        firestore,
        definition.key,
        definition.path,
        id,
        normalized as Record<string, unknown>,
        record,
      );
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حفظ البيانات.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>
            {record
              ? `تعديل ${definition.singular}`
              : `إضافة ${definition.singular}`}
          </DialogTitle>
          <DialogDescription>
            المحرر المتقدم يحفظ جميع حقول العقد. التواريخ تُكتب بصيغة ISO.
          </DialogDescription>
        </DialogHeader>
        {!record && (
          <div className="space-y-2">
            <Label htmlFor="document-id">Document ID</Label>
            <Input
              id="document-id"
              dir="ltr"
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              placeholder="stable-document-id"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="json-editor">بيانات الوثيقة</Label>
          <Textarea
            id="json-editor"
            dir="ltr"
            className="min-h-[420px] resize-y font-mono text-xs leading-5"
            value={json}
            onChange={(event) => setJson(event.target.value)}
            spellCheck={false}
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>بيانات غير صالحة</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function saveWithRelations(
  firestore: Firestore,
  key: ResourceKey,
  path: string,
  id: string,
  data: Record<string, unknown>,
  previous: AdminRecord | null,
) {
  const reference = doc(firestore, path, id);
  const batch = writeBatch(firestore);
  batch.set(reference, data, { merge: previous !== null });
  if (key === 'programs') {
    const nextStation = String(data.stationId);
    const previousStation = previous ? String(previous.data.stationId) : null;
    if (!previous)
      batch.update(doc(firestore, 'HudHudDev/stations/stations', nextStation), {
        'stats.programsCount': increment(1),
      });
    else if (previousStation !== nextStation) {
      batch.update(
        doc(firestore, 'HudHudDev/stations/stations', previousStation!),
        { 'stats.programsCount': increment(-1) },
      );
      batch.update(doc(firestore, 'HudHudDev/stations/stations', nextStation), {
        'stats.programsCount': increment(1),
      });
    }
  }
  if (key === 'episodes') {
    const nextProgram = String(data.programId);
    const previousProgram = previous ? String(previous.data.programId) : null;
    if (!previous)
      batch.update(doc(firestore, 'HudHudDev/programs/programs', nextProgram), {
        'stats.episodesCount': increment(1),
      });
    else if (previousProgram !== nextProgram) {
      batch.update(
        doc(firestore, 'HudHudDev/programs/programs', previousProgram!),
        { 'stats.episodesCount': increment(-1) },
      );
      batch.update(doc(firestore, 'HudHudDev/programs/programs', nextProgram), {
        'stats.episodesCount': increment(1),
      });
    }
  }
  await batch.commit();
}

async function deleteWithRelations(
  firestore: Firestore,
  key: ResourceKey,
  record: AdminRecord,
  allRecords: RecordsState,
) {
  if (
    key === 'stations' &&
    allRecords.programs.some((item) => item.data.stationId === record.id)
  )
    throw new Error(
      'لا يمكن حذف محطة مرتبطة ببرامج. انقل البرامج أو احذفها أولًا.',
    );
  if (
    key === 'programs' &&
    allRecords.episodes.some((item) => item.data.programId === record.id)
  )
    throw new Error(
      'لا يمكن حذف برنامج مرتبط بحلقات. انقل الحلقات أو احذفها أولًا.',
    );
  if (key === 'episodes') {
    const count = await getCountFromServer(
      query(collection(record.reference, 'comments'), limit(1)),
    );
    if (count.data().count > 0)
      throw new Error('لا يمكن حذف حلقة لها تعليقات. راجع التعليقات أولًا.');
  }
  const batch = writeBatch(firestore);
  batch.delete(record.reference);
  if (key === 'programs')
    batch.update(
      doc(
        firestore,
        'HudHudDev/stations/stations',
        String(record.data.stationId),
      ),
      { 'stats.programsCount': increment(-1) },
    );
  if (key === 'episodes')
    batch.update(
      doc(
        firestore,
        'HudHudDev/programs/programs',
        String(record.data.programId),
      ),
      { 'stats.episodesCount': increment(-1) },
    );
  if (key === 'comments')
    batch.update(
      doc(
        firestore,
        'HudHudDev/episodes/episodes',
        String(record.data.episodeId),
      ),
      { 'stats.commentsCount': increment(-1) },
    );
  await batch.commit();
}

function validateResource(
  key: ResourceKey,
  data: Record<string, unknown>,
  allRecords: RecordsState,
) {
  const required =
    key === 'stations'
      ? ['name', 'streamUrl', 'cityCode']
      : key === 'programs'
        ? ['stationId', 'title']
        : key === 'episodes'
          ? ['stationId', 'programId', 'title', 'audioUrl']
          : key === 'banners'
            ? ['title', 'imageUrl', 'targetType']
            : [];
  for (const field of required)
    if (typeof data[field] !== 'string' || !String(data[field]).trim())
      throw new Error(`الحقل ${field} مطلوب.`);
  for (const field of ['streamUrl', 'audioUrl', 'imageUrl'])
    if (typeof data[field] === 'string' && !data[field].startsWith('https://'))
      throw new Error(`الحقل ${field} يجب أن يبدأ بـ https://.`);
  if (key === 'programs') {
    if (!allRecords.stations.some((item) => item.id === data.stationId))
      throw new Error('stationId لا يشير إلى محطة موجودة.');
    const schedule = data.schedule as Record<string, unknown> | undefined;
    if (
      !schedule ||
      !Array.isArray(schedule.weekdays) ||
      schedule.weekdays.length === 0
    )
      throw new Error('جدول البرنامج مطلوب ويجب أن يحتوي أيام بث.');
  }
  if (key === 'episodes') {
    const program = allRecords.programs.find(
      (item) => item.id === data.programId,
    );
    if (!program) throw new Error('programId لا يشير إلى برنامج موجود.');
    if (program.data.stationId !== data.stationId)
      throw new Error('stationId للحلقة لا يطابق محطة البرنامج.');
  }
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

function toEditable(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toEditable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, toEditable(child)]),
    );
  return value;
}

function recordTitle(record: AdminRecord, definition: ResourceDefinition) {
  return readString(record.data, definition.titleField) || record.id;
}
function readString(data: Record<string, unknown>, field?: string) {
  const value = field ? data[field] : '';
  return typeof value === 'string' ? value : '';
}
function percentage(value: number, total: number) {
  return total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`;
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
