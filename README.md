# HudHud FM — Flutter

تطبيق Flutter جديد، عربي أولًا، لعرض الإذاعات اليمنية. المشروع مستقل عن تطبيق
Android القديم ولا يحتوي طبقات توافق مع نماذج legacy.

## النطاق الحالي

- Android وiOS مدعومان في بيئة التطوير، مع بقاء Android هدف الإصدار الأول.
- Splash ثم شاشة رئيسية واحدة بلا Bottom Navigation.
- تصفح ضيف وحساب Email/password مع إنشاء واستعادة وخروج.
- بانرات Development غير حاجبة للشاشة.
- بحث بالاسم والمدينة والتردد.
- فلترة المدن من بيانات Firebase المرجعية فقط.
- Grid/List محفوظ محليًا.
- قراءة cache أولًا ثم تحديث يدوي/عند الفتح، دون listener دائم.
- برامج وحلقات وجدول أسبوعي وتشغيل live/episode موحد في الخلفية.
- تعليقات الحلقة لحظيًا أثناء الشاشة، مع شروط المشاركة وبلاغ التعليق/المستخدم
  والحظر الشخصي وطابور إشراف للإخفاء والإزالة وتعطيل الحساب.
- حذف الحساب داخل التطبيق وصفحة حذف عامة، تنفذهما Cloud Function بعد إعادة
  مصادقة حديثة وتحذف البيانات التابعة.
- إعلانات FCM اختيارية، بلا حفظ token أو device identifier في Firestore.

## Firebase Development

الجذر الوحيد حاليًا هو `HudHudDev`، والمسارات المعتمدة:

```text
HudHudDev/stations/stations/{stationId}
HudHudDev/banners/banners/{bannerId}
HudHudDev/users/users/{uid}
HudHudDev/users/users/{uid}/agreements/ugc
HudHudDev/users/users/{uid}/blockedUsers/{blockedUid}
HudHudDev/users/users/{uid}/commentReportEpisodes/{episodeId}/moderationReports/{commentId}
HudHudDev/users/users/{uid}/userReportTargets/{reportedUid}/moderationReports/{sourceCommentId}
HudHudDev/locations/locations/{locationId}
HudHudDev/programs/programs/{programId}
HudHudDev/episodes/episodes/{episodeId}
HudHudDev/episodes/episodes/{episodeId}/comments/{commentId}
```

لا ينسخ هذا المستودع أي إعداد Firebase من `FM-Pro`. لربط Android، سجّل تطبيق
Development بالحزمة `com.sanaadev.hudhudfm` ثم شغّل من جذر المشروع:

```bash
flutterfire configure \
  --platforms=android \
  --android-package-name=com.sanaadev.hudhudfm
```

ملفات Firebase المحلية مستبعدة من Git. فعّل Email/password في Firebase Auth،
وراجع `firestore.rules` ثم انشرها إلى بيئة Development بإجراء مستقل قبل اختبار
إنشاء الحساب أو التعليق على البيانات الحقيقية. المشروع لا ينشر القواعد تلقائيًا.

اختبار القواعد محليًا:

```bash
npm install
npm run emulators:test
```

وظيفة حذف الحساب في `functions/`، وتختبر محليًا بـ:

```bash
cd functions
npm install
npm run lint
npm test
cd ..
npm run emulators:account-deletion
```

قبل نشر Rules التي تشترط `status=published` على بيئة فيها تعليقات قديمة، اتبع
ترتيب migration والفهارس والدالة الموثق في
[`docs/release/google-play-ugc-evidence.md`](docs/release/google-play-ugc-evidence.md).

سيناريو بيانات العرض المترابط وتعليمات تشغيله موثقان في
[`tool/firebase_seed/README.md`](tool/firebase_seed/README.md)، وخريطة الرحلات في
[`DEMO_COVERAGE.md`](tool/firebase_seed/DEMO_COVERAGE.md). ابدأ دائمًا بـdry-run؛
لا يشغّل المشروع apply تلقائيًا.

لوحة إدارة الويب موجودة في [`admin_web`](admin_web/README.md)، وتغطي المحتوى
والجداول والحلقات والإعلانات وتعليقات الجمهور وطابور الإشراف والمفضلة
والاشتراكات. الدخول يتطلب
حساب Firebase Auth يحمل `admin=true` ولا تعتمد اللوحة على أسرار داخل المصدر.
النسخة المنشورة متاحة عبر Firebase Hosting على
[`hudhud-fm-admin-sanadev.web.app`](https://hudhud-fm-admin-sanadev.web.app).
بعد نشر الحزمة الحالية ستتوفر صفحتا `/community-guidelines` و
`/account-deletion` دون بوابة الإدارة؛ الروابط الحالية لن تعكسهما قبل النشر.

لـ iOS، يجب أن يطابق `ios/Runner/GoogleService-Info.plist` تطبيق Firebase المسجل
بالحزمة `com.sana.dev.fm`. الملف مضاف إلى Runner Target ويُقرأ عند بدء التطبيق.
يلزم أيضًا رفع APNs key في Firebase واستخدام provisioning يدعم Push Notifications
لاختبار FCM على جهاز iOS فعلي.

## العقود والأدوار

العقود الملزمة وخريطة سلطتها في [`docs/README.md`](docs/README.md)، وتعليمات
التطوير في [`AGENTS.md`](AGENTS.md). عقد Firebase والبيانات هو المصدر الوحيد
لتفاصيل Station وLocation وBanner بدل تكرارها هنا.

## التحقق

```bash
./tool/verify-governance.sh
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --debug
flutter build ios --simulator --debug
```
