# Release readiness contract

الحالة: ملزم  
المالك: Quality and release role

## الهدف

تحديد المعايير والشروط الإلزامية غير القابلة للتفاوض لنقل تطبيق **هدهد FM (Hudhud FM)** من بيئة التطوير إلى بيئة الإنتاج والإطلاق النهائي (Production Release) على متجري **Google Play** و **Apple App Store**.

---

## الثوابت الإلزامية

### 1. بيئات وقواعد البيانات في Firebase
- جذر قاعدة بيانات الإنتاج الرسمية الحية هو حصرياً: `HudHudOfficial`.
- جذر بيئة التطوير والاختبارات هو حصرياً: `HudHudDev`.
- **منع بات:** يُحظر تماماً بناء أو توجيه أي حزمة Release إنتاجية إلى جذر `HudHudDev`.
- تُنشر قواعد الأمان `firestore.rules` و `storage.rules` بما يطابق مسار `HudHudOfficial` مع اشتراط فحص الانحدار عبر Firebase Emulator (`npm run emulators:test`).

### 2. معالجة النطاق والروابط القانونية (Domain & Legal Policies)
- يُمنع الترميز الثابت (Hardcoding) لنطاق التطبيق في شاشات الواجهة أو نوافذ الحوار.
- يُستخرج النطاق الأساسي (`appDomain`) ديناميكياً من إعدادات التطبيق أو التكوين المعتمد (مثل Remote Config / Environment Config).
- تُحدد مسارات السياسات المعتمدة كمسارات فرعية مرتبطة بالنطاق الأساسي:
  - سياسة الخصوصية: `${appDomain}/privacy`
  - شروط الخدمة: `${appDomain}/terms`
  - إرشادات المجتمع (UGC): `${appDomain}/community-guidelines`
  - حذف الحساب والبيانات: `${appDomain}/account-deletion`
- لوحة الإدارة (`admin_web`) هي الواجهة المسؤولة عن التحكم في هذه الصفحات العامة وخدمتها.

### 3. معرّف المتجر ومساعد الروابط (Store URL Resolution)
- يُمنع تثبيت رابط تنزيل أو تقييم المتجر كرابط ثابت عام (`https://hudhudfm.com/download`).
- يجب استخدام مساعد مخصص (`StoreUrlHelper`) يبني رابط التقييم والمتجر الرسمي بحسب منصة التشغيل الفعالة ومعرّف الحزمة:
  - **Android:** `https://play.google.com/store/apps/details?id=${packageId}` (معرّف الحزمة: `com.sanaadev.hudhudfm`).
  - **iOS:** رابط متجر App Store الرسمي المبني على Apple ID المعتمد بعد إعداد التطبيق في App Store Connect (معرّف الحزمة: `com.sana.dev.fm`).

### 4. الهوية البصرية والأصول الرسمية
- المصدر المعتمد والوحيد لأيقونة التطبيق هو الملف عالي الدقة:
  `/Users/iq/Documents/03_Projects/Mobile_Apps/Hudhud FM/01_الهوية_البصرية_والتصاميم/01_شعارات_المنصة_والأيقونات/Logo_Export_Transparent.png`
- يجب توليد الأيقونات المتكيفة (Adaptive Icons) بالكامل:
  - **Android:** أيقونة foreground وأيقونة background مع أيقونة أحادية اللون (Monochrome Themed Icon) لنظام Android 13+.
  - **iOS:** حزمة الأيقونات الكاملة شاملة مقاس 1024×1024 لمتجر App Store.
- يُمنع إطلاق أي نسخة إنتاجية تحمل أيقونة Flutter الافتراضية.

### 5. المراقبة ورصد الأعطال (Observability & Crashlytics)
- تفعيل حزمة `firebase_crashlytics` إلزامي لنسخ الإنتاج.
- التقاط كافة الأخطاء البرمجية غير المعالجة على مستوى Flutter Engine ومستوى المنصة الأصلية (Native).
- تسجيل نقاط التتبع (Breadcrumbs) لحالات مشغل الصوت للرجوع إليها عند تشخيص انهيارات الخلفية دون تسجيل أي بيانات شخصية (PII) أو روابط بث صوتية خاصة.

### 6. تقليص الأكواد وحماية الهندسة العكسية (R8 / ProGuard)
- تفعيل `isMinifyEnabled = true` و `isShrinkResources = true` في نوع البناء الإنتاجي لـ Android.
- وضع قواعد استثناء صريحة في `android/app/proguard-rules.pro` لحماية مكتبات الصوت والشبكة:
  - حماية حزم `com.ryanheise.just_audio.**` و `com.ryanheise.audioservice.**`.
  - حماية فئات نماذج Firebase والـ DTOs من حذف الحقول أو الانعكاسات (Reflection).

### 7. إدارة التوقيع والمفاتيح السرية
- لا يُقبل بناء Release يوقع بمفاتيح `debug`؛ يجب ربط `key.properties` بمفتاح الإنتاج (`hudhud-upload-keystore.jks`).
- يجب أن تبقى الملفات التالية مستثناة كلياً من الـ Git:
  - `android/key.properties`
  - `android/hudhud-upload-keystore.jks`
  - `android/auth-providers.properties`
  - `ios/Flutter/AuthProviders.xcconfig`

---

## بوابات التحقق قبل الإطلاق (Pre-Release Gates)

| البوابة | المتطلب | الشرط الإلزامي |
|---|---|---|
| **بوابة الكود** | اختبارات وتحليل Flutter | نجاح `flutter analyze` و `flutter test` بنسبة 100% دون أي تحذيرات حرجة. |
| **بوابة الأمان** | فحص قواعد Firebase | مطابقة `firestore.rules` لجذر `HudHudOfficial` واجتياز اختبارات المحاكي. |
| **بوابة الأصول** | الهوية البصرية | استبدال كافة أيقونات فلاتر بشعار هدهد FM الرسمي المتكيف. |
| **بوابة الروابط** | الخصوصية والمتاجر | عمل روابط الخصوصية والمتاجر عبر المتصفح الخارجي دون أخطاء 404 أو SnackBar. |
| **بوابة الصوت** | استقرار المشغل في الخلفية | تشغيل مستمر لأكثر من 30 دقيقة على جهاز حقيقي مع اختبار انقطاع البلوتوث والمكالمات. |
| **بوابة النشر** | استراتيجية الطرح التدريجي | بدء الإطلاق بنسبة 5% والمراقبة لـ 24 ساعة، مع اشتراط `Crash-Free Users ≥ 99.5%`. |

---

## خطة التراجع (Rollback Plan)

1. الاحتفاظ بنسخة البناء السابقة (Artifact السابق) جاهزة للرفع الفوري في حال حدوث تراجع حرج (P0).
2. في حال حدوث خلل في قواعد البيانات، يُعاد تفعيل الإصدار المؤرشف من القواعد فوراً ولا يُسمح بفتح القواعد بصلاحيات عامة (`allow read, write: if true`).
