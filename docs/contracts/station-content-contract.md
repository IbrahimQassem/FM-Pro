# Station content contract

الحالة: ملزم
المالك: Station content role

## الحدود

```text
StationDetails/ProgramDetails widgets
  -> StationContentController + immutable StationContentState
  -> StationContentRepository
  <- FirebaseStationContentRepository
  <- StationContentFirestoreDataSource
  <- HudHudDev/programs + HudHudDev/episodes
```

- شاشة تفاصيل المحطة تملك تبويبات البرامج والجدول وعن المحطة.
- تفاصيل البرنامج تستقبل البرنامج وحلقاته المحملة لنفس المحطة ولا تبدأ قراءة
  Firestore إضافية.
- تشغيل الحلقة يمر عبر `StationPlayerController` واللاعب المشترك نفسه؛ لا يوجد
  player أو provider صوتي ثانٍ.

## القراءة والحالة

- القراءة حسب `stationId` فقط، ثم الفرز محليًا لتجنب index مركب في هذه المرحلة.
- يبدأ controller بمحاولة cache ثم server، بلا snapshot listener دائم.
- فشل cache الأول متوقع. cache الصالح يبقى ظاهرًا كـoffline إذا فشل server.
- المستند المخالف يرفض منفردًا، ولا تعرض قيم schema أو URLs في رسالة المستخدم.
- البرامج غير النشطة والحلقات غير المنشورة لا تظهر.

## الجدول

- `weekdays` يستخدم ترقيم Dart/ISO: الاثنين 1 حتى الأحد 7.
- البرنامج بلا `schedule` يبقى ظاهرًا في قائمة البرامج ولا يظهر في تبويب الجدول.
- `startMinute` ضمن 0..1439، و`endMinute` أكبر منه وحتى 1440؛ لا تدعم الفترة
  العابرة لمنتصف الليل في هذا الإصدار.
- `utcOffsetMinutes` جزء صريح من المستند؛ بيانات اليمن تستخدم 180.
- الحالة `live/next/upcoming/ended` تحسب بقواعد domain. نافذة `next` ثلاث ساعات.
- تغيير يوم الجدول محلي في state ولا يعيد طلب الشبكة.

## الحلقات والتشغيل

- ملفات الحلقات والصور HTTPS فقط. لا يسجل `audioUrl` ولا يظهر في الأخطاء.
- تاريخ الحلقة يعرض بعد تطبيق `utcOffsetMinutes` الخاص بها، ولا يعتمد على timezone
  جهاز المستمع.
- تشغيل حلقة يوقف/يستبدل المصدر الحالي ويعرض عنوان الحلقة واسم المحطة في جلسة
  الوسائط. أزرار التطبيق والإشعار تتحكم في نفس اللاعب.
- لا كتابة لإحصاءات الاستماع أو الإعجاب أو التعليقات في هذا الإصدار.
- تنزيل الحلقات والمشاركة والتعليقات والتفاعل خارج النطاق.

## التحقق

- mapper valid/invalid لكل نوع وتوقيت Firestore حقيقي في الاختبار.
- domain tests لحالات الجدول وحدود المنطقة الزمنية.
- controller tests لـserver/cache/offline/error واختيار اليوم.
- widget tests للتنقل من البرنامج ولتشغيل الحلقة وحالات الفراغ والخطأ.
