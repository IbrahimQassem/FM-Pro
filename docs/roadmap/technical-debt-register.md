# Technical debt register

هذا الملف هو المصدر الوحيد لحالة الدين التقني. كل بند يملك دليلًا، خطرًا، مالكًا،
مرحلة هدف، ومعيار إغلاق قابلًا للتحقق.

| ID | الأولوية | الحالة | الدين والدليل | المالك | المرحلة | معيار الإغلاق |
|---|---|---|---|---|---|---|
| TD-001 | P1 | done | 12 ملف Java كانت كلها كودًا معلّقًا بلا مراجع | Modernization | 0 | حذفها وبناء التطبيق بنجاح |
| TD-002 | P0 | open | أزيل `key.properties` حاليًا؛ السر التاريخي لم يُدوّر | Security | 0/1 | تدوير السر، إصدار موقّع، وتقييم التاريخ |
| TD-003 | P0 | in progress | JDK 17 وCI مثبتان؛ AGP 7.2.1/Gradle 7.6.3 قديمان | Modernization | 0 | CI ناجح وترقية متدرجة بلا كسر flavors |
| TD-004 | P0 | in progress | عزل ميزتي Programs وBanners بالكامل خلف repositories؛ حذف MyItemAdapter الميت وإزالة وصول Firebase المباشر من AdapterListDrag وChatHolder وNoInternetActivity وMainHomeFragment وProgramsFragment وButterKnife بالكامل | Firebase | 2–4 | لا وصول مباشر لـ Firebase من Activities أو Fragments أو Adapters |
| TD-005 | P0 | in progress | القواعد المحلية تعتمد `admin` claim و19 اختبار denied؛ provisioning والنشر الإنتاجي غير منفذين | Security | 1/6 | خدمة claims موثوقة ونشر Rules واختبارات staging مثبتة |
| TD-006 | P0 | done | `FIRST_TIME_VERSION` كان يوقف مسار البدء | Modernization | 1 | صار مسار الترقية يستدعي `loadRadios` والبناء ناجح |
| TD-007 | P0 | done | FCM/User/device data كانت تطبع في السجلات | Security | 1 | أزيلت القيم الحساسة من المسارات المرصودة وفُحص المصدر |
| TD-008 | P0 | in progress | أزيلت صلاحيات الهاتف والتخزين؛ ما زال cleartext عامًا بسبب روابط بث ديناميكية | Security | 1 | حصر مضيفي الإنتاج واستبدال العام باستثناء host موثق ومختبر |
| TD-009 | P0 | in progress | فُك الارتباط المباشر لـ FloatingActionButton واستُبدل بـ OnPlaybackStateChangeListener؛ إكمال MediaSessionService لاحقًا | Playback | 5 | MediaSessionService بلا مرجع UI |
| TD-010 | P1 | in progress | أضيفت 85 اختبار وحدة Java و19 اختبار Firebase Rules | Quality | 0–7 | تغطية seams والمسارات الحرجة حسب العقد |
| TD-011 | P1 | in progress | ثُبت Facebook 18.3.0؛ ما زالت dependencies قديمة وJCenter | Modernization | 0/2 | إصدارات مثبتة وrepositories دنيا وبناء متكرر |
| TD-012 | P1 | done | تأسيس رموز Material 3 وحالات الشاشة المشتركة باللغة العربية واختبار مصفوفة RTL وAccessibility بالكامل في المرحلة 3 | Product UX | 3 | موارد Locale واختبارات RTL وAccessibility |
| TD-013 | P1 | in progress | تم التحقق من سلامة الحقول الناقصة ومنع `null - null` عبر اختبارات `ProgramMapperTest` و`ScheduleMapperTest` ضمن P2-01 | Firebase | 2/4 | mapper validation وحالة UI مفهومة |
| TD-014 | P1 | in progress | فُصل قرار الوصول في `StartupAccessPolicy`، وفُصلت حالة البرامج في `ProgramsViewModel`، وتوحد هيكل التنقل بـ4 وجهات و`AccountFragment` في P3-02؛ ما زال Main/Splash يخلطان مسؤوليات أخرى | Modernization | 1–3 | shell/use cases وخفض مسؤوليات موثق |
| TD-015 | P0 | open | `internews` يفشل: لا Firebase client للحزمة `com.sanaadev.internews` | Firebase | 0 | إعداد flavor صالح أو قرار موثق بإيقافه، ثم build ناجح |
| TD-016 | P0 | in progress | أوقف password/logs وtoken cache والنسخ الاحتياطي؛ القواعد تمنع إنشاء device/password أو تغيير الدور؛ حقول legacy قد تبقى في الإنتاج | Security | 1 | جرد وحذف حقول الإنتاج بأداة موثوقة وتحقق rules |
| TD-017 | P1 | open | Android Lint يفشل بـ38 خطأ legacy و723 تحذيرًا؛ أولها `Range` في `FmUtilize` مع toolchain Kotlin قديم | Quality/Modernization | 2/7 | Lint ناجح بلا baseline يخفي الأخطاء، مع ترقية toolchain تدريجية |
| TD-018 | P2 | open | أحدث `firebase-tools` يملك 5 advisories متوسطة في تبعيات dev فقط؛ النسخة الأقدم المقترحة تضيف high/critical | Firebase/Quality | 1/7 | إصدار upstream مثبت ينجح معه `npm audit` بلا moderate+ مع بقاء اختبارات Emulator ناجحة |

## TD-001 evidence

الملفات المحذوفة كانت: `MusicServiceActivity`, `PermitActivity`, `PlayerActivity`,
`SongListFragment`, `FmProgress`, `FireBaseHelper`, `FirebaseDatabaseReference`,
`FirestoreHelperZ`, `FmProgramCRUDImpl`, `FmStationCRUDImpl`, `FmUserCRUDImpl`,
`MediaNotificationManager`. لم يكن فيها أي سطر Java فعّال أو مرجع فعّال خارجها.

## سياسة الإضافة والإغلاق

- أضف بندًا فقط لعمل مؤجل يملك أثرًا حقيقيًا، لا لكل TODO صغير.
- لا تغلق بندًا بالنية أو بإخفاء التحذير.
- إذا استبدل بند بقرار معماري، اربطه بـADR ثم أغلقه.
- أي debt جديد في مسار معدل يجب أن يكون أضيق من الدين الذي أزيل، مع موعد إزالة.
