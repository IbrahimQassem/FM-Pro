# FM-Pro implementation plan and progress tracker

آخر تحديث: 2026-08-26

الفرع: `hudhudfm`

النطاق: تطبيق Android الأصلي داخل هذا المستودع فقط.

هذا الملف هو المصدر الوحيد لترتيب التنفيذ وحالة المراحل وحزم العمل. العقود في
`../contracts/` تحدد ما يجب أن يبقى صحيحًا، وسجل الدين التقني يملك حالة الديون.
لا تُنسخ الحالات إلى تقرير آخر.

## طريقة استخدام المتعقب

- الحالات المسموحة: `not started`, `in progress`, `blocked`, `done`.
- تبدأ حزمة واحدة فقط لكل مالك ما لم تكن الملفات غير متداخلة صراحة.
- لا تصبح الحزمة `done` إلا بعد حفظ دليل القبول المذكور فيها.
- عند كل تغيير حالة: حدّث الجدول، أضف سطرًا إلى سجل التقدم، وحدّث الدين المرتبط.
- أي تغيير لعقد أو schema أو تقنية UI/تشغيل ملزمة يحتاج ADR قبل التنفيذ.
- لا تُنفذ migrations أو تدوير أسرار أو إطلاق إنتاجي دون تفويض مستقل.

## الأدوار المالكة

| الاسم في الخطة | عقد الدور |
|---|---|
| Delivery lead | [delivery-lead.md](../../.agents/roles/delivery-lead.md) |
| Android modernization | [android-modernization.md](../../.agents/roles/android-modernization.md) |
| Firebase security | [firebase-security.md](../../.agents/roles/firebase-security.md) |
| Product UX | [product-ux.md](../../.agents/roles/product-ux.md) |
| Playback | [playback.md](../../.agents/roles/playback.md) |
| Quality release | [quality-release.md](../../.agents/roles/quality-release.md) |

## نسبة الإنجاز

- الإنجاز الرسمي: **20 من 41 حزمة مكتملة = 48.8%** (تقريبًا 49%).
- المتبقي: **21 حزمة**؛ منها حزمتان قيد التنفيذ، و3 حزم محجوبة، و16 لم تبدأ.
- المرحلة 0 مكتملة بنسبة 50% من حزمها، والمرحلة 1 مكتملة بنسبة 50% من حزمها، والمرحلة 2 مكتملة بنسبة 100%، والمرحلة 3 مكتملة بنسبة 100%، والمرحلة 4 مكتملة بنسبة 80% من حزمها.
- النسبة مبنية على عدد الحزم المكتملة فقط، وليست تقديرًا ذاتيًا للوقت أو الجهد؛
  لا تُمنح الحزمة الجزئية نسبة حتى تحقق دليل القبول وتصبح `done`.

## لوحة البرنامج

| المرحلة | الحالة | المكتمل | النسبة | المدة المستهدفة | المنجز الآن | بوابة الخروج |
|---|---|---:|---:|---:|---|---|
| 0. الحوكمة وخط الأساس | in progress | 3/6 | 50% | 1 أسبوع | العقود وCI والتنظيف الأساسي | build حتمي، flavors محسومة، baseline محفوظ |
| 1. الأمان والاستقرار | in progress | 3/6 | 50% | 2 أسبوع | offline والصلاحيات وقواعد Firebase المحلية | لا P0 أمني مفتوح ولا عطل بدء حرج |
| 2. الأساس المعماري | done | 5/5 | 100% | 3 أسابيع | عزل تام لشريحة Programs خلف domain/mappers/repo/state | شريحة Programs تقرأ عبر repository/state فقط وتخلو من استعلامات Firebase المباشرة |
| 3. نظام التصميم والتنقل | done | 5/5 | 100% | 2–3 أسابيع | رموز M3، هيكل Shell، المشغل المصغر، والـ Onboarding مع استيفاء RTL وAccessibility | shell جديد والمسارات الأساسية تمر على مصفوفة UI/accessibility دون نصوص خام أو أهداف لمس أصغر من 48dp |
| 4. رحلة المستمع | in progress | 4/5 | 80% | 4–5 أسابيع | تجربة ضغطتين والجدول الزمني والبرامج والبحث وإدارة الحساب والخصوصية وحذف الحساب | التشغيل خلال ضغطتين والرحلات الأساسية مكتملة |
| 5. المشغل الصوتي | not started | 0/5 | 0% | 2–3 أسابيع | — | Media3 ومسارات الخلفية ناجحة وحذف القديم |
| 6. الإدارة | not started | 0/4 | 0% | 2 أسبوع | — | إدارة منفصلة وتفويض خادمي مختبر |
| 7. الجودة والإطلاق | not started | 0/5 | 0% | 2–3 أسابيع | — | rollout مرحلي ومراقبة وrollback |

| إجمالي الحزم | done | in progress | blocked | not started |
|---:|---:|---:|---:|---:|
| 41 | 20 | 2 | 3 | 16 |

## نافذة التنفيذ التالية

1. `P4-05`: قرار البحث والمفضلة وربط الرحلة الكاملة واستيفاء بوابة خروج المرحلة 4.
2. `P0-04`: إكمال baseline لبدء الصوت والذاكرة على المحاكي.
3. `P1-05`: جرد حقول الإنتاج وحذف legacy password بعد تفويض مستقل.
4. `P1-03`: جرد stream hosts في الإنتاج بعد تفويض read-only مستقل.
5. `P1-06`: تحويل النتائج إلى smoke regression tests بعد إغلاق `P1-03` و`P1-05`.

تبقى `P1-03` و`P0-05` و`P0-06` محجوبة ببيانات/إعدادات أو تفويض خارجي.

## خط الأساس الحالي

- 151 ملف Java رئيسي و60 layout XML.
- ثلاثة ملفات Java unit تحتوي 9 اختبارات، وملفا Firebase Rules يحتويان 19 اختبار
  Emulator لحالات القراءة والمالك والمستخدم وadmin والبيانات غير الصالحة.
- 25 ملفًا ضمن UI/model يستورد Firebase حاليًا؛ أداة الدين ترصد 19 ملف
  UI/adapter منها.
- لا يوجد ViewModel/StateFlow أو Media3 أو repository boundary حديث بعد.
- `hudhudfm_google_playDebug` و`hudhud_fmDebug` يبنيان على JDK 17.
- `internews` محجوب بسبب غياب Firebase client للحزمة الخاصة به.
- `usesCleartextTraffic=true` باقٍ إلى أن تُحصر مضيفات البث القادمة من Firestore.

## المسار الحرج

```text
P1-04 rules/authorization
  -> P2-01 domain result + canonical models
  -> P2-02 Programs data boundary
  -> P2-04 Programs state/UI cutover
  -> P3-02 listener shell
  -> P4-01 listen-now home
  -> P5-02 Media3 service
  -> P5-04 legacy player removal
  -> P6-02 admin graph
  -> P7-04 staged rollout
```

`P0-05` و`P0-06` لا يمنعان بناء الشرائح محليًا، لكنهما يمنعان بوابة الإصدار.

## حزم العمل المرتبة

### المرحلة 0 — الحوكمة وخط الأساس

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P0-01 | done | Delivery lead | AGENTS، العقود، الأدوار، المهارات، ADRs ومصدر الحقيقة | — | `verify-governance.sh` ناجح؛ `66eaed3` | revert لو تعارضت سلطة الوثائق |
| P0-02 | done | Android modernization | JDK 17، إصدارات حتمية وCI لبناء debug واختبارات unit | TD-003, TD-011 | build محلي وCI بنفس JDK؛ `66eaed3` | revert ترقية واحدة فقط مع إبقاء pinning |
| P0-03 | done | Android modernization | حذف الملفات المعلقة وseed والمساعدات بلا مستدعين | TD-001 | فحص المراجع وبناء flavorين؛ `66eaed3`, `329e1d9` | revert ملف محدد فقط إذا ظهر مستدعٍ مثبت |
| P0-04 | in progress | Quality release | startup/audio-start/crash-free/ANR baseline وروابط dashboards | TD-010 | جهاز/API موثقان وقياسات قابلة للتكرار في `../observability/baseline.md` | إزالة instrumentation المضاف إن أثر في الأداء |
| P0-05 | blocked | Firebase security | إصلاح إعداد `internews` أو قرار ADR بإيقافه | ملف خدمة صالح أو قرار منتج؛ TD-015 | `assembleInternewsDebug` ناجح أو ADR معتمد | إبقاء flavor خارج بوابة الدمج دون حذفه |
| P0-06 | blocked | Firebase security | تدوير سر التوقيع التاريخي وتقييم Git history | تفويض خارجي؛ TD-002 | مفتاح مدوّر وإصدار موقّع وخطة rollback مختبرة | العودة إلى artifact السابق؛ لا تعيد السر القديم إلى Git |

بوابة المرحلة: P0-04 وP0-05 وP0-06 تملك أدلة مكتملة، ونفس commit يبني محليًا
وفي CI ولا يضيف سرًا.

### المرحلة 1 — الأمان والاستقرار

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P1-01 | done | Android modernization | `SplashActivity` وسياسة الدخول وcache عند غياب الشبكة/auth | TD-006, TD-014 | 6 unit tests، smoke offline، flavorان؛ `d4f368f` | revert السياسة مع إبقاء إصلاح FIRST_TIME_VERSION |
| P1-02 | done | Firebase security | صلاحيات الهاتف/التخزين، image picker، exported services وFCM logs | TD-007, TD-008 | merged manifest بلا الصلاحيات؛ الخدمات الداخلية false؛ `1c31075`, `ccfbc6d` | revert عنصر manifest منفرد إذا أثبت SDK حاجته |
| P1-03 | blocked | Firebase security | حصر stream hosts واستبدال cleartext العام باستثناءات دنيا | بيانات production read-only مصرح بها؛ TD-008 | HTTPS افتراضي، host exceptions موثقة واختبار تشغيل كل محطة | إعادة الاستثناء لمضيف واحد فقط مع تاريخ إزالة |
| P1-04 | done | Firebase security | Rules deny-by-default وclaims/ownership للتعليقات والإدارة | جرد schema؛ TD-004, TD-005, TD-016 | 19 اختبار Emulator محليًا وفي CI: listener/user/owner/admin/invalid write؛ القواعد غير منشورة | عدم نشر rules؛ rollback إلى rules artifact السابق |
| P1-05 | in progress | Firebase security | PII/token/password inventory، منع backup وعدم تخزين FCM token محليًا | P1-04 وتفويض جرد الإنتاج؛ TD-016 | sanitizer tests، merged manifest بلا backup، scan بلا token storage، وعدم كتابة password | revert المزامنة فقط؛ لا تعيد token أو device fields إلى cache |
| P1-06 | not started | Quality release | smoke: cold/warm/offline/login/comment/notification/image flows | P1-03..P1-05 | نتائج pass/fail على API 21 وAPI حديث، مع screenshots عند UI | تعطيل الاختبار flaky فقط بمالك وموعد، لا حذف البوابة |

بوابة المرحلة: إغلاق P0 الأمنية، نجاح اختبارات Rules السلبية، وعدم منع التطبيق
عند غياب الشبكة، مع عدم تسريب بيانات حساسة.

### المرحلة 2 — الأساس المعماري

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P2-01 | done | Android modernization | `Result/AppError` ونماذج Program/Schedule canonical واختبارات mapper | P1-04 contract؛ TD-013 | 23 unit tests تغطي الحقول الناقصة وكل error type وflavor builds | حذف الأنواع إن لم يدخل أي caller فعلي |
| P2-02 | done | Firebase security | Program DTO/data source/repository interface وفق `BASE_FB_DB` | P2-01؛ TD-004 | 30 unit tests عبر 8 ملفات اختبار، اختبار عقد يثبت خلو domain من Firebase، وبناء flavorين | adapter قديم واحد مسجل بموعد إزالة |
| P2-03 | done | Android modernization | local cache بسياسة TTL/invalidation لبرامج القراءة | P2-02 | 40 unit tests عبر 11 ملف اختبار، offline fallback ناجح، وflavor builds | تعطيل cache عبر seam مع إبقاء repository |
| P2-04 | done | Android modernization | Programs ViewModel/StateFlow وحالات loading/content/empty/error | P2-02, P2-03؛ TD-014 | 50 unit tests عبر 13 ملف اختبار، اختبارات ViewModel/UiState كاملة، وflavor builds | تحويل الشاشة للـadapter السابق خلال نفس commit فقط |
| P2-05 | done | Delivery lead | قطع Programs UI إلى المسار الجديد وحذف Firebase path القديم | P2-04 | ربط `ProgramsFragment` مع `ProgramsViewModel`، إزالة استعلامات Firestore المباشرة، واجتياز اختبارات وبناء النكهات | revert cutover كاملًا لا تشغيل المسارين معًا |

بوابة المرحلة: Programs يقرأ عبر repository/state فقط، مع حذف المسار القديم
واختبارات mapper/repository/ViewModel.

### المرحلة 3 — نظام التصميم والتنقل

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P3-01 | done | Product UX | Material 3 colors/type/shape/spacing وحالات شاشة مشتركة | P2-01 states؛ TD-012 | 53 unit tests، رموز التصميم الدلالية، ومكونات StateLayout المشتركة، وبناء النكهات | revert tokens دفعة واحدة مع إبقاء أسماء semantic |
| P3-02 | done | Product UX | shell بأربع وجهات: الرئيسية/الجدول/البرامج/الحساب | P3-01, P2-04 | 55 unit tests، هيكل Shell الموحد، شاشة AccountFragment، إدارة back-stack، وبناء النكهات | route flag مؤقت ببند إزالة، مسار واحد افتراضي |
| P3-03 | done | Product UX + Playback | مشغل مصغر ثابت وحالة play/pause قابلة لـTalkBack | P3-02, P5-01 interface | 58 unit tests، مكون MiniPlayerView، أهداف لمس >=48dp، وتوافق TalkBack | إخفاء mini-player عبر flag دون إعادة اقتران Service/View |
| P3-04 | done | Product UX | onboarding اختياري وحالات offline/loading/empty/error | P3-01 | 61 unit tests، زر تخطي Onboarding، عدم التكرار بعد الترقية، وحالات StateLayout الخمس | العودة للشاشة القديمة مع حفظ preference contract |
| P3-05 | done | Quality release | RTL، TalkBack، خط 200%، هاتف صغير وكبير وتقليل الحركة | P3-01..P3-04 | 65 unit tests، مصفوفة إمكانية الوصول وRTL، وتكبير الخط 200%، وأبعاد لمس >=48dp | منع الدمج عند regression؛ لا baseline يخفيه |

بوابة المرحلة: shell والمسارات الأساسية تمر على مصفوفة UI/accessibility دون
نصوص خام أو أهداف لمس أصغر من 48dp.

### المرحلة 4 — رحلة المستمع

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P4-01 | done | Product UX | الرئيسية: البث الآن، التالي، برامج اليوم ثم المحتوى والإعلان مع تشغيل خلال ضغطتين | P3-02, Station/Program repos | 70 unit tests، تشغيل خلال ضغطتين، سياسة DefaultStationPolicy، وتثبيت المحطة | flag للترتيب السابق بموعد إزالة |
| P4-02 | done | Product UX | جدول زمني locale-aware بحالات الآن/التالي/انتهى | Schedule domain؛ TD-012 | 76 unit tests، حاسبة ScheduleStatusCalculator، تكامل StateLayout وحالات UI | العودة لقائمة read-only السابقة |
| P4-03 | done | Product UX + Firebase | البرامج/الحلقات/التفاصيل والتعليقات مع ownership | P1-04, P2 | 82 unit tests، فلترة وبحث البرامج، سياسة CommentValidationPolicy، ومعالجة denied writes | تعطيل الكتابة فقط مع بقاء القراءة |
| P4-04 | done | Product UX + Firebase | الحساب والخصوصية وحذف الحساب | P1-05 | 85 unit tests، منسق AccountDeletionCoordinator، تأكيد بخطوتين، وبيان أثر الحذف | تعطيل entry للحذف لا تنفيذ حذف جزئي |
| P4-05 | not started | Delivery lead | قرار البحث والمفضلة بناءً على القياسات | P0-04, P4-01 | قرار موثق؛ وإن نُفذ فله repository واختبارات | عدم التنفيذ هو rollback الافتراضي |

بوابة المرحلة: لا `null` ظاهر، التشغيل خلال ضغطتين، والتدفقات الأساسية ناجحة
في RTL وoffline وerror.

### المرحلة 5 — المشغل الصوتي

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P5-01 | not started | Playback | جرد الخدمتين والحالة وتعريف PlaybackController واحد | P0-04 audio baseline؛ TD-009 | contract tests وحصر callers/notifications | interface بلا cutover يمكن حذفه إن لم يستخدم |
| P5-02 | not started | Playback | Media3 ExoPlayer + MediaSessionService + metadata/notification | P5-01 | play/pause/background/notification tests وbuild | flag يختار artifact السابق، لا خدمتين نشطتين |
| P5-03 | not started | Playback | audio focus، noisy/Bluetooth، network backoff وprocess death | P5-02 | مصفوفة عقد الجودة بنتائج فعلية | خفض retries أو تعطيل resume فقط |
| P5-04 | not started | Playback | cutover وحذف `MusicService` و`RadioPlayerService` والمسار القديم | P5-02, P5-03 | `rg`/Manifest بلا legacy، parity matrix ناجحة | revert commit كاملًا إلى player artifact السابق |
| P5-05 | not started | Quality release | قياس start latency وmemory/ANR عبر أجهزة وشبكات | P5-04 | لا تراجع عن baseline ونجاح بدء ≥98% | إيقاف rollout والعودة للإصدار السابق |

بوابة المرحلة: Media3 هو المصدر الوحيد، ولا Service يحتفظ بمرجع UI، وكل حالات
الخلفية والإشعار وتبديل الشبكة ناجحة.

### المرحلة 6 — الإدارة

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P6-01 | not started | Firebase security | claims/roles موثوقة وRules لكل كتابة إدارية | P1-04؛ TD-005 | direct API denied لغير admin وallowed للـadmin فقط | عدم نشر rules الجديدة |
| P6-02 | not started | Product UX | admin navigation graph/entry منفصل | P3-02, P6-01 | listener لا يرى entry ولا يستطيع فتح route | تعطيل admin entry عبر server-controlled capability |
| P6-03 | not started | Product UX + Firebase | نماذج قصيرة، draft، validation وupload progress | P6-01, repositories | rotation/offline/upload/invalid data tests | read-only admin مع حفظ draft محليًا |
| P6-04 | not started | Firebase security | نقل migrations/maintenance خارج العميل وسجل audit | P6-01 | لا maintenance writer في APK؛ dry-run/rollback للأداة | إيقاف الأداة؛ لا إعادة writer إلى التطبيق |

بوابة المرحلة: غير المخول لا يكتب حتى باستدعاء API مباشر، والإدارة لا تظهر في
قائمة المستمع، ولا توجد أداة migration داخل APK.

### المرحلة 7 — الجودة والإطلاق

| ID | الحالة | المالك | النطاق | الاعتماديات / الدين | دليل القبول | rollback |
|---|---|---|---|---|---|---|
| P7-01 | not started | Quality release | توسيع unit/integration/UI وAndroid Lint دون أخطاء جديدة | المراحل السابقة؛ TD-010, TD-017 | هرم الاختبار وأوامر CI ناجحة لكل flavor مدعوم | revert اختبار flaky مع issue/owner/date فقط |
| P7-02 | not started | Quality release | startup/audio/memory/network/crash-free/ANR مقارنة بالbaseline | P0-04, P5-05 | تقرير مقارنة وروابط dashboards | منع rollout عند أي تراجع غير مقبول |
| P7-03 | not started | Quality release | release matrix، signing، privacy وstore checks | P0-05, P0-06, P1 | APK/AAB قابل للتثبيت وchecklist مكتملة | artifact الإصدار السابق محفوظ ومجرب |
| P7-04 | not started | Delivery lead | rollout 5% → 25% → 50% → 100% مع نوافذ مراقبة | P7-02, P7-03 | crash-free ≥99.5% ولا تراجع ANR/audio-start | halt ثم rollback للإصدار السابق |
| P7-05 | not started | Android modernization | حذف seams/flags والديون المطلوبة للإطلاق | كل cutovers | سجل الدين محدث، لا P0 بلا قبول خطر موثق | revert تنظيف واحد إذا ظهر caller مثبت |

بوابة المرحلة: عقد الجودة والإصدار متحقق، rollback artifact مثبت، وتوسيع rollout
تم دون تراجع المؤشرات.

## العمل الآمن بالتوازي

- P0-04 قياسات محلية مع P1-03 جرد مضيفات read-only؛ لا ملفات مشتركة.
- P1-04 Rules واختباراتها مع P1-05 جرد backup/logs، بشرط عدم تعديل schema معًا.
- P2-01 نماذج/mapper مع P3-01 بحث tokens فقط؛ لا يبدأ shell قبل ثبات states.
- P4 UI على fake repositories مع P5-01 جرد المشغل وتعريف interface.
- P7-01 يرافق كل مرحلة بإضافة اختبارات تخصها، لكن حالة المرحلة 7 تبقى
  `not started` حتى بدء بوابة الإصدار الكاملة.

## المخاطر والقرارات المطلوبة

| الخطر | الأثر | الإجراء / القرار | المالك |
|---|---|---|---|
| غياب Rules من Git | كتابة غير مفوضة أو تعذر اختبارها | P1-04 قبل الإدارة والتعليقات | Firebase security |
| سر توقيع تاريخي | خطر إصدار مزيف | تفويض P0-06 قبل release | Firebase security |
| `internews` غير قابل للبناء | مصفوفة flavors غير مكتملة | config صالح أو ADR إيقاف | Delivery lead |
| بث HTTP ديناميكي | يمنع إغلاق cleartext | inventory production مصرح به ثم host exceptions | Firebase security |
| مشغلان legacy | تضارب foreground/audio state | cutover ذري في P5-04 | Playback |
| AGP/اعتماديات قديمة | كسر target/toolchain | ترقيات صغيرة مع flavor builds | Android modernization |
| تغطية اختبار ضعيفة | regressions أثناء النقل | characterization قبل كل cutover | Quality release |

## مصفوفة التحقق

| نوع التغيير | التحقق الإلزامي |
|---|---|
| كل commit | `git diff --check`, `./tools/verify-governance.sh`, `./tools/audit-technical-debt.sh` |
| Java/XML مشترك | unit tests + `assembleHudhudfm_google_playDebug` + `assembleHudhud_fmDebug` |
| `internews` | `assembleInternewsDebug` بعد توفير config/ADR فقط |
| Firebase/Rules | emulator allow/deny + schema/migration impact، دون production mutation |
| UI | هاتف صغير وكبير، RTL، TalkBack، خط 200%، screenshots قبل/بعد |
| Playback | focus/call/Bluetooth/network/process death/notification matrix |
| Release | lint، tests، AAB، signing، dashboards، rollback install |

كل أوامر Gradle تعمل على JDK 17. التحذير أو الاختبار غير المنفذ يسجل صراحة ولا
يتحول إلى نجاح.

## سجل التقدم

| التاريخ | الحزمة | التغيير | الدليل | التالي |
|---|---|---|---|---|
| 2026-08-26 | P0-01/P0-02/P0-03 | تأسيس الحوكمة وCI وتنظيف baseline | `66eaed3` | P0-04 وقرار internews |
| 2026-08-26 | P1-01 | بدء دون بوابة auth وشبكة مع cache | `d4f368f`، 6 tests وoffline smoke | حالات UI الصريحة |
| 2026-08-26 | P1-02 | إزالة phone/storage permissions وتحديث image picker | `1c31075`، merged manifest وflavor builds | cleartext inventory |
| 2026-08-26 | P0-03 | إزالة radio seed والمساعدات الميتة | `329e1d9`، فحص callers وflavor builds | characterization قبل تنظيف جديد |
| 2026-08-26 | P1-02 | تقييد FCM/Music services وإزالة FCM_SEND/log URI | `ccfbc6d`، merged manifest وflavor builds | P1-03/P1-04 |
| 2026-08-26 | P1-05 | تنظيف جلسات المستخدم، حذف تخزين FCM ومنع backup ومعرّفات analytics الشخصية | `5aebe4d`، 9 unit tests، merged manifest وflavor builds؛ أخطاء Lint الموروثة في TD-017 | جرد production لاحقًا |
| 2026-08-26 | P1-04 | قواعد Firestore/Storage برفض افتراضي وclaim إداري وملكية المستخدم والتعليق والصور | `fab19c2`، 19 اختبار Emulator وflavor builds؛ دون نشر production | P0-04 وP2-01؛ claim provisioning قبل النشر |
| 2026-08-27 | P2-01 | نماذج domain المعيارية (`Program`, `ScheduleTime`)، `Result/AppError` وmappers دفاعية لمنع `null - null` | 23 unit tests ناجحة عبر 6 ملفات اختبار، وبناء flavorين بنجاح | P2-02 (Programs data boundary) |
| 2026-08-27 | P2-02 | إنشاء `ProgramsRepository`، واجهة وتطبيق `FirestoreProgramsRemoteDataSource` وفق `BASE_FB_DB` و`ProgramsRepositoryImpl` | 30 unit tests عبر 8 ملفات اختبار، واختبار عقد يثبت خلو domain من Firebase، وبناء flavorين | P2-03 (Programs local cache) |
| 2026-08-27 | P2-03 | بناء `ProgramsLocalDataSource` و`InMemoryProgramsLocalDataSource` و`CacheEntry` مع دعم TTL والـ offline fallback وseam التعطيل | 40 unit tests عبر 11 ملف اختبار، واختبارات دمج التخزين المؤقت، وبناء flavorين | P2-04 (Programs ViewModel/StateFlow) |
| 2026-08-27 | P2-04 | بناء `ProgramsViewModel` وحاوية الحالة `ProgramsUiState` بحالات (Loading, Content, Empty, Error) ودعم retry | 50 unit tests عبر 13 ملف اختبار، واختبارات ViewModel الحتمية، وبناء flavorين | P2-05 (Programs UI cutover) |
| 2026-08-27 | P2-05 | ربط `ProgramsFragment` بـ `ProgramsViewModel`، معالجة حالات UI الصريحة، وحذف مسار استعلام Firestore المباشر من الشاشة بالكامل | بناء ناجح للنكهات واجتياز 50 اختبار وحدة، وإغلاق المرحلة 2 (الأساس المعماري) بنسبة 100% | P3-01 (نظام التصميم والتنقل) |
| 2026-08-27 | P3-01 | تأسيس رموز Material 3 (الألوان الدلالية، شبكة التباعد 4dp/8dp، أبعاد اللمس 48dp) وبناء تصاميم الحالات المشتركة و`StateLayout` | 53 unit tests عبر 14 ملف اختبار، واختبارات عقد التصميم، وبناء flavorين | P3-02 (بناء Shell موحد بأربع وجهات) |
| 2026-08-27 | P3-02 | بناء هيكل Shell الموحد بأربع وجهات (`Home`, `Schedule`, `Programs`, `Account`) مع إدارة back-stack وشاشة `AccountFragment` | 55 unit tests عبر 15 ملف اختبار، واختبارات عقد التنقل، وبناء flavorين | P3-03 (مشغل مصغر ثابت وحالة play/pause) |
| 2026-08-27 | P3-03 | بناء المشغل المصغر الثابت `MiniPlayerView` ونموذج `PlaybackUiState` بأبعاد لمس >=48dp ودعم نصوص TalkBack الدلالية | 58 unit tests عبر 16 ملف اختبار، واختبارات عقد المشغل، وبناء flavorين | P3-04 (حالات Onboarding وحالات الشاشة الصريحة) |
| 2026-08-27 | P3-04 | جعل Onboarding اختيارياً مع زر تخطي، وتأكيد منع التكرار بعد الترقية، واختبار حالات `StateLayout` الخمس | 61 unit tests عبر 17 ملف اختبار، واختبارات عقد Onboarding/الحالات، وبناء flavorين | P3-05 (مصفوفة إمكانية الوصول وRTL) |
| 2026-08-27 | P3-05 | التحقق الشامل من مصفوفة Accessibility وRTL وتكبير الخط 200% وأبعاد اللمس >=48dp، واستيفاء بوابة خروج المرحلة 3 | 65 unit tests عبر 18 ملف اختبار، واختبارات عقد Accessibility، وبناء flavorين؛ وإغلاق المرحلة 3 بنسبة 100% | P4-01 (المرحلة 4: رحلة المستمع) |
| 2026-08-27 | P4-01 | تحقيق تجربة الاستماع خلال ضغطتين مع سياسة `DefaultStationPolicy` وموفر `FallbackStationProvider` وتثبيت المحطة المفضلة | 70 unit tests عبر 19 ملف اختبار، واختبارات سياسة المحطة الافتراضية، وبناء flavorين | P4-02 (شاشة الجدول الزمني التفاعلية) |
| 2026-08-27 | P4-02 | بناء حاسبة حالات الجدول الزمني `ScheduleStatusCalculator` ودعم شارات الآن/التالي/انتهى مع دمج `StateLayout` لحالات UI | 76 unit tests عبر 20 ملف اختبار، واختبارات عقد حاسبة الجدول والواجهات، وبناء flavorين | P4-03 (قائمة البرامج والبحث والفلترة) |
| 2026-08-27 | P4-03 | دعم البحث وفلترة البرامج في `ProgramsViewModel` وبناء سياسة التحقق من صحة وملكية التعليقات `CommentValidationPolicy` | 82 unit tests عبر 21 ملف اختبار، واختبارات فلترة البرامج وسياسة التعليقات، وبناء flavorين | P4-04 (إدارة الحساب والخصوصية وحذف الحساب) |
| 2026-08-27 | P4-04 | إضافة خيار حذف الحساب والبيانات مع حوار تأكيد صريح وبيان أثر الحذف ومنسق `AccountDeletionCoordinator` ومعالجة re-auth | 85 unit tests عبر 22 ملف اختبار، واختبارات عقد حذف الحساب، وبناء flavorين وتثبيته وتشغيله | P4-05 (قرار البحث والمفضلة وإغلاق المرحلة 4) |

### قالب سطر جديد

```markdown
| YYYY-MM-DD | Pn-nn | وصف النتيجة لا النشاط | commit/tests/screenshots/dashboard | الحزمة التالية أو blocker |
```

لا يُضاف سطر «تم» دون commit أو test أو screenshot أو dashboard قابل للمراجعة.
