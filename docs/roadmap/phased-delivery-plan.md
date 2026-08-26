# Phased delivery plan

هذا الملف هو المصدر الوحيد لحالة التنفيذ. القيم المسموحة: `not started`,
`in progress`, `blocked`, `done`. لا تغيّر الحالة إلى `done` قبل تحقق بوابة الخروج.

## ملخص الحالة

| المرحلة | الحالة | المدة المستهدفة | بوابة الخروج |
|---|---|---:|---|
| 0. الحوكمة وخط الأساس | in progress | 1 أسبوع | بناء حتمي، عقود معتمدة، قياسات أساسية |
| 1. الأمان والاستقرار | not started | 2 أسبوع | إغلاق P0 الأمنية وأخطاء البدء |
| 2. الأساس المعماري | not started | 3 أسابيع | أول شريحة repository/state كاملة |
| 3. نظام التصميم والتنقل | not started | 2–3 أسابيع | shell جديد وRTL/accessibility |
| 4. رحلة المستمع | not started | 4–5 أسابيع | الرئيسية والجدول والبرامج والحساب |
| 5. المشغل الصوتي | not started | 2–3 أسابيع | Media3 ومسارات الخلفية ناجحة |
| 6. الإدارة | not started | 2 أسبوع | فصل الإدارة وتفويض خادمي |
| 7. الجودة والإطلاق | not started | 2–3 أسابيع | rollout مرحلي ومراقبة وrollback |

## المرحلة 0: الحوكمة وخط الأساس

- [x] إنشاء مصدر الحقيقة والعقود والأدوار والمهارات.
- [x] توثيق البناء على JDK 17.
- [x] إزالة الملفات المعلقة بالكامل المثبتة ككود ميت.
- [ ] إضافة CI يبني debug ويشغل unit tests.
- [ ] قياس startup، بدء الصوت، crash-free وANR.
- [ ] حصر Firebase schema وSecurity Rules واختبارات emulator الحالية.
- [ ] اعتماد خطة تدوير الأسرار وإزالة `key.properties` من التتبع.
- [ ] إصلاح Google Services لنكهة `internews` أو اعتماد قرار بإيقاف النكهة.

بوابة الخروج: نفس commit يبني محليًا وCI، ولا توجد أسرار جديدة، والقياسات
الأساسية محفوظة كرابط dashboard لا كأرقام منسوخة هنا.

## المرحلة 1: الأمان والاستقرار

- إصلاح `FIRST_TIME_VERSION` وإزالة hard network gate.
- تصنيف أخطاء الشبكة وتوفير cached content.
- إيقاف logs الحساسة ومراجعة permissions وexported components وcleartext.
- فرض admin وownership عبر Firebase Rules وclaims.
- إضافة smoke tests للبدء والتسجيل والتعليقات.

بوابة الخروج: بنود P0 الأمنية مغلقة واختبارات rules السلبية تنجح.

## المرحلة 2: الأساس المعماري

- تعريف domain result/error ونماذج canonical.
- إنشاء repository interfaces وFirebase data sources وmappers.
- إدخال ViewModel/StateFlow وDI في شريحة Programs أولًا.
- منع وصول Firebase جديد من UI وتسجيل legacy seams.

بوابة الخروج: شريحة Programs تقرأ عبر الحدود الجديدة، باختبارات، مع حذف المسار
القديم الذي استبدلته.

## المرحلة 3: نظام التصميم والتنقل

- Material 3 tokens ومكونات الحالات المشتركة.
- shell بأربع وجهات ومشغل مصغر ثابت.
- RTL، TalkBack، خط 200%، small/large phone.
- تعريف أولي اختياري وحالات offline/loading/empty/error.

بوابة الخروج: screenshot/accessibility review للمسارات الأساسية دون نصوص خام.

## المرحلة 4: رحلة المستمع

- الرئيسية بترتيب البث الآن أولًا.
- جدول زمني وبرامج وتفاصيل وحلقات وتعليقات.
- الحساب والخصوصية وحذف الحساب.
- بحث ومفضلة فقط بعد استقرار القياسات الأساسية.

بوابة الخروج: تشغيل البث خلال ضغطتين، وعدم ظهور `null`، واختبارات UI حرجة ناجحة.

## المرحلة 5: المشغل الصوتي

- Media3 ExoPlayer وMediaSessionService وPlaybackController.
- audio focus، notification، headset/Bluetooth، reconnect/backoff.
- استعادة الحالة بعد process death وتبديل الشبكة.
- حذف الخدمات والتنفيذات القديمة فور تحويل المسار.

بوابة الخروج: مصفوفة المشغل في عقد الجودة ناجحة ولا يوجد Service يحتفظ بـView.

## المرحلة 6: الإدارة

- graph/entry منفصل للإدارة.
- نماذج قصيرة مع draft/validation/upload progress.
- تفويض خادمي وسجل عمليات إدارية.
- نقل migrations وأدوات الصيانة خارج تطبيق العميل.

بوابة الخروج: مستخدم غير مخول لا يستطيع أي كتابة حتى مع استدعاء API مباشر.

## المرحلة 7: الجودة والإطلاق

- توسيع unit/integration/UI tests وفق المخاطر.
- performance وstartup وmemory وnetwork resilience.
- release checklist وrollback وstaged rollout.
- إغلاق seams المؤقتة والديون المطلوبة للإطلاق.

بوابة الخروج: تحقق عقد الجودة والإصدار وتوسيع rollout بلا تراجع مؤشرات.
