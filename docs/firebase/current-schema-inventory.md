# Current Firebase inventory

الحالة: دليل حالي من كود العميل بتاريخ 2026-08-26
السلطة العقدية: [عقد Firebase والبيانات](../contracts/firebase-data-contract.md)

هذا الجرد يصف ما يستعمله التطبيق الأصلي حاليًا، ولا يعرّف schema جديدًا ولا
يثبت صلاحية قواعد الإنتاج. لم تُقرأ أو تُعدّل أي بيانات أو إعدادات إنتاجية أثناء
إعداده.

## المشاريع والنكهات

| flavor | application ID | `BASE_FB_DB` | حالة Google Services المحلية |
|---|---|---|---|
| `hudhud_fm` | `com.sanaadev.hudhudfm` | `HudHudFM` | متاح |
| `hudhudfm_google_play` | `com.sana.dev.fm` | `HudHudFmGooglePlay` | متاح |
| `internews` | `com.sanaadev.internews` | `InterNews` | عميل الحزمة غير موجود |

يعتمد التطبيق على ملف `app/google-services.json` محلي غير متتبع. لا يجوز نسخ
محتواه إلى التوثيق أو Git.

## مسارات Firestore

يمثل `{root}` قيمة `BASE_FB_DB`. تنشئ `FirestoreDbUtility` جذرًا من نوع
collection، ثم تتكرر بعض أسماء الوثائق والـcollections كما يلي:

| الكيان | المسار الحالي | العمليات المرصودة |
|---|---|---|
| Station | `/{root}/RadioInfo/RadioInfo/{radioId}` | قراءة، merge، تحديث، حذف |
| Program | `/{root}/RadioProgram/{radioId}/RadioProgram/RadioProgram/{programId}` | استعلام، إنشاء، تحديث، حذف |
| Episode | `/{root}/Episode/{radioId}/Episode/Episode/{epId}` | استعلام، إنشاء، تحديث، حذف |
| Comment | مسار Episode ثم `/Comment/{commentDocumentId}` | استعلام مرتب، إنشاء، حذف |
| User | `/{root}/Users/Users/{uid}` | قراءة مباشرة بالـUID، merge، تحديث، قائمة إدارية للمشرف فقط |
| Advertisement | `/{root}/Advertisement/Advertisement/{advertisementId}` | استعلام وعرض |
| Destination favorite | مسار User ثم `/favorites/{destinationId}` | قراءة، إنشاء، حذف |

مسار المفضلة جزء من شاشات Destination التجريبية ولا يستخدم ثابت collection.
يجب تقرير الاحتفاظ بالميزة أو حذفها قبل تحويلها إلى العقد المستهدف.

## الحقول المرصودة

- Station: المعرف، الاسم والوصف، رابط البث والشعار، الوسوم والمدينة والتردد،
  العدادات والأولوية، وحالات online/disabled/blue badge.
- Program: معرفا البرنامج والمحطة، الاسم والوصف والتصنيفات والصورة والجدول،
  المنشئ والتوقيت والعدادات وحالة disabled.
- Episode: معرفات المحطة والبرنامج والحلقة، بيانات العرض والبث والمذيع والصورة،
  الجدول والتوقيت والعدادات والإعجابات وحالة disabled.
- Comment: المعرف الثابت يساوي document ID، ومعرف الحلقة، اسم ومعرف الكاتب،
  النص، الوقت والإعجابات.
- User: UID والاسم والبريد والهاتف والصورة والملف الشخصي والموقع وطريقة
  التوثيق والدور والأذونات، مع معرفات الجهاز ورموز الإشعارات.

كان `UserModel` يتضمن خاصية `password` ويعيد كتابتها عند تحديث الملف الشخصي.
أوقف العميل تسلسلها وكتابتها في 2026-08-26، لكن أي حقل موجود في الإنتاج يحتاج
جردًا وحذفًا بأداة إدارية موثوقة وخطة rollback؛ لا ينفذ العميل migration.
رموز الإشعارات ومعرفات الأجهزة بيانات حساسة ولا يجوز تسجيلها. منذ 2026-08-26
لا يخزن العميل FCM token في SharedPreferences ولا يضع token/device fields في
نسخة جلسة المستخدم المحلية؛ تبقى الحقول الموجودة في Firestore ضمن جرد الإنتاج
المطلوب، وتتم مزامنة رمز الإشعار الحالي مباشرة عند فتح جلسة موثقة.

## خدمات Firebase الأخرى

- Authentication: مسارات Google وFacebook وSMS مرصودة، مع تهيئة تدعم email.
- Storage: `/{BASE_FB_DB}_Folder/{ownerId}/{imageName}`؛ تستخدم صورة الحساب UID
  كـ`ownerId`، بينما تستخدم صور المحتوى `radioId` ويكتبها admin فقط. روابط الصور
  القديمة تبقى قابلة للقراءة ولا تحتاج migration فوريًا.
- Remote Config: المفتاح `hudhudFmAppConfig` مع defaults من
  `res/xml/remote_config_defaults.xml`، ويقرأ إعدادات الدخول والإعلانات
  والإصدار المطلوب.
- Cloud Messaging: يجلب العميل FCM token بعد تسجيل الدخول ويزامنه مع وثيقة
  المستخدم دون تخزين محلي.
- Crashlytics: مهيأ ويستعمله مسار بدء التطبيق، لكن مؤشرات الإنتاج غير متاحة
  من المستودع.

## حدود الأمان الحالية

- يملك المستودع `firestore.rules` و`storage.rules` و`firebase.json` و19 اختبار
  Emulator محليًا. القواعد لم تُنشر إلى أي مشروع Firebase.
- القراءة العامة محصورة في المحطات والبرامج والحلقات والإعلانات والتعليقات ضمن
  جذور flavors المعروفة. وثيقة المستخدم خاصة بصاحب UID، وقائمة المستخدمين admin فقط.
- إنشاء التعليق يثبت UID والمؤلف ومعرف الحلقة والوثيقة والطول؛ التعديل والحذف
  للمالك أو admin. تفاعل الحلقة يسمح للمستخدم بتغيير مدخل إعجابه وعدّاده فقط.
- الكتابات الإدارية تعتمد custom claim باسم `admin=true`. يبقى `UserType` المحلي
  لإظهار UI فقط ولا يمنح أي كتابة في القواعد.
- رفع المستخدم محصور في مجلد UID وصور أقل من 5 MiB؛ صور المحتوى يكتبها admin.
- يوجد وصول مباشر إلى Firebase من Activities وFragments وAdapters. يمنع العقد
  إضافة وصول مباشر جديد، وتُنقل المسارات تدريجيًا إلى data source/repository.
- أزيل جلب ملفات مؤلفي التعليقات من Adapter، وصارت مطابقة الحساب تقرأ وثيقة UID
  بدل استعلام email/mobile، بينما مر إنشاء التعليق عبر `FirestoreDbUtility`.

## المدخلات الخارجية اللازمة للإغلاق

1. تصدير قواعد Firestore وStorage والفهارس الفعلية من مالك المشروع ومقارنتها
   بالقواعد المحلية قبل أي نشر.
2. توفير خدمة موثوقة لمنح وسحب `admin` custom claim مع سجل تدقيق.
3. توفير Firebase client صالح لـ`com.sanaadev.internews` أو ADR يوقف النكهة.
4. جرد production آمن لحقول `password` القديمة وحذفها بأداة إدارية مدققة.
5. تنفيذ بوابة ما قبل النشر والـrollback في
   [دليل القواعد](security-rules-runbook.md) بعد تفويض إنتاجي مستقل.
