# HudHud FM Admin

لوحة إدارة عربية RTL. يحدد `VITE_FIRESTORE_ROOT` جذر البيانات صراحة: `HudHudDev` أو `HudHudOfficial`.
يبقى Firebase Auth مشتركًا بين الجذرين في المشروع نفسه.

## الصلاحيات

- الدخول عبر Firebase Auth Email/password فقط.
- يمكن للمشرف طلب رسالة إعادة تعيين كلمة المرور من شاشة الدخول.
- لا يكفي تسجيل الدخول؛ يجب أن يحتوي ID token على custom claim باسم
  `admin=true`.
- لا تنشئ اللوحة حسابات إدارية ولا تخزن كلمات مرور أو service-account keys.
- عمليات المحتوى والعدادات العلاقية تستخدم Firestore transactions.

لمنح حساب موجود الصلاحية، ابدأ بـdry-run من `tool/firebase_seed`:

```bash
npm run admin:grant -- --project sanadev-fm --email ADMIN_EMAIL
npm run admin:grant -- --project sanadev-fm --email ADMIN_EMAIL --apply
```

## التشغيل

انسخ `.env.example` إلى `.env.local` وأضف إعداد Firebase Web App من قناة آمنة،
ثم:

```bash
npm install
npm run dev
```

`.env.local` مستبعد من Git. تُحقن إعدادات Firebase العامة في حزمة المتصفح وقت
البناء، ولا توضع قيمها داخل ملفات المصدر.

## الاستضافة

تُبنى اللوحة كتطبيق React ثابت وتُنشر إلى موقع Firebase Hosting المستقل
`hudhud-fm-admin-sanadev` عبر target باسم `hudhud_admin`، لذلك لا يتأثر موقع
المشروع الافتراضي.

المساران العامان `/community-guidelines` و`/account-deletion` لا يمران عبر بوابة
المشرف. الثاني يدعم Email/password وGoogle وFacebook وApple، ثم يعرض الحساب لتأكيد الحذف
قبل استدعاء `deleteAccountData` بدون معاملات. الحذف يشمل الحساب وبياناته في الجذرين؛
تستخدم الصفحة جلسة ذاكرة مستقلة عن جلسة المشرف، وتلغي تفويض Apple قبل الحذف. لا يسمح
بعرض أو تعديل أي مورد إداري.

## نطاق الإدارة

- المحطات والبرامج والجداول والحلقات والإعلانات: قراءة وإنشاء وتعديل وحذف آمن.
- يمنع حذف محطة لها برامج، أو برنامج له حلقات، أو حلقة لها تعليقات.
- تحديث عدادات البرامج والحلقات والتعليقات يتم ذريًا مع العملية الأصلية.
- نقل برنامج بين المحطات يحدّث مراجع محطات حلقاته والعدادات في transaction
  واحدة، حتى 450 حلقة. للبرامج الأكبر انقل الحلقات إلى برنامج آخر أولًا.
- تعديل بيانات المدينة يحدّث بيانات الموقع المنسوخة إلى محطاتها ذريًا حتى
  450 محطة. تمنع عمليات الحفظ تكرار رمز المدينة داخل الدولة، بما فيها الحفظ
  المتزامن. يلزم نشر قواعد وثيقة مراجعة دليل المدن قبل إصدار هذه الواجهة.
- المستخدمون read-only في شاشة الموارد؛ تعطيل الحساب متاح فقط ضمن قرار بلاغ
  موثق. حذف المستخدم نفسه يتم عبر Cloud Function المخصصة، لا من CRUD العام.
- التعليقات قابلة للمراجعة فقط في شاشة الموارد، وتنفذ قراراتها من طابور الإشراف
  للحفاظ على سجل القرار. المفضلة والاشتراكات قابلة للمراجعة والإزالة.
- طابور الإشراف يعرض بلاغات التعليقات والمستخدمين دون إبراز هوية المبلّغ، ويسجل
  قرار رفض أو إخفاء/إزالة تعليق أو تعطيل حساب بوقت الخادم وهوية المشرف. الإجراء
  وحسم البلاغات المفتوحة عملية batch ذرية.

## بوابة البناء والإصدار

```bash
npm run test
npm run lint
VITE_FIRESTORE_ROOT=HudHudOfficial npm run build
```

البناء دون جذر صريح أو بجذر غير معتمد يفشل؛ لا يتغير الجذر تلقائيًا عند غياب الإعداد.
لإنشاء حزمة اختبار استخدم `VITE_FIRESTORE_ROOT=HudHudDev` صراحة. تظهر البيئة المحددة
في اللوحة، وتُقيد استعلامات المجموعات قبل حد النتائج، كما تتحقق عمليات الكتابة من الجذر.
إعداد الجذر لا يمنح صلاحيات؛ تظل Rules وcustom claims بوابة الصلاحية.

قبل نشر رابط الحذف، اختبر كل مزود بحساب قابل للتخلص منه، بما فيه إلغاء popup وحظره،
الهوية المعروضة، تفويض Apple، المصادقة القديمة، وفشل callable الجزئي. البناء والاختبارات
المحلية لا تثبت تهيئة OAuth domains/providers أو نجاح حذف حساب على الخدمة المنشورة.
مرجع إلغاء Apple: https://firebase.google.com/docs/auth/web/apple


## Local deletion regression checks

From the repository root, `npm run emulators:admin` exercises the actual admin
episode deletion and program transfer helpers against a demo Firestore emulator. It covers retry and
counter behavior, both roots, interrupted deletions, missing parents and concurrent
comment creation, off-page episodes, concurrent episode creation during transfer,
and transfer size limits. Run `npm run emulators:test` for the matching authorization
checks. Release the matching comment Rules before the admin deletion UI; no local
build or test deploys either artifact.


## Authenticated local preview

Use Node 22. Start root Auth/Firestore emulators with project
`demo-hudhud-admin-preview`, then run:

```bash
GCLOUD_PROJECT=demo-hudhud-admin-preview FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node tool/seed-admin-preview.mjs
```

Serve Vite with `VITE_USE_FIREBASE_EMULATORS=true`, `VITE_FIRESTORE_ROOT=HudHudDev`,
`FIREBASE_PROJECT_ID=demo-hudhud-admin-preview` and synthetic values for the other
required Firebase fields. Fixture login: `preview-admin@example.test` /
`HudHud-preview-only-2026` (public local-only test values). Seeding rejects other
projects/hosts. Emulator mode rejects builds and live projects. Never reuse these
fixture credentials for real accounts.

Add `--large-only` to the guarded seeder command to add stations/cities 56–305
without resetting earlier fixture edits. `--banners-only` seeds only the four
banner timing examples. Both flags retain the same demo-project/host guards.
