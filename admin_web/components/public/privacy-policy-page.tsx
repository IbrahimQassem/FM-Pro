import { Shield, Lock, Bell, Radio, Trash2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PrivacyPolicyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-primary">هدهد FM</p>
          <h1 className="mt-2 text-3xl font-bold">سياسة الخصوصية (Privacy Policy)</h1>
          <p className="mt-3 text-muted-foreground">
            آخر تحديث: 2026-09-01 · نلتزم في هدهد FM بحماية خصوصيتك وبياناتك الشخصية وفق أعلى المعايير.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-primary" /> مقدمة ونطاق السياسة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <p>
              توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية المعلومات عند استخدام تطبيق
              <strong> هدهد FM </strong> وخدماتنا الرقمية المرتبطة به.
            </p>
            <p>
              باستخدامك للتطبيق، فإنك توافق على جمع واستخدام المعلومات وفقاً لهذه السياسة.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="text-primary" /> البيانات التي نجمعها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <ul className="list-disc space-y-2 ps-6">
              <li>
                <strong>معلومات الحساب:</strong> عند إنشاء حساب، نجمع الاسم والبريد الإلكتروني وصورة الملف الشخصي لتخصيص تجربتك وحفظ مفضلاتك.
              </li>
              <li>
                <strong>بيانات التفاعل والمفضلة:</strong> قائمة الإذاعات المفضلة والتعليقات التي تنشرها على الحلقات.
              </li>
              <li>
                <strong>المعلومات التقنية وسجلات التشخيص:</strong> معلومات الجهاز ونظام التشغيل وسجلات الأعطال عبر Firebase Crashlytics لتحسين استقرار التطبيق دون جمع أي معرفات شخصية حساسة.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="text-primary" /> أذونات التطبيق وكيفية استخدامها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <ul className="list-disc space-y-2 ps-6">
              <li>
                <strong>تشغيل الصوت في الخلفية:</strong> إذن استمرار تشغيل البث الإذاعي عند قفل الشاشة أو استخدام تطبيقات أخرى.
              </li>
              <li>
                <strong>الإشعارات (اختياري):</strong> إرسال تنبيهات عند بدء برامجك المفضلة أو الرد على تعليقاتك.
              </li>
              <li>
                <strong>معرض الصور والكاميرا (اختياري):</strong> لتمكينك من اختيار أو التقاط صورة لملفك الشخصي فقط.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="text-primary" /> حذف الحساب والبيانات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 leading-7 text-sm sm:text-base">
            <p>
              يحق لك في أي وقت حذف حسابك وكافة البيانات المرتبطة به بشكل دائم، وذلك إما:
            </p>
            <ol className="list-decimal space-y-1 ps-6 mt-2">
              <li>مباشرة من داخل التطبيق عبر صفحة: <strong>إدارة الحساب &gt; حذف الحساب</strong>.</li>
              <li>أو عبر زيارة صفحة طلب الحذف الرسمية على الرابط: <a href="/account-deletion" className="text-primary underline">طلب حذف الحساب</a>.</li>
            </ol>
            <p className="mt-2 text-muted-foreground text-xs sm:text-sm">
              يتم مسح كافة السجلات الشخصية والتعليقات والمفضلات من خوادمنا بصورة نهائية وفورية.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="text-primary" /> التواصل والدعم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 leading-7 text-sm sm:text-base">
            <p>إذا كانت لديك أي استفسارات حول سياسة الخصوصية، يسعدنا تواصلك معنا عبر:</p>
            <p className="font-medium text-primary">البريد الإلكتروني: hudhudfm.ye@gmai.com</p>
          </CardContent>
        </Card>
      </article>
    </main>
  );
}
