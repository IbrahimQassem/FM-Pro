import type { ReactNode } from 'react';
import { Ban, Flag, ShieldCheck, UserRoundX } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CommunityGuidelinesPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-muted/40 px-4 py-10 sm:px-8">
      <article className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-primary">هدهد FM</p>
          <h1 className="mt-2 text-3xl font-bold">شروط المشاركة والتعليقات</h1>
          <p className="mt-3 text-muted-foreground">
            الإصدار 2026-09-01 · تنطبق هذه الشروط على كل تعليق ينشره المستخدم
            داخل التطبيق.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck /> مجتمع آمن ومحترم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 leading-7">
            <p>
              بنشر تعليق، يوافق المستخدم على أن يكون المحتوى قانونيًا ومحترمًا
              وآمنًا، وألا ينتهك حقوق الآخرين أو خصوصيتهم.
            </p>
            <ul className="list-disc space-y-2 ps-6">
              <li>يُمنع التهديد والتحرش والتنمر وخطاب الكراهية.</li>
              <li>
                يُمنع المحتوى الجنسي أو الاستغلال أو أي محتوى يعرّض الأطفال للخطر.
              </li>
              <li>
                يُمنع نشر البيانات الشخصية أو انتحال الهوية أو التحريض على العنف.
              </li>
              <li>
                يُمنع المحتوى غير القانوني والرسائل المزعجة والترويج المضلل.
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <PolicyAction
            icon={<Flag />}
            title="الإبلاغ"
            description="يمكن الإبلاغ عن تعليق أو مستخدم من قائمة إجراءات التعليق داخل التطبيق."
          />
          <PolicyAction
            icon={<UserRoundX />}
            title="الحظر"
            description="يمكن حظر مستخدم لإخفاء تعليقاته فورًا من تجربة الحاظر."
          />
          <PolicyAction
            icon={<Ban />}
            title="الإشراف"
            description="قد نخفي المحتوى المخالف أو نزيله، وقد نعطل الحساب عند المخالفات الجسيمة أو المتكررة."
          />
        </div>

        <Card>
          <CardContent className="space-y-3 pt-6 leading-7">
            <h2 className="text-xl font-bold">قرارات الإشراف</h2>
            <p>
              يراجع فريق الإشراف البلاغات وفق خطورتها وسياقها. لا تظهر هوية المبلّغ
              للمستخدم المبلّغ عنه. قد يُرفض البلاغ، أو يُخفى التعليق، أو يُزال، أو
              يُعطّل الحساب.
            </p>
            <p>
              لا يضمن استخدام هدهد FM بقاء أي تعليق منشور إذا خالف هذه الشروط.
              يمكن حذف الحساب وبياناته من داخل التطبيق أو من{' '}
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => window.location.assign('/account-deletion')}
              >
                صفحة حذف الحساب
              </button>
              .
            </p>
          </CardContent>
        </Card>
      </article>
    </main>
  );
}

function PolicyAction({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <span className="text-primary">{icon}</span>
        <h2 className="font-bold">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
