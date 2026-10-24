# WORK_PROGRESS — HudHud FM

## أحدث حالة موثوقة عند الاستئناف

آخر متابعة: إصلاح دمج دلالات تقدم الحلقة، واختبار إجراءات قارئ الشاشة ولوحة
المفاتيح الفعلية؛301 اختبارات وبناء المنصتين أعيدت بنجاح. حزمة iOS كاملة427
مدخلاً موثقة، والنسخ السابقة والمرشحة محفوظة. سؤال نموذج المواقع ما زال بلا
جواب، ولا هاتف فعلي متاح؛ تفاصيل هذه الدورة في آخر الملف.

- **الهدف:** تنفيذ خارطة نوفمبر بعد مراجعة تطوير الأسبوع السابق، مع إصلاحات
  البيانات والأمان والإشعارات، وفلتر البث السليم وتقدم الحلقات، دون إعادة كتابة.
- **المكتمل محليًا:** NOV-01..06، اتساق الصحة وفلتر البث NOV-08/09، ومشغل
  الحلقات NOV-10. NOV-07: هوية الاستيراد وRSS والنطاق العربي وترحيله الآمن
  منفذة ومختبرة؛ اعتماد قائمة المحافظات ما زال مفتوحًا.
- **آخر تحقق:** Flutter301، Functions147، تحرير المحاكي37، Rules33، الإدارة
  الفعلية14، صور الحساب3، صيانة24، الموقع العام53؛ الإدارة74 ناجحة و14 اختبارًا
  تحتاج المحاكي مغطاة في التشغيل المنفصل. analyzer بلا مشاكل، format209 ملفًا
  دون تعديل، governance وdiff check ناجحة. بناء Android وiOS simulator نجحا.
- **القرارات:** مشغل واحد؛ progress منفصل عن حالة الصفحة؛ seek متسلسل مع load
  ومقيد بالهوية/generation ومدة native. النطاق العربي ARAB/global-ar/regional؛
  ARAB معرّف نطاق داخلي لا دولة. لا إعادة تصنيف لمعرفات المدن اليمنية دون اعتماد.
- **الملفات:** قائمة كاملة أدناه، وحزمة الأدلة في
  `docs/release/november-2026-local-acceptance.md`، والخطة الحالية في
  `docs/roadmap/november-2026-execution.md`.
- **المتبقي والخطوة التالية:** اعتماد المالك لقائمة المحافظات ثم تجهيز معاينتها
  المحددة؛ اختبار الصوت والخلفية والمقاطعات وFCM على هاتف فعلي. المتاح محاكي
  iOS وmacOS ومتصفح فقط؛ لا يمكن استبدال هذه الأدلة باختبار جهاز حقيقي.
- **الحفظ والحدود:** جميع التعديلات على القرص، بما فيها ملفات iOS التي ولدها
  البناء؛ لم يُحذف أو يُعكس العمل. لا Commit أو Reset أو Push أو Deploy أو
  بيانات حية أو signing. لا أداة ضغط يدوي متاحة؛ هذا الملف مرجع الضغط التلقائي.

الأقسام الأقدم أدناه سجل تاريخي؛ عند اختلاف حالة مؤقتة معها، تتقدم هذه الفقرة
وحزمة القبول الأخيرة. المهمة الأصلية ليست معتمدة بالكامل ما دامت البوابات أعلاه مفتوحة.


آخر تحديث: 2026-10-24. سجل استئناف للمهمة النشطة؛ ليس إعلان اكتمال.

## الهدف والمتطلبات

مراجعة تطوير 17–24 أكتوبر ونطاقه، ثم تنفيذ خارطة نوفمبر2026 كاملة بجودة عالية.
المراجع: `docs/roadmap/development-review-2026-10-24.md`،
`docs/roadmap/november-2026-roadmap.md`، `docs/roadmap/november-2026-execution.md`.
النطاق NOV-01..11 يشمل الإصلاحات وميزتي فلتر البث السليم وتقدم/seek الحلقات؛
لا تسقط الميزتين بافتراض السعة. لا إعادة كتابة/تنزيل صوت/PWA ضمن هذه الخطة.

تعليمات المستخدم الأخيرة: لا Commit أو Reset دون طلب صريح جديد؛ احفظ كل العمل
على القرص، لا تحذف/تتراجع عن تغييرات، واصل تلقائيًا، واختبر النتائج.
لم ننفذ commit/reset/push/deploy بعد هذه التعليمات، ولم نمس بيانات حية.
لا توجد أداة ضغط سياق يدوي متاحة؛ اعتمد هذا الملف عند compaction التلقائي.

## البيئة والحدود

- المشروع: `/Users/ibrahimqassem/VisualCodeProjects/acceleration/hudhud_fm`.
- الفرع `hudhud_fm` أمام origin بتسعة commits؛ HEAD13d4f9d. قبل منع commits،
  حُفظ c512459 ثم13d4f9d محليًا بعد fast-forward إلى main5eac31c. لا push.
- Node22.23.4: `/tmp/hudhud-nov-node22/node_modules/node/bin`. استخدم
  `PATH=/tmp/hudhud-nov-node22/node_modules/node/bin:$PATH` مع npm. العام26 غير مدعوم.
- Flutter3.47.5/Dart3.13.4. أوامر SDK والمحاكيات تحتاج escalation للـcache/المنافذ.
- كل المحاكيات demo وبيانات صناعية وFCM sender محقون. لا FCM حي/production/signing.
- لا تقرأ FM-Pro أو ملفات مفاتيح/config Firebase أو .env/الأسرار.
- حافظ على Flutter/Riverpod/domain-data/player الواحد والتعريب وRTL؛ لا اعتماديات جديدة.
- لا تشغل محاكيات تستخدم المنافذ نفسها بالتوازي. لا توجد أداة subagent؛ المراجعة inline.

## المكتمل

| البطاقة | النتيجة |
|---|---|
| NOV-01 | أساس الفرع والبيئة محليًا مثبت؛ baseline Flutter276 نجح. |
| NOV-02 | ملكية المحتوى المخزنة/الوجهة والأب الفعلي والهوية الخادمية؛ real Auth/Functions denial/control في الجذرين. |
| NOV-03 | تنظيف معاينة افتراضيًا مع هدف صريح، backup typed/fsynced، checkpoints، استئناف واستعادة create-only وحماية المراجع؛ unit5 وemulator6 ناجحة. لا عملية حية. |
| NOV-04 | جلب البث/RSS موحد: DNS/IP pinning وIPv4/IPv6/redirects وحدود الحجم/فك الضغط/المهلة والتوازي؛11 اختبارًا مخصصًا ناجحة. |
| NOV-05 | حفظ/استيراد/حذف مدقق خادميًا، counters/identity/audit ذرية؛ fence التعليقات وحماية الأبناء وID reuse. نقل الإشراف إلى callable لإغلاق كتابة عداد الحلقة من العميل. Rules server-only. القبول المحلي ناجح. |
| NOV-08 | اتساق freshness لكروت الويب مع التفاصيل وإصلاح ticker؛ browser/device acceptance النهائي باقٍ. |

## NOV-06 — التنفيذ الحالي

- `notification-delivery.js`: pending/claimed ثم pending/sending بحجز10 دقائق؛
  sent/failed/unknown؛ الفشل المؤكد القابل للإعادة فقط يستخدم backoff2دقيقة..ساعة.
  انتهاء claimed قابل للاستعادة؛ انتهاء sending يصبح unknown دون إعادة تلقائية.
- البرامج: عملية ثابتة لكل برنامج/تاريخ اليمن داخل الجذر؛ التحقق من الجدول الحالي
  قبل الإرسال؛ lastNotifiedDate بعد provider ack؛ private receipt يمنع التكرار
  حتى إن فشل compatibility stamp. تنظيف20 receipt منتهية بعد30 يومًا.
- الحلقات: حجز لكل جهاز فوق job lease؛ إعادة فحص profile/subscription/opt-out،
  deletion barriers، المحطة والبرنامج والحلقة وعلاقاتها وملكية الجهاز قبل الإرسال.
  legacy sent receipts نهائية؛ unknown لا يعاد إرساله. cleanup ضمن job القائم.
- الإرسال اليدوي كان ضمن REV-05 أيضًا: operationId ثابت من المحرر، scoped
  caller/root hash وربط payload fingerprint؛ history قبل send وack في receipt
  قبل history، وإعادة بناء السجل بعد فشله دون send آخر.
- Admin composer يحتفظ بالمعرّف في الذاكرة لنفس المحتوى/الحساب/الجذر؛ يوضح
  pending/failed/unknown ويفرّق قبول المزود عن وصول الجهاز. بعد reload راجع
  السجل قبل إنشاء intent جديد؛ لا ندعي dedup بين intents/tabs مستقلة.
- Dev announcements: hudhuddev_hudhud_fm_announcements؛ Official يبقى
  hudhud_fm_announcements. Flutter يصالح legacy memberships عند توفر الإذن،
  يلغي كلا الموضوعين عند opt-out ويرفض payload من جذر آخر. denied init لا يطلب إذنًا/token.
- القواعد تمنع إنشاء/تعديل notification history من العميل؛ super admin يستطيع
  قراءته/حذفه فقط؛ الحذف لا يلغي private dedup. لا exactly-once أو device receipt وعد.
- rollout يحتاج إيقاف scheduler القديم أولًا لأنه لا يحترم leases، ثم تحديث
  clients/topics. النشر خارج التفويض. العقود وADR0003 محدثة.

## أدلة التحقق

- NOV-05: Rules31/31، native editorial20/20، real Auth/Functions admin14/14،
  account-deletion3/3؛ كلها دون failures/skips. الفشل القديم لتجهيز aggregate
  fixture صُحح باستخدام Admin SDK، والاستعلامات باقية عبر Auth client.
- Functions الحالية146/146 نجحت بعد دمج manual broadcast، وتشمل5 helper tests.
- Notifications native18/18 نجحت: الجذران، lease contention، lost ack، انتهاء
  إرسال قيد التنفيذ، retry، opt-out، private Rules، retention وhistory recovery.
- Flutter notification repository5/5 نجحت؛ admin broadcast-attempt1/1 نجح.
- Admin آخرunit72 pass و14 emulator skips (الحالات14 منفذة منفصلًا أعلاه).
- Admin آخرtypecheck نجح؛ lint أعيد بعد إصلاح void test (نتيجته قيد المراجعة).
- Admin build بعد التغييرات نجح؛ تحذير chunk>500kB معروف.
- Functions syntax lint السابق نجح؛ أعده بعد rename collectNotificationOperations.
- Governance وgit diff --check نجحا.
- RED/GREEN موثق: منع SDK content قبل Rules؛ metadata plain-map/parent fence؛
  program concurrency/failure/lost ack؛ episode duplicates بالجذرين؛ broadcast
  binding/history recovery؛ Flutter root constructor جديد.
- notification history Rules: الاختبار الجديد شوهد يفشل تحت الإذن القديم؛
  أُغلقت الكتابة، وأحدث `emulators:test` قيد التشغيل بسجل
  `/tmp/hudhud-notification-rules-green.log` (session4608). لا تدع النجاح قبل فحصه.
- Flutter analyzer كامل قيد التشغيل بسجل `/tmp/hudhud-notifications-analyze.log`
  (session12818)، وfull Flutter tests قيد التشغيل بسجل
  `/tmp/hudhud-notifications-flutter-all.log` (session29911).
- admin lint session28485؛ build29510 وunit51774 سجلا النجاح؛ تحقق من exit codes.

## قرارات مهمة

1. content/counters/natural-key/audit معاملة واحدة؛ equivalent save retry no-op.
2. import identities SHA256 متوافقة مع العميل؛ first claim يقرأ451 كحد أقصى،
   ويرفض scopes>450 دون backfill مُراجع. يجب إكمال أداة backfill ضمن NOV-07.
3. delete snapshot كامل (backend/counters/creation)، timestamps ISO، يستثني
   deletion token؛ GeoPoint class فقط، وplain coordinate maps لا تُسقط حقولها.
4. scoped episode deletion يتحقق من program station الحقيقي قبل كتابة fence؛
   فشل audit لا ينقص عدادًا/يحرر key؛ finally يزيل token المحاولة نفسها فقط.
5. moderation نقل لازم لإغلاق episode writes، وليس توسيع صلاحيات؛ تعطيل
   الحساب super-only؛ جمع البلاغات bounded450 وserver actor.
6. release editorial: backend→compatible admin→Rules؛ لا إعادة فتح broad writes.
7. لا تحويل unknown لفشل قابل للإعادة ولا ادعاء FCM exactly-once.

## المشاكل والمتبقي والخطوة التالية

1. افحص نتائج العمليات الجارية المذكورة أعلاه وعالج أي إخفاق فعلي. شغّل
   Functions lint بعد rename، وadmin typecheck إذا طرأ تعديل؛ حدّث الأدلة.
   إن نجحت، حدّث NOV-06 إلى accepted locally فقط؛ device/browser gate باقٍ.
2. NOV-07: global-ar الآن YE/governorate، ويتطلب regional classification مع
   contract/mappers/selectors/filters/fixtures متوافقة كي لا تُخفى المحطات.
   لم نغيّر كود المواقع بعد؛ القراءات فقط. Flutter/Admin يرشحان YE حاليًا.
   catalog22 يحتاج تحققًا دلاليًا: مكلا/سيئون مدينتان، فلا تعتمد عدد22 دليلًا
   على دقة قائمة المحافظات. يلزم قرار/مراجعة catalog ومخطط migration آمن.
3. أداة natural identity backfill للـlegacy scopes الكبيرة: preview/conflict
   resolution/explicit target/backups/checkpoints/restore، دون تشغيل حي.
4. NOV-09: optional working-stream filter Flutter/public web مع city/search/
   favorites؛ default all؛ fresh45min online+zero failures، AR/EN/RTL/accessibility.
5. NOV-10: elapsed/duration/seek للحلقات القابلة للبحث عبر player الحالي فقط؛
   unknown/nonseekable/live handling، دون player ثانٍ أو downloads.
6. NOV-11: broad tests/builds Android/iOS/browser، RTL/200%/accessibility و
   device audio/background/interruption evidence إن توفر؛ لا تستبدل الجهاز بـmock.
7. حدّث هذا الملف وسجل التنفيذ بالنتائج ولا تعِد العمل المكتمل. لا commit/reset.

## الملفات الحالية المحفوظة على القرص

حالة Git الفعلية وقت تحديث الملخص:

```text
## hudhud_fm...origin/hudhud_fm [ahead 9]
 M docs/contracts/content-automation-contract.md
 M docs/contracts/firebase-data-contract.md
 M docs/contracts/station-governorates-stream-import-contract.md
 M docs/decisions/0003-station-subscriptions-and-alerts.md
 M docs/roadmap/november-2026-execution.md
 M firebase_tests/firebase-emulators/station-subscriptions.test.js
 M firebase_tests/firebase-rules/firestore.rules.test.js
 M firestore.rules
 M functions/index.js
 M functions/lib/admin-content-relations.js
 M functions/lib/editorial-audit.js
 M functions/lib/episode-alerts.js
 M functions/lib/program-notifications.js
 M functions/lib/user-management.js
 M functions/package.json
 M functions/test/program-notifications.test.js
 M functions/test/user-management.test.js
 M lib/features/notifications/data/repositories/firebase_notifications_repository.dart
 M package.json
 M test/features/notifications/data/firebase_notifications_repository_test.dart
 M tool/run-admin-emulator-tests.mjs
 M web_admin/README.md
 M web_admin/components/admin/admin-app.tsx
 M web_admin/components/admin/notifications-manager.tsx
 M web_admin/lib/delete-episode.ts
 M web_admin/lib/review-report.ts
 M web_admin/lib/save-content.ts
 M web_admin/test/editorial-queries.emulator.test.ts
 M web_admin/test/episode-deletion.emulator.test.ts
 M web_admin/test/location-relations.emulator.test.ts
 M web_admin/test/pl03-moderation.emulator.test.ts
 M web_admin/test/pl03-moderation.pilot.ts
 M web_admin/test/program-transfer.emulator.test.ts
 M web_admin/test/relationship-counter.test.ts
 M web_admin/test/review-report.emulator.test.ts
?? WORK_PROGRESS.md
?? firebase_tests/firebase-emulators/editorial-delete.test.js
?? functions/lib/admin-content-authorization.js
?? functions/lib/admin-content-delete.js
?? functions/lib/admin-report-review.js
?? functions/lib/notification-delivery.js
?? functions/test/admin-content-delete.test.js
?? functions/test/admin-report-review.test.js
?? functions/test/notification-delivery.test.js
?? web_admin/lib/broadcast-attempt.ts
?? web_admin/test/broadcast-attempt.test.ts
?? web_admin/test/moderation-authorization.emulator.test.ts
```

كل التعديلات محفوظة وغير ملتزم بها؛ المهمة الأصلية ما زالت active.

## نتائج مؤكدة بعد العمليات المذكورة أعلاه

- العمليات الجارية سابقًا انتهت: Rules32 passed، full Flutter279 passed،
  analyzer بلا ملاحظات، admin lint/typecheck/build ناجحة. Functions146 passed.
- NOV-06 أصبحت source/emulator accepted؛ browser/device acceptance يبقى NOV-11.
- أُرسلت للمستخدم مسألة نطاق كتالوج المواقع عبر سؤال async؛ لا جواب حتى الآن،
  ولا تغيير كود للمواقع بعد. مرجع الخرائط الذي قُرئ:
  https://humanitarianatlas.org/yemen/ (Hadramawt وSanaa City إداريًا مستقلان).
  HDX المباشر رفض fetch403؛ لا تدع قراءة محتوى dataset لم يتوفر.
- اكتشاف NOV-07 مهم: مجرد backfill لكل سجل لا يتيح إنشاء هوية جديدة فيscope
  >450؛ يلزم completed-scope marker موثوق مع إثبات ثبات عضوية النطاق.
- RSS ما زال read-then-batch دون shared identity، ويجب ربطه بالمعاملة قبل
  الوثوق بالـmarker. لم نعدّل RSS أوأداةbackfill بعد؛ التصميم في سجل التنفيذ.
- التالي: TDD manifest/guards ثم أداةbackfill bounded، دمجmarker/RSS واختبارات
  native قبل أي ادعاء إكمالNOV-07. واصل بقية الميزات والنطاق دون commit/reset.

## NOV-07 backfill — أحدث عمل محفوظ

- أُضيف `tool/backfill_content_identities.mjs` واختباراته؛5 unit passed بعد
  RED للوحدة المفقودة ثم regression لصف preview malformed.
- الأداة preview افتراضيًا، project/root/kind/parent صريحة، manifest hash-bound
  دون raw title/URL، backup fsynced قبل كتابة، keys create-only، checkpoints
  ذرية، parent updateTime دقيق، وفحص aggregate count قبل scope completion.
- restore يغلق marker أولًا ولا يمس content، ويحذف فقط key يحمل backfillRunId
  للمحاولة؛ يحتفظ بالمفاتيح التي أعاد writer موثوق حجزها، ويدعم الاستئناف.
- `firebase_tests/firebase-emulators/editorial-identity-backfill.test.js` جديد،
  يدخل تلقائيًا في wildcard `emulators:editorial`. preview/backup failure/
  bounded resume/rollback/stale parent/duplicates/wrong client للجذرين نجحت.
- آخر native run بعد استكمال station fixture:24 pass و1 expected failure:
  scope451 اكتمل backfill له، لكن save الجديد يُرفض بـidentity-backfill؛
  يلزم completed-marker fast path في prepareContentIdentity، لم يُكتب بعد.
- أضيفت حالتا RSS canonical-URL fragment مقابل editor، متوقع أن تكشفا تكرارًا
  بسبب bypass؛ تشغيلهما قيد التنفيذ الآن عبر emulators:editorial، session21042،
  السجل `/tmp/hudhud-backfill-rss-red.log`. لا تغيّر RSS قبل رؤية فشلها الفعلي.
- الخطوة التالية: افحص ذلك السجل، انقل hash scope إلى shared content helper،
  اربط marker guard بالخادم، ثم حوّل RSS إلى native tx تشمل parent/counter/key/
  audit وcreate-only وتتعامل مع duplicate كـskip. احتفظ بكل regressions RSS
  القديمة (فشل commit، partial retry، counters) عند تكييف fake transaction harness.
- `functions/lib/rss-ingestion.js` ما زال دون تغييرات NOV-07. أسئلتنا عن نطاق
  كتالوج المواقع ما زالت بلا رد؛ العمل الحالي في backfill مستقل عنها.

## آخر نقطة استئناف — NOV-07 الهويات مكتملة محليًا

- أُضيف contentIdentityScope في functions/lib/admin-content.js؛ الأداة تستخدم
  نفس hash، وprepareContentIdentity يقرأ private completed-scope marker، ويتحقق
  version/state/kind/parent/runId قبل تخطي legacy scan للنطاقات الكبيرة.
- RSS الآن native tx: parent/station validity، create-only episode، counter،
  shared natural key وaudit system:rss معًا. canonical precheck + key transaction
  يمنعان اختلافGUID/fragment من صنع duplicate. لا raw title/URL/errors في logs.
- RSS unit harness كُيّف لمعاملة فعلية مع الحفاظ على اختبارات commit failure/
  partial retry/counters؛ full Functions146 passed بعد التغيير.
- Native identity/RSS27 ثم31 ثم33 passed بلا skip. آخِر33 تتضمن cursor bound،
  concurrent RSS، stale parent، وcompeting maintenance runs (RED2 ثمGREEN).
  السجل `/tmp/hudhud-backfill-scope-lock-green.log`.
- backfill له scope lock خاص يمنع run آخر أو apply/restore متداخلين. cursor
  apply=completed، restore=restoreCompleted؛ كل invocation لا يتجاوز maxItems
  item transactions. final count + precise parent version يثبتان scope coverage.
  restore يغلق marker أولًا ويحتفظ بقفل النطاق حتى انتهاء إزالة المفاتيح الخاصة
  بالمحاولة. تغير الأب يتطلب restore للمحاولة الجزئية قبل apply لpreview جديد.
- صُححت audit test isolation:3 استعلامات في editorial-audit.test.js أصبحت
  scoped targetId؛ لم يعد عدّ audit collection كله يختلط بملفات اختبارات متوازية.
- docs/operations/content-identity-backfill.md جديد؛ docs/README والعقد ودليل
  workspace محدثة. private Rules test يشمل scope proofs/locks/checkpoints؛
  آخر emulators:test33/33 passed (`/tmp/hudhud-backfill-rules.log`).
- maintenance unit16/16 passed (backfill5+cleanup5+location migration6).
  Functions lint ناجح؛ git diff --check وgovernance ناجحان.
- Android `flutter build apk --debug --no-pub` نجح؛ artifact
  build/app/outputs/flutter-apk/app-debug.apk. تحذير KGP plugins مستقبلي معروف.
- iOS `flutter build ios --simulator --debug --no-pub` قيد التشغيل session64092؛
  سجل `/tmp/hudhud-november-ios-simulator.log`، آخره Running Xcode build.
  تحذير flutter_facebook_auth غير داعمSPM مستقبلي؛ لا signing/deploy.
- كل التعديلات محفوظة، لا commit/reset. جغرافياNOV-07 لم تتغير بعد، وسؤال
  اختيارcatalog async لم يُجب عنه. لا ادعاء أن geography/migration منجزة.
- التالي المستقل: NOV-09 working-stream filter Flutter/public web. الموجود:
  HomeState.visibleStations يجمع city/search/favorites لكن controller يمسحcity
  عندfavorites؛ مطلوب دمجها جميعًا معفلترhealthy اختياري defaultfalse.
  public-home.tsx يحسب filteredStations داخلuseMemo ويجمع search/city/library.
  راجع معيارadminhealthy والـ45min قبلالكتابة؛ TDD. ثمارجعcatalog/region والمهاجرات
  بعدقراره، ثمNOV-10 عبرplayerالحالي وNOV-11 browser/device/build evidence.

## NOV-08/09 — أحدث قبول محلي قبل العمل على الحلقة

- NOV-09 منفذة Flutter/public web: isWorkingStreamsOnly defaultfalse، Fresh45m
  online+zero failures+source، مع search/city/favorites وrecent للويب. لم تعد
  خياراتcity/favorites تمسح بعضها فيFlutter. unknown/archive تبقى فيdefault.
- HomeView وPublicHome يستخدمان timer محليًا عندحد freshness/entry، وإعادةفحص
  عندforeground/focus دونnetworkpolling. اسمhelper الحالي nextStreamHealthChange.
- UI AR/EN فيARB، شرح last checked وempty action يعطلfilter دون مسح خيارات
  Flutter الأخرى؛ فيالويب showall يعيدكلالفلاتر كماوُصف. counters تعرض النتائج.
- malformed failure counters لم تعد تصير0؛ negative sentinel يعرض unverified
  فيFlutter/web ويُستبعد منhealthy فيالإدارة. largeinvaliddatesمحجوبةفيstreamCheckedAt.
- NOV-08 browser QA كشف archive/noSource يوصف كsourceoutage؛ أُصلحت كروت
  homepage/detail عبر streamHealthLabels. noSource playback disabled معبقاء
  route البرامج/الحلقات متاحًا وnote محايد؛ تفاصيل تعرضوقتآخرcheck.
- Flutter analyzer أصبح clean بعد4 curly-brace infos، وآخرfullFlutter286 passed
  (`/tmp/hudhud-working-flutter-all.log`). Widget recovery AR/EN عند200%2passed؛
  أولفشليهماكانtapقبلتحديثscrolllayout، أُضيفpumpبعدensureVisible لا إسكاتللتحذير.
- Publicweb51 tests passed، admin73 passed و14 emulator skipsسبقنفذتمنفصلًا.
  آخرtypecheckنجح؛build/lintنجحا قبلhelperdateالأخير، يلزمfinalbuild/typecheck/lint
  بعدآخرstreamCheckedAt/station-detail تغييرات قبلقبولنهائي.
- Browser QA عبرCUA ChromePlaywright(لأنIABغيرمتاح؛npxPlaywrightفشلENOTFOUND،
  لمتثبتأيdependency). UI3→healthy1، معfav/city/search0،showall3،
  desktop+390x844بدونoverflowcontentWidth390 أوconsoleerrors.
- archivesrouteنجحبالkeyboardEnter وبmouseرابطالتفاصيل. locatorclickعلىوسط
  titleمتعددالأسطرأصابH3gap،فاستخدمناالرابطالدلاليبدلإضافةCSSغيرلازم.
- screenshotsخارجالمشروع: /tmp/hudhud-working-desktop-empty.png،
  /tmp/hudhud-working-mobile.png (قديماtagقبلآخرتحسينlabel؛حدّثهقبلfinal)،
  /tmp/hudhud-working-archive.png.
- Localdevserver67579:127.0.0.1:5178،fixture/test/preview.html?state=working؛
  صناعيتمامًا بلاFirebase/accounts. Chromebrowser1،tab10269551،bindings
  qaTab/qaBrowser/qaViewport/qaFiles فيcua_repl؛viewportرُدإلىdefault.
  لاbrowserhandoff/deliverablemark. بعدcompactionاقرأcua.rewriteDocumentation().

## أثر بناءiOS الذي يجب الحفاظ عليه

- SPMكانموجودًا فيHEAD أصلًا؛flutterbuildأعادPodfile.lockلتبقىفقطFacebookpods
  وأزالCPcopyresourcesphase(18line)،وأنتج2Package.resolved. Firebaseلميتغير12.18.0.
- الملفات: ios/Podfile.lock،ios/Runner.xcodeproj/project.pbxproj، و
  ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved،
  ios/Runner.xcworkspace/xcshareddata/swiftpm/Package.resolved.
- لمتُعكسأوتُحذفهذهالتغييرات؛تعليماتالمستخدمتحظرالتراجع. نسخةقبل/بعدوالpatch
  محفوظةفي /var/folders/83/q6qt5_t166dgx04c_8zhkl6c0000gp/T/hudhud-ios-build-review-97ujj0wg.
- Androiddebug وiOSsimulatorbuildنجحاقبلNOV-09. تحذيراتKGP/FacebookSPMمستقبلية،
  ولاsigning/upload/deviceevidence. راجعأثرgeneratedlocksفيتقريرNOV-11.

## التالي — NOV-10 لم يبدأ كودها بعد

- اقرأ JustAudioPlayerDataSource وAudioPlaybackRepository/DataSource/interfaces،
  StationPlayerController._loadCurrent يستخدم_loads لتسلسلloads،وAudioPlaybackItem
  لديهisLiveبالفعل(epfalse)؛لاحاجةلمشغلثانٍأونوعميدياجديد.
- التصميمالمقترح: domain AudioPlaybackProgress(itemId,position,duration,isLive,
  seekFailed) معcanSeekمشتقةمنمدةnativeموجبةوepisode؛لااعتمادعلىcatalogduration
  لإثباتseekability. datasourceيصدرprogressللepisodeفقط ويلغيهعندload/live/stop/
  dispose؛replaylatestللpausedlisteners. repositorydelegation،StreamProvider
  منفصلوويدجتprogressفرعيحتىلايعيدبناءHomeعلىكلpositiontick.
- seekيمرcontrollerمعitemIdمتوقع،ويُسلسلضمن_loadsنفسها؛generationguardيمنعseek
  قديمًامنالتأثيرعلىمصدرجديد. clamp0..nativeDuration؛لاautoplay.فشلseekآمن
  يعطلscrubbingلهذهالمحاولةويظهرنصlocalizedدونrawerrorsأوتحويلهلاشتغالفشلعام.
- اختباراتمطلوبة: source/seekrace, unknown/live/nonseekable, pause/replay،
  controller/fakeupdates،AR/ENaccessibleslider،dispose. No persistence/speed/download.
- fakeimplementersالمعروفة2: test/support/development_fixtures.dart ReviewAudio؛
  test/features/player/presentation/station_player_controller_test.dart _FakeAudioPlaybackRepository.
- NOV-07geographyمازالتpending،السؤالasyncلميردعليه،ولاcatalogsourceتغير.
  يمكنمتابعةNOV-10مستقلًا؛لاcancelgoalأوcommit/reset/push/deploy.

## Current verified checkpoint before NOV-10

- NOV-09 and visual NOV-08 now pass locally; roadmap/contract updated.
- Full Flutter286 passed; analyzer clean. Public51 passed, admin73 passed
  (14 emulator tests were separately14/14 earlier). Final public build/lint and
  full Dart format check are running/finishing: sessions69899/10401;
  logs `/tmp/hudhud-working-web-build.log`, `/tmp/hudhud-working-format-check.log`.
- Shared web `streamCheckedAt` rejects invalid/out-of-range dates. Public card
  labels and details use the same health interpretation. No-source sources have
  disabled live control and retain episode navigation, without false outage text.
- Final mobile screenshot updated after label changes:
  `/tmp/hudhud-working-mobile.png`; desktop `/tmp/hudhud-working-desktop.png`.
  Archive and empty-state screenshots remain available. CUA viewport reset.
- NOV-10 plan saved to docs/superpowers/plans/2026-10-24-episode-progress.md.
  Playback contract has an explicitly pending design checkpoint. No player product
  code changed for NOV-10 yet. Existing AudioPlaybackItem.isLive already differentiates
  episodes and live sources; use it.
- Important SDK finding: just_audio0.10.6 createPositionStream creates a timer
  per call. Do not create one per episode load. Use one datasource-owned500ms
  local timer only while ready/playing, plus a generation-bound playback-event
  listener for the loaded episode. Cancel both on replacement/stop/dispose.
- Next: TDD progress model/native lifecycle, repo signatures and fakes, controller
  seek serialized with `_loads`, then isolated StreamProvider/controls and ARB.
  Configure-session test injection retains the real production music default.
- Geography still untouched and owner question still pending. No Commit/Reset.

## استئناف NOV-10 بعد حفظ السياق

- تنفيذ جديد محفوظ على القرص: نموذج AudioPlaybackProgress، واجهتا datasource/
  repository وتفويض default repository، native progress/seek في المصدر الحالي،
  وتحديث fake repositories. لا مشغل أو dependency جديد.
- اختبارات النموذج الأربعة نجحت. أول تشغيل native وصل إلى11 نجاحًا ثم علق
  في اختبار widget للمؤقّت؛ أوقف تشغيل الاختبار فقط، ولم يُحذف أو يُعكس كود.
- السبب في الاختبار: انتظار stream.first داخل fake async بلا pump. عُدل إلى
  اشتراك مستمر مع pump وإثبات توقف قراءة position بعد إلغاء المستمع.
- قرار: مؤقّت500ms واحد فقط لحلقة ready/playing ولها مستمع. native duration
  شرط seek، فشله يعطل scrubbing للمحاولة ويحفظ elapsed. dispose guarded.
- التحقق الحالي قيد الإعادة؛ controller queue والواجهة لم يُنفذا بعد.
- التالي: إنهاء اختبارات native، ثم seek المتسلسل والواجهة AR/EN، ثم checks
  النهائية والمواقع. قيود no Commit/Reset/push/deploy مستمرة.

## نقطة التنفيذ الحالية — تتقدم على الملاحظات الأقدم

- NOV-10: النموذج/native/repository/controller والواجهة/ARB منفذة محليًا.
  الـseek يتسلسل في _loads مع فحص generation قبل/بعد وexpected episode ID؛
  لا play/pause آلي. Slider يرسل طلبًا واحدًا بعد الإفلات، وتحديث الزمن منفصل.
- full Flutter300/300 نجحت في /tmp/hudhud-episode-full.log. Widget AR/EN2/2
  نجح؛ اختبار المصدر broadcast يطابق production. اختبارات single-sub السابقة
  علقت عند teardown؛ لا يُنسب ذلك إلى عطل production. أضيفت حالات unknown/live/
  late-seek-disposal بعد ذلك وتحتاج تشغيلًا نهائيًا. Analyzer وجد6 issues محلية
  (braces/null assertion)؛ أصلحت ويجب إعادة التحقق، لا تدعِ analyzer clean بعد.
- Ruling: نطاق عربي مستقل محليًا countryCode=ARAB (معرّف نطاق داخلي وليس ISO)،
  cityCode ثابت global-ar وlocationType=regional. countryNameAr=العالم العربي.
  نحتفظ بدعم العرض للوثائق القديمة YE/global-ar أثناء rollout. لا استنتاج
  تغيير تصنيف صنعاء/المكلا/سيئون أو اعتماد قائمة22 من عدم جواب المالك.
- تعديلات النطاق الإقليمي قيد الاختبار: canonical source، validator الخادمي،
  Admin form/picker، Flutter discovery وPublic filter/SEO. لا بيانات حية تغيرت.
- المتبقي: تحقق جديد شامل، أدوات preview/migration آمنة للقائمة الإقليمية،
  اعتماد جغرافيا المحافظات، أحدث Android/iOS builds ومصفوفة الأجهزة الفعلية.

## الحالة المحفوظة بعد الاستكمال المحلي —2026-10-24

- NOV-10 منفذ؛ Full Flutter301/301، analyzer بلا issues، governance وdiff check
  نجحت. الاختبار الموسع AR/EN يشمل unknown/live/failure/stale identity وإغلاق
  widget أثناء طلبseek. Androiddebug الأحدث نجح؛ iOSsimulatorbuild جارٍ.
- NOV-07 إقليمي/استيراد: source/client schema+filters+SEO وmigration tool منفذة.
  Native editorial37/37 تشمل concurrent apply وaudit rollback وحد450 وثيقة؛
  Functions147/147، Public53/53، Admin74passed+14skips. Admin Auth/Functions
  المنفصل14/14 نجح بعد regionalvalidation. Private checkpoint Rules أعيد اختبارها.
- الدليل الجديد docs/operations/regional-location-migration.md. CLI الجديد
  tool/migrate_regional_location.mjs، واختبارات tool/test/migrate_regional_location.test.mjs
  (3/3). القديمان seed_locations/migrate_station_locations يمنعان تحديثglobal-ar
  المباشر كيلا يتخطيا ذرية المرجع والمحطات وaudit. لا تنفيذ حي أو نشر.
- browser: النطاقARAB/global-ar يبقى ظاهرًا؛ اختيارعربي يعطي1 محطة، metadata
  regional صحيحة، 390px بلاoverflow. screenshots الصحيحة:
  /tmp/hudhud-regional-desktop.png و/tmp/hudhud-regional-mobile.png.
  fixturestateيجب تضمينه عندreload؛ روابطالمنتجلاتحتفظبـstateالتجريبي، لذا
  reloadدونهيرجعfixtureالافتراضيولايمثلbugإنتاج. HMRأصدرcreateRootwarning أثناء
  تعديلfixture؛ لاFCMأوAuthحي. viewportأعيدdefaultولاtabhandoff.
- generatediOSchangesمازالت محفوظة. لم نُنفذCommitأوResetأوPushأوDeploy.
- المتبقي الحقيقي: إنهاءiOS/checks وحفظartifactfingerprint/acceptancematrix؛
  اعتمادالمالكلكتالوجالمحافظات (لا جوابحتىالآن)، معاينةالبياناتالحيةعندتفويضها،
  واختباراتالصوت/الخلفية/المقاطعات/FCMعلىأجهزةفعلية. لا تجعلlocalchecks اعتمادإطلاق.

## حزمة القبول والأثر المحلي

- أحدث Android وiOSsimulator builds نجحت. لا جهاز هاتف فعلي متاح؛ iOSsimulator/
  macOS/browser فقط. لم يُنفّذ signing أو upload أو live-data action.
- السجل: docs/release/november-2026-local-acceptance.md، ويحتوي بصمات artifacts
  وworktree وفصل pass/skip والجوانب الخارجية المتبقية. فحصprofile-images جارٍ.
- بصمة المصدر المعدل: `493d6674a8ff3b937a79d18bae5b598b3a0767f8552bdbab8ba1add0a891b9f7`. ملخص الأنشطة الأقدم أعلاه تاريخي؛
  هذه النقطة وحزمة القبول هما حالة الاستئناف الحالية. لا أداة ضغط يدوي متاحة.

## قائمة الملفات المعدلة/الجديدة المحفوظة على القرص

```text
WORK_PROGRESS.md
docs/README.md
docs/contracts/content-automation-contract.md
docs/contracts/firebase-data-contract.md
docs/contracts/playback-contract.md
docs/contracts/station-governorates-stream-import-contract.md
docs/decisions/0003-station-subscriptions-and-alerts.md
docs/operations/codex-workspace-setup.md
docs/operations/content-identity-backfill.md
docs/operations/regional-location-migration.md
docs/release/november-2026-local-acceptance.md
docs/roadmap/november-2026-execution.md
docs/superpowers/plans/2026-10-24-episode-progress.md
firebase_tests/firebase-emulators/editorial-audit.test.js
firebase_tests/firebase-emulators/editorial-delete.test.js
firebase_tests/firebase-emulators/editorial-identity-backfill.test.js
firebase_tests/firebase-emulators/editorial-regional-migration.test.js
firebase_tests/firebase-emulators/station-subscriptions.test.js
firebase_tests/firebase-rules/firestore.rules.test.js
firestore.rules
functions/index.js
functions/lib/admin-content-authorization.js
functions/lib/admin-content-delete.js
functions/lib/admin-content-relations.js
functions/lib/admin-content.js
functions/lib/admin-report-review.js
functions/lib/editorial-audit.js
functions/lib/episode-alerts.js
functions/lib/notification-delivery.js
functions/lib/program-notifications.js
functions/lib/rss-ingestion.js
functions/lib/user-management.js
functions/package.json
functions/test/admin-content-delete.test.js
functions/test/admin-report-review.test.js
functions/test/notification-delivery.test.js
functions/test/program-notifications.test.js
functions/test/regional-location.test.js
functions/test/rss-ingestion.test.js
functions/test/user-management.test.js
ios/Podfile.lock
ios/Runner.xcodeproj/project.pbxproj
ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved
ios/Runner.xcworkspace/xcshareddata/swiftpm/Package.resolved
lib/app/providers.dart
lib/features/home/data/mappers/station_mapper.dart
lib/features/home/domain/models/location_reference.dart
lib/features/home/domain/models/station.dart
lib/features/home/presentation/controllers/home_controller.dart
lib/features/home/presentation/controllers/home_state.dart
lib/features/home/presentation/home_screen.dart
lib/features/home/presentation/widgets/home_view.dart
lib/features/notifications/data/repositories/firebase_notifications_repository.dart
lib/features/player/data/datasources/audio_player_data_source.dart
lib/features/player/data/datasources/just_audio_player_data_source.dart
lib/features/player/data/repositories/default_audio_playback_repository.dart
lib/features/player/domain/models/audio_playback_progress.dart
lib/features/player/domain/repositories/audio_playback_repository.dart
lib/features/player/presentation/controllers/station_player_controller.dart
lib/features/player/presentation/widgets/episode_progress_controls.dart
lib/features/player/presentation/widgets/now_playing_sheet.dart
lib/l10n/app_ar.arb
lib/l10n/app_en.arb
lib/l10n/generated/app_localizations.dart
lib/l10n/generated/app_localizations_ar.dart
lib/l10n/generated/app_localizations_en.dart
package.json
test/features/home/data/station_mapper_test.dart
test/features/home/domain/working_stream_filter_test.dart
test/features/home/presentation/home_controller_test.dart
test/features/home/presentation/working_stream_filter_view_test.dart
test/features/notifications/data/firebase_notifications_repository_test.dart
test/features/player/data/audio_episode_progress_test.dart
test/features/player/domain/audio_playback_progress_test.dart
test/features/player/presentation/episode_progress_controls_test.dart
test/features/player/presentation/station_player_controller_test.dart
test/support/development_fixtures.dart
tool/backfill_content_identities.mjs
tool/firebase_seed/canonical_locations.mjs
tool/firebase_seed/seed_locations.mjs
tool/firebase_seed/test/seed_locations.test.mjs
tool/migrate_regional_location.mjs
tool/migrate_station_locations.mjs
tool/run-admin-emulator-tests.mjs
tool/test/backfill_content_identities.test.mjs
tool/test/migrate_regional_location.test.mjs
web_admin/README.md
web_admin/components/admin/admin-app.tsx
web_admin/components/admin/content-editor.tsx
web_admin/components/admin/notifications-manager.tsx
web_admin/lib/broadcast-attempt.ts
web_admin/lib/content-form.ts
web_admin/lib/delete-episode.ts
web_admin/lib/resource-filters.ts
web_admin/lib/review-report.ts
web_admin/lib/save-content.ts
web_admin/test/broadcast-attempt.test.ts
web_admin/test/content-form.test.ts
web_admin/test/editorial-queries.emulator.test.ts
web_admin/test/episode-deletion.emulator.test.ts
web_admin/test/location-relations.emulator.test.ts
web_admin/test/moderation-authorization.emulator.test.ts
web_admin/test/pl03-moderation.emulator.test.ts
web_admin/test/pl03-moderation.pilot.ts
web_admin/test/program-transfer.emulator.test.ts
web_admin/test/relationship-counter.test.ts
web_admin/test/resource-filters.test.ts
web_admin/test/review-report.emulator.test.ts
web_hudhud/lib/discovery.ts
web_hudhud/lib/seo.ts
web_hudhud/lib/stations.ts
web_hudhud/public-home.tsx
web_hudhud/station-detail.tsx
web_hudhud/test/preview.tsx
web_hudhud/test/working-stream-filter.test.mjs
```


## نتيجة آخر فحص إلزامي

اختبارات صور الحساب عبر محاكيات demo نجحت3/3، وأُغلقت المحاكيات بنجاح.
تم تحديث حزمة القبول وسجل التنفيذ بنتائج Android/iOS والأدلة النهائية. الخطوة
التالية تعتمد على اعتماد كتالوج الجغرافيا وتوفر هاتف فعلي؛ لا تعِد التنفيذ المحلي.


## استمرار الهدف — تدقيق متطلبات القبول

الدورة السابقة تُصنف تقدمًا: تنفيذ واختبارات وحزم فعلية. في هذه الدورة أضيفت
مراجعة بندية في docs/release/november-2026-completion-audit.md ومقترح كتالوج
قابل للمراجعة في docs/operations/location-catalog-owner-review.md يغطي22 ID.
المصدر الخارجي Humanitarian Atlas يؤكد فصل الوحدات الإدارية؛ لا يقرر بدل المالك
هوية تغطية المحطات، لذلك لا ترحيل جغرافي مبني على الافتراض.

كشف اختبار تفاعل فعلي لقارئ الشاشة أن label شريط التقدم منفصل عن قيمة الزمن.
أضيف MergeSemantics، ثم نجح اختبارا AR/EN مع semantics increase/decrease وTab/
arrowUp عند200-percent. تحقق analyzer/full Flutter والحزم يُعاد بعد هذا الإصلاح.
بصمة iOS السابقة كانت للـRunner فقط؛ سيُحفظ manifest للحزمة كاملة بعد إعادة البناء.
لا Commit/Reset. المقصود بقيود signing هو production/store؛ حزمdebug قد تستخدم
توقيع التطوير المعتاد، ولا تعني إصدارًا للمتجر.


تقدم إضافي: نجح analyzer/full Flutter301 بعد إصلاح الدلالات؛ إعادة بناء الحزم
جارية في session57735 (ملفا /tmp/hudhud-nov-a11y-apk.log وios.log). احتُفظ
بحزم ما قبل إصلاح الدلالات تحت /tmp/hudhud-november-artifacts/pre-accessibility-fix
مع التحقق من APK وmanifest الحزمة الكاملة. هذه ليست baseline قبل NOV-10.
أُعدت docs/release/november-2026-device-acceptance.md بقيم Not run صريحة ومنهج
قياس قبل/بعد ومتطلبات الصوت وFCM الفعلية؛ لا تُملأ النتائج بالاستنتاج.


## أحدث نقطة بعد تدقيق إمكانية الوصول

- نجاح301/301 بعد الإصلاح، analyzer نظيف، format209 ملفًا دون تعديل، governance
  وdiff check ناجحة. Android/iOS أُعيدا بنجاح، session57735 انتهت exit0.
- اختبارا الدلالات/لوحة المفاتيح الحقيقيان نجحا؛ الإصلاح MergeSemantics فقط في
  EpisodeProgressControls. الأرقام القديمة تخص قبل هذا الإصلاح ولا تتقدم عليه.
- بصمة المصدر الحالية: `51eca3b7e1a1c34531c9fcf1c8a47cf703739599a5abeeb1619fa1783258a30a`.
- APK الحالي: `e190b274750d4f10d4cad32e93108e09c3f8bdfd2c35acff5854f0aa934b87fd`.
- manifest كامل iOS: `d71e76737eae2bebf7aeb055428d14a1a561a79b7e8a3c669ccdc936916cfb75` في
  /tmp/hudhud-nov-ios-bundle-manifest.json، مع نسخ مرشحة وسابقة محفوظة محليًا.
- فحص الأجهزة أُعيد: iOSsimulator/macOS/browser فقط، لا هاتف فعلي. سؤال نموذج
  المواقع قُدم عبر الأداة بعد إعداد جدول مراجعة22ID؛ لم يصل جواب، ولا يصح
  تفسير الانتظار كموافقة. هذه ليست حالة اكتمال للهدف.
- الخطوة التالية: قرار المالك ثم تنفيذ شريحة الجغرافيا المتفق عليها؛ قبول
  الأجهزة والقياس وFCM عند توفر البيئة والتفويض. لا تكرر الاختبارات الخضراء
  دون تغيير جديد. لا Commit/Reset/push/deploy/production signing.

### ملفات أضيفت لهذه المراجعة

- docs/operations/location-catalog-owner-review.md
- docs/release/november-2026-completion-audit.md
- docs/release/november-2026-device-acceptance.md


## تدقيق التعذر — الدورة الثالثة المتتالية بنفس البوابات

- الدورة السابقة تقدم مثبت: إصلاح دلالات المشغل، اختبارات حقيقية وإعادة بناء
  Android/iOS مع حفظ النسخ والبصمات. ليست جلسة انتظار لعملية ما زالت تعمل.
- أُعيدت المطابقة الآن: المصدر مطابق لبصمة القبول، HEAD13d4f9d دون تغيير،
  السجلات الفعلية تثبت301 اختبارًا والتحليل والبناء الناجح. لا عملية بناء معلقة.
- فحص الأجهزة الحالي /tmp/hudhud-nov-blocked-audit-devices.json يؤكد غياب هاتف
  Android/iOS فعلي؛ المتاح محاكي iOS وmacOS ومتصفح. لا يمكن إثبات جلسات الصوت
  والخلفية والقياس وFCM الفعلية بهذه الأهداف.
- قرار نموذج الجغرافيا ما زال بلا جواب:22 محافظة مع مدن مستقلة أم مناطق تغطية.
  اعتماد الكتالوج شرطNOV-07؛ الملف القابل للمراجعة والسؤال قُدما بالفعل.
- هذه هي المرة الثالثة المتتالية التي تبقى فيها البوابات نفسها. بعد إنهاء
  العمل المستقل لا توجد خطوة تنفيذ آمنة ذات معنى قبل القرار/تغير بيئة الأجهزة.
  تُعلَّم حالة الهدف blocked، لا complete ولا paused. لا اختبار مكرر أو موافقة
  مفترضة أو تغييرات إضافية في المصدر. جميع الملفات محفوظة؛ لا Commit/Reset.
- الاستئناف: عند وصول القرار أو توفر البيئة المطلوبة، اقرأ هذه النقطة وملفات
  القبول، ونفذ المتبقي دون إعادة ما أُنجز. نطاق الهدف الكامل محفوظ.
