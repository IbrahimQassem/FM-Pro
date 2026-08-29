# حصر قدرات التطبيق القديم

## 1. الغرض والنطاق

هذا المستند مرجع تخطيطي غير ملزم لتطبيق Flutter. يسجل ما وُجد في تطبيق
Android القديم كما يظهر في الكود، لكنه لا يحول التنفيذ القديم أو بنيته أو
قراراته إلى عقود للتطبيق الجديد.

- لقطة المصدر: الفرع `modernization-phase-2`، الالتزام `f60f172`.
- تاريخ الجرد: 2026-08-29.
- أدلة الفحص: Android Manifest، ملفات Java والموارد، Gradle، واستخدامات
  Firebase والخدمات والـworkers.
- حجم السطح المفحوص: 37 Activity معلنة، و3 Services، وReceiver واحد،
  وProvider واحد، و229 ملف Java، و80 Layout، و33 ملف اختبار وحدات.
- لا يتضمن الجرد أسرار Firebase أو معرفات الإعلانات أو بيانات المستخدمين.

هذا جرد ثابت للكود، وليس إثباتاً بأن كل مسار كان مفعلاً في الإنتاج أو آمناً
أو صالحاً للترحيل كما هو. أي قدرة تعتمد على إعدادات Firebase أو سياسات الخادم
تحتاج تحققاً تكاملياً مستقلاً.

## 2. مفتاح التصنيف

| الحالة | المعنى |
|---|---|
| مكتمل | يوجد مسار واجهة وتنفيذ فعلي ظاهر في الكود. |
| جزئي | يعمل جزء من المسار، أو توجد فجوة معروفة في السلوك أو التكامل. |
| بنية تحتية | خدمة أو طبقة مساندة وليست ميزة مستقلة للمستخدم. |
| غير موصول | التنفيذ موجود لكن لا يظهر له استدعاء فعلي من مسار التطبيق. |
| واجهة فقط | شاشة أو زر أو نموذج بلا عملية نهائية مكتملة. |
| قديم/مكرر | مسار تقني موازٍ أو إرثي لا ينبغي ترحيله قبل اتخاذ قرار. |

قرارات Flutter المقترحة:

- **إعادة البناء**: نحتفظ بهدف المنتج وننفذه وفق عقود Flutter.
- **تحقق أولاً**: نثبت حاجة المنتج والبيانات والصلاحيات قبل التخطيط.
- **تأجيل**: ليس ضمن الأساس الحالي، ويحفظ في backlog فقط.
- **استبعاد**: لا ينقل إلا بقرار جديد صريح.

## 3. ملخص المجالات

| المجال | الموجود في القديم | حالة Flutter الحالية | القرار المقترح |
|---|---|---|---|
| البدء والتهيئة | Splash، إعداد Firebase، دخول مجهول، Intro، تحديث إجباري، fallback محلي | بوابة Firebase وSplash أساسيان | إعادة بناء سياسات البدء تدريجياً |
| اكتشاف الإذاعات | بانرات، بحث، تصفية، شبكة/قائمة، اختيار محطة، تفاصيل | موجود أساس جيد للصفحة والتفاصيل | استكمال وتحسين |
| البث المباشر | تشغيل/إيقاف مؤقت/إيقاف، mini-player، إشعار foreground، metadata | تشغيل `just_audio` وmini-player وخلفية/إشعار جلسة الوسائط وAudio Focus موجودة | اعتماد مصفوفة المقاطعات وBluetooth على أجهزة فعلية ثم بحث استعادة process death |
| البرامج والحلقات | قوائم، تفاصيل، جدول يومي، حلقات لحظية | برامج وتفاصيل وحلقات منشورة وجدول أسبوعي وتشغيل الحلقة موجودة | اعتماد البيانات والجهاز؛ realtime feed والتفاعل مؤجلان |
| التفاعل | تعليقات، إعجاب حلقة، مشاركة؛ المفضلة والاشتراك غير مكتملين | غير موجود | تحقق أولاً لكل تفاعل |
| الحساب | ضيف، Google، Facebook، هاتف، ملف شخصي، حذف الحساب | قراءة مستخدم/ضيف فقط | إعادة بناء حسب قرار مزودي الدخول |
| الإدارة | لوحة وإحصاءات وقوائم وحذف/تعطيل؛ نماذج كثيرة placeholders | غير موجود | يفضل منتج إدارة منفصل؛ تحقق أولاً |
| الإشعارات | FCM، إذن Android، حفظ token، إشعار بسيط | غير موجود | إعادة بناء بعد تحديد حالات الاستخدام |
| البيانات والتخزين | Firestore CRUD ومراقبة، Storage uploads، cache وseed | قراءة Firestore محدودة | توحيد المسارات قبل التوسعة |
| الإعلانات والقياس | Ads/Consent، Analytics، Crashlytics، Performance | غير موجود | قرار منتج وخصوصية مستقل |
| التخصيص | العربية/الإنجليزية، RTL، ثيم نظام/فاتح/داكن | العربية/الإنجليزية وRTL والثيم الأساسي | استكمال إعداد المستخدم |

## 4. رحلات المستخدم والميزات

### 4.1 البدء والوصول

| ID | العملية أو الميزة | الحالة في القديم | الدليل المختصر | قرار Flutter |
|---|---|---|---|---|
| START-01 | تهيئة Firebase عند تشغيل التطبيق | مكتمل | `FmApplication` | موجود جزئياً؛ الحفاظ على بوابة فشل آمنة |
| START-02 | تطبيق اللغة والثيم المحفوظين قبل الواجهة | مكتمل | `FmApplication`, `PreferencesManager` | إعادة البناء |
| START-03 | تسجيل دخول مجهول للمستمع مع متابعة آمنة عند الفشل | مكتمل | `SplashActivity` | تحقق أولاً من الحاجة؛ لا تجعل التصفح رهينة للمصادقة |
| START-04 | جلب Remote Config وتخزين إعدادات التطبيق | جزئي | `SplashActivity`, `AppRemoteConfig` | إعادة تصميم كمفاتيح محددة لا JSON شامل |
| START-05 | فرض تحديث عند تجاوز `requiredVersion` | مكتمل | `StartupAccessPolicy`, `SplashActivity` | إعادة البناء مع سياسة إصدار موثقة |
| START-06 | عرض Intro في أول تثبيت أو بعد ترقية مختارة | مكتمل | `AppIntroLight`, `checkAppStart` | تحقق أولاً من رحلة onboarding المطلوبة |
| START-07 | تحميل الإذاعات النشطة وترتيبها بالأولوية | مكتمل | `SplashActivity`, `PriorityRankingEngine` | إعادة البناء؛ جزء القراءة موجود |
| START-08 | استخدام seed محلي عند غياب البيانات أو فشل الشبكة | مكتمل مع اختلاف DEBUG | `LocalSeed*DataSource` | إبقاء seed للتطوير فقط وفق عقد البيانات |
| START-09 | اختيار المحطة السابقة أو fallback افتراضي | مكتمل | `DefaultStationPolicy` | إعادة البناء |
| START-10 | شاشة مستقلة لانقطاع الإنترنت وإعادة المحاولة | جزئي/قديم | `NoInternetActivity`, `StateLayout` | استخدم حالات inline في Flutter ولا تنقل الشاشة حرفياً |
| START-11 | نكهات Official وDevelopment وInternews | بنية تحتية | `app/build.gradle` | قرار بيئات مستقل قبل الإصدار |

### 4.2 الرئيسية واكتشاف المحطات

| ID | العملية أو الميزة | الحالة في القديم | الدليل المختصر | قرار Flutter |
|---|---|---|---|---|
| HOME-01 | ترحيب المستخدم أو الضيف | مكتمل | `AccountFragment` وبيانات الجلسة | موجود أساسه في Flutter |
| HOME-02 | بانرات/وجهات أعلى الرئيسية مع ترتيب واستهداف | مكتمل للعرض، جزئي للإجراء | `MainHomeFragment`, `DestinationSliderAdapter`, `BannersRepository` | إعادة البناء مع allowlist للروابط |
| HOME-03 | عرض الإذاعات في Grid أو List | مكتمل | `MainHomeFragment`, `StationGridAdapter` | موجود |
| HOME-04 | البحث باسم المحطة | مكتمل | `MainHomeFragment.applyFilter` | موجود وموسع بالمدينة والتردد |
| HOME-05 | تصفية المحتوى/المحطات من الواجهة | جزئي | `setupSearchAndFilters`, الوجهات المحلية | تثبيت تعريف الفلاتر قبل النقل |
| HOME-06 | إظهار عدد النتائج | مكتمل | `updateCountText` | موجود |
| HOME-07 | فتح تفاصيل المحطة | مكتمل | `RadioListActivity`, `DestinationDetailActivity` | موجود أساسه |
| HOME-08 | اختيار محطة نشطة وحفظها | مكتمل | `RadioListActivity`, `PreferencesManager` | إعادة البناء |
| HOME-09 | تشغيل سريع من بطاقة المحطة | مكتمل | `onQuickPlayClick`, `MainActivity` | موجود |
| HOME-10 | عرض حالة المحطة والتوثيق والإحصاءات | مكتمل للعرض | `RadioInfo`, adapters | موجود جزئياً |
| HOME-11 | مفضلة الوجهة/المحطة | واجهة فقط | `DestinationDetailActivity.toggleFavorite` | لا تعتبر متطلباً حتى اعتماد نموذج المفضلة |
| HOME-12 | حالات loading/empty/error/offline مع retry | مكتمل في عدة شاشات | `StateLayout` وموارد `view_state_*` | إعادة البناء كنمط موحد |

### 4.3 البرامج والحلقات والجدول

| ID | العملية أو الميزة | الحالة في القديم | الدليل المختصر | قرار Flutter |
|---|---|---|---|---|
| CONTENT-01 | جلب برامج محطة محددة | مكتمل | `ProgramsRepository`, `FirestoreProgramsRemoteDataSource` | موجود بعقد canonical في Flutter |
| CONTENT-02 | cache برامج في الذاكرة مع TTL وforce refresh | مكتمل | `ProgramsRepositoryImpl`, `InMemoryProgramsLocalDataSource` | تحقق أولاً؛ لا تضف cache بلا سياسة lifecycle |
| CONTENT-03 | قائمة البرامج وفتح التفاصيل | مكتمل | `ProgramsFragment`, `ListProgramActivity` | موجود في Flutter |
| CONTENT-04 | تفاصيل البرنامج والإحصاءات والجدول | مكتمل للعرض | `ProgramDetailsActivity/Fragment` | موجود جزئيًا؛ لا كتابة إحصاءات |
| CONTENT-05 | مشاركة تفاصيل البرنامج/الحلقة عبر share sheet | مكتمل | `ProgramDetailsActivity/Fragment` | إعادة البناء |
| CONTENT-06 | قائمة حلقات البرنامج | مكتمل | `ListEpisodeActivity`, `ProgramDetails*` | موجود في Flutter |
| CONTENT-07 | تفاصيل الحلقة وتشغيل ملفها الصوتي | مكتمل بمسار player قديم | `ProgramDetailsActivity`, `SongPlayerFragment` | قائمة وتشغيل موحد موجودان؛ شاشة تفاصيل مستقلة مؤجلة |
| CONTENT-08 | جدول اليوم للمحطة حسب أيام وأوقات البث | مكتمل | `DailyEpisodeFragment`, `TimeLineAdapter` | جدول أسبوعي موجود بـoffset صريح واختبارات domain |
| CONTENT-09 | feed حلقات لحظي من Firestore | مكتمل لكن إرثي مباشر من UI | `RealTimeEpisodeFragment` | إعادة بناء عبر repository أو استبعاد إن لم يعد مطلوباً |
| CONTENT-10 | ترتيب محطات/برامج/حلقات وفق priority والإحصاءات | بنية تحتية | `PriorityRankingEngine` | تحقق أولاً من قواعد المنتج قبل النقل |
| CONTENT-11 | حساب حالة الجدول: قادم/مباشر/منتهٍ | بنية تحتية | `ScheduleStatusCalculator` | موجود في domain مع اختبارات توقيت |
| CONTENT-12 | دعم بيانات legacy وcanonical مع mapping دفاعي | جزئي/انتقالي | DTOs و`*Mapper` | لا تنقل التوافق القديم تلقائياً؛ اعتمد canonical فقط |

### 4.4 التعليقات والتفاعل الاجتماعي

| ID | العملية أو الميزة | الحالة في القديم | الدليل المختصر | قرار Flutter |
|---|---|---|---|---|
| SOCIAL-01 | عرض تعليقات الحلقة لحظياً | مكتمل | `CommentsActivity`, FirebaseUI | إعادة البناء إذا اعتمدت التعليقات |
| SOCIAL-02 | إضافة تعليق للمستخدم المسجل | مكتمل مع تحقق أساسي | `CommentsActivity` | إعادة البناء مع validation وقواعد خادم |
| SOCIAL-03 | منع الضيف من التعليق وتوجيهه للدخول | مكتمل | `validateComment` | إعادة البناء |
| SOCIAL-04 | إعجاب/إلغاء إعجاب الحلقة | جزئي | `RealTimeEpisodeFragment.toggleLike` | تحقق أولاً؛ التنفيذ القديم يخزن map مستخدمين في الوثيقة |
| SOCIAL-05 | عرض عدادات الإعجاب والتعليقات والاشتراكات والتنزيلات | مكتمل للقراءة فقط في مواضع | models/mappers | عرضها فقط إذا كانت إحصاءات الخادم موثوقة |
| SOCIAL-06 | إعجاب تعليق | نموذج فقط | `Comment` fields وواجهة adapter | تأجيل |
| SOCIAL-07 | الاشتراك في برنامج/محطة | نموذج وثوابت فقط | models و`SUBSCRIPTIONS_SUBCOLLECTION` | تأجيل حتى تعريف الإشعار والإلغاء |
| SOCIAL-08 | المفضلة | واجهة/نموذج فقط | `isFavorite`, `FAVORITES_SUBCOLLECTION` | تأجيل |
| SOCIAL-09 | حذف أو تعديل تعليق | غير موجود كرحلة مكتملة | لا يوجد إجراء مستخدم مقابل | يلزم تصميم جديد إن طلبه المنتج |

### 4.5 المصادقة والحساب والإعدادات

| ID | العملية أو الميزة | الحالة في القديم | الدليل المختصر | قرار Flutter |
|---|---|---|---|---|
| AUTH-01 | التصفح كضيف/مستخدم مجهول | مكتمل | `SplashActivity`, `BaseActivity/Fragment` | الحفاظ على listener-first |
| AUTH-02 | الدخول بواسطة Google وربطه بـFirebase Auth | مكتمل | `GoogleSignInHelper`, `LoginByActivity` | تحقق من متطلبات المنصة ثم إعادة البناء |
| AUTH-03 | الدخول بواسطة Facebook | مكتمل مع تحكم Remote Config | `LoginByActivity` | تحقق أولاً؛ لا تضف SDK قبل قرار المنتج |
| AUTH-04 | الدخول برقم الهاتف وOTP | مكتمل | `PhoneLoginActivity`, `VerificationPhone` | إعادة البناء إن كان مزوداً معتمداً |
| AUTH-05 | إنشاء/قراءة ملف المستخدم في Firestore بعد الدخول | مكتمل | `LoginByActivity`, `VerificationPhone`, `UserMapper` | إعادة البناء عبر repository واحد |
| AUTH-06 | عرض وتعديل الملف الشخصي | مكتمل | `UserProfileActivity` | إعادة البناء |
| AUTH-07 | اختيار صورة، قصها، ضغطها ورفع avatar | مكتمل | `ImagePickerActivity`, uCrop, Storage | إعادة البناء مع صلاحيات حديثة |
| AUTH-08 | حذف وثيقة المستخدم ثم حساب Firebase Auth | مكتمل في مسارين | `AccountDeletionCoordinator`, `UserProfileActivity` | إعادة البناء كعملية ذرية قابلة للاستئناف |
| AUTH-09 | التعامل مع طلب إعادة المصادقة قبل الحذف | مكتمل في coordinator | `AccountDeletionCoordinator` | إعادة البناء |
| AUTH-10 | تسجيل الخروج | جزئي/غير واضح كرحلة موحدة | استدعاءات متفرقة وتعليقات قديمة | يلزم مسار واحد صريح |
| PREF-01 | تغيير العربية/الإنجليزية وتطبيق RTL | مكتمل | `AccountFragment`, `MyContextWrapper` | موجود أساسه؛ أضف إعداد المستخدم |
| PREF-02 | ثيم النظام/الفاتح/الداكن | مكتمل | `AccountFragment`, `FmApplication` | إعادة البناء |
| PREF-03 | فتح سياسة الخصوصية والشروط | مكتمل كرابط | `AccountFragment`, `LoginByActivity` | إعادة البناء بروابط allowlisted |
| PREF-04 | مشاركة التطبيق | مكتمل | `AccountFragment`, `FmUtilize` | إعادة البناء |
| PREF-05 | إعداد إشعارات المستخدم | جزئي؛ switch دون دورة اشتراك كاملة | `AccountFragment`, FCM token | إعادة تصميم |
| PREF-06 | صفحة عن التطبيق والتواصل وروابط الشبكات | مكتمل | `AboutAppActivity`, `MainDialog` | تحقق من المحتوى ثم إعادة البناء |

## 5. التشغيل الصوتي

### 5.1 البث المباشر

| ID | العملية أو الخدمة | الحالة في القديم | الملاحظة | قرار Flutter |
|---|---|---|---|---|
| PLAY-01 | تحميل رابط بث وتشغيله async | مكتمل | `RadioPlayerService` يستخدم `MediaPlayer` | موجود عبر `just_audio` |
| PLAY-02 | Play/Pause/Stop من التطبيق | مكتمل | service مربوط بـ`MainActivity` | موجود play/pause/stop |
| PLAY-03 | تبديل المحطة النشطة | مكتمل | `playOrPause`, اختيار المحطة | موجود أساسه |
| PLAY-04 | mini-player دائم في الواجهة | مكتمل | `MainActivity` | موجود |
| PLAY-05 | foreground service وإشعار تحكم | مكتمل لكن متعدد implementations | `RadioPlayerService` | مطلوب استكماله في Flutter |
| PLAY-06 | أفعال Play/Pause/Stop من الإشعار | مكتمل | service actions | إعادة البناء |
| PLAY-07 | قراءة metadata للبث دورياً | جزئي | polling كل 10 ثوان عبر metadata retriever | تحقق أولاً من دعم مصادر البث |
| PLAY-08 | إظهار عنوان/فنان البث الحالي | جزئي | callback إلى `MainActivity` | إعادة البناء إن توفرت metadata |
| PLAY-09 | fallback إلى رابط بث احتياطي | ممثل في نموذج المحطة، غير مكتمل قديماً | `backupStreamUrl` في domain | موجود في Flutter controller |
| PLAY-10 | audio focus/noisy/headset/media session | غير مكتمل في مسار الراديو | لا توجد جلسة موحدة ناضجة | مطلوب قبل الإصدار |
| PLAY-11 | استعادة التشغيل بعد قتل العملية/إعادة التشغيل | غير مثبت | لا يوجد دليل end-to-end | يلزم قرار واختبارات lifecycle |

### 5.2 مشغل الحلقات/الملفات القديم

يوجد مسار ثانٍ منفصل (`MusicService`, `SongPlayerFragment`, قاعدة SQLite محلية)
يدعم تشغيل الملفات، السابق/التالي، seek، حفظ آخر موضع، audio focus، وإشعاراً
مستقلاً. هذا المسار **قديم/مكرر** ولا ينبغي نسخه. الهدف المنتجّي، إن كان مطلوباً،
هو مشغل واحد في Flutter يميز بين live stream والحلقة داخل state machine موحدة.

## 6. لوحة الإدارة وإنشاء المحتوى

> تنبيه أمني: إظهار لوحة الإدارة بناء على `UserType` مخزن محلياً أو في وثيقة
> العميل ليس تفويضاً. كل كتابة إدارية يجب أن تمنعها قواعد الخادم/claims حتى لو
> وصل مستخدم غير مخول إلى الشاشة.

| ID | العملية أو الميزة | الحالة في القديم | الملاحظة | قرار Flutter |
|---|---|---|---|---|
| ADMIN-01 | لوحة رئيسية وعدّ المحطات والبرامج والحلقات والمستخدمين | مكتمل | أربع قراءات Firestore | تحقق أولاً؛ يفضل Admin منفصل |
| ADMIN-02 | قائمة المحطات والبحث والتصفية نشط/معطل | مكتمل | `AdminStationsActivity` | تحقق أولاً |
| ADMIN-03 | تعطيل/تفعيل محطة | مكتمل في العميل | merge مباشر | لا ينقل دون تفويض خادم |
| ADMIN-04 | حذف محطة | مكتمل في العميل | لا يظهر cascade للأصول/المحتوى | يلزم تصميم عملية آمنة |
| ADMIN-05 | إنشاء/تعديل/تفاصيل محطة | واجهة فقط | شاشات placeholder | ليس قدرة مكتملة |
| ADMIN-06 | قائمة البرامج والبحث والحذف | مكتمل | `AdminProgramsActivity` | تحقق أولاً |
| ADMIN-07 | تصفية البرامج حسب المحطة | جزئي/غير موصول | متغير filter موجود بلا مسار اختيار مكتمل | لا تسجل كمكتمل |
| ADMIN-08 | إنشاء/تعديل/تفاصيل برنامج في الإدارة الجديدة | واجهة فقط | placeholder | ليس قدرة مكتملة |
| ADMIN-09 | نموذج legacy لإضافة/تعديل برنامج ورفع غلافه وجدولته | مكتمل لكن قديم | `AddProgramActivity` | استخرج المتطلبات فقط ثم أعد التصميم |
| ADMIN-10 | قائمة الحلقات والبحث وتصفية منشور/مسودة والحذف | مكتمل جزئياً | filter scheduled غير منفذ فعلياً | تحقق أولاً |
| ADMIN-11 | إنشاء/تعديل/تفاصيل حلقة في الإدارة الجديدة | واجهة فقط | placeholder | ليس قدرة مكتملة |
| ADMIN-12 | نموذج legacy لإضافة/تعديل حلقة ورفع صورة وجدولتها | مكتمل لكن قديم | `AddEpisodeActivity` | استخرج المتطلبات فقط |
| ADMIN-13 | قائمة المستخدمين والبحث حسب الدور/الحالة | مكتمل | `AdminUsersActivity` | تحقق أولاً |
| ADMIN-14 | تفعيل/تعطيل وحذف وثيقة مستخدم | مكتمل في العميل | حذف الوثيقة لا يضمن حذف Auth | يلزم backend موثوق |
| ADMIN-15 | تغيير دور User/Admin/Super Admin | مكتمل في العميل | `AdminUserDetailActivity` | ممنوع نقله ككتابة عميل مباشرة |
| ADMIN-16 | نموذج إنشاء/تعديل مستخدم | واجهة فقط | placeholder | ليس قدرة مكتملة |
| ADMIN-17 | شاشة تعريف الأدوار | عرض ثابت فقط | `AdminRolesActivity` | استبعاد حتى تعريف RBAC فعلي |
| ADMIN-18 | أدوات نقل مجموعات Firestore | غير موصول/أداة صيانة | `FirestoreCollectionTransferHelper` | استبعاد من تطبيق المستخدم |

## 7. الخدمات والعمليات الخلفية والتكاملات

| ID | الخدمة أو العملية | الحالة في القديم | الملاحظة | قرار Flutter |
|---|---|---|---|---|
| SVC-01 | Firestore CRUD: create/merge/update/delete/get one/get many | بنية تحتية مكتملة | utility عام وشروط query ديناميكية | استبدال repositories محددة النوع |
| SVC-02 | مراقبة المحطات والتعليقات/الحلقات لحظياً | مكتمل | snapshot listeners/FirebaseUI | أضف فقط حيث التحديث اللحظي مطلوب |
| SVC-03 | رفع avatar وشعارات وأغلفة وصوت الحلقة وصور البانرات | مكتمل كـrepository | Firebase Storage | إعادة البناء مع قواعد حجم/MIME/ملكية |
| SVC-04 | حذف asset من Storage | مكتمل كعملية منفردة | لا تظهر transaction مع الوثيقة | صمم workflow متسقاً |
| SVC-05 | ضغط الصور إلى WebP وتغيير حجمها | مكتمل | storage/image helpers | إعادة البناء عند إضافة الرفع |
| SVC-06 | مزامنة دورية كل 6 ساعات عبر WorkManager | غير موصول | `SyncManager` بلا استدعاء، والـworker يزامن المحطات فقط | لا تعتبر ميزة قائمة |
| SVC-07 | مزامنة فورية عند الطلب | غير موصول | `SyncManager.syncNow` بلا مستهلك | تأجيل |
| SVC-08 | FCM: استقبال notification payload وعرض إشعار | مكتمل جزئياً | data payload job غير منفذ، TODO لـAndroid 14 | إعادة بناء واختبار منصة |
| SVC-09 | طلب إذن الإشعارات في Android الحديث | مكتمل | `MainActivity` | إعادة البناء |
| SVC-10 | جلب FCM token وحفظه في ملف المستخدم | مكتمل للحساب المسجل | `MainActivity.updateUserFcmToken` | إعادة بناء مع rotation/logout cleanup |
| SVC-11 | deep links إلى home/schedule/program/station/episode/live/account | parser مكتمل، التوجيه جزئي | `DeepLinkRouter`, `MainActivity` | إعادة البناء مع روابط موثقة واختبارات |
| SVC-12 | Firebase Crashlytics | مدمج ومستخدم في البدء | تسجيل أخطاء Remote Config | قرار observability قبل الإنتاج |
| SVC-13 | Firebase Analytics وFacebook App Events | SDK مدمج | لا يعني وجود taxonomy أحداث مكتملة | لا ينقل بلا خطة قياس وموافقة خصوصية |
| SVC-14 | Firebase Performance | dependency/metadata موجودان | التفعيل العملي يحتاج تحقق | تحقق أولاً |
| SVC-15 | Google Mobile Ads | جزئي/معطل في أجزاء | SDK موجود وتهيئة معلقة بالتعليقات | قرار تجاري وخصوصية مستقل |
| SVC-16 | UMP consent/privacy options | جزئي | جمع consent الأساسي معطل بالتعليقات | لا ينقل كما هو |
| SVC-17 | Play Integrity | dependency فقط | لا يوجد تدفق attestation ظاهر | لا تعتبر قدرة قائمة |
| SVC-18 | روابط المتجر، المشاركة، البريد، Facebook وTwitter | مكتمل كـAndroid intents | utilities وAbout | إعادة البناء حسب قائمة روابط معتمدة |
| SVC-19 | كاميرا/معرض/قص صورة عبر FileProvider | مكتمل | `ImagePickerActivity`, uCrop | إعادة البناء عند الحاجة فقط |
| SVC-20 | مراقبة اتصال الشبكة | موجودة بأكثر من helper | `CheckInternetConnection`, listener | توحيدها في abstraction واحدة |

## 8. نموذج البيانات الموجود

### 8.1 مجموعات Firestore الأساسية

- `stations`: بيانات المحطة، رابط البث الأساسي والاحتياطي، الشعار، الموقع،
  الأولوية، حالة live/active/verified/featured والإحصاءات.
- `programs`: البرنامج والمحطة المالكة، العنوان والوصف والغلاف والتصنيفات،
  الجدول، حالة النشر والإحصاءات.
- `episodes`: الحلقة والبرنامج والمحطة، الصوت والغلاف والمقدم والضيف، الجدول،
  حالة النشر والإحصاءات.
- `users`: الهوية العامة، وسائل الدخول، الدور، التعطيل، avatar وFCM token.
- `banners`: الصورة والموضع والأولوية وفترة العرض ونوع/هدف الانتقال.

### 8.2 البيانات الفرعية والحالة الفعلية

| البيانات | الوجود في القديم | القرار |
|---|---|---|
| تعليقات الحلقة | مستخدمة فعلياً تحت وثيقة الحلقة | توحيد اسم ومسار canonical قبل Flutter |
| likes | ثابت schema ونماذج، وتنفيذ الحلقة يستخدم map داخل الوثيقة | لا تنقل map؛ صمم كتابة قابلة للتوسع |
| favorites | ثابت/نموذج فقط | غير معتمد |
| subscriptions | ثابت/عداد فقط | غير معتمد |

توجد أيضاً أسماء مجموعات legacy للإذاعات والبرامج والحلقات والمستخدمين
والتعليقات والإعلانات. وجود mappers انتقالية لا يبرر دعم المخططين في Flutter؛
عقد `firebase-data-contract.md` هو السلطة للمسارات الجديدة.

## 9. المتطلبات غير الوظيفية الظاهرة

- العربية هي التجربة الأساسية مع الإنجليزية وRTL.
- min SDK القديم 21 وtarget/compile SDK 34.
- صلاحيات الإنترنت، حالة الشبكة، الكاميرا، الإشعارات، wake lock وخدمة تشغيل
  foreground.
- النسخ الاحتياطي للتطبيق معطل، لكن إعدادات network security تسمح cleartext؛
  يجب ألا تنتقل هذه السماحية إلى التطبيق الجديد.
- التخزين المحلي يشمل اللغة والثيم والمحطة المختارة وقائمة المحطات وبيانات
  جلسة منقحة. لا تخزن tokens أو بيانات حساسة بلا حاجة.
- حالات الخطأ والفراغ والتحميل وعدم الاتصال موجودة لكن غير موحدة تماماً.
- لا يظهر مسار وصول accessibility كامل أو اختبارات end-to-end لكل الرحلات؛
  لذلك لا تعتبر الجودة القديمة baseline قبول.

## 10. العناصر المرشحة للاستبعاد أو إعادة التصميم

1. لا تنقل `MusicService` وقاعدة الأغاني بالتوازي مع مشغل الراديو؛ وحّد التشغيل.
2. لا تنقل Firestore CRUD العام إلى presentation؛ استخدم repositories وحالات
   استخدام محددة.
3. لا تنقل تعيين الأدوار أو الحذف الإداري ككتابة مباشرة من العميل.
4. لا تنقل دعم مجموعات legacy إلا ضمن migration مؤقتة ذات موعد إزالة.
5. لا تعتبر المفضلة والاشتراكات وإعجاب التعليقات ميزات مكتملة.
6. لا تعتبر شاشات الإدارة placeholder أو WorkManager غير الموصول قدرات إنتاجية.
7. لا تنقل cleartext أو logging الحساس أو تنزيل الصور المتزامن داخل الإشعار.
8. لا تضف Ads/Analytics/Facebook/Integrity لمجرد وجود dependency قديمة.

## 11. تحويل الجرد إلى خطة تطوير

ترتيب الاعتماد المقترح:

1. **الأساس:** Firebase environments، schema canonical، security rules،
   observability، navigation، وحالات الخطأ.
2. **الاستماع:** اكتشاف المحطات، التفاصيل، اختيار المحطة، تشغيل الخلفية،
   media notification، audio focus وlifecycle.
3. **المحتوى:** البرامج ثم الحلقات ثم الجدول، مع repositories واختبارات mapping.
4. **الحساب:** اختيار مزودي الدخول، الملف الشخصي، الجلسة، الحذف وإعادة المصادقة.
5. **التفاعل:** التعليقات أولاً؛ ثم قرار مستقل للمفضلة/الإعجاب/الاشتراكات.
6. **الإشعارات والروابط:** taxonomy، token lifecycle، deep links والقياس.
7. **الإدارة:** backend/RBAC ومنتج إدارة منفصل قبل أي CRUD إداري.
8. **الربح والقياس:** consent وprivacy review قبل Ads/Analytics الإضافية.

كل بطاقة تطوير مشتقة من هذا المرجع يجب أن تحدد:

- `Capability ID` من هذا المستند.
- القيمة للمستخدم ومعيار القبول.
- مالك العقد المتأثر.
- schema/API والصلاحيات المطلوبة.
- حالات offline/error/empty/loading.
- اختبارات الوحدة والواجهة والتكامل والمنصة.
- قرار صريح: إعادة بناء، تحقق أولاً، تأجيل، أو استبعاد.

## 12. دليل ملفات المصدر

| المجال | مواقع الدليل في التطبيق القديم |
|---|---|
| المكونات والصلاحيات | `FM-Pro/app/src/main/AndroidManifest.xml` |
| النكهات والاعتماديات | `FM-Pro/app/build.gradle` |
| البدء | `FmApplication.java`, `SplashActivity.java`, `core/startup/` |
| التنقل | `MainActivity.java`, `core/navigation/` |
| الرئيسية والمحطات | `MainHomeFragment.java`, `RadioListActivity.java`, `data/*Stations*` |
| البرامج والحلقات | `ProgramsFragment.java`, `DailyEpisodeFragment.java`, `ProgramDetails*`, `ListEpisodeActivity.java` |
| التعليقات والتفاعل | `CommentsActivity.java`, `RealTimeEpisodeFragment.java` |
| الحساب | `ui/activity/appuser/`, `AccountFragment.java`, `core/auth/` |
| التشغيل | `utils/playerpro/`, `ui/activity/player/` |
| الإدارة | `admin/`, `AddProgramActivity.java`, `AddEpisodeActivity.java` |
| Firebase/Storage | `data/repository/`, `utils/my_firebase/` |
| الإشعارات والمزامنة | `FcmMessagingService.java`, `core/sync/` |

## 13. صيانة المرجع

- المرجع frozen على الالتزام المذكور؛ لا يتغير تلقائياً بتغير التطبيق القديم.
- عند اكتشاف قدرة إضافية، أضف ID ودليلاً وحالة وقرار Flutter، ولا تنسخ الكود.
- عند تنفيذ قدرة في Flutter، حدث عمود حالة Flutter أو اربط بخطة/ADR، ولا تغير
  وصف السلوك القديم.
- لا تستخدم هذا الملف بديلاً عن العقود أو تعريف الإنجاز أو security rules.
