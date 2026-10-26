# Firebase and data contract

الحالة: ملزم
المالك: Firebase data and security role

## البيئة والمسارات

قرار حدود الحساب والبيئة: [ADR 0002](../decisions/0002-store-release-boundaries.md).
الجذران يشتركان في Auth؛ حذف الحساب ينظف بياناته في كليهما قبل حذف الهوية.


يدعم التطبيق جذرين رسميين معتمدين: جذر الإنتاج `HudHudOfficial` لإصدارات المتاجر الحية، وجذر التطوير `HudHudDev` لبيئات التجارب والفحص:

```text
{root}/stations/stations/{stationId}
{root}/stationPrivate/stations/{stationId}
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
logoUrl, thumbnailUrl, frequency,
websiteUrl, facebookUrl, instagramUrl, youtubeUrl, twitterUrl, whatsapp
```

- `streamUrl` و`backupStreamUrl` يقبلان HTTP أو HTTPS لأن بعض محطات البث legacy.
- روابط المواقع وشبكات التواصل `websiteUrl` و`facebookUrl` و`instagramUrl` و`youtubeUrl` و`twitterUrl` و`whatsapp` معلومات عامة أساسية للمستمعين تظهر في التطبيق.
- حقول المراجع والإدارة `owner` و`address` و`contactPerson` و`contactPhone` و`contactEmail` بيانات مرجعية داخلية مخصصة لإدارة المحطة ولوحة الإدارة `web_admin` وتصدير إكسل لـ Super User فقط، ويتجاهلها تطبيق Flutter.
- حقول المواصفات الفنية للبث والشبكة وأجهزة الإرسال `streamType` و`audioCodec` و`bitrateKbps` و`sampleRateHz` و`transmitterPower` و`transmitterLocation` و`coverageArea` و`rds` بيانات فنية تشغيلية لإدارة المحطات ولوحة الإدارة `web_admin` وتصدير إكسل لـ Super User فقط، ويتجاهلها تطبيق Flutter.
- image URLs تقبل network URLs المصرح بها في mapper الحالي؛ لا تُعرض قيمة فاسدة.
- counters أعداد غير سالبة، والـflags الإلزامية لا تملك defaults مخفية.
- تعرض المحطات النشطة فقط، وترتب featured ثم priority ثم الاسم.

## Station privacy amendment — C01, 2026-10-25

This amendment defines the implementation target for WO-01/R01 and R10; it does
not assert deployment, migration completion or closure of either finding. It
supersedes only the former placement of internal station fields in the public
station document. Existing public playback, geography, relationships and counters
retain their contracts; no new dependency or client architecture is introduced.

### Private station document

For each known root (`HudHudDev` or `HudHudOfficial`), the optional one-to-one
private document is `{root}/stationPrivate/stations/{stationId}`. Its ID is the
existing public station ID, never a newly generated station identity. No private
field below may occur in `{root}/stations/stations/{stationId}`, including empty
values. Public stream/backup URLs, social links and other public fields remain
public. The internal-field descriptions above refer to this private document.

```text
owner, address, contactPerson, contactPhone, contactEmail,
streamType, audioCodec, bitrateKbps, sampleRateHz,
transmitterPower, transmitterLocation, coverageArea, rds
schemaVersion: 1
revision: positive safe integer
```

All 13 editable private values retain the existing validated string type and trim
normalization, including bitrate/sample-rate values; this amendment does not
introduce numeric conversion. Empty string is a stored value, not field deletion.
`schemaVersion` and `revision` are server-owned, rejected in editable payloads.
Revision starts at 1 on first creation and increases exactly once for each
committed private-field change. An empty private document retains its metadata to
avoid revision reuse; eligible station deletion removes both documents atomically.
If the public station is absent but a private orphan exists, creation fails closed
and an ordinary public-absent delete leaves the orphan unchanged for separately
reviewed repair; it must not blindly delete metadata.
Public-only and exact no-op saves do not increase private revision. Unsupported
schema, invalid revisions and conflicting legacy copies stop without overwrites.

### Compatible callable save protocol

Keep `adminSaveContent` and its existing `root,kind,id,content,expected,locationId,
source` request and `success,id,action` response. For `kind: stations` only, add:

- `expectedPrivateRevision`: optional; explicit `null` means no private document,
  otherwise a positive safe integer matching the transaction read.
- `deletePrivateFields`: optional array of unique names from the 13-field set.
  Reject unknown/duplicate names and a name present in both this array and
  `content`. Explicit deletion requires a private precondition; `null` values
  are invalid. Other content kinds reject these station-only options.

`content` continues to accept the existing mixed editable station shape. Partition
it on the server before building public writes. Capture actual key presence before
normalization: omission preserves a private value, an included string sets it,
and `deletePrivateFields` removes it. Required public fields and all existing
public validation remain unchanged. Do not turn the public snapshot API into an
unrestricted partial-update API. Compare `expected` against the current normalized
public editable projection, stripping only these 13 private fields from both
sides. Retain the existing create (`expected: null`) versus update distinction.

For an existing station, any requested private change requires an explicit matching
`expectedPrivateRevision`; absence is not an instruction to reset or overwrite.
An older client with no private precondition may save public changes only when
its supplied private values equal the authoritative private values; omitted keys
are preserved. Stale values, default blanks that differ, or new private values
fail with a safe `failed-precondition` reload/upgrade error and zero writes. For
new station creation, an older mixed request with `expected: null` may create both
projections atomically only when both documents are absent; an orphan private
document is a conflict. New clients send explicit `expectedPrivateRevision: null`.
An authenticated exact-state retry may return `unchanged` despite stale expected
values only when the complete effective public and private desired states equal
the current canonical states, no legacy public keys need scrubbing, and no deletion
or schema conflict exists. Never use public equality alone for this exception.
A real private mutation requires the matching private precondition.

Read the public/private documents and relation/identity prerequisites before any
transaction writes. Validate public and private preconditions before mutation; permit only the
exact-state retry exception above before returning `unchanged`. Keep current authorization: station saves remain super-admin-only;
this amendment grants no new scoped-admin station-edit permission. Reject forged
private or mixed payloads atomically. Preserve current permissions for unrelated
public program/episode operations. Admin SDK bypasses Rules, so enforce these
checks inside the callable as well as the client UI.

On a transitional legacy station, resolve the 13-field preimage before saving:
when no private document exists, use the validated legacy private projection as
the initial private state; when both copies exist, identical overlaps are safe
and differing overlaps are a conflict requiring reviewed migration resolution.
When a canonical private document exists, any legacy-only private key absent
from it is also a conflict: never merge or drop it without an explicit reviewed
migration resolution, even when all overlapping keys match.
A successful authorized save preserves/moves the resolved private state and
removes every legacy public private key in the same transaction, even if editable
values are unchanged. Public cleanup is an `update`, not an early no-op. Preserve
relation/counter/identity/audit atomicity, and never copy private values into audit
summaries, exceptions or logs. Retry must not duplicate committed changes.

### Station deletion preconditions

For `adminDeleteContent` with `kind: stations` only, accept
`expectedPrivateRevision` with the same null/positive-integer semantics as save.
Read public and private documents in the same transaction, preserve the existing
public expected-snapshot check after stripping only the 13 private keys from both
current and legacy/mixed expected snapshots, and preserve relation/deletion guards.
If a canonical private document exists, its matching revision is mandatory; an
older delete request lacking that precondition fails closed rather than deleting
unseen metadata. An explicit null requires private absence. An older request with
no private precondition may proceed only when private absence is verified in the
transaction and the public precondition is valid. Legacy private-key conflicts
obey the save conflict policy; unresolved legacy metadata is not silently discarded.
An eligible deletion removes both existing projections atomically. A missing
public station leaves any orphan private document unchanged for separately
reviewed repair. These options confer no permission on non-super-admin callers.
The admin delete helper `web_admin/lib/delete-episode.ts` must transmit the station
private precondition; other resource deletion semantics remain unchanged.

### Reads and listener email

Private get/list is super-admin-only for client SDKs, with bounded page/ID reads
for editing/export. Every direct client create/update/delete is denied, including
super-admin clients. All other roles, unknown roots and unauthenticated callers
are denied. The parent `stationPrivate` document grants no additional access.
Admin export reads this authorized private source; it never falls back to public
legacy fields. Read failure must not become an empty form that overwrites data.

Listener projections at `{root}/users/users/{uid}` must not contain `email`.
Client profile create/update Rules reject a resulting document containing the
`email` key (including null/empty values), even for super-admin clients; an
otherwise-authorized update that removes the key is allowed. Validate resulting
state, not merely changed fields. This does not grant new profile-write rights.
Auth remains the identity/email authority; bootstrap, subscriptions, password
management and both legacy migration paths must not copy it. Admin profile
lists/search/name fallbacks use UID/name, not profile email. Do not derive a new
fallback from email, and preserve existing user-provided displayName without a
blind scrub. No replacement
other-user Auth-email endpoint is authorized. Preserve the explicitly authorized
private, expiring email-verification challenge and its existing lifecycle. This
is not an Auth-email deletion or an administrative `actorEmail` audit-policy change.

Writer coverage, deployment ordering, backup retention and conditional recovery
are specified in [station privacy migration](../operations/station-privacy-migration.md).
R01 remains open until both roots have verified clean public projections and all
writers are safe; a private-path Rules test alone is insufficient.

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

Managed direct partnerships use the separate private collections and callable v1
defined in [advertising-contract.md](advertising-contract.md). They do not add
commercial agreement data or measurements to the legacy public banner documents.

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
- تستدعي اللوحة `adminReviewReport`؛ تغيير حالة التعليق أو تعطيل الحساب وحسم
  البلاغات المرتبطة يتم في معاملة خادمية واحدة، مع تحديث عداد التعليقات عند
  خروج تعليق منشور من العرض. لا تقبل Rules قرار إشراف مباشرًا من أي عميل.
- يتطلب مدير المحطة/المشرف المحدود ملكية محطة الحلقة الفعلية. تعطيل الحساب
  للمشرف العام فقط. يحفظ الخادم هوية المراجع ووقته، ويحد الاستعلام إلى451
  بلاغًا ويمنع العملية عند تجاوز450 دون تعديل جزئي.

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

## Location cleanup maintenance — November 2026

`tool/remove_old_locations.mjs` requires an explicit project and one root and
defaults to dry-run. A reviewed version-1 report contains typed snapshots of
unreferenced, noncanonical locations; apply verifies an independently persisted
backup before deletion and rechecks current values and station references in
each transaction. A bounded invocation changes at most 25 locations by default
(explicit `--max-items` accepts 1..100).

Private server-owned checkpoints live at
`{root}/locationCleanup/runs/{runId}/items/{locationId}` with `state` equal to
`deleted` or `restored` and server timestamp `at`. Default Rules deny clients
access, including admins. The checkpoint, deletion/restoration, and catalog
identity-revision increment are atomic. The same reviewed report resumes a
partial run; restore creates only absent records with a matching deletion
checkpoint and never overwrites a location. Restored runs cannot be reapplied;
a fresh preview produces a new run identity. This does not authorize live runs.

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


## Administrative editorial image uploads

`adminUploadImage` accepts only explicit root/kind/image field, parent/current
record context, a UUID operation ID and base64 JPEG/PNG/WebP. Authenticated admin
claims and existing super/scoped roles are checked, including actual stored
ownership, parents and deletion barriers. Only processed media is saved. Limits,
WebP/JPEG notification compatibility, private job/quota paths, reuse semantics and
bounded failed-upload cleanup are in [admin image operations](../operations/admin-images.md).
URL fields and their trusted content-save path stay canonical; uploads do not
create content records or notification broadcasts. Direct SDK Storage writes and
client metadata/quota reads/writes remain denied.
