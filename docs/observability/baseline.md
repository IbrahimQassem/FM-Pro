# Observability baseline

الحالة: دليل قياس محلي بتاريخ 2026-08-26
المالك: Quality / Modernization

## بيئة القياس

- build: `hudhudfm_google_playDebug`، version `2.0.6` (`versionCode 26`).
- الجهاز: Android Emulator `sdk_gphone16k_x86_64`، Android 17 / API 37.
- العرض: `1080x2400` بكثافة `420dpi`.
- الأداة: `adb shell am start -W` للنشاط launcher
  `com.sana.dev.fm/.ui.activity.SplashActivity`.
- هذه أرقام debug/emulator للمقارنة أثناء التطوير، وليست SLO إنتاجيًا.

## Startup

### تشغيل بارد

أُوقفت العملية قبل كل قراءة باستخدام `am force-stop`.

| القراءة | `TotalTime` | `WaitTime` |
|---:|---:|---:|
| 1 | 5555ms | 5674ms |
| 2 | 4537ms | 4582ms |
| 3 | 4424ms | 4445ms |
| 4 | 4666ms | 4885ms |
| 5 | 5295ms | 5392ms |
| الوسيط | **4666ms** | **4885ms** |

### عودة دافئة

أُرسل التطبيق إلى Home ثم أعيد فتح launcher intent. أعاد النظام مهمة
`MainActivity` القائمة وصنف الحالة `UNKNOWN (0)`، لذلك لم يقدم `TotalTime`؛
قيم `WaitTime` هي: 559، 268، 1764، 484، 156ms، والوسيط **484ms**.

## القياسات غير المتاحة بعد

| المؤشر | الحالة | المطلوب |
|---|---|---|
| ضغط تشغيل الصوت → أول صوت | غير مقاس | trace يبدأ من نية المستخدم وينتهي عند أول frame صوتي، ثم اختبار على جهاز حقيقي وشبكة مضبوطة |
| crash-free users/sessions | غير متاح محليًا | وصول read-only إلى Firebase Crashlytics مع نطاق زمني وإصدار محددين |
| Android vitals ANR | غير متاح محليًا | وصول read-only إلى Play Console وتثبيت الإصدار والنطاق الزمني |

لا تُنسخ أرقام لوحات الإنتاج إلى الخطة؛ عند توفر الصلاحية يضاف رابط dashboard
والـquery window هنا. تبقى بوابة المرحلة 0 مفتوحة إلى أن تكتمل هذه المؤشرات.
