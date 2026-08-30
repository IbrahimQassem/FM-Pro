# Security and privacy contract

الحالة: ملزم  
المالك: Firebase data and security role

## الأسرار والإعدادات

- هذه الملفات محلية ومستبعدة من Git ولا يجوز عرض محتواها أو نسخه بين المشاريع:
  - `android/app/google-services.json`
  - `ios/Runner/GoogleService-Info.plist`
  - `lib/firebase_options.dart`
- لا تسجل API keys أو project IDs أو connection details أو signing material.
- إعداد Android يخص `com.sanaadev.hudhudfm` وإعداد iOS يخص bundle المسجل له؛
  لا يفترض أن ملف منصة صالح للأخرى.
- لا تدخل بيئة production أو secrets إلى CI دون مخزن أسرار وصلاحية دنيا.

## المصادقة والبيانات الشخصية

- Firebase Auth هو مصدر هوية المستخدم الوحيد؛ بيانات UI لا تمنح صلاحية.
- guest fallback للعرض فقط ولا يمثل حسابًا موثقًا.
- UID والاسم والصورة أقل projection عام. يظهر email من Firebase Auth داخل شاشة
  الحساب فقط ولا يكتب في Firestore أو SharedPreferences ولا يسجل. الهاتف خارج النطاق.
- FCM اختياري ويستخدم topic ثابتًا؛ لا يخزن التطبيق token أو device ID في
  Firestore أو التخزين المحلي. SharedPreferences يحتفظ باختيار الاشتراك فقط.
- أي كتابة مستقبلية تتحقق منها Rules جهة الخادم، مع allow/deny tests للضيف
  والمستخدم والمالك والمشرف. إخفاء زر في UI ليس authorization.

## الشبكة والمحتوى الخارجي

- صور المستخدم والبانرات HTTPS فقط.
- روابط البث قد تكون HTTP بسبب المصدر، لكنها بيانات حساسة تشغيليًا: لا تسجل
  الرابط ولا تعرضه في رسالة خطأ ولا ترسله إلى analytics.
- لا يفتح banner أو deep link حتى توجد allowlist وسياسة `targetType` واختبارات.
- إشعارات FCM الحالية إعلانات نصية فقط؛ النقر يفتح التطبيق دون تفسير data
  payload أو تنقل حتى اعتماد allowlist مستقلة.
- رسائل الخطأ للمستخدم آمنة ولا تتضمن Firebase codes أو stack traces أو paths.

## التخزين والسجلات

- `SharedPreferences` يخزن اختيار grid/list فقط حاليًا، لا credentials أو PII.
- Firestore cache تديره SDK ولا يُعامل كصلاحية للوصول بعد تغير الهوية.
- debug logging يقتصر على نوع الخطأ وأعداد accepted/rejected دون وثائق أو URLs.
- لا تضف crash/analytics payload يحتوي user data قبل مراجعة الخصوصية.

## المنصات والإصدار

- Android release يستخدم debug signing حاليًا؛ هذا مقبول للتطوير فقط ويمنع
  اعتبار artifact جاهزًا للإنتاج.
- أي signing production أو App Store/Play upload يحتاج تفويضًا منفصلًا، secret
  storage، rotation وrollback.
- لا تنشر Firebase Rules أو تعدّل بيانات production ضمن build أو اختبار عادي.

## بوابة القبول

- فحص التغيير لا يكشف config أو secret أو PII.
- لا وصول Firebase جديد خارج data boundary.
- كل write جديد له Rules واختبارات رفض وقبول قبل الدمج.
- لا release production مع debug signing أو إعداد Development.
