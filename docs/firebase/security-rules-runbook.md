# Firebase security rules runbook

الحالة: قواعد محلية مختبرة، غير منشورة
السلطة العقدية: [عقد Firebase والبيانات](../contracts/firebase-data-contract.md)
و[عقد الأمان والخصوصية](../contracts/security-privacy-contract.md)

## النطاق المحلي

- `firestore.rules` و`storage.rules` هما artifact القواعد المرشح.
- `firebase.json` يشغل Firestore وStorage Emulator فقط.
- `firebase-tools` مثبت في `package-lock.json`، و`npm run emulators:test` يشغل
  اختبارات allow/deny على مشروع وهمي
  `demo-fm-pro-rules-test` ولا يستطيع الوصول إلى بيانات إنتاج.
- claim الإدارة المعتمد هو boolean باسم `admin`. لا يمنح تطبيق Android هذا
  claim ولا يحتوي Admin SDK أو service-account.

## بوابة ما قبل النشر

لا تنفذ أي خطوة نشر إلا بتفويض إنتاجي مستقل وبعد اكتمال الآتي:

1. حفظ نسخة مؤرخة من قواعد Firestore وStorage المنشورة حاليًا خارج APK.
2. مقارنة القواعد المنشورة بالقواعد المرشحة وتوثيق كل مسار سيتغير.
3. جرد جذور flavors والـindexes والحقول القديمة، خصوصًا `password` وبيانات الجهاز.
4. إثبات وجود خدمة موثوقة تمنح وتسحب `admin` مع audit، واختبار مستخدم إداري فعلي.
5. تشغيل `npm ci` ثم `npm run emulators:test` وبناء flavorين المدعومين.
   يجب أن ينجح `npm audit --audit-level=high`؛ تنبيهات أداة CLI المتوسطة الحالية
   محصورة في dev tooling ويتابعها TD-018 ولا تدخل APK.
6. تنفيذ smoke على مشروع staging: listener، login، profile، comment، like،
   upload profile، وإدارة المحتوى.

## النشر والـrollback

- يحدد المنفذ project alias صريحًا؛ لا يستخدم المشروع الافتراضي ضمن سكربت آلي.
- ينشر Firestore وStorage Rules معًا فقط بعد نجاح البوابة، مع تسجيل commit والوقت.
- يراقب `permission-denied` ومسارات login/comment/upload مباشرة بعد النشر.
- عند تراجع حرج، يعاد نشر artifact القواعد السابق المحفوظ، ثم تعاد اختبارات
  smoke. لا توسع قاعدة عامة مؤقتًا ولا تستخدم `allow read, write: if true`.

## تغييرات التوافق الحالية

- تسجيل الدخول يقرأ `Users/{uid}` بدل query على email/mobile.
- التعليق يستخدم document ID مطابقًا لـ`commentId`.
- صور الحساب الجديدة تكتب تحت مجلد UID. الروابط القديمة تبقى للقراءة، ولا
  ينقل العميل ملفات إنتاج.
