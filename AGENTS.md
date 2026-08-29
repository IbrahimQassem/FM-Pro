# HudHud FM Flutter agent instructions

## Scope

هذه التعليمات تخص مشروع `hudhud_fm` فقط. لا تقرأ أو تنسخ أو تعدّل كودًا من
`../FM-Pro`؛ التطبيق Flutter مستقل ولا يحمل طبقات توافق مع تطبيق Android القديم.

## Single source of truth

| الموضوع | المصدر المعتمد |
|---|---|
| السلوك القابل للتنفيذ | `lib/` واختباراته في `test/` |
| حدود المعمارية وإدارة الحالة | `docs/contracts/architecture-contract.md` |
| Firebase ومخطط البيانات | `docs/contracts/firebase-data-contract.md` |
| الأمان والخصوصية | `docs/contracts/security-privacy-contract.md` |
| المنتج وRTL وإمكانية الوصول | `docs/contracts/product-ux-contract.md` |
| التشغيل الصوتي | `docs/contracts/playback-contract.md` |
| الجودة والإصدار | `docs/contracts/quality-release-contract.md` |

`README.md` مدخل تشغيل فقط ولا يكرر العقود. عند اختلاف الكود مع عقد، لا تفترض
أن أحدهما صحيح: وثّق الفرق، ثم حدّثهما معًا أو أوقف التغيير حتى يُحسم القرار.

## Required reading

قبل أي تغيير اقرأ هذا الملف و`docs/README.md`، ثم اقرأ عقد الدور والعقود المرتبطة
بالمهمة فقط. افحص الكود والاختبارات الفعلية قبل قبول أي افتراض توثيقي.

## Change rules

1. نفّذ شريحة صغيرة قابلة للتحليل والاختبار والبناء؛ لا تنشئ إعادة كتابة موازية.
2. حافظ على اتجاه `presentation -> domain <- data`، واجعل `app/providers.dart`
   نقطة تركيب الاعتماديات لا مستودعًا لمنطق الأعمال.
3. استخدم Riverpod فقط لإدارة الحالة والـDI. لا تضف service locator أو نمط حالة
   ثانٍ دون قرار موثق وإزالة المسار السابق.
4. لا تستدعِ Firebase من Widget أو Controller. يمر الوصول عبر data source ثم
   repository interface في domain.
5. لا تنفذ async work داخل `build`، وتخلص من controllers والاشتراكات والموارد.
6. حافظ على cache-first ثم server refresh. لا تضف listener دائمًا أو offline
   store جديدًا قبل تحديد lifecycle وinvalidation واختبارهما.
7. كل نص ظاهر للمستخدم يعيش في ARB، مع العربية وRTL وإمكانية الوصول وتكبير الخط.
8. لا تسجل stream URLs أو UID أو بيانات المستخدم أو تفاصيل إعداد Firebase.
9. لا تقرأ أو تعرض محتوى `google-services.json` أو `GoogleService-Info.plist`.
10. التطبيق Development/read-only حاليًا. أي كتابة، Rules، بيئة production،
    signing أو إطلاق خارجي يحتاج تفويضًا وعقدًا/قرارًا مستقلًا.

## Agent roles

- قيادة وتسليم: `.agents/roles/delivery-lead.md`
- معمارية Flutter: `.agents/roles/flutter-architecture.md`
- Firebase والبيانات والأمان: `.agents/roles/firebase-data-security.md`
- المنتج وUX وإمكانية الوصول: `.agents/roles/product-ux-accessibility.md`
- التشغيل الصوتي: `.agents/roles/playback.md`
- الجودة والإصدار: `.agents/roles/quality-release.md`

ملفات الأدوار عقود تسليم عند التفويض، وليست صلاحية تلقائية أو وكلاء دائمين.
أرسل لكل دور هدفًا واحدًا، نطاق ملفات، معايير قبول، وهل المهمة تنفيذ أم مراجعة.
لا تجعل دورين يعدلان الملف نفسه بالتوازي.

## Verification

شغّل من جذر `hudhud_fm`:

```bash
./tool/verify-governance.sh
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --debug
```

لتغيير iOS أو المشغل أو إعدادات المنصة شغّل أيضًا:

```bash
flutter build ios --simulator --debug
```

لا تدّع نجاح أمر لم يُنفذ. سجّل البيئة، النتائج، وما لم يُختبر وسبب ذلك.
