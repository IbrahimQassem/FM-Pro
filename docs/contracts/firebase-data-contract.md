# Firebase and data contract

الحالة: ملزم
المالك: Firebase data and security role

## البيئة والمسارات

قرار حدود الحساب والبيئة: [ADR 0002](../decisions/0002-store-release-boundaries.md).
الجذران يشتركان في Auth؛ حذف الحساب ينظف بياناته في كليهما قبل حذف الهوية.


يدعم التطبيق جذرين رسميين معتمدين: جذر الإنتاج `HudHudOfficial` لإصدارات المتاجر الحية، وجذر التطوير `HudHudDev` لبيئات التجارب والفحص:

```text
{root}/stations/stations/{stationId}
{root}/banners/banners/{bannerId}
{root}/users/users/{uid}
{root}/users/users/{uid}/agreements/ugc
{root}/users/users/{uid}/blockedUsers/{blockedUid}
{root}/users/users/{uid}/commentReportEpisodes/{episodeId}/moderationReports/{commentId}
{root}/users/users/{uid}/userReportTargets/{reportedUid}/moderationReports/{sourceCommentId}
{root}/users/users/{uid}/favorites/{favoriteId}
{root}/users/users/{uid}/subscriptions/{subscriptionId}
{root}/locations/locations/{locationId}
{root}/programs/programs/{programId}
{root}/episodes/episodes/{episodeId}
{root}/episodes/episodes/{episodeId}/comments/{commentId}
{root}/accountDeletionRequests/requests/{uid}
{root}/emailVerificationChallenges/challenges/{uid}
{root}/emailVerificationRateLimits/emails/{emailHmac}
```
حيث يكون `{root}` إما `HudHudOfficial` أو `HudHudDev`.

`lib/core/config/firestore_paths.dart` هو المالك التنفيذي للمسارات. لا تبني path
كسلسلة داخل feature ولا تضف fallback إلى جذور legacy. وتتكفل قواعد Firestore Rules
بالتحقق من مطابقة الجذر لأحد الجذور المعتمدة `isKnownRoot(root)`، والسماح بالمشاركة في UGC فقط بعد توثيق البريد من Firebase Auth، دون اعتبار
مزود الدخول وحده دليلًا على ملكية البريد.


## سياسة القراءة والتخزين

- القراءة العامة للمحتوى read-only. ملف المستمع ينشأ من Cloud Function فقط بعد
  توثيق البريد. كتابات العميل المحددة هي قبول شروط UGC، وإضافة تعليق، والإبلاغ
  عن تعليق أو مستخدم، وإدارة قائمة
  الحظر والمفضلة والاشتراكات؛ جميعها محمية بقواعد واختبارات emulator.
- يبدأ Home بقراءة `Source.cache`، ثم يطلب `Source.server` عند الفتح والتحديث.
- لا يوجد snapshot listener دائم. إضافته يحتاج lifecycle وتكلفة وoffline policy.
- التعليقات استثناء محدد: listener لحظي حتى 100 تعليق يعمل فقط أثناء شاشة
  تعليقات الحلقة ويُلغى بواسطة `autoDispose` عند مغادرتها.
- فشل cache الأول متوقع، وفشل server يعرض cache كـoffline إن كانت صالحة.
- فشل banners أو locations لا يمنع عرض stations.
- كل batch يعيد items غير قابلة للتعديل وعدد السجلات المرفوضة ومصدر cache.
- المستند المخالف يُرفض منفردًا ولا يسقط المجموعة كلها، ولا تظهر قيم تقنية خام.

## Email verification challenge schema

```text
email, displayName, codeHash, status, attemptsRemaining,
expiresAt, resendAvailableAt, sendWindowStartedAt, sendCount,
createdAt, updatedAt, consumedAt?
```

- المسار خادمي بالكامل؛ Firestore Rules تمنع كل قراءة وكتابة من العميل حتى
  لصاحب UID.
- `codeHash` هو HMAC يربط UID والرمز بـpepper خادمي، ولا يخزن الرمز الصريح.
- يطبق مسار `emailVerificationRateLimits` حد الإرسال نفسه على HMAC للبريد عبر
  الحسابات المختلفة لمنع إساءة الإرسال، ولا يخزن البريد أو يسمح بوصول العميل.
- نجاح التحقق يحدث `emailVerified` في Firebase Auth وينشئ ملف المستمع canonical
  ثم يحذف challenge بشرط تطابق معرّف العملية. إعادة المحاولة بعد فشل جزئي
  تستأنف الإثبات المستهلك عبر `ensureAccountProfile` دون إعادة قبول الرمز.
- يحتفظ الخادم بالتحدي المنتهي أو المقفل لأغراض التنظيف فقط. بعد 30 يومًا تحذف
  مهمة يومية حساب Auth غير الموثق والتحدي إذا لم يوجد ملف مستمع؛ وتحذف التحدي
- حالة التوثيق المعتمدة في Firebase Auth هي المرجع الوحيد للكتابات الشخصية وUGC.
  لا ترفع Cloud Function الحساب إلى موثق لمجرد وجود مزود اجتماعي.



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

Optional internal field `adminRelationRevision` is incremented atomically by
admin station saves using a location. Location edits read that document before
querying dependent stations and update their copied country/city fields in the
same transaction (up to 450 stations). The revision forces a retry when a station
is created concurrently. Flutter ignores this metadata; it is not a station
count or an editable field. Other administrative writers must preserve this
protocol when modifying station location relationships.

Admin location saves also read and increment `adminIdentityRevision` on the
private parent document `{root}/locations` in the same transaction. After reading
that document, they query country/city code matches and reject any other location
with the same pair. Concurrent creates and renames therefore retry the uniqueness
check. Existing location IDs remain unchanged. Only admins can get/create/update
this parent document; public location collection reads do not expose it. Deploy
the matching Rules before this admin workflow. Administrative seed/import writers
must follow the same protocol or run without concurrent location editing.

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
- projection الحالي: `uid`, `displayName`, `username` و`avatarUrl` من HTTPS أو
  أحد أصول الماسكوت الأربعة المعتمدة.
- لا تمرر document map أو token أو email أو phone إلى UI دون عقد جديد.
- البريد يظهر داخل شاشة الحساب من Firebase Auth فقط، ولا يكتب في Firestore ولا
  يمر إلى Home أو التعليقات.

## Listener profile write schema

ينشئ الخادم الوثيقة `users/{uid}` مرة واحدة بعد توثيق البريد:

```text
displayName, username, avatarUrl, isActive=true, role=listener,
createdAt, updatedAt
```

لا يسمح العميل بتغيير الدور أو الحالة أو إنشاء الوثيقة مباشرة. تحديث الاسم
والصورة المعتمدة يمر عبر callable خادمي يتحقق من الملكية وحالة الحساب؛ لا يخفى
فشل الحفظ كنجاح. صور الماسكوت الأربعة المضمنة وHTTPS هي القيم المقبولة؛
مسارات ملفات الجهاز مرفوضة.

## Comment schema

```text
episodeId, authorId, authorName, content, createdAt, isEdited=false,
status=published|hidden|removed
```

- `content` بعد trim من 1 إلى 1000 حرف.
- `authorId` يساوي UID، و`authorName` يطابق ملف المستخدم النشط وفق Rules.
- القراءة العامة مقيدة باستعلام `status=published`؛ لا تسمح Rules بقراءة
  `hidden` أو `removed`. الإنشاء لمستمع نشط بعد قبول شروط UGC الحالية، وتغيير
  الحالة للمشرف فقط.
- لا يكتب العميل `stats.commentsCount`، ولا توجد likes للتعليقات في هذه المرحلة.

## UGC agreement schema

الوثيقة الثابتة `users/{uid}/agreements/ugc`:

```text
termsVersion, acceptedAt
```

- يقرأ المالك وثيقته، ويستطيع المشرف قراءتها للتدقيق.
- ينشئ المالك الوثيقة أو يحدثها فقط إلى الإصدار الحالي وبوقت الخادم.
- لا يرسل العميل UID أو email أو نص الشروط داخل الوثيقة.
- Rules تتحقق من الإصدار قبل إنشاء كل تعليق؛ إخفاء المحرر في UI ليس صلاحية.
- الإصدار التنفيذي الحالي `2026-09-01` ويجب تحديث Dart وRules والعقد معًا عند
  تغيير جوهري في شروط المشاركة.

## Moderation report schema

بلاغ التعليق وثيقة حتمية في
`users/{uid}/commentReportEpisodes/{episodeId}/moderationReports/{commentId}`،
وبلاغ المستخدم وثيقة حتمية في
`users/{uid}/userReportTargets/{reportedUid}/moderationReports/{sourceCommentId}`.
يمنع ذلك تكرار البلاغ عن السياق نفسه، ويسمح ببلاغ جديد عند وجود تعليق جديد:

```text
targetType=comment|user, episodeId, commentId, reportedAuthorId,
reason=harassment|hate|sexualContent|violence|spam|privacy|other,
details, status=open, createdAt
```

- لا يبلّغ المستخدم عن نفسه أو تعليقه، وتتحقق Rules من وجود تعليق سياق منشور
  ومطابقة مؤلفه.
- `details` اختيارية بحد 500 حرف ولا ينسخ التطبيق نص التعليق أو البريد إلى البلاغ.
- المالك ينشئ البلاغ ويقرأ وثيقته فقط؛ لا يسرد البلاغات ولا يعدلها أو يحذفها.
- المشرف يسرد `moderationReports` كـcollection group ويغلق البلاغ بإضافة
  `status=resolved|dismissed` و
  `resolution=commentHidden|commentRemoved|userDisabled|noAction`,
  و`reviewedAt` بوقت الخادم و`reviewedBy` المطابق لهويته.
- تغيير حالة التعليق أو تعطيل الحساب وحسم البلاغات المرتبطة يتم في batch واحد
  من لوحة الإدارة، مع تحديث عداد التعليقات عند خروج تعليق منشور من العرض.

## Blocked user schema

الوثيقة `users/{uid}/blockedUsers/{blockedUid}`:

```text
blockedUserId, createdAt
```

- المالك فقط ينشئ الحظر أو يحذفه، ولا يستطيع حظر نفسه أو إضافة حقول خاصة.
- تحمل الشاشة قائمة الحظر عند فتحها أو تغير الحساب، وتخفي كل تعليق يطابق مؤلفه.
- الحظر شخصي ولا يحذف التعليق ولا يؤثر في تجربة مستخدم آخر.
- الحساب ذو `isActive=false` لا يستطيع إنشاء حظر أو بلاغ أو موافقة أو مفضلة أو
  اشتراك جديد، ولا يستطيع إضافة تعليق.

## Account deletion

الدالة callable باسم `deleteAccountData` تتطلب Firebase Auth ومصادقة حديثة خلال
خمس دقائق. تعطل ملف المستمع أولًا، ثم تحذف تعليقاته وتعيد احتساب عدادات الحلقات،
وتزيل البلاغات والحظر المرتبطين به، وتحذف ملفه وكل مجموعاته التابعة، ثم تحذف
Firebase Auth أخيرًا. وثيقة العمل المؤقتة تحت
`accountDeletionRequests/requests/{uid}` تحفظ معرّفات الحلقات لضمان استئناف آمن
إذا فشل التنفيذ بين الخطوات، ولا يقرأها العميل.

تحتاج الاستعلامات الخادمية فهارس collection-group للحقول `comments.authorId`،
`moderationReports.reportedAuthorId` و`blockedUsers.blockedUserId`. يجب نشر
`firestore.indexes.json` قبل نشر الدالة.

## Favorite schema

المسار تابع للمستخدم ولا يحتوي UID مكررًا داخل الوثيقة:

```text
targetType=station|program|episode, targetId, createdAt
```

- القراءة والإنشاء والحذف للمالك فقط، أو للمشرف للمراجعة والإدارة.
- لا تعديل من العميل؛ تغيير الهدف يعني حذف المفضلة وإنشاء واحدة جديدة.
- يمنع تخزين البريد أو token أو بيانات خاصة داخل الوثيقة.

## Subscription schema

```text
targetType=station|program, targetId,
notificationsEnabled, isActive, createdAt, updatedAt
```

- المالك يدير اشتراكاته فقط، والمشرف يستطيع القراءة والإدارة.
- `createdAt` ثابت بعد الإنشاء و`updatedAt` يساوي وقت الطلب في تحديث العميل.
- الاشتراك تفضيل محتوى وإشعار، وليس عقد دفع أو اشتراك مالي.

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
- قبل تشديد Rules على بيئة تحتوي تعليقات قديمة، شغّل
  `npm run comments:status:dry` ثم `comments:status:apply` بتفويض مستقل لإضافة
  `status=published` للتعليقات التي لا تملك حالة.


## Admin episode deletion

`web_admin` places a temporary server-authorized `adminDeletionToken` on an episode
before querying its comments. Rules reject new comments when the episode is absent
or this marker is present. A transaction then verifies the unchanged episode and
marker, deletes the episode and decrements its program counter together. Existing
comments block deletion; operators can unpublish that episode instead. Failure
clears only the calling attempt's marker. A later attempt can recover an interrupted
operation without recreating an absent episode or decrementing its counter twice.

Deploy the matching Rules before releasing the updated deletion UI. The marker is
operational metadata, never an editable content field. Direct administrative or
backend deletion tools must use the same guard when listeners can write comments.
The demo-only `npm run emulators:admin` suite exercises both roots, retries,
concurrent deletion attempts and concurrent comment creation.


## Profile image storage lifecycle

Verified active listeners may send `imageBase64` instead of `avatarUrl` to
`updateAccountProfile`. The callable validates/re-encodes JPEG/PNG, limits input to
1 MB and 16 million pixels, and returns the existing `{updated: true}` contract.
The profile receives `avatarUrl`, `avatarUploadId`, `avatarStoragePath` and a
server-owned `lastImageUploadAt` rate-limit timestamp. The two roots share Auth
but have distinct image paths: `{root}/profile-images/{uid}/{uploadId}.jpg`.

`{root}/profileImageUploads/uploads/{uploadId}` is private server-owned cleanup
state (`uid`, `root`, `objectPath`, `state`, `createdAt`, `settleAt`, `dueAt`). Client
Firestore access is denied, including admin clients. Finalization checks both
account-deletion barriers and the upload job in a transaction. The hourly
collector reserves deletion before touching an unreferenced object; it cannot
race a finalization into referencing that object. Referenced images are retained,
including for moderated inactive profiles, until replaced or the account is deleted.
Deletion tombstones survive the callable lifetime and are removed by a subsequent
successful cleanup pass. Storage SDK reads and writes are denied; image display
uses an unguessable, shareable HTTPS bearer URL from the backend. No device path,
original EXIF or original upload bytes are persisted.


## Station subscription development amendment — 2026-09-08

[ADR 0003](../decisions/0003-station-subscriptions-and-alerts.md) owns the station
follow flow, callable mutations, private device registrations, publication jobs,
retention, consent and allowlisted episode notification navigation. This supersedes
the earlier topic-only/no-payload-navigation boundary for version-1 episode alerts
only. General announcements remain independent; arbitrary URLs remain rejected.
Private device/job paths are denied by the default Rules, including admin clients.
No production deployment or app release is included.
