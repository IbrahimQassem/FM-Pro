# Account, comments, and notifications contract

الحالة: ملزم  
المالك: Firebase data/security + Product UX

## الحساب

- يبقى الضيف قادرًا على الاكتشاف والاستماع وقراءة التعليقات.
- يدعم الحساب Email/password وGoogle وFacebook وApple. يبقى UID في Firebase Auth
  الهوية canonical، ويضيف المزود الجديد إلى الحساب الحالي بدل إنشاء ملف مستخدم
  مكرر.
- حساب Email/password يبدأ غير موثق. ترسل callable خادمية رمزًا رقميًا من ستة
  أرقام، ولا ينشأ ملف المستمع ولا يسمح بأي كتابة شخصية أو UGC قبل نجاح التحقق.
- رمز التحقق صالح لعشر دقائق، بخمس محاولات، ومهلة دقيقة بين طلبات الإرسال وحد
  خمسة إرسالات في الساعة. لا يولد التطبيق الرمز ولا يخزنه أو يقرر صحته.
- مصدر التوثيق الموحد: راية التوثيق المعتمدة في Firebase Auth هي المصدر الوحيد للتوثيق (Single Source of Truth) لكافة صلاحيات الحساب والكتابة والـ UGC.
  - حسابات Email/password غير الموثقة تمر بمسار رمز التحقق الخادمي (OTP) الذي يحدث الحساب خادمياً عند النجاح.
  - مزود OAuth لا يمنح التوثيق تلقائيًا. تنشئ `ensureAccountProfile` ملف المستمع فقط عند وجود `emailVerified` موثوق في Firebase Auth؛ البريد المفقود أو غير الموثق يتبع مسار OTP القائم.
- تدعم جميع مسارات الحساب والتعليقات والـ UGC كلاً من جذر الإنتاج `HudHudOfficial` وجذر التطوير `HudHudDev` عبر قواعد أمان موحدة وغير قابلة للتجاوز.

- كلمة المرور لا تخرج من repository ولا تخزن أو تسجل. البريد يظهر في شاشة
  الحساب فقط.
- يستطيع المستخدم حذف حسابه من شاشة الحساب بعد إعادة المصادقة بكلمة المرور أو
  بمزود اجتماعي مرتبط، والموافقة الصريحة على التحذير النهائي. يستدعي التطبيق
  callable خادمية قابلة للاستئناف ثم يسجل الخروج بعد نجاح الحذف فقط.
- يتوفر المسار الخارجي `/account-deletion` للمستخدم الذي أزال التطبيق. لا تعرض
  رسائل الفشل ما إذا كان البريد مسجلًا، ولا يعد تعطيل الحساب حذفًا.

## التعليقات

- التعليقات تابعة للحلقة canonical وتقرأ لحظيًا أثناء الشاشة فقط، بحد 100.
- الضيف يقرأ ولا يكتب. المستخدم المسجل النشط يضيف نصًا من 1 إلى 1000 حرف بعد
  قبول الإصدار الحالي من شروط المشاركة.
- اسم الكاتب مشتق من ملفه المحمي، ولا تقبل Rules اسمًا أو UID مزورًا.
- لا تعديل/حذف مستخدم أو likes أو كتابة عداد الحلقة في هذا الإصدار.
- يعرض كل تعليق ليس للمستخدم الحالي ثلاثة أفعال منفصلة: الإبلاغ عن التعليق،
  الإبلاغ عن المستخدم، وحظر صاحبه. تحتاج الأفعال حسابًا، ويبقى الضيف قارئًا.

## قبول شروط UGC

- تعرض شروط المشاركة بوضوح من شاشة التعليقات بالعربية والإنجليزية.
- قبل أول تعليق، يختار المستخدم «أوافق وأتابع» صراحة؛ الإغلاق أو الرجوع لا يعد
  قبولًا ولا يفتح محرر التعليق.
- يخزن إثبات الحد الأدنى تحت المستخدم: إصدار الشروط ووقت الخادم فقط.
- يستطيع المستخدم مراجعة الشروط بعد القبول من جوار محرر التعليق.
- تغير الحساب يعيد تحميل حالة الموافقة ولا يعرض حالة حساب سابق.
- Rules، وليس Widget، تمنع التعليق عند غياب القبول أو قدم الإصدار.
- البلاغ حتمي لكل مستخدم وتعليق، وسببه مقيد وتفاصيله اختيارية حتى 500 حرف؛ لا
  تظهر هوية المبلّغ لصاحب التعليق.
- الحظر مستقل وشخصي؛ يخفي تعليقات المؤلف فورًا ويوفر تراجعًا مباشرًا.
- فشل تحميل قائمة الحظر يمنع عرض التعليقات المسجلة بدل كشف محتوى محظور سابقًا.
- طابور الإدارة يعرض بلاغات التعليق والمستخدم للمشرف فقط، ويتيح رفض البلاغ أو
  إخفاء/إزالة التعليق أو تعطيل الحساب، مع قرار ووقت وهوية مشرف قابلة للتدقيق.
- التعليقات `hidden/removed` لا تظهر للعامة حتى بطلب Firestore مباشر. تعطيل
  الحساب يمنع كل الكتابات الشخصية وUGC، مع بقاء الحذف مسارًا منفصلًا للمستخدم.

## المفضلة والاشتراكات

- المفضلة تخص المحطات أو البرامج أو الحلقات وتخزن تحت ملف المستخدم دون تكرار
  UID أو بيانات شخصية في الوثيقة.
- الاشتراك يخص محطة أو برنامجًا، ويحتوي تفعيل الحالة وتفضيل الإشعارات فقط؛ لا
  يمثل دفعًا أو اشتراكًا ماليًا.
- الضيف لا يقرأ أو يكتب. المستخدم يدير بياناته فقط، والمشرف يملك مراجعة وإزالة
  السجلات من لوحة الإدارة.

## مسار الإعدادات والحساب والتفاعل (Settings & Account Hub)

- يتحول مسار الإعدادات والحساب إلى مركز متكامل مجمع وخفيف (Grouped Settings Hub) يفصل بين الإعدادات العامة وإدارة الحساب والمصادقة:
- **مركز الإعدادات (Settings Hub):**
  - شاشة مجمعة تتسع في صفحة واحدة تضم بطاقة المستمع العلوية، مجموعة التفاعل والمجتمع، ومجموعة عن التطبيق والمعلومات.
  - للضيف: تعرض بطاقة الهدهد الترحيبية مع زرين واضحين ومفصولين: «تسجيل الدخول» (`SignInScreen`) و«إنشاء حساب جديد» (`RegisterScreen`).
  - للمسجل: تعرض بطاقة البروفايل مع الأفاتار والاسم وشارة التوثيق وزر «إدارة بيانات الحساب» الذي يفتح شاشة إدارة الحساب المخصصة (`ManageAccountScreen`).
- **شاشتا تسجيل الدخول وإنشاء الحساب المنفصلتان (`SignInScreen` & `RegisterScreen`):**
  - فصل تام بين تسجيل الدخول وإنشاء الحساب في واجهتين مخصصتين، مع رابط سريع للتبديل بينهما، وتكامل مع مزودي الدخول الاجتماعي (Google, Facebook, Apple) وإرشادات المجتمع.
- **شاشة إدارة الحساب المخصصة (`ManageAccountScreen`) وتعديل الملف الشخصي (`EditProfileBottomSheet`):**
  - عرض الصورة الشخصية والاسم والبريد وشارة التوثيق.
  - إمكانية تعديل الاسم والصورة عبر حوار «تعديل الملف الشخصي» السريع، مع دعم التقاط صورة بالكاميرا 📸، أو الاختيار من المعرض 🖼️، أو اختيار شخصية من شخصيات الهدهد الرسمية 🪶.
  - عرض طريقة تسجيل الدخول الحالية (`currentSignInMethod`) كشارة هادئة دون إرباك المستخدم بأزرار ربط إضافية بعد إكمال التسجيل.
  - جعل خيار حذف الحساب غير بارز وفي أسفل الشاشة (`deleteAccountDiscrete`) لتجنب تشجيع المستخدم على الحذف، مع بقاء تأكيد الحذف بكلمة المرور مطابقًا لمتطلبات المتاجر.
- **التفاعل والمجتمع:**
  - دعوة صديق / مشاركة التطبيق: تفعيل مشاركة رابط تنزيل التطبيق برسالة دعوة يمنية أصيلة عبر `ShareService` مع التوافق التام مع iPad.
  - تقييم التطبيق: توفير حوار تفاعلي `AppRatingDialog` بالنجوم مع تغذية راجعة لطيفة من الهدهد ورابط المتجر.
- **عن التطبيق والمعلومات:**
  - توفير حوار/شاشة `AboutAppDialog` لعرض إصدار وبناء التطبيق، قصة الهوية، روابط سياسة الخصوصية وشروط الخدمة.
  - إتاحة إعادة استعراض "جولة في التطبيق" (App Tour) وإرشادات المجتمع (UGC Guidelines) للجميع.

## إشعارات التطبيق

- إشعار جلسة الوسائط مملوك لعقد playback وليس جزءًا من FCM.
- FCM مخصص لإعلانات `hudhud_fm_announcements` فقط، والاشتراك opt-in صريح.
- لا يُخزن token أو device identifier، ولا يفسر التطبيق روابط أو أوامر data.
- foreground يظهر كتغذية داخل التطبيق، background/terminated يعرضه النظام.
- القائمة داخل التطبيق لا تدّعي أنها inbox دائم؛ تحتفظ بآخر 20 رسالة في الذاكرة.

## بوابة القبول

- قواعد Firestore تختبر guest/user/forged/admin/default deny محليًا.
- كل subscription يلغى عند dispose ولا يوجد prompt تلقائي عند بدء التطبيق.
- رسائل الخطأ localized وآمنة، ولا تعرض Firebase codes أو paths.
- Android 13 permission وiOS push/background capabilities موجودة، مع اختبار جهاز
  فعلي مطلوب قبل الإصدار لأن simulator/build لا يثبت تسليم APNs أو FCM.


## Station subscription development amendment — 2026-09-08

[ADR 0003](../decisions/0003-station-subscriptions-and-alerts.md) owns the station
follow flow, callable mutations, private device registrations, publication jobs,
retention, consent and allowlisted episode notification navigation. This supersedes
the earlier topic-only/no-payload-navigation boundary for version-1 episode alerts
only. General announcements remain independent; arbitrary URLs remain rejected.
Private device/job paths are denied by the default Rules, including admin clients.
No production deployment or app release is included.


## WO-02 registration outcome and notification handoff reconciliation

Email/password account creation and verification-code delivery are separate
outcomes. Once Auth creation succeeds, a rejected or unavailable delivery request
or rate limit leaves that account signed in and unverified. Registration returns
AccountRegistrationResult with sent, failed or rateLimited verificationDelivery;
only an explicit callable response with sent == true sets verificationCodeSent.
That response acknowledges dispatch, not inbox receipt or email verification. A
creation failure does not report delivery success or dispatch a verification code.
No raw delivery exception, password or account data is logged.

The controller prevents a second create request while registration is pending or
a user/account has already been created; recovery uses the existing resend flow.
Each resend clears prior sent feedback before requesting delivery, so a later
failure cannot coexist with stale success. Delayed Auth events retain the pending
registration outcome for its identity, while identity changes/disposal invalidate
stale asynchronous delivery results. Existing localized sent/failure/rate-limit
feedback and verification/resend UI remain in use. Delivery never grants verified
status, listener-profile creation, personal writes or UGC privileges: trusted
Firebase Auth verification and the existing server/Rules gates remain authoritative.

Source: [registration result](../../lib/features/account/domain/models/account_registration_result.dart),
[Auth datasource](../../lib/features/account/data/datasources/account_auth_data_source.dart),
[repository](../../lib/features/account/data/repositories/firebase_account_repository.dart)
and [controller](../../lib/features/account/presentation/controllers/account_controller.dart).
Permanent regressions cover [dispatch outcomes](../../test/features/account/data/account_auth_data_source_test.dart),
[controller lifecycle/resend](../../test/features/account/presentation/account_controller_test.dart)
and [registration UI](../../test/features/account/presentation/register_screen_test.dart).
[B08 evidence](../../.boss/technical-review/evidence/WO-02/B08-provenance.json)
retains the real pre-fix delivery failures and subsequent focused/integrated checks.

Version-1 episode alerts retain the allowlisted ADR 0003 handoff.
[openEpisodeAlert](../../lib/features/notifications/presentation/episode_alert_navigation.dart)
validates the selected root and root:episode event identity, then resolves the
canonical station/program/episode target directly through the existing repository.
It does not depend on a station's first content page or fetch the whole catalog.
A valid result opens ProgramDetailsScreen highlighting that episode; it does not
start audio. Duplicate taps share one in-flight lookup, and an unmounted view
receives no late navigation. Missing content returns to the first route with
localized unavailable feedback; lookup errors use localized load failure.
Arbitrary URLs, cross-root targets and notification-carried media URLs gain no
navigation or playback authority. General announcements, consent and private
device/job permissions remain unchanged.

[Permanent navigation tests](../../test/features/notifications/presentation/episode_alert_navigation_test.dart)
cover available/missing/offline targets, direct resolution outside the first
page, duplicate taps/disposal and zero audio starts. Recorded full Flutter/build
evidence is linked in the [playback reconciliation](playback-contract.md#wo-02-timer-and-completed-replay-reconciliation).
It does not establish actual APNs/FCM delivery, browser acceptance or physical
Android/iPhone behavior. Final merged-candidate tests, device notification/audio
acceptance and independent WO-02 review/QA remain mandatory. No security gate or
finding status changes through this documentation-only reconciliation.
