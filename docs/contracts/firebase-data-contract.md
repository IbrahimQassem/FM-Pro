# Firebase and data contract

الحالة: ملزم
المالك: Firebase data and security role

## البيئة والمسارات

التطبيق مرتبط حاليًا ببيئة Development فقط، والجذر canonical هو `HudHudDev`:

```text
HudHudDev/stations/stations/{stationId}
HudHudDev/banners/banners/{bannerId}
HudHudDev/users/users/{uid}
HudHudDev/locations/locations/{locationId}
HudHudDev/programs/programs/{programId}
HudHudDev/episodes/episodes/{episodeId}
HudHudDev/episodes/episodes/{episodeId}/comments/{commentId}
```

`lib/core/config/firestore_paths.dart` هو المالك التنفيذي للمسارات. لا تبني path
كسلسلة داخل feature ولا تضف fallback إلى جذور legacy. إدخال environments أو
flavors متعددة يحتاج قرارًا يحدد الفصل، package IDs، configs وقواعد النشر.

## سياسة القراءة والتخزين

- القراءة العامة للمحتوى read-only. الكتابتان الوحيدتان من العميل هما إنشاء ملف
  المستمع عند التسجيل وإضافة تعليق؛ كلاهما محمي بقواعد واختبارات emulator.
- يبدأ Home بقراءة `Source.cache`، ثم يطلب `Source.server` عند الفتح والتحديث.
- لا يوجد snapshot listener دائم. إضافته يحتاج lifecycle وتكلفة وoffline policy.
- التعليقات استثناء محدد: listener لحظي حتى 100 تعليق يعمل فقط أثناء شاشة
  تعليقات الحلقة ويُلغى بواسطة `autoDispose` عند مغادرتها.
- فشل cache الأول متوقع، وفشل server يعرض cache كـoffline إن كانت صالحة.
- فشل banners أو locations لا يمنع عرض stations.
- كل batch يعيد items غير قابلة للتعديل وعدد السجلات المرفوضة ومصدر cache.
- المستند المخالف يُرفض منفردًا ولا يسقط المجموعة كلها، ولا تظهر قيم تقنية خام.

## Station schema

المعرف هو Firestore document ID غير الفارغ. الحقول الإلزامية:

```text
name, streamUrl,
countryCode, countryNameAr,
cityCode, cityNameAr,
priority,
isLive, isActive, isVerified, isFeatured,
stats.programsCount, stats.subscribersCount, stats.totalPlays
```

الحقول الاختيارية صحيحة النوع عند وجودها:

```text
nameEn, tagline, description, backupStreamUrl,
logoUrl, thumbnailUrl, frequency
```

- `streamUrl` و`backupStreamUrl` يقبلان HTTP أو HTTPS لأن بعض محطات البث legacy.
- image URLs تقبل network URLs المصرح بها في mapper الحالي؛ لا تُعرض قيمة فاسدة.
- counters أعداد غير سالبة، والـflags الإلزامية لا تملك defaults مخفية.
- تعرض المحطات النشطة فقط، وترتب featured ثم priority ثم الاسم.

## Location schema

```text
countryCode, countryNameAr,
cityCode, cityNameAr,
sortOrder, isActive
```

الـfilter يأخذ المدن النشطة من هذه المجموعة فقط، ويعرض مدينة عندما توجد محطة
يمنية تحمل `cityCode` نفسه. لا يُنشأ filter من نص محطة غير موجود في المرجع.

## Banner schema

```text
title, imageUrl, targetType, targetId, targetUrl,
priority, isActive, startAt?, expiresAt?
```

`imageUrl` و`targetUrl` عند وجوده HTTPS، وتطبق نافذة البداية والانتهاء محليًا.
التنقل الناتج من `targetType` غير منفذ بعد ولا يجوز تخمينه.

## User projection

- المستخدم غير الموثق ينتج `AppUser.guest` بلا UID أو بيانات مصطنعة.
- عند وجود Firebase Auth، تقرأ وثيقة UID مباشرة.
- فشل الوثيقة أو غياب الاسم يعود إلى بيانات Auth الآمنة ثم guest.
- projection الحالي: `uid`, `displayName`, `username`, وHTTPS `avatarUrl` فقط.
- لا تمرر document map أو token أو email أو phone إلى UI دون عقد جديد.
- البريد يظهر داخل شاشة الحساب من Firebase Auth فقط، ولا يكتب في Firestore ولا
  يمر إلى Home أو التعليقات.

## Listener profile write schema

ينشئ التطبيق الوثيقة `users/{uid}` مرة واحدة بعد نجاح إنشاء Auth:

```text
displayName, username, avatarUrl, isActive=true, role=listener,
createdAt, updatedAt
```

لا يسمح العميل بتغيير الدور أو الحالة أو تحديث الوثيقة في هذه المرحلة. فشل
إنشاء الوثيقة بعد Auth يؤدي إلى محاولة حذف الحساب الجزئي ولا يُخفى كنجاح.

## Comment schema

```text
episodeId, authorId, authorName, content, createdAt, isEdited=false
```

- `content` بعد trim من 1 إلى 1000 حرف.
- `authorId` يساوي UID، و`authorName` يطابق ملف المستخدم النشط وفق Rules.
- القراءة عامة؛ الإنشاء لمستمع موثق نشط؛ التعديل والحذف للمشرف فقط حاليًا.
- لا يكتب العميل `stats.commentsCount`، ولا توجد likes للتعليقات في هذه المرحلة.

## Program schema

الحقول الإلزامية:

```text
stationId, title, priority, isActive, isFeatured,
stats.episodesCount, stats.subscribersCount, stats.totalPlays
```

الحقول الاختيارية صحيحة النوع: `titleEn`, `description`, `coverUrl`,
`thumbnailUrl`, `categories`, `presenters`, و`schedule`. عند وجود الجدول تلزم
`weekdays`, `startMinute`, `endMinute`, `utcOffsetMinutes`. روابط الصور HTTPS فقط.
تفاصيل قواعد الجدول والفرز في `station-content-contract.md`.

## Episode schema

```text
programId, stationId, title, audioUrl, durationSeconds, priority,
isPublished, isFeatured, broadcastAt, utcOffsetMinutes,
stats.playsCount, stats.likesCount, stats.commentsCount
```

الحقول الاختيارية: `description`, `coverUrl`, `presenter`, `guest`, `publishedAt`.
`broadcastAt` و`publishedAt` عند وجوده Firestore Timestamp، وروابط الصوت والصور
HTTPS فقط. القراءة فقط؛ لا يكتب التطبيق counters.

## تغيير schema

أي حقل أو collection أو index جديد يحتاج mapper واختبارات valid/invalid وتحديث
هذا العقد في التغيير نفسه. migrations والإصلاحات الجماعية أدوات إدارية خارج
التطبيق، مع dry-run وrollback وتفويض مستقل.

## Development demo seed

- `tool/firebase_seed/development_seed.json` هو سيناريو العرض canonical الوحيد.
- يلزم قبل الاتصال تحقق metadata وIDs والعلاقات station/program/episode/comment/
  user، ومطابقة counters للعلاقات، وصحة التواريخ.
- full وcontent-only يستخدمان `create` داخل batch ذري؛ لا upsert ولا overwrite.
- content-only يشتق عدادات المحطات من البرامج ولا يحتوي IDs مكتوبة يدويًا.
- مستخدمو seed projections لعرض كتّاب التعليقات فقط، وليسوا Auth credentials.
- تشغيل apply أو نشر Rules أو إرسال FCM يحتاج تفويضًا خارجيًا مستقلًا.
