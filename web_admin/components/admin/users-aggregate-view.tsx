import { useCallback, useEffect, useState } from 'react';
import { collection, getCountFromServer, type Firestore } from 'firebase/firestore';
import { firestoreRoot } from '@/lib/firestore-root';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users, ShieldCheck, RefreshCw, CheckCircle2, Lock } from 'lucide-react';

export function UsersAggregateView({ firestore }: { firestore: Firestore }) {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchTotalUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getCountFromServer(
        collection(firestore, `${firestoreRoot}/users/users`),
      );
      setTotalCount(snap.data().count);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Failed to get total users count:', err);
      setError('تعذر تحميل إجمالي المستخدمين من الخادم. يرجى التحقق من الاتصال بالشبكة والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    let cancelled = false;
    void getCountFromServer(collection(firestore, `${firestoreRoot}/users/users`))
      .then((snap) => {
        if (!cancelled) {
          setTotalCount(snap.data().count);
          setLastChecked(new Date());
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to get total users count:', err);
          setError('تعذر تحميل إجمالي المستخدمين من الخادم. يرجى التحقق من الاتصال بالشبكة والمحاولة مجدداً.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [firestore]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              إجمالي المستخدمين
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إحصائية عدد الحسابات المسجلة في تطبيق هدهد إف إم
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={fetchTotalUsers}
          className="min-h-11 shadow-xs self-start sm:self-auto"
          aria-label="تحديث البيانات"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          تحديث الإجمالي
        </Button>
      </section>

      {/* Info notice about permission */}
      <Alert className="border-primary/20 bg-primary/5 text-primary">
        <ShieldCheck className="size-5 text-primary" />
        <div className="ms-2">
          <AlertTitle className="font-semibold text-primary">
            صلاحية الاطلاع الإحصائي
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm leading-6 text-foreground/85">
            عرض وتعديل بيانات وحسابات المستخدمين الفردية مقتصر على مدير عام النظام للحفاظ على خصوصية المستمعين. تتيح لك هذه النافذة متابعة إجمالي أعداد المستخدمين المسجلين في التطبيق.
          </AlertDescription>
        </div>
      </Alert>

      {/* Error alert if any */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>تعذر تحميل الإجمالي</AlertTitle>
          <AlertDescription className="mt-1 flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTotalUsers}
              className="shrink-0"
            >
              إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Metric Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Main count card */}
        <Card className="border-border/60 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1 w-full bg-primary" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">إجمالي الحسابات المسجلة</span>
              <Users className="size-4 text-primary" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-2">
              {loading ? (
                <span className="inline-block animate-pulse text-muted-foreground text-2xl">
                  جارٍ التحميل...
                </span>
              ) : totalCount !== null ? (
                totalCount.toLocaleString('ar-YE')
              ) : (
                '—'
              )}
            </CardTitle>
            <CardDescription className="text-xs pt-1">
              مستخدم مسجل في قاعدة بيانات التطبيق
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              <span>حسابات نشطة في التطبيق</span>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">حالة التحديث والمزامنة</span>
              <RefreshCw className="size-4 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold text-foreground pt-2">
              {loading ? 'جارٍ فحص الخادم...' : 'مباشرة من قاعدة البيانات'}
            </CardTitle>
            <CardDescription className="text-xs pt-1">
              {lastChecked
                ? `آخر تحديث: ${lastChecked.toLocaleTimeString('ar-YE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}`
                : 'في انتظار الاتصال'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              يتم جلب الإحصائية مباشرة عبر استعلام تجميعي فوري بدون تحميل بيانات المستخدمين.
            </div>
          </CardContent>
        </Card>

        {/* Security & Scope Card */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">مستوى الأمان والبيئة</span>
              <Lock className="size-4 text-amber-500" />
            </div>
            <CardTitle className="text-lg font-bold text-foreground pt-2">
              حماية بيانات المستمعين
            </CardTitle>
            <CardDescription className="text-xs pt-1">
              البيئة: {firestoreRoot}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground leading-relaxed">
              الحسابات مشفرة ومحمية بقواعد أمان Firestore لمنع تسريب الهويات أو الأرقام الشخصية.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
