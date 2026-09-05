import { FileText, Radio, CheckCircle, AlertTriangle, Scale, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TermsOfServicePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-primary">هدهد FM</p>
          <h1 className="mt-2 text-3xl font-bold">شروط الخدمة (Terms of Service)</h1>
          <p className="mt-3 text-muted-foreground">
            آخر تحديث: 2026-09-01 · تحكم هذه الشروط استخدامك لتطبيق وخدمات هدهد FM.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-primary" /> 1. قبول الشروط
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <p>
              تحميلك لتطبيق <strong>هدهد FM</strong> أو استخدامك لأي من خدماته يعني موافقتك الكاملة وغير المشروطة
              على الالتزام بهذه الشروط وبسياسة الخصوصية المعتمدة.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="text-primary" /> 2. طبيعة الخدمة والمحتوى الإذاعي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <p>
              يوفر تطبيق هدهد FM دليلاً ومنصة للاستماع المباشر لمحطات الراديو والبرامج الإذاعية.
              جميع حقوق البث والعلامات التجارية للإذاعات ملك لأصحابها ومرخصيها الرسميين.
            </p>
            <p>
              يُحظر إعادة تسجيل أو إعادة بث أو استغلال المحتوى الإذاعي لأغراض تجارية دون إذن كتابي مسبق من الجهات المالكة.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-primary" /> 3. حساب المستخدم وسلوك المشاركة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <p>
              أنت مسؤول عن الحفاظ على سرية بيانات حسابك، وعن أي نشاط يتم من خلاله. عند كتابة تعليقات أو التفاعل مع المجتمع، يجب الالتزام الصارم بـ
              <a href="/community-guidelines" className="text-primary font-medium underline ms-1">
                إرشادات وشروط المشاركة (UGC Guidelines)
              </a>.
            </p>
            <p>
              يحتفظ فريق الإشراف بالحق في إزالة أي تعليقات مخالفة أو تعليق الحسابات التي تنتهك معايير المجتمع فورياً.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-primary" /> 4. إخلاء المسؤولية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <p>
              نعمل باستمرار على ضمان استقرار وجودة البث، ولكن الخدمة تُقدم &quot;كما هي&quot; دون ضمانات بتوفر البث دون انقطاع
              نظراً لاعتماد استقرار البث على خوادم الإذاعات وشبكة الإنترنت الخاصة بالمستخدم.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="text-primary" /> 5. التعديل على الشروط
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <p>
              قد نقوم بتحديث شروط الخدمة من وقت لآخر لمواكبة التحديثات التنظيمية والتقنية. استمرارك في استخدام التطبيق بعد نشر أي تعديلات يعتبر قبولاً ضمنياً بها.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="text-primary" /> 6. التواصل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 leading-7 text-sm sm:text-base">
            <p>لأي استفسارات قانونية أو فنية تتعلق بشروط الخدمة، يرجى التواصل معنا عبر:</p>
            <p className="font-medium text-primary">legal@hudhudfm.com / hudhudfm.ye@gmai.com</p>
          </CardContent>
        </Card>
      </article>
    </main>
  );
}
