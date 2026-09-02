# جاهزية المصادقة — Development

- المشروع: `sanadev-fm`
- تاريخ التدقيق: 2026-09-02
- commit الأساسي: `629a35e`

هذا الملف يسجل نتيجة تحقق من الحالة الحية والمحلية دون نسخ Client IDs أو tokens
أو مفاتيح إلى المستودع.

| البند | الحالة | الدليل الحالي | المتبقي للإغلاق |
|---|---|---|---|
| AUTH-01 | ناجح | ADR-0001 معتمد واختيار الرمز فقط | لا شيء |
| AUTH-02 | محلي فقط | اختبارات Functions وEmulator ناجحة | إنشاء `EMAIL_VERIFICATION_CONFIG`، نشر Functions وRules، واختبار رسالة حقيقية |
| AUTH-03 Google | جاهز للاختبار | المزود مفعّل؛ SHA-1 وSHA-256 لتوقيع debug مسجلتان؛ Android config محدّث؛ iOS OAuth config محلي | نجاح/إلغاء/تبديل حساب وربط فعلي على Android وiOS |
| AUTH-04 Facebook | جاهز جزئيًا | المزود مفعّل في Firebase؛ App ID مطابق للإعداد القديم وClient Token مضبوط محليًا خارج Git | تأكيد package/bundle/key hashes في Meta ثم اختبار البريد المفقود والربط على الجهازين |
| AUTH-05 Apple | غير جاهز حيًا | entitlement والكود وبناء Simulator ناجحة | تفعيل Apple provider ومفاتيحه، provisioning صالح، واختبار Private Relay على جهاز |

## إشارات البيئة الحية

- Email/password وGoogle وFacebook مفعّلة في Firebase Authentication.
- Apple غير موجود ضمن default supported IdP configs.
- المنشور حاليًا هو `deleteAccountData` فقط؛ Functions الخاصة بالرمز والملف
  والتنظيف المجدول غير منشورة.
- Secret `EMAIL_VERIFICATION_CONFIG` غير موجود. Secret Manager API مفعّلة.
- تطبيق Android الفعلي مسجل للحزمة `com.sanaadev.hudhudfm`، وتطبيق iOS مسجل
  للحزمة `com.sana.dev.fm`. توجد سجلات Firebase أخرى قديمة ولا تستخدمها البنية
  الحالية.
- لا توجد هوية code signing صالحة مثبتة محليًا؛ بناء Simulator ينجح، لكن اختبار
  iPhone الفعلي يحتاج شهادة/provisioning من فريق Apple.

## أوامر البوابة

```bash
./tool/verify-auth-readiness.sh
flutter analyze
flutter test
flutter build apk --debug
flutter build ios --simulator --debug
```

آخر تحقق محلي: `flutter analyze` دون ملاحظات، و63 اختبار Flutter، و7 اختبارات
Functions، و4 سيناريوهات تكامل للرمز، و20 اختبار Rules، واختبار حذف الحساب؛ كما
نجح بناء Android debug وبناء iOS Simulator. تم تخطي اختبار واجهة المحاكي بناءً
على طلب صاحب المشروع، لذلك تبقى رحلات المزودين الحية ضمن عمود «المتبقي للإغلاق».

لا تنشر Rules الجديدة منفردة قبل Functions وإصدار العميل؛ لأنها تمنع الكتابات
الشخصية للحسابات غير الموثقة، ويجب أن تتوفر رحلة الرمز معها في الإصدار نفسه.
