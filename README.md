# HudHud FM — Flutter

تطبيق Flutter جديد، عربي أولًا، لعرض الإذاعات اليمنية. المشروع مستقل عن تطبيق
Android القديم ولا يحتوي طبقات توافق مع نماذج legacy.

## النطاق الحالي

- Android وiOS مدعومان في بيئة التطوير، مع بقاء Android هدف الإصدار الأول.
- Splash ثم شاشة رئيسية واحدة بلا Bottom Navigation.
- مستخدم Firebase الحالي عند توفره، وإلا هوية مستمع ضيف.
- بانرات Development غير حاجبة للشاشة.
- بحث بالاسم والمدينة والتردد.
- فلترة المدن من بيانات Firebase المرجعية فقط.
- Grid/List محفوظ محليًا.
- قراءة cache أولًا ثم تحديث يدوي/عند الفتح، دون listener دائم.

## Firebase Development

الجذر الوحيد حاليًا هو `HudHudDev`، والمسارات المعتمدة:

```text
HudHudDev/stations/stations/{stationId}
HudHudDev/banners/banners/{bannerId}
HudHudDev/users/users/{uid}
HudHudDev/locations/locations/{locationId}
```

لا ينسخ هذا المستودع أي إعداد Firebase من `FM-Pro`. لربط Android، سجّل تطبيق
Development بالحزمة `com.sanaadev.hudhudfm` ثم شغّل من جذر المشروع:

```bash
flutterfire configure \
  --platforms=android \
  --android-package-name=com.sanaadev.hudhudfm
```

ملفات Firebase المحلية مستبعدة من Git. قبل تشغيل التطبيق مع البيانات الحقيقية، يجب
أن تسمح قواعد Development بالقراءة من المسارات الأربعة أعلاه.

لـ iOS، يجب أن يطابق `ios/Runner/GoogleService-Info.plist` تطبيق Firebase المسجل
بالحزمة `com.sana.dev.fm`. الملف مضاف إلى Runner Target ويُقرأ عند بدء التطبيق.

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
