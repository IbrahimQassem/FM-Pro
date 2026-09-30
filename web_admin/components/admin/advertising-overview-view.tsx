import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ShieldCheck, Radio, Lock, CheckCircle2, BarChart3 } from 'lucide-react';
import { firestoreRoot } from '@/lib/firestore-root';

export function AdvertisingOverviewView() {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              الشراكات والحملات الإعلانية
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              إدارة العقود التجارية والرعايات الرسمية لمحتوى هدهد FM
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-xs gap-1.5 font-medium self-start sm:self-auto">
          <Lock className="size-3.5" />
          <span>صلاحية تجارية خاصة بالإدارة العامة</span>
        </Badge>
      </section>

      {/* Info notice about permission */}
      <Alert className="border-primary/20 bg-primary/5 text-primary">
        <ShieldCheck className="size-5 text-primary" />
        <div className="ms-2">
          <AlertTitle className="font-semibold text-primary">
            صلاحية إدارة الحملات والشراكات التجارية
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm leading-6 text-foreground/85">
            إدارة المعلنين والشركاء وإطلاق الحملات الإعلانية ومتابعة تقارير الأداء وتعديل الاتفاقيات مقتصرة على مدير عام النظام لضمان سرية العقود التجارية. يمكنك مراجعة الإدارة العامة لأي استفسار أو لجدولة رعاية إذاعية.
          </AlertDescription>
        </div>
      </Alert>

      {/* Feature Overview Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: System */}
        <Card className="border-border/60 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1 w-full bg-primary" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">نظام الحملات والرعايات</span>
              <Megaphone className="size-4 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground pt-2">
              إعلانات ورعايات موجهة
            </CardTitle>
            <CardDescription className="text-xs pt-1">
              دعم إعلانات البانر، رعاية الشاشات الرئيسية، والحملات المجدولة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              <span>جدولة وبث تلقائي مباشر</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Platforms */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">المنصات المستهدفة</span>
              <Radio className="size-4 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground pt-2">
              الهواتف الذكية والويب
            </CardTitle>
            <CardDescription className="text-xs pt-1">
              تطبيقات iOS وAndroid وموقع البث المباشر
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              توزيع موحد وآمن للإعلانات متوافق مع كافة أحجام الشاشات.
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Analytics */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">تقارير الأداء</span>
              <BarChart3 className="size-4 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground pt-2">
              متابعة المشاهدات والنقر
            </CardTitle>
            <CardDescription className="text-xs pt-1">
              البيئة: {firestoreRoot}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              قياس معدلات الظهور والنقر بدقة وتصدير التقارير للمعلنين.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
