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

## B01 data amendment — C03/C04, 2026-10-26

This implementation target preserves C01 and the existing two-root identities.
It adds no dependency and authorizes no deployment or live data operation. The
C03 station-content amendment and ADR 0006 override conflicting earlier query,
comment-counter and fixed-Yemen alert descriptions only.

### C03 administration and query compatibility

- Admin resource pages return 50 items, reading at most 51 raw documents, with
  root/parent/status filters before limit and a complete stable order tuple plus
  document ID. Keep collection-group root bounds. Default document-ID order
  remains available; expose other global sort queries only after required field
  coverage and additive indexes are verified. Never label local page sorting as
  global order or silently drop legacy records missing an order field.
- Text search has two explicitly labeled modes: current loaded page and a
  user-started resumable dataset scan preserving the existing text predicate.
  Each explicit continuation examines at most 200 documents and retains at most
  100 visible result rows. Display examined and matched-so-far counts; only
  exhaustion establishes completeness. Cancel/filter/sort/root changes invalidate
  the scan identity. No unbounded archive accumulation or search dependency.
- Server-filter totals exclude arbitrary contains-text predicates and carry
  `asOf`; matched-so-far is not a total. The callable `adminGetUserCount` accepts
  exactly `{root: 'HudHudDev'|'HudHudOfficial'}` and returns only
  `{root, total: nonnegative safe integer, asOf: ISO-8601 UTC string}`. Use Firebase
  callable envelopes/errors unchanged. Require authenticated, verified, active
  administrative Auth and the existing trusted super-admin/station-admin/moderator
  role convention; never trust a request role. Only the root-level total is
  granted to scoped administrative roles, not profile get/list or breakdowns.
  Reject invalid root/extra keys, unauthenticated or non-administrative callers
  with existing invalid-argument/unauthenticated/permission-denied errors.
- Current-page export includes exactly that page. Full matching export freezes
  filters/root/sort and separately scans at most 200 documents/request, writing
  parts of at most 1,000 records before releasing memory. Provide progress,
  cancel/resume and a scope/count/completeness manifest. Never promise a fixed
  snapshot under concurrent writes. Use C01 authorized private projections only;
  failed private reads abort the export, never fall back to legacy public values.
- Relation hydration is page-only, using `in` chunks of at most 30 IDs. Account
  statistics never download listener profiles. Explicit server/cache source,
  opaque cursor identity, generation invalidation and direct-link checks follow
  the C03 station-content contract.


#### C03 B11 finite admin query whitelist — approved implementation refinement

For this implementation, the only dataset-wide admin order is document ID
ascending (`id_asc`), using full document paths for collection groups. The old
`newest` value maps compatibly to that order and must be labeled accurately;
it does not mean creation time. Retain `oldest` as reverse-current-page order,
and name/city/priority/statistics controls as explicitly current-page sorts.
Preserve their existing Arabic collation and missing-value fallbacks. Do not
add global date/name/priority/statistics order queries or corresponding indexes.

The following table is the exhaustive server-filter whitelist. Braces indicate
optional equality-filter combinations, not additional runtime query operators.
Every tuple appends `__name__ ASC`. Unfiltered queries order by `__name__ ASC`.
These are query shapes; reuse existing or automatic indexes where sufficient,
and add only exact necessary supported composite/collection-group indexes.

| Scope | Resource / collection group | Allowed equality sets | Ordered tuple when all filters present |
|---|---|---|---|
| COLLECTION | locations, stations, banners, users | `{}`, `{isActive}` | `isActive ASC, __name__ ASC` |
| COLLECTION | programs | `{}`, `{isActive}`, `{stationId}`, `{stationId,isActive}` | `stationId ASC, isActive ASC, __name__ ASC` |
| COLLECTION | episodes | `{}`, `{isPublished}`, `{programId}`, `{programId,isPublished}` | `programId ASC, isPublished ASC, __name__ ASC` |
| COLLECTION | notifications | `{}` | `__name__ ASC` |
| COLLECTION_GROUP | comments | `{}`, `{status}` | `status ASC, __name__ ASC` |
| COLLECTION_GROUP | moderationReports | `{}`, `{status}`, `{targetType}`, `{targetType,status}` | `targetType ASC, status ASC, __name__ ASC` |
| COLLECTION_GROUP | favorites | `{}` | `__name__ ASC` |
| COLLECTION_GROUP | subscriptions | `{}`, `{isActive}` | `isActive ASC, __name__ ASC` |

Boolean filters accept only true/false. Comment status accepts published,
hidden or removed; report status accepts open, resolved or dismissed; report
targetType accepts comment or user. Parent IDs use existing validated IDs.
Every collection-group shape preserves both current root name bounds before
cursor/limit: `>= doc(root, 'episodes')` and `< doc(root, 'users\uf8ff')`.
No feature/role/date/health predicates or arbitrary caller-supplied fields are
added to server queries. Features, roles and stream health remain explicit
current-page predicates, available over the full dataset through the bounded,
user-started scan. Preserve missing/unknown-role listener behavior and existing
healthy/stopped predicates; freeze health evaluation time for each scan.

Page identity includes version, root, resource, canonical server filters and
`id_asc`. Cursor payloads additionally contain the last consumed raw document
path, validated against the exact collection/group/root; reject mismatched or
malformed cursors. Read at most 51 raw documents, consume the first 50 and use
the last consumed raw document for continuation, even when mapping rejects it.
The lookahead document must not advance the cursor. An empty mapped page with
a continuation is not exhaustion. Filter/root changes invalidate cursor history
and stale completions. Later-page errors preserve prior successful content.

Scan/export traverse canonical ID ASC independently of presentation order.
Freeze the text/feature/role/server-filter/sort fingerprint and health evaluation
time; cancel or changed identity prevents stale commits. A scan examines at
most 200 raw documents per explicit continuation; exactly 200 means exhaustion
is still unknown until another explicit continuation. Hydrate only that batch's
relation IDs in chunks of at most 30, preserving relation-label search. Retain
at most 100 visible matches and report examined/matched-so-far counts until
exhaustion. Export uses independent bounded state, at most 1,000 rows per part,
C01 projections and an explicit completeness manifest; it does not globally
sort by a current-page presentation comparator. Page-only counts and filter
badges must identify their scope. The all-account aggregate must not be labeled
as active accounts. All existing C03 authorization, count, migration, rollback,
RED/GREEN, independent review and acceptance requirements remain unchanged.

### C04 private operational state

Every path below is private server state under one known root. All client roles,
including admin web SDK clients, are denied reads and writes. No raw URLs, comment
text, names, email, device tokens or raw errors are stored in these records.

| Path | Minimum purpose and invariants |
|---|---|
| `{root}/streamHealthJobs/checkpoints/active` | Schema version 1; last completed document ID/null, cycle and lease generation, owner and expiry. Compare lease generation/owner transactionally. Root state cannot regress or be shared between roots. |
| `{root}/commentCountContributions` | Schema version 1; paused/active cutover state, activation time and reviewed baseline manifest hash. Legacy baseline completeness from a bounded exhausted inventory of the frozen scope must precede initial activation. |
| `{root}/commentCountContributions/episodes/{episodeId}` | Schema version 1; building/active baseline generation, trustworthy episode create-time identity, checkpoint cursor, staged published count, reviewed manifest hash and owned lease. Partial baseline is never active. |
| `{root}/commentCountContributions/episodes/{episodeId}/contributions/{commentId}` | Schema version 1; episode identity/generation, published contribution 0 or 1 and fresh comment version needed for replay. No comment content or user identity. |
| `{root}/notificationOperations/operations/{sha256}` | Existing delivery protocol, with schedule fingerprint binding and v2 occurrence key defined by ADR 0006. Root remains scoped by the path. |

Only `functions/lib/comment-counts.js` owns comment contribution arithmetic. A
transaction reads current episode/comment, count state and contribution before
writing desired-minus-prior delta and contribution atomically. Duplicate and
out-of-order triggers use fresh state, not event snapshot status. Manual review
and account deletion use this same authority in their transaction; no separate
aggregate-read/overwrite or independent decrement survives integration. If the
episode is missing, do not recreate it; an episode ID reused with a new create-time
must not inherit an older generation's contributions. Do not clamp an inconsistent
negative result into apparent success: conflict for reconciliation.

Preserve the current client-created `published` comment behavior. Existing
moderation may later change it; this work does not introduce a pending-approval
product flow. A schema-contract description saying initial `pending` is superseded.

For existing episodes choose explicit scoped write quiescence, not an untested
online revision barrier: pause all comment creation/status/deletion writers and
old/new workers for the reviewed scope, stage complete ledger pages and count,
verify unchanged source and then activate the generation atomically. Maximum
25 items/invocation with resumable pages/checkpoints. Initial root activation
requires all pre-cutover episodes in the reviewed manifest to have complete active
baselines; freshly created post-activation episodes start from their canonical
zero counter and a new episode identity. Unknown/pre-cutover missing baseline
fails closed rather than guessing whether an absent ledger row was counted.
Quiescence must be enforced and rehearsed across client Rules and all server
writers before any live apply; claiming a lease alone does not stop legacy writes.

Keep zero-contribution tombstones for live episode generations so delayed events
cannot repeat subtraction. Never TTL active contributions. After episode deletion,
private generation records may be removed in bounded cleanup only after missing
parent verification; delayed events must recheck parent existence and cannot
recreate it. Conditional recovery changes only owned ledger/counter fields under
the expected postimage and generation; never restore deleted comments, undo current
moderation, or restore C01-prohibited public data.

### Evidence and activation

B15 must export and exercise the real count event handler in the isolated emulator
harness with deterministic moderation and no external sends. Four PL03 controls
remain distinct: manual corrected-counter fixtures do not prove new-comment
worker behavior. Both-root Rules matrices cover all private state paths and direct
counter denial. New tools require reviewed preview/manifests, private durable
verified backups, conditional writes, bounded resume and safe restore before
separately authorized production work. A code review or emulator pass does not
activate a live root, index or migration.

## C04-COUNTS enforcement amendment — reviewed fence design, 2026-10-26

This amendment makes the earlier quiescence requirement mechanically enforceable.
It does not change C03, RSS, health, timezone, C01 or production authorization.
No count baseline or root activation is valid merely because an operator supplied
`paused: true`, a lease, a hash, or a boolean freeze assertion.

### One root fence, one normal-writer boundary

Reuse `{root}/commentCountContributions`; do not add a generic lock service. Its
version-1 maintenance fields are `state: paused|active`, positive monotonically
increasing `generation`, `owner`, `planHash`, `leaseUntil`, and `writerProtocol: 1`.
`activeFrom` and the accepted baseline manifest hash remain the activation record.
All clients, including admin web client SDKs, are denied direct
reads/writes to it. Unknown schema/state/generation fails closed. An absent fence
means legacy normal operation, not proof of an active count baseline.

#### Root fence field types — M04-T12-FENCE-READY

The shared Rules/helper wire schema is explicit; this type clarification must be
independently reviewed before the Rules milestone is integrated. It does not
activate a root or complete04-T12/B15/B16.

| Field | Required type and invariant |
| --- | --- |
| `version` | Integer exactly `1` |
| `state` | String exactly `paused` or `active` |
| `generation` | Integer in `1..9007199254740991`; monotonically increased by trusted maintenance transactions |
| `owner` | Opaque nonempty string, at most128 characters, trimmed and without `/`; no user identity or content |
| `planHash` | Exactly64 lowercase hexadecimal characters |
| `leaseUntil` | Integer epoch milliseconds in `0..9007199254740991` |
| `writerProtocol` | Integer exactly `1` |
| `activeFrom` | Required for `active`: literal native Firestore Timestamp from the guarded paused activation barrier, atomically bound by final release; preserve exact seconds/nanoseconds |
| `baselineManifestHash` | Required for `active`: exactly64 lowercase hexadecimal characters identifying the accepted baseline |

An absent document preserves legacy normal operation. A present fence permits
normal writers only when the complete supported active shape is valid. Missing,
unknown or mistyped required fields fail closed. A paused state never becomes
active because its operational lease expires. Rules do not infer historical
monotonicity from one snapshot; trusted mutation transactions enforce generation
advancement. The dependency-free helper validates native Timestamp structural
seconds/nanoseconds without importing a Firebase package. It must not replace
activation time with a client clock, rounded epoch milliseconds or a REQUEST_TIME-to-document-metadata equality assumption. Paused records
may retain the previous activation pair; neither retained fields nor lease expiry
bypass pause. Normal authorized comment creation retains existing verification,
profile ownership, UGC agreement, publication and deletion protections.

#### Unreleased private ledger namespace clarification

Use `{root}/commentCountContributions/episodes/{episodeId}/contributions/{commentId}`.
The earlier planned `/comments/{commentId}` suffix would overlap the existing
recursive administrator comment collection-group list permission. An explicit deny
cannot override that allow. This is a design/security mismatch in a new, unreleased
private namespace; do not rewrite canonical comment audit Rules or introduce a
second ledger authority to hide it. The new `contributions` collection name avoids
that overlap and retains default-deny access for every client role. Existing
`importKeys` read policy and canonical episode comments remain unchanged.

No ledger implementation or live rename/migration is authorized by this namespace
clarification. Before any later authorized count maintenance, reconciliation, apply, restore or
activation scope proceeds, perform a bounded read-only preflight audit for records
in the old planned `/comments` namespace. This is not a full-ledger scan on each
normal event or writer transaction.
If any are found, refuse apply/restore/activation and report the mismatch for
separate review. Never automatically rename, copy, delete, merge or expose legacy
records. The initial synthetic old-path leak probe must remain in evidence as a
design mismatch; already-passing new-path private guards are GREEN obligations,
not fabricated RED. The paused-root comment-create assertion provides genuine
behavioral RED for this early Rules milestone.

Add the narrowly scoped, dependency-free helper
`functions/lib/comment-count-maintenance.js`. It validates root/fence data and
reads the root fence through the caller's existing transaction before any write.
No Firebase/package dependency is added to standalone seed tooling. Normal writers
cannot supply a maintenance owner or bypass flag. A paused root rejects episode
creation/deletion/replacement and episode/comment mutations. Root fence changes
conflict with all in-flight guarded transactions, so they retry and observe pause;
a pre-read followed by a WriteBatch/BulkWriter commit is not an enforcement fence.

- Rules use this same root state to deny comment creation while paused, alongside
  existing authorization/deletion checks. Episode SDK writes remain denied.
  Rules and server guards are both required: Admin SDK bypasses Rules.
- `editorial-audit.js` checks in the save transaction for episode saves and program
  transfers touching episodes. `admin-content-delete.js` checks every episode
  deletion-token acquisition, delete and cleanup transaction. RSS checks in its
  episode creation transaction, before identity/counter/audit writes.
- Count/moderation/manual-review transactions check before comment/status/count
  writes. Account deletion replaces canonical-comment BulkWriter deletion with
  bounded guarded transactions using the same contribution authority; unrelated
  account cleanup remains unchanged. Its durable job/barrier is retained while
  maintenance blocks progress; Auth is not removed before cleanup succeeds.
- Existing episode import/preview tools must not reset an existing
  `stats.commentsCount` by merging a zero-valued fixture map. Zero is initial
  state only on create; existing counts stay authority-owned. Seed create-only
  semantics remain create-only, but the existing atomic commit becomes a guarded
  transaction. Comment status migration uses the same authority transaction.
  Other owned episode repair/backfill tools also read the fence in their actual
  mutation transaction; preview remains read-only.
- The maintenance tool alone writes staged ledger/counter state while paused,
  verifying generation/owner/planHash and fresh lease in each mutation transaction.
  Its permission is internal to that tool, never an option on ordinary callables.
  Lease expiry never reopens normal writes. Recovery claims a fresh generation
  only against the same reviewed plan and persisted recovery state.

### Count-authority activation is an operational cutover precondition

An absent root fence permits the OLD deployed legacy application to continue its
existing normal operation. It does not establish a count baseline and does not
permit NEW count-aware code to guess a legacy comment's prior contribution.
Count-aware code must not be enabled for normal traffic before the already-required
isolated, fenced baseline cutover is complete. This clarifies the approved
maintenance/deployment order; it does not introduce a different comment UI,
pending-approval flow, legacy arithmetic fallback or maintenance bypass.

| Root / episode state | New count event or replay | New count-affecting manual/status/delete transaction |
| --- | --- | --- |
| Root absent; no established accepted baseline | Retry without counter/contribution writes; absence is not zero | Fail safely before comment/status/count mutation; retain incomplete account-deletion jobs/barriers |
| Root paused, including expired lease; building/partially verified baseline | Retry without acknowledging unfinished work | Reject atomically; only the scoped maintenance tool may stage under its verified lease |
| Supported active root and accepted episode baseline matching exact episode identity | Read fresh current state; apply desired-minus-prior contribution atomically; duplicate/reordered work converges | Commit intended comment mutation, contribution and count together through the same authority |
| Malformed/unknown root or missing/mismatched/unaccepted episode baseline | Retry or report reconciliation conflict without guessing | Fail atomically; no clamp, standalone decrement, aggregate overwrite or lazy-zero fallback |

Rules retain absent-root authorized published comment creation. During a correctly
sequenced cutover, the existing approved quiescence/isolation blocks that traffic
before new code is enabled, and the complete baseline is activated before traffic
is released. Encountering an absent/unfinished baseline in new code is a
misordered/incomplete-activation safety failure, not an alternative normal product
flow. Unrelated operations retain existing authorization and behavior. A missing
episode is never recreated; a terminal no-parent outcome cannot mutate a newer
same-ID episode. An account deletion that cannot complete comment cleanup keeps
its durable progress/barriers and does not remove Auth prematurely.

The future authorized cutover order is mandatory:

1. Prepare and independently verify compatible guarded writers, count authority,
   Rules, baseline tooling, retry handling and conditional recovery before rollout.
2. Establish verified platform isolation of old/unowned Admin SDK writers and pause
   client creation through the approved fence boundary before enabling count-aware
   code for normal traffic. No operator boolean or claimed lease substitutes for
   that isolation. Perform the approved bounded read-only old-namespace audit to
   exhaustion before maintenance mutation; refuse if old planned records exist.
3. While the root remains paused and isolated, run the frozen exact ID/createTime
   inventory, complete staged baselines and second exhausted verification. New
   handlers may be installed under isolation but cannot process normal mutations
   against an absent or partial baseline. Preserve unacknowledged retryable work.
4. Atomically install the accepted baseline/root lineage and native trusted-commit
   `activeFrom`, verify readback, then release only compatible guarded traffic.

The current production mechanism cannot prove old/unowned-writer isolation, so
production apply/restore/activation stays unsupported and refused. This document
is not deployment or migration authorization. Rollback retains isolation and pause
until a compatible authority and, where necessary, reviewed rebaseline are ready.
Never release old unsafe decrement/recount workers over active contribution ledgers,
erase accepted lineage or remove the fence merely to make old traffic run.

#### Episode identity and data generation are not the fence lease epoch

The root `generation` owns maintenance concurrency. An opaque per-episode baseline
generation owns contribution data for one exact native episode `createTime`.
Persist the accepted-manifest/root-lineage binding in the existing private episode
record and completion state. Contributions must match that accepted episode data
generation and exact create identity. Root lease acquisition/recovery or final
activation may advance the root generation without invalidating unchanged accepted
baselines. Do not assume equality with root generation or derive a baseline by
subtracting one. No new mapping service or collection is required.

A genuinely new post-activation episode receives its canonical zero counter and
accepted empty baseline atomically with canonical episode creation, through the
same count authority. Bind baseline identity to the native creation commit and
accepted root lineage. The first count event does not lazily invent zero from a
missing baseline or from `createTime > activeFrom` alone. Deleted/recreated IDs
require a new baseline/data generation bound to the new native createTime; old
contributions and delayed events cannot be inherited or resurrect content.
`activeFrom` is the exact native metadata timestamp of the paused activation barrier,
atomically bound by the final release transaction as specified below. Client clocks,
rounded milliseconds or a serverTimestamp transform cannot establish exact native
episode birth identity or an activation-metadata equality assumption.

### Native metadata binding — proposed precision clarification before first use

Firestore documents `DocumentTransform.ServerValue.REQUEST_TIME` at millisecond
precision. `FieldValue.serverTimestamp()` is that transform; it is not guaranteed
to equal a document's finer native createTime/updateTime. Keep native Timestamp
seconds/nanoseconds without rounding. See the [official RPC contract](https://firebase.google.com/docs/firestore/reference/rpc/google.firestore.v1).
The following unreleased schema clarification requires independent review before
correcting or consuming the early bootstrap implementation.

**Episode birth receipt:** the existing private per-episode record has `version:1`,
`state:active`, `origin:creation`, its opaque `generation`, and accepted
`baselineManifestHash`. For this origin the record is immutable after its canonical
creation transaction, and its native snapshot `updateTime` is the birth receipt.
That native version must equal the episode's native `createTime` exactly. There is
no duplicated `episodeCreateTime` transform field for a creation-origin record.
Normal count writes do not modify the baseline. The authority resolves exact birth
identity from that receipt and stores the literal native timestamp in contribution
rows. An unexpected baseline rewrite invalidates the receipt and fails closed.

For `origin:baseline`, including verified reconciliation, the existing per-episode
record stores literal `episodeCreateTime` read from the native episode snapshot.
Reconciliation may rewrite such a record under its verified root fence. A rollback
must never restore an old `origin:creation` body and interpret the restore write's
new updateTime as the old birth. Recovery either converts verified backup identity
to `origin:baseline` with the exact literal old episode createTime, or keeps the
root paused/non-releasing until separately reviewed rebaseline. Accepted lineage
and opaque episode data generations remain distinct from the root lease epoch.

**Contribution version receipt:** each row keeps literal observed `commentVersion`
(native Timestamp, or null for a missing/deleted comment) and boolean
`commentMutation`. A normal sync/staging row uses false and the observed current
version. A row written atomically with an intended comment update uses true and
the exact observed pre-update version; its own native snapshot updateTime is the
possible mutation commit receipt. Firestore may retain a version when a write
changes no data. Receipt or observed-before equality is evidence only for the
unchanged/no-op fast path. A mismatch with a legitimate newer current comment is
not an admission failure: validate episode identity, accepted lineage and prior
contribution, then recompute desired-minus-prior from fresh canonical state
atomically. Record the new observed or atomic-mutation version as appropriate.
Never reject ordinary newer status/update/delete work solely because its version
differs from the previous contribution receipt; stale event snapshots remain
non-authoritative. No REQUEST_TIME value supplies native comment identity.

Before rewriting/restoring a `commentMutation:true` row, resolve and verify its
native version using the original row snapshot receipt and canonical comment/
episode identity. Persist the rewritten record as `commentMutation:false` with an
exact verified literal observed native comment version, or retain pause/reconcile
if no safe conversion is possible. Never copy the old mutation-receipt body and
reinterpret the restore write's new native updateTime as the old comment mutation
commit. A changed canonical comment requires fresh authorized reconciliation,
not restoration of a stale contribution/version. Missing/deleted comment version
remains null.

**Paused activation barrier:** use the existing root document/completion state,
without a new collection or mapping service. After complete staging and exhausted
verification, a guarded transaction keeps `state:paused` and writes
`countMaintenance.phase:activation-barrier`, plus `barrierPlanHash` (64 lowercase
hex), `barrierGeneration` (positive safe integer root lease epoch), `barrierOwner`
(the validated opaque owner), `inventoryCount` (nonnegative safe integer), and
`inventoryDigest` (64 lowercase hex). The record remains frozen until release;
lease loss/recovery must reverify and establish a fresh barrier under its new epoch.

The final release transaction reads that same paused barrier's exact native
snapshot updateTime, rereads/validates its owner/generation/lease, accepted plan and
complete inventory/baseline proof, and rechecks backup custody/recovery window.
It atomically sets active state and accepted lineage, increments the root lease
epoch, stores that literal timestamp as `activeFrom` and
`countMaintenance.barrierVersion` (native Timestamp), and changes phase to active.
All normal client/SDK writers remain fenced throughout the barrier/release gap;
verified isolation of old/unowned writers is still mandatory. Thus no legal birth
can fall in that gap. This is a precise activation cutoff, not a claim that the
barrier timestamp equals the later release metadata.

Readback/replay checks require the exact plan/lineage, owner and barrier epoch
binding, complete inventory count/digest, `activeFrom == barrierVersion`, supported
active schema and release native metadata strictly after the barrier. An already
active accepted result is verified read-only, never replay-overwritten. Recovery
preserves previous accepted lineage and remains paused until compatible proof is
complete. Later count/ledger apply/restore uses immutable per-item commit/version
receipts for conditional ABA-safe recovery. No bootstrap/recovery path may infer a
native version from a transform, client clock, approximate time or `rootGeneration-1`.

### No lost work during pause

A fenced event must fail with a retryable maintenance classification, never return
success/skip and acknowledge unfinished work. Enable `retry: true` for the current
comment-created moderation handler as well as the new count on-write/delete
handler. Existing terminal moderation precedence remains. Retry fresh current
state after release; do not replay event-snapshot status over a later decision.
A blocked scheduled RSS/import item is explicitly deferred/not accepted and remains
available to the next invocation; do not stamp it ingested or emit publication
side effects. Callables return safe failed-precondition/retry-later results.
Unfreeze never resurrects a removed comment/episode; parent/create-time checks and
contribution generations remain required.

### Frozen identity inventory and activation

Initial root cutover freezes the whole root, including episode creation, deletion
and ID reuse, not just comment writes on an enumerated subset. Acquire the pause
transaction before taking the baseline inventory. Build a deterministic private
inventory in document-ID order using pages of at most25, recording each episode's
ID plus exact Firestore `createTime` seconds/nanoseconds and source precondition.
Persist its ordered digest, count, cursor and manifest version; exhaust to EOF.
Retain explicit empty episodes. Do not use client-provided `createdAt`, a count
alone or a list collected before the fence as identity evidence.

Stage each episode's complete comment ledger under staging ownership of that
verified root maintenance epoch; the accepted episode data generation remains
distinct and is not required to equal the root lease generation,
with bounded pages and checkpoints; no partial generation becomes active. Before
activation, re-enumerate the entire episode inventory to EOF in stable ID order
under the still-paused fence. Compare ordered ID/createTime pairs, count and digest
with the frozen manifest; missing, added, replaced or same-ID/recreated episodes
are conflicts. Validate each episode's complete staged generation and unchanged
source preconditions, including current comments, before marking it verified.
This re-enumeration detects non-cooperating writer drift but does not substitute
for preventing such writes.

Each bounded inventory/verification checkpoint transaction rereads the fence and
checks generation/owner/planHash. Once both exhausted inventories and every staged
episode are verified, activation atomically rereads the same fence and persisted
completion records, installs the active baseline/activation time and increments
the generation to release writers. No unrelated writer may modify completion
records. Crash or lease loss before that transaction leaves the root paused;
after-commit/before-ack resume recognizes the exact activated manifest. Missing
parent, changed identity or mixed baseline never becomes a best-effort success.

### Supported freeze proof and production limitation

The current implementation supports apply/rehearsal only with an explicit demo
project and validated local Firestore Emulator endpoint. Its proof is generated
by exercising the installed guarded writers and Rules: writes paused before and
during a transaction must reject; pre-pause in-flight commits must conflict/retry;
normal writes resume only after valid activation. Include adversarial unguarded
Admin SDK create/delete/ID-reuse attempts and require final inventory verification
to reject the resulting drift. A synthetic adapter or caller boolean is not
production freeze proof.

Production reconciliation CLI mutations remain explicitly refused. Before later
G-O4-READY/live authorization, operations must provide supported platform-enforced
verification that deployed Rules and every owned writer use the reviewed fence
protocol, old revisions/in-flight work are drained, and every unowned Admin SDK
writer is actually stopped or loses effective Firestore write access while the
reviewed maintenance identity retains it. Firestore cannot stop an arbitrary
Admin SDK principal that ignores this document. Do not invent a generic verifier
interface, accept an operator attestation as equivalent, or claim this external
capability exists. Until a separately reviewed supported platform integration
proves that isolation, the production apply/restore/activation path is unavailable.


## R09 RSS historical alias ownership — B13 implementation amendment

This amendment documents the private implementation schema. It does not authorize
production repair, deployment, alias reclamation, or relaxation of C01/C03/C04
security and count-fence contracts. R09 acceptance and independent review remain
mandatory.

### Private reservation and immutable binding

Existing `{root}/importKeys/importKeys/{keyHash}` documents retain
`targetKind: "episodes"`, `targetId`, `keyHash`, and server `reservedAt`.
RSS reservations additionally use this exact proof schema:

| Field | Type / invariant |
| --- | --- |
| `rssAliasVersion` | Integer `1`; unknown or missing required proof fields fail closed |
| `rssOwnerRoot` | Exact allowed root, `HudHudDev` or `HudHudOfficial` |
| `rssOwnerProgramId` | Valid existing owner/program ID in that root |
| `rssOwnerStationId` | Valid station ID, matching the validated program and owner |
| `rssOwnerExternalIdHash` | Lowercase SHA-256 hex of the owner's immutable, nonempty stored `externalId` |

`keyHash` retains the existing `contentIdentity('episodes', {programId, audioUrl})`
algorithm. No raw URL, raw GUID, personal data, growing URL array, or notification
payload is stored in proof fields or emitted in logs. Each historical URL alias
owns its own bounded-size reservation; an alias remains valid after more than
three feed URL rotations or admin URL edits because proof binds stored external
identity rather than the latest URL or a bounded recent-key list.

An alias is valid only when its existing, non-deleting target episode matches
root/program/station/episode identity and the immutable external-ID hash. Distinct
raw/decoded owners, malformed or foreign proof, inconsistent relationships,
reserved missing owners, and wrong deterministic candidates stop atomically.
Program-scoped equality queries resolve at most two incoming raw/decoded external
IDs, with a two-document bound each, including after a completed URL-key identity
backfill. Distinct GUID owners fail closed. A legacy scope without a verified
complete marker also uses the existing bounded 451-document legacy check; more
than 450 requires reviewed backfill rather than an unbounded scan.

RSS reimport preserves existing episode IDs, stored URLs, external IDs, counters,
publication flags, audit history, and unrelated fields. It may reserve previously
unreserved raw/decoded aliases transactionally to that same owner. Creating a new
episode retains the existing deterministic ID, payload, parent-count adjustment
and audit transaction. Existing non-RSS rows without external-ID binding can keep
an ordinary current-key reservation; ambiguous escaped historical aliases require
reviewed repair. Admin identity changes preserve verified historical RSS alias
ownership and cannot reassign it merely because the owner URL changed.

An owner deletion or program/station transfer that invalidates this proof must not
silently reclaim or relax aliases. Such aliases conservatively fail closed until
reviewed lifecycle integration or cleanup; no orphan reclamation is introduced by
B13. This limitation must remain visible in acceptance and operations review.

### Private repair jobs, receipts and field ownership

Repair manifests, encrypted backup envelopes and jobs use schema `version: 2`.
Older incomplete schemas fail closed. Manifests bind exact source `updateTime` and
`createTime`, complete before/after fingerprints, exact program version, explicit
scope and positive raw-feed provenance. Review/persist the immutable encrypted
manifest before execution; the executor never recreates a missing backup.

`{root}/rssUrlRepairs/runs/{manifestHash}` contains private maintenance state:
`version: 2`, `runId`, `generation`, lease `owner` and `leaseUntil`, apply cursor
`next`, restore cursor `restored`, and `status` (`applying`, `applied`, `restoring`,
`restored`). Its apply receipts live at `items/{zeroPaddedIndex}` and restore
receipts at `restores/{zeroPaddedIndex}`. Every receipt has `version: 2`, `runId`,
`id`, `index`, `mode`, `sourceCreateTime`, `beforeFingerprint`, and
`afterFingerprint`. The receipt's Firestore `updateTime` is the source commit
version: receipt creation, URL mutation and checkpoint advancement are atomic in
the same transaction. Separate immutable apply/restore receipts preserve both
commit versions without rewriting the source with a tool-specific marker.

The current source must retain the manifest's `createTime`, expected complete
postimage and exact corresponding receipt commit `updateTime`. Identical-content
ABA writes and delete/recreate conflict. Completed/lost-ack checkpoints are not
trusted merely because a cursor advanced: before any new lease write, a bounded
verification of up to 100 committed manifest entries checks source identity,
postimage, commit receipt and aliases. Every item and final verification also
checks its fresh program/lease/checkpoint and backup. Unknown-commit recovery
therefore skips only a still-owned verified committed prefix; it never reapplies
or restores over a newer same-content write.

Mutation accepts only a private WeakMap-bound facade created by
`createRssDemoFirestore`, which constructs the installed actual server SDK client
with explicit demo project, loopback host and disabled TLS for that emulator only,
then freezes its public settings/facade. Arbitrary database objects, copied
facades, claimed public project IDs or caller host strings cannot register an
owned transport. A conflicting emulator environment is rejected. Production
mutation remains refused; no attestation flag or production adapter exists.

The backup capability is obtained only through `RssRepairBackupStore.open`.
Its key, expiry, canonical directory, device/inode custody and clock are private;
its instance/prototype are frozen and module-private capability membership is
required. Memory objects, forged prototypes and mutable public properties cannot
stand in for encrypted durable backup. The immutable AES-256-GCM backup remains
outside the repository and `.boss`, with owner-only permissions, authenticated
readback, bound directory/file identity and at least one hour of remaining
recovery time (maximum retention 30 days). Its actual verified readback, expiry,
permissions and custody are checked inside the initial lease transaction even for
an empty manifest, every retried item mutation/checkpoint, restore and final
verification. Loss, corruption, permissions changes or directory replacement stop
before the next database mutation. File integrity is not a one-time caller claim.

A bounded item transaction checks scope, lease/generation, deletion state, parent
version, source version/create identity/fingerprint and alias ownership before
writing only owned URL/alias fields, receipt and atomic progress checkpoint.
Conditional restore restores only a still-owned URL postimage and retains valid
aliases; it cannot resurrect records, restore unrelated data, overwrite concurrent
edits, increment parent counts, toggle publication or send notifications. B15's
reviewed write-fence must be checked in this actual mutation transaction before
integration acceptance.

The established `importKeys` read contract is preserved: known-root reads/lists
are allowed by existing `isAdmin()` policy (`admin: true`, or role
`station_admin` / `super_admin`, including role-only station/super administrators).
Anonymous users, ordinary authenticated listeners and role-only moderators remain
denied those reads. Every client role remains denied reservation writes. Alias
proof contains hashes/IDs only, without raw URLs, raw GUIDs or personal data; no
Rules change broadens the existing reservation exposure.

All client roles, including administrators, remain denied get/list/create/update/
delete access to the NEW repair jobs and both receipt collections under default-
deny Rules. Actual both-root fixtures test both the established reservation
read/write policy and the new private path denials. This corrects the newly authored
overbroad all-client reservation-read denial expectation; it is not remediation of
a preexisting permission vulnerability. Independent scope/contract review is
required before accepting that clarification.

Actual SDK commit-version/recovery fixtures and independent source/security review
are required; mocks or Admin SDK success do not prove client permissions. A
Firestore identical-data set can be a no-op with unchanged updateTime. The real
ABA regression must make a distinct temporary write, then restore the original
applied payload before checking a newer version and rejected replay/restore. The
first same-data-set fixture failure was invalid ABA setup, not a failed security
guard. Later operational integration and explicit migration/rollback approval
remain separate checkpoints. Original unexplained editorial concurrency instability
is retained as evidence; passing a diagnostic rerun does not establish a source fix.

## C04-TIMEZONE B16 wire refinement — proposed independent review

This is an implementation-contract proposal for existing04-T10/11/12, not batch
execution, policy reconsideration, rollout approval or finding closure. It retains
fixed accepted per-schedule offsets, the shared delivery protocol and private
`notificationOperations` namespace. No new service/dependency or collection is
required. Production migration remains unsupported until actual old/new notifier
and collector quiescence/drain is independently verified; a boolean/lease/hash
supplied by an operator is not isolation evidence.

### Canonical occurrence and fingerprint

Normalize an accepted schedule to sorted unique ISO weekdays1..7, integer
startMinute0..1439, integer endMinute>startMinute and<=1440, and integer
utcOffsetMinutes in[-720,840]. Missing/invalid accepted fields are ineligible,
not silently defaulted. Program and station must exist, be active and non-deleting,
with exact canonical relationship. No IANA/DST or new schedule field is introduced.

At each eligibility check derive local UTC-calendar fields from the actual UTC
instant plus offsetMinutes*60000. Retain the current same-local-day minute rule:
weekday belongs to the normalized schedule and startMinute-currentMinute is
in[0,10]. The occurrence date is that offset-derived YYYY-MM-DD. This refinement
does not introduce a previous-day lead notification for tomorrow's start; midnight
and weekday rollover tests verify the accepted offset/date consistently.

Let H be lowercase SHA-256 of UTF-8 JSON.stringify of the stated array, with no
locale-dependent object sorting or textual whitespace. V1 remains
H([programId,YemenDate]); V2 is H(['program-start-v2',programId,localDate]). Root
is scoped by the canonical path. Changing a schedule never creates a second key
for one program/local-date occurrence.

The exact fingerprint is
H(['program-schedule-v2',programId,stationId,true,true,weekdays,startMinute,endMinute,utcOffsetMinutes]).
The two true values are validated program/station active states. Deletion/missing
parent conditions fail validation rather than becoming alternate fingerprints.
Titles/names are not intent identity; read their current values in the successful
start transaction to construct the existing topic/payload. No private contact,
raw token or user data belongs in fingerprints/proof/logs. A changed fingerprint
cannot rebind an existing occurrence, including sent/unknown receipts.

### Minimal private wire records

Existing delivery receipt path: `{root}/notificationOperations/operations/{v2Key}`.
Existing shared fields retain their types/semantics: status, phase, lease,
fingerprint, attempts, retryable, reason, createdAt/updatedAt/leaseUntil/retryAt/
expiresAt/cleanupAt and optional provider messageId. Those SDK Timestamp fields
are operational instants; they are NOT evidence of the database commit version.
The snapshot's native createTime/updateTime seconds/nanoseconds supply source CAS.
Do not reinterpret receipt expiry as permission to retry sent/unknown.

A migration-created suppression uses existing terminal `status: unknown`,
`retryable: false`, reason `legacy-compatibility-suppression`, the exact canonical
fingerprint, attempts0, phase `claimed`, a bounded opaque migration lease ID, and
zero leaseUntil. Creation/updated timestamps are server timestamps; expiresAt and
cleanupAt are omitted for such held records. The program-only reason is added to
the existing safe-reason allowlist, without changing any other sender default.
An inline `programCompatibility` map is optional proof on a terminal suppression:

| Field | Type / invariant |
|---|---|
| version | Integer1 |
| manifestHash | Lowercase64-hex immutable reviewed manifest identity |
| cutoverAt | Native Timestamp representing the explicitly supplied UTC cutoff |
| programCreateTime | Exact native program createTime from reviewed source |
| scheduleFingerprint | Exact canonical lowercase64-hex fingerprint |
| legacyDates / legacyKeys | Sort/deduplicate dates ascending only; at most2. legacyKeys[i] must equal H([programId,legacyDates[i]]). Hashes are distinct but NEVER independently sorted |
| evidenceHashes | Array of at most3 lowercase64-hex hashes binding legacy receipt/stamp observations |
| decision | `suppressed` or `carried-prepared|carried-retryable|carried-terminal-failed`; never a claim of provider acknowledgement |
| legacySourceKey / legacySourceCreateTime / legacySourceUpdateTime | Required only for a state carry: exact64-hex V1 key and native source create/update identity |
| recordedAt | Server-generated operational Timestamp; not a client clock or exact native commit identity |

A state carry is permitted only under the exact state matrix below; its
status/phase/lease/attempts and original clocks are copied, never reset. A valid
V1 program receipt normally has NO fingerprint because the actual V1 caller did
not pass one. That absence alone is not malformed or payload conflict. A new V2
carry binds its canonical fingerprint once without rewriting V1. No `clear` proof
grants a send, and no new success/sent state is fabricated by a migration. Existing terminal V2 sent/unknown receipts remain byte-preserved even
if their fingerprint differs. Nonterminal V2 receipt strengthening to unknown is
permitted only under reviewed quiescence and exact current CAS; preserve all
unrelated fields and original before-image privately. Never weaken unknown/sent.

Maintenance job path reuses the same private collection with a disjoint key:
`{root}/notificationOperations/operations/program_date_migration_{manifestHash}`.
Its fields are version1, kind `program-date-migration`, manifestHash, projectId,
root, programId, cutoverAt(native Timestamp), fromLocalDate/toLocalDate(YYYY-MM-DD),
owner(opaque trimmed slash-free1..128 string), generation(positive safe integer),
leaseUntilMs(nonnegative safe epoch-ms integer), nextIndex(integer0..entryCount),
entryCount(integer0..25), status(`applying|completed|rollback-held`), and
backupExpiresAtMs(safe epoch-ms). Jobs contain no payload/token/raw before-image.
Per-entry immutable receipts live at `.../{jobId}/items/{threeDigitIndex000Through024}`:
version1, manifestHash, index0..24, v2Key, action(`created-suppression|strengthened-suppression|carried-prepared|carried-retryable|carried-terminal-failed|preserved-terminal|clear-noop`),
sourceHash, beforeHash, afterProjectionHash(all64-hex), targetChanged(boolean),
targetCreateTime and targetUpdateTime(exact literal native target metadata observed
BEFORE this item transaction, both null only for proven target absence). The item
receipt is created once in the same atomic transaction as its changed V2 target
and job progress; it is never updated or overwritten. Do not persist a guessed
future targetUpdateTime or committedAt: native commit metadata is unknown before
commit, and REQUEST_TIME/serverTimestamp transforms have millisecond precision.
Operational recordedAt/createdAt/updatedAt fields never supply native identity.

Resolve the applied target proof from the immutable item receipt snapshot:

| Item result | targetChanged and observed metadata | Applied target createTime / updateTime |
|---|---|---|
| Created suppression or carried state at an absent V2 | true; both observed timestamps null | Both equal the original item receipt snapshot.updateTime from that same atomic creation commit |
| Strengthened existing V2 | true; both observed timestamps literal, non-null | Create identity remains literal targetCreateTime; update version equals the original item receipt snapshot.updateTime |
| Preserved terminal V2 or any genuine unchanged existing target | false; both observed timestamps literal, non-null | Retain the exact observed targetCreateTime/targetUpdateTime; the later item receipt time is NOT the target version |
| Proven absent clear-noop | false; both observed timestamps null | Target remains absent; null is proven absence, never unknown metadata |

Validate targetChanged against the authorized action and actual before/after
projection. An identical-data write can be a native no-op; it must not be labelled
changed merely because a set/update was requested. Do not update a target only to
manufacture a changed receipt. This schema covers only the single V2 target of
each occurrence; V1 receipts, program/station sources and stamps stay read-only.
No generic target list, receipt framework or other sender field is introduced.

The projection hash excludes only action-defined newly generated operational
server-timestamp fields, whose database version is checked separately. It must
not exclude copied carry clocks, statuses, attempts, lease/backoff/expiry or
compatibility evidence. No caller-supplied ignore-field list is permitted.
Read every source before writes. After commit, read back the original immutable
item receipt and current target, resolve the exact native identities above and
compare authorized projection/native versions before reporting that item verified.
A newer unowned target version, equal-value ABA or delete/recreate is conflict,
not an adopted source version. For a newly created target its createTime must
match the original receipt commit; an existing target must retain its literal
original createTime. Never rewrite a receipt to make newer target metadata fit.

After an unknown acknowledgement, recover only from the matching immutable item
receipt, reviewed backup and exact native target proof, then verify the committed
prefix before advancing; nextIndex alone is insufficient. Missing/mismatched
receipt or target proof remains held without repeating an uncertain write. An
absent no-op can prove only currently observed absence under verified isolation;
it cannot detect arbitrary unguarded create/delete history from absence alone.
Conditional rollback/restore rechecks these same current target identities,
versions and postimages plus original source/backup scope. It never borrows a
no-op receipt time, erases terminal suppression or resurrects a target/program.
All existing non-erasing rollback and production-refusal rules remain unchanged.
Unknown schema/fields/types fail closed.

All job/receipt/proof records are server-only. Existing default-deny Rules must
be tested with get/list/create/update/delete for both roots and all client roles,
including role-only/admin/super-admin and forged maintenance claims. Existing
importKeys reads, canonical comment groups and public notification behavior do
not change. Document-ID prefixes must never collide with raw64-hex program keys
or existing `broadcast_` keys.

### Legacy mapping, runtime start boundary and stamps

For occurrence D at offset O, form the half-open UTC interval
[UTC-midnight(D)-O, UTC-midnight(D+1)-O). Enumerate every Yemen UTC+180 calendar
date whose half-open day intersects it; there are one or two. Boundary-only
contact is not intersection. Reject derived UTC/Yemen endpoints outside native
years0001..9999; calendar arithmetic must avoid JavaScript Date.UTC year0..99
coercion and must be independently tested. Read those V1 keys and the current program stamp.
Keep the date set tied to the reviewed/current normalized schedule, not a host
locale or guessed lastNotifiedDate conversion.

Use the following ordered legacy decision matrix at the SAME supplied runtime
`now` instant. Native receipt timestamps retain the actual shared-protocol meaning;
zero/missing values cannot be invented to make a malformed record retryable. A
well-formed receipt has supported status/phase, nonempty lease where pending,
positive safe attempts and valid native createdAt/updatedAt/expiresAt/cleanupAt;
retryable failure additionally has boolean retryable and native retryAt. Optional
legacy fingerprint may be absent; if present it must not be guessed equal to the
new canonical fingerprint. An existing unknown fingerprint binding requires
review rather than rebind. Exact source/create/update identity is always checked.

| Existing legacy evidence | Migration / runtime decision; no fresh-key bypass |
|---|---|
| sent or unknown | Terminal suppression regardless of lease/expiry/backoff. Preserve V1 and existing terminal V2 byte-for-byte; never retry or fabricate acknowledgement |
| pending/claimed with leaseUntil>now | Defer while ownership is live; do not permanently mark unknown merely because it is claimed. Under actual old-worker quiescence/drain and exact CAS, carry its PREPARED state to absent V2 preserving original lease/clocks/attempts; shared claimDelivery still waits until that lease expires |
| pending/claimed with leaseUntil<=now AND expiresAt>now | Proven pre-send work is safely reclaimable only after actual quiescence/drain and exact source CAS. Carry unchanged prepared state to absent V2; existing claimDelivery reclaims once, increments original attempts once and preserves original createdAt/expiresAt/cleanupAt. Revalidate current eligibility before start |
| pending/claimed whose expiresAt<=now | No recovery send; carry/retain failed nonretryable expiry semantics. Do not allocate a fresh24-hour V2 lifetime. A still-live claimed lease remains deferred until ownership is settled; expiry is not ownership permission |
| pending/sending with leaseUntil>now | Defer; a provider call may still finish. Do not turn a potentially definite future result into a new retry. No handoff mutation until old sender is actually drained/isolated |
| pending/sending with leaseUntil<=now | Ambiguous-send terminal suppression, equivalent to existing expired-sending -> unknown. Never reclaim as prepared, even if expiresAt remains in the future |
| failed with retryable=true, supported preparation-failed or allowlisted retryable provider rejection, expiresAt>now, retryAt>now | Preserve failure, attempts and all original clocks; carry only to absent V2 under quiescence/CAS. Defer until ORIGINAL retryAt; key change cannot shorten backoff |
| Same supported retryable failure with retryAt<=now AND expiresAt>now | Safe retry may reclaim through existing claimDelivery after state carry, using original attempts+1 and original expiry/createdAt/cleanupAt, followed by fresh start-transaction eligibility. It is not a first attempt |
| failed with retryable=false, including ineligible/known permanent rejection/expired | No automatic retry for the mapped occurrence, even if provably unsent. Preserve/carry terminal failed outcome and original reason/clocks/attempts; do not rewrite it as fresh pending |
| Any recoverable claimed/retryable record with expiresAt<=now | Expiry forbids a send; retain/carry failed nonretryable expired outcome without refreshing clocks. Backoff/active lease may still defer ownership handling, but can never extend lifetime |
| Unsupported status/phase, invalid required clocks/attempts, unknown failure reason, inconsistent state or unreadable source | Hold/suppress conservatively for review; never silently coerce, assume unsent or grant retry |
| No receipt/stamp evidence for a current/future occurrence whose eligibility window has not ended at the explicit cutoff | Preview clear-noop only; runtime must still pass all fresh legacy/start checks before a normal first V2 claim |
| Missing evidence for a historical occurrence whose local eligibility window ended strictly before cutoverAt | Historical uncertainty is held for review; no historical replay or unsent inference from absence/retention |

Failure reason classification reuses notificationFailure's existing retryable and
rejected allowlists, plus existing preparation-failed/ineligible/expired outcomes;
no new classification changes another sender. Known retryable legacy records
retain their full original retryAt/backoff even when migration executes later.
`createdAt`, `updatedAt`, `expiresAt`, `cleanupAt`, `retryAt` where present,
`leaseUntil`, `attempts`, `lease`, `status` and `phase` are copied exactly for an
eligible prepared/retryable carry; no initial attempts0/default timestamps. Actual
native target create/update commit versions are separate, as documented above.
A nonretryable/expired carry remains failed/nonretryable and cannot regain lifetime.

A recoverable carry requires exactly one unambiguously mapped source V1 owner
and an absent V2 target, with all other overlapping legacy observations absent or
nonconflicting. Multiple possible source owners, a conflicting existing V2, or
incompatible clocks/fingerprints is a preview blocker requiring mapping review,
not permission to pick/reset a source or permanently convert provably safe
prepared work to unknown. No apply may claim completed mapping with an unresolved
blocker. Terminal sent/unknown or nonretryable evidence in ANY overlapping alias
is restrictive and cannot be ignored in favor of a recoverable alias. All mapped
aliases are read again at start, so a changed/new restrictive source stops send.

An unversioned/version1 valid stamp matching any overlapping Yemen date is
acknowledged-send evidence and suppresses. A version2 stamp is local-date evidence
and is never reinterpreted as Yemen time. Unknown/malformed stamp versions/dates
require review rather than being ignored. Runtime current-window eligibility never
sends old dates. Classify the occurrence window using the same local minute/date
predicate and strict cutoff instant, not workstation dates or receipt age.

The runtime may not create an empty fresh V2 receipt over recoverable/deferred/
terminal legacy policy. A recovered/retryable occurrence requires a reviewed,
CAS-bound state carry before shared claimDelivery; absent carry means defer,
not drop-to-unknown or fresh lease. Inside start validation, reread all V1 source
versions, carry lineage and original retry/expiry constraints. V2 attempts cannot
be below inherited attempts; expiry cannot move later or createdAt be reset.
Later V2 provider failures use existing backoff derived from the continued attempt
counter. Any changed legacy outcome/identity prevents start until reconciled.
Because existing claimDelivery replaces a reclaimed document with its known shared
fields, the new optional inline programCompatibility lineage MUST survive that
replacement byte-for-byte when present on a fingerprint-bound program carry.
Preserve that one new metadata field through reclaim; do not add a claim argument,
second claim state machine or generic metadata mechanism. Other sender documents
without the field retain exactly their current write shape/defaults. Malformed
program compatibility metadata fails the program start validator rather than being
silently ignored or rebound. Shared caller regression tests must prove this narrow
metadata retention cannot change episode/broadcast delivery behavior.

Validate date/key pairs as exact tuples. For program wire-review-4, ascending dates
2026-10-26 and2026-10-27 produce keys
67b46c21aaa6afb1c10f7093da14ec8379939090627bfa43e9ac6925f65f5601 and
43d1a107e43ba6820e0eb364baa1cce52a99cbd662ec52f8177cd8a526125588 respectively.
Keep this decreasing-hash counterexample in permanent wire validation tests.

The notifier checks legacy/current-stamp blockers before claim, and MUST reread
program, station, overlapping V1 receipts and current intent in the actual
startDelivery transaction before phase becomes sending. Extend only its existing
optional `validate(tx)` callback contract: default absent preserves boolean
behavior for episode-alerts/user-management callers; false returns false without
starting send. Callback performs reads only. It checks the exact fingerprint,
current offset-derived eligibility and relationship/visibility, and prepares the
existing payload from those transaction snapshots. Callback retries replace the
prepared payload; no external side effect occurs inside a retried transaction.
Only a successful committed start and its matching prepared payload authorize
messaging.send. A failed/throwing validation cannot fall back to earlier reads.

Only terminal/ambiguous compatibility evidence can terminalize a claimed V2
intent through existing finishDelivery as unknown/nonretryable with the allowlisted
suppression reason. Prepared ownership/backoff deferral leaves the claimed intent
unsent and reclaimable according to its preserved lease/expiry, without permanent
unknown conversion; a crash before that finish leaves claimed work which must
repeat the same validation before any later start. No duplicate start state
machine is introduced. Changed-schedule payload conflict is review/skipped, not
a new occurrence, fingerprint rewrite or whole-root accidental resend.

After provider acknowledgement, retain the receipt as the authority. Stamp only
`lastNotifiedDate: localDate` and `lastNotifiedPolicyVersion:2` in a conditional
program transaction checking original native create identity and still-matching
current schedule/relationship. Do not overwrite a newer version2 date with an
older acknowledgement. Stamp failure cannot turn acknowledged sent into retryable
work. Program source IDs, topic names, notification payload and other senders'
claim/start/finish defaults remain unchanged.

### Retention and conditional recovery

Raw64-hex program operation records, including legacy receipts and V2 suppression,
are not automatically deleted by cleanupAt. Retain sent/unknown/ambiguous evidence
and their compatibility lineage until separately reviewed archival can prove
suppression survives; this proposal implements no pruning/TTL shortcut. Do not
scan twenty held records forever and starve unrelated cleanup. Preserve existing
broadcast retention with a separate bounded query restricted to `broadcast_`
ID prefix plus expiry, or an equally proven exact existing-broadcast selector;
inspect actual SDK query/index requirements and register only a necessary index.
Episode receipt/job cleanup remains unchanged. Jobs/entry receipts have no automatic
expiry deletion; finite encrypted backup expiry does not delete delivery evidence.

Rollback means paused/quiesced workers plus conditional verification of owned
postimages and source/create/commit versions. Keep both namespaces and every
terminal suppression; never restore an old pending/failed state, remove a newly
created unknown, reset stamps, delete receipts, resend or revive a deleted program.
A rollback-held checkpoint may be recorded with CAS only after backup and prefix
verification. If current evidence differs, stop and report conflict while workers
remain paused. Restoring a previous deployment is not permission to run old
unaware workers over V2 receipts. No production apply/restore is supported here.


### B15 full nonempty reconciliation persistence — accepted technical contract

Independent technical approval is recorded in
`.boss/technical-review/B15-nonempty-contract-review.md`.
This section specifies the later full04-T09 implementation; it does not authorize
source execution, production mutation or deployment. Existing empty bootstrap is
unchanged. All paths below are under the existing default-deny private count
namespace, for each supported explicit root. No comment body, author identity,
URL, user content or credentials are stored in these records or operational logs.

#### Exact records and wire types

Use the existing root document `{root}/commentCountContributions` and existing
baseline/contribution paths. Add only these subordinate maintenance records:

- Plan: `{root}/commentCountContributions/maintenance/{planHash}`.
- Episode inventory/completion: `{root}/commentCountContributions/maintenance/{planHash}/episodes/{episodeId}`.
- Immutable commit receipts and target heads share
  `{root}/commentCountContributions/maintenance/{planHash}/units/{recordId}`.

`planHash` is64 lowercase hexadecimal characters. `episodeId`/`commentId` use the
existing canonical opaque ID validation. `unitId` for immutable receipts is a12-digit zero-padded decimal
sequence, checked for overflow before allocation. Mutable target-head IDs are
`head-` followed by the immutable `targetKey`: SHA-256 of the canonical JSON
tuple `[targetPath, ownedField]`. For the episode counter, ownedField is exactly
`stats.commentsCount`; for a whole private baseline/contribution record it is null. Validate these
disjoint ID shapes by record kind; never apply receipt-only numeric validation to
heads. Numeric receipt queries use document-ID range `000000000000` through
`999999999999`, orderBy document ID and limit at most the remaining budget. Head
queries use the disjoint `head-` prefix range and the same bounds. These existing
name-range queries require no composite index, new collection or dependency. All counters/cursors are bounded
safe nonnegative integers. All hashes are64 lowercase hexadecimal characters.
All native times retain exact Firestore Timestamp seconds/nanoseconds; null means
proven absence, never unknown. No serverTimestamp transform supplies identity.

The plan record contains `version:1`, `kind:comment-count-reconciliation`, exact
`projectId`, `root`, `planHash`, `beforeRootHash`, `previousAcceptedManifestHash`
(hash or null), `owner`, `generation` (root lease epoch), `phase`, `nextUnit`,
`resumeVerifyUnit`, `resumeHeadCursor` (head ID or null), `resumeChainUnit`
(sequence or null), `resumeExpectedHash` (hash or null), `inventoryCursor` (ID or null), `inventoryCount`,
`inventoryDigest`, `verifyCursor` (ID or null), `verifyCount`, `verifyDigest`,
`currentEpisodeId` (ID or null), `restoreUnit` (integer or null), `restoreMaxApplyUnit` (integer or null), and
`backupPlanHash`. `phase` is exactly one of `inventory`, `staging`, `verifying`,
`activation-barrier`, `active`, `restoring`, `restored-held`. The root's
`countMaintenance` contains `version:1`, `kind:reconciliation`, `planHash`, `phase`,
`nextUnit`, and the final inventory/completion proof fields. Phase/cursor changes
and their unit receipt commit atomically with the root lease renewal. Arrays of
all IDs, versions or receipts are prohibited in the root/plan record.

Each episode record contains `version:1`, `episodeId`, literal `episodeCreateTime`,
`sourceVersion` (immutable native episode version at initial inventory),
`expectedSourceHead` (head ID or null), `sourceCounter` (safe
nonnegative integer), `dataGeneration` (new opaque ID, independent of root epoch),
`previousBaselineHash` (hash or null), `state` (`inventoried`, `staging`, `staged`,
`verifying`, `verified`), `commentCursor` and `contributionCursor` (ID or null), independent
`commentsComplete`/`contributionsComplete` booleans, `publishedCount`, ordered
`commentCount`/`commentDigest`, `contributionCount`/`contributionDigest`, and
`lastUnit` (integer or null). Completion fields are not accepted before both
bounded traversals exhaust. The staged existing per-episode baseline uses
`origin:baseline`, the literal frozen episode createTime, accepted plan hash and
this opaque generation. It is unusable by normal writers while the root is paused.


The existing private maintenance episode record additionally contains a fixed-size
`verification` map while its state is `verifying` or `verified`. Its exact fields
are `commentCursor`, `commentCount`, `commentDigest`, `contributionCursor`,
`contributionCount`, `contributionDigest`, `publishedCount`, `commentsComplete`
and `contributionsComplete`; no extra fields or row arrays are accepted. Cursors
use the existing canonical ID-or-null type; counts are safe nonnegative integers,
digests use the same canonical rolling algorithm as their corresponding staged
proof, and completion flags are booleans. Initialize both cursors to null, all
three counts to 0, both digests to H(JSON([])), and both completion flags to false
when the guarded episode transition starts its independent second pass. The
original staged cursor/count/digest/completion fields are then immutable evidence;
never reuse or reset them as second-pass progress.

Each bounded verification checkpoint atomically advances this separate map with
its existing unit receipt and guarded root/plan checkpoint. The same owner/epoch,
lease, source CAS, backup custody and invocation budgets apply. Each traversal
must independently reach EOF, including an explicit empty result for an empty
scope. Set state `verified` and emit its single immutable episode proof only after
both completion flags are true and the second-pass counts/digests/published count
match the frozen staged proof and verified baseline/counter evidence. A cursor or
flag alone never establishes completion.

An interrupted second pass may continue only after the existing bounded receipt
and target-head recovery proof. If a deliberate restart is necessary before its
immutable episode proof is emitted, reset the entire `verification` map to the
initial values in a guarded checkpoint and repeat both traversals; never reset
only one digest/counter, preserve a completed flag, or alter staged evidence. Once
its immutable episode proof is emitted, do not reset/reemit that proof; recovery
must verify the existing proof under the accepted membership/identity rules or
stop. Missing/malformed progress in a `verifying`/`verified` record refuses normal
continuation; it cannot silently be treated as completed or as a fresh staged
record. This is an internal bounded checkpoint on the existing private episode
record, not a new collection, normal episode/baseline field or public API.

Each receipt is created once with `version:1`, `planHash`, `unitId`, `index`,
`kind` (`inventory`, `comment`, `tombstone`, `episode-finalize`, `verify`,
`restore`), `owner`, `generation`, `episodeId` (ID or null), `commentId` (ID or
null), `backupHash`, `beforeHash`, `afterHash`, and bounded `targets`. At most three
owned targets are permitted: counter field, baseline record, contribution record.
Each target contains `targetKey`, `slot` (integer0..2, unique within its receipt),
canonical `targetPath`, `ownedField`, source `createTime` and
`beforeVersion` (native or null for proven absence), `afterHash`, `previousUnit`
(sequence or null), `previousSlot` (integer0..2 or null with no predecessor), `created` (boolean), and `changed` (boolean). The receipt's immutable native updateTime is the applied commit version
for changed targets. A genuine no-op target instead retains its exact observed
beforeVersion; receipt time must not be substituted. Receipts for inventory/verify
have no owned targets. Conditional deletion additionally requires exact target
create identity and version; recovery never deletes a recreated target.

Each mutable head has `version:1`, `kind:target-head`, `planHash`, canonical
`targetKey`, `targetPath`, `ownedField`, `latestApplyUnit` (sequence or null),
`latestApplySlot` (integer0..2 or null), `currentReceiptUnit` (sequence),
`currentReceiptSlot` (integer0..2),
`currentReceiptKind` (`apply` or `restore`), and `currentImageHash`. A unit reads
its head, original target and prior referenced receipt before any write. It proves
the exact previous postimage/native identity, records the predecessor link, then
atomically writes target, immutable receipt, head and checkpoint. A target created
by the receipt derives native create identity from that original receipt commit;
an existing target retains its literal source createTime. The current target
version derives from the referenced receipt's native updateTime only when that
receipt changed it; a no-op instead retains that receipt target's literal observed
beforeVersion. Proven absence has a null target version, and is accepted only
under the still-exclusive guarded maintenance lineage, not as a claim that an
arbitrary unguarded create/delete history can be detected from absence alone.

Only the latest head may be compared with current target metadata. An earlier
receipt is validly superseded when its successor's explicit predecessor unit/slot
link addresses the same immutable targetKey, and its before-image
hash and exact before-version agree with its proven resulting image/version.
Never compare every historical receipt directly with today's target version.
Resume first checks current heads against their latest apply/restore receipts,
then walks each target's immutable predecessor chain back to its original backed-up
boundary. A receipt's generation is its historical issuance epoch, not a required
match to the current recovered root epoch. Verify its original chain/plan binding;
only new mutations require the current owner/epoch. Persist head/chain cursor and expected proof at each bounded checkpoint;
each receipt/head visit consumes budget. Any broken link or unowned version stops
progress. Do not scan an unbounded suffix to find a later write, trust an unverified
head alone, or restart an unbounded ancestry walk in one invocation. Exclusive
paused root ownership keeps validated prefixes stable while the bounded walk
continues; lease loss restarts this proof under a freshly claimed epoch.

#### Frozen inventory, union and bounded verification

Every apply/resume invocation processes at most `maxItems` work units, default25,
range1..25, serial concurrency1. Each episode/comment/contribution/receipt visited
consumes one unit, including prefix verification and empty episodes; a page is not
one unit. Queries use at most the remaining invocation budget (never over25).
Bounded empty phase transitions also consume one unit. Every ordered query has
limit at most25, and an
item transaction reads only the root, plan, current episode/completion record,
its receipt, at most three owned targets/heads/prior receipts, and at most
one canonical comment required by that unit (at most16 point-document reads). Inventory/page checkpoint transactions may instead read
one query page of at most25 episodes/rows. Do not combine an unbounded receipt
prefix, all episodes or all comments into a final transaction.

After a guarded pause, inventory episodes in document-ID order to EOF, persisting
ordered ID/exact-createTime digest and explicit empty episodes. This immutable
identity digest excludes updateTime/sourceVersion: a legitimate owned counter
finalization changes the episode version without changing its identity. Track
source CAS separately from the immutable inventory digest. Start with the literal
inventory sourceVersion; advance it only through the exact episode counter target
head and verified owned receipts. A later own counter update cannot fail identity
inventory equality, while an unowned version, ABA or changed createTime cannot be
adopted as the new expected source version. Compute inventoryDigest as a rolling
SHA-256: start with SHA-256 of canonical empty-array JSON; in ascending ID order
replace digest with SHA-256 of canonical JSON `[previousDigest,episodeId,seconds,
nanoseconds]`. Both inventory passes use this exact algorithm/count; neither
requires an all-ID array. Mutable versions are validated separately against each
original sourceVersion or verified current counter head.
For each episode, traverse canonical comments and the entire existing private
contribution collection independently to EOF. Stage every current comment from
fresh status/version. A second traversal visits all contribution IDs, including
deleted-comment tombstones and old generations; it reads the corresponding
canonical comment and normalizes the row to the same accepted episode generation.
Already normalized current rows verify/no-op. Missing comments receive zero/null
observed tombstones. Do not derive a count by summing old active contributions,
drop old generations blindly, or treat absence of a baseline as zero. The counter
is installed only after complete canonical traversal and complete union staging.
Only `stats.commentsCount` changes on the canonical episode, preserving all other
fields. Its exact create identity and expected version must match inventory plus
this plan's own proven commits.

Before release, independently re-enumerate the complete episode inventory to EOF,
and reverify every episode's canonical comment ID/native-version/status digest,
normalized contribution union and complete baseline/counter proof in bounded
pages. Compare ordered inventory count/digest and exact create identities. Any
added/deleted/recreated episode, newer unowned source version, modified comment,
missing row or incomplete union stops activation. Each checkpoint rereads the
same root fence and verifies owner/epoch/plan/lease; no completed prefix is trusted
solely because a cursor advanced. On lease recovery, verify the numeric receipt
prefix and target-head predecessor chains in bounded pages using persisted resume
cursors before any new mutation. Source CAS uses the verified latest target head,
not stale initial metadata or an unrelated later receipt. Accepted
replay similarly verifies bounded completion/source proofs read-only; it never
reapplies counters or rows. An `active` return requires this exhausted verification,
not merely finding an active root.

The final transaction reads bounded aggregate completion proofs, the same root
fence and plan, not an unbounded collection. Previously verified prefixes remain
valid because all legal writers are transactionally fenced and only this serial
maintenance owner can mutate them. No collection digest or two scans can prove
isolation from an arbitrary Admin SDK writer that ignores the fence, particularly
an edit after a page was verified. Demo acceptance must demonstrate guarded writer
conflict/retry and adversarial drift rejection at relevant checkpoints. Production
isolation remains unsupported: a caller boolean, synthetic verifier or operator
attestation never closes this gap. Production apply/restore/activation refuses
before any lease or item mutation.

Activation follows the approved native paused-barrier protocol: complete proofs,
owner/epoch/plan, live lease and durable backup are checked before committing the
paused barrier and again in the guarded release. Bind exact literal barrier
updateTime as activeFrom/barrierVersion, release under a later native version,
retain previous lineage, and verify readback. Lease loss requires fresh proof and
barrier under the recovered epoch; it never releases an old barrier.

#### Purpose-bound backups and conditional recovery

Extend only the count-specific encrypted backup format with versioned
`comment-count-plan` and `comment-count-unit` payloads. Unit payloads bind project,
root, reviewed plan hash, sequence, exact native source identities/versions and
owned before/after images. They contain counter values and schema-validated private
baseline/contribution records, never canonical comment data or whole episodes.
Persist and authenticate each immutable payload before the corresponding Firestore
mutation; record its hash in the immutable receipt and durable plan checkpoint.
The existing private configured capability, AES-GCM,0700/0600 custody, fsync,
identity/readback, separate key and recovery-window safeguards apply to initial
lease, every item/checkpoint, resume, barrier, release and restore, even empty work.
No raw backup payload is accepted as a substitute for that private capability.

All transaction reads and fresh-source/receipt/custody checks precede writes.
Item mutation, immutable receipt and progress/root renewal commit together. Lost
acknowledgement resumes by exact receipt and native target versions, not by
repeating the write. ABA and delete/recreate fail even if field values match.
Unknown outcome with no valid matching receipt remains paused, never overwrite.
A missing source or changed version is a conflict, not permission to resurrect it.

Restore claims a fresh root lease against the same reviewed plan, audits the old
namespace to EOF, validates encrypted custody, and verifies the committed prefix
in bounded calls. Before appending any restore receipt, freeze `restoreMaxApplyUnit` as the highest
committed apply-prefix index; do not enlarge it when restore receipts are added.
It walks that frozen apply prefix in reverse sequence with a persisted
`restoreUnit` cursor, at most the remaining25-unit budget, and conditionally restores
only this plan's owned counter fields/private baseline/contribution state.
Each unit reads its current target heads and referenced latest receipt. The head's
latestApplyUnit must identify the unit being undone, but its current physical
version may come from a later immutable restore receipt; never demand the old
apply version after a valid owned restore. Verify exact current native identity,
version and postimage, then atomically write the conditional inverse, a distinct
immutable numeric receipt of kind restore (with `undoneApplyUnit` and, for each
target slot, `undoneApplySlot`, `physicalPredecessorUnit`,
`physicalPredecessorSlot`), progress and
heads. Each head moves latestApplyUnit/latestApplySlot to that apply target's
previousUnit/previousSlot, while
currentReceiptUnit/currentReceiptSlot/currentReceiptKind point to the new restore
receipt target slot and its
currentImageHash. New restore-native versions therefore supersede older versions
explicitly. No-op restore keeps its observed target version. Resume validates this
same restore chain in bounded calls; after-commit lost ACK cannot apply an inverse
twice or make a stale predecessor version authoritative.
Canonical episode/comment creation/deletion, body/status/author/publication edits
and unrelated fields are forbidden. Original creation baselines and mutation rows
must be materialized from the backed-up original native snapshots into explicit
`origin:baseline` / `commentMutation:false` literal native identities before any
rewrite. Where materialization changes a receipt-form record into its explicit
literal form, record exact `restoredProjectionHash` and
`originalProjectionHash` for each restore target slot in the immutable restore
receipt; these bind the verified normalized literal form and original backed-up
receipt-form body, respectively. Eligibility of the next inverse compares the verified normalized image
and latest restore-head version, not raw old receipt-form bytes or old metadata.
The original immutable receipt/native snapshot remains the conversion proof;
normalization is not permission to accept a changed canonical comment. Never
reinterpret a restore write's metadata as the historical receipt.
If canonical comment state changed, conversion cannot prove identity, or an old
baseline was absent/incompatible, retain pause and require reviewed rebaseline;
do not restore a stale contribution or release unsafe legacy arithmetic.

A successful conditional restore ends `restored-held`: preserve isolation, paused
root, previous accepted lineage and durable job/receipts. It does not automatically
reactivate old traffic. A later independently reviewed complete rebaseline and
native activation are required to release compatible writers. Restored plans
cannot apply again. Backup destruction, fence removal or release of old unguarded
workers is not rollback.


### Full04-T09 bounded proof replay and read accounting — accepted technical clarification

Independent technical approval is recorded in
`.boss/technical-review/B15-replay-budget-contract-review.md`.
Source/runtime acceptance gates remain separate.
It does not authorize production isolation, live data operations or deployment.
The full nonempty API remains the accepted exported demo API; no new CLI parser,
service, collection, dependency, public application state or bypass is introduced.
Direct CLI mutation is refused rather than inventing operator key/loading contracts.

**Logical versus physical work.** For the full nonempty APIs, maxItems 1..25 limits
successful logical enumeration/proof work across one invocation: each episode,
comment, contribution, mutable head, immutable receipt or ancestry link visited as
work consumes one unit. An empty query/phase transition also consumes one unit.
A query's result limit cannot exceed the remaining logical budget. Fixed admission
and source/head/receipt CAS rereads needed to make that same item atomic do not
consume duplicate logical units; they are separately bounded to at most 16 point
reads per item attempt. No loop, extra collection page or variable ancestry walk
may be hidden among fixed CAS rereads. A failed/retried attempt never advances the
logical cursor, but all its physical reads count against the invocation ceiling.

Every Firestore transaction explicitly uses maxAttempts 3. Count application-issued
reads and visible SDK transaction callback attempts (including nonexistent
snapshots); charge a query by
its result count, at least 1 for an empty result. Precharge a query by its requested
limit before issuing it, then reconcile to the actual returned count. At most 25
logical units may each enumerate one row/empty result plus 16 fixed CAS point-read
equivalents over 3 attempts (75 enumeration plus 1200 CAS, 1275 total).
At most 4 out-of-unit admission/control transactions, each at most 16 reads over 3
attempts (192), plus 32 nontransaction admission/final read equivalents are allowed.
The absolute invocation ceiling is 1536 physical document-read equivalents; stop
before issuing an operation whose reserved worst-case charge exceeds the remaining
ceiling. The remaining 37 reads after the 1499 maximum are reserve, not another work budget. No recursion
or automatic invocation retry resets these counters. Reaching a cap yields safe
in-progress/refusal before further writes; never claim active/verified on an
incomplete proof. Runtime evidence records attempts, logical visits and physical
read charges. This is an application-issued read-equivalent/visible-callback
attempt bound, not a claim of visibility into internal gRPC transport retries,
provider billing/index-entry charges or SDK latency. No unlimited application
retry is permitted. Fixed admission may perform one old-namespace query with
limit 1: a positive result refuses before mutation, an empty result exhausts that
scoped preflight. Charge it physically within the 32 admission/final reads, not as
a recurring logical business enumeration unit that would starve maxItems1.

**Historical accepted result is not a fresh recount.** Before activation, all
existing frozen source/target CAS, complete union verification, guarded writer
isolation and native barrier requirements remain. Once accepted, legitimate count
workers may change current counters/comments/contributions without rewriting the
historical maintenance result. Read-only accepted replay verifies immutable
historical activation/completion/receipt-chain evidence. It must not demand that
current worker-owned data retain old applied versions, recompute today's count,
or substitute today's mutable target heads for historical evidence. Conditional
restore still validates CURRENT target identity/version/postimages; ordinary later
worker edits may therefore safely block restore even when historical replay passes.

Use the existing private plan/root completion records and numeric immutable unit
receipts. Bind these exact additional completion fields at the paused barrier and
release: `proofMaxUnit` (last historical proof receipt index), `proofReceiptCount`
(exactly proofMaxUnit+1), `proofReceiptDigest`, `episodeProofCount`,
`episodeProofDigest`, `headProofCount`, `headProofDigest`,
`proofTargetSlotCount`, `headChainTargetSlotCount`, and `releaseUnit` (the
next numeric receipt index). Counts are safe nonnegative integers, hashes 64 lower
hex. proofReceiptCount is0 iff proofMaxUnit is null; releaseUnit is exactly
proofMaxUnit+1, or 0 for the empty prefix. The immutable release receipt has
kind verify, proofKind release and empty targets; its proofImage binds these
aggregate fields and the literal paused barrierVersion. No undefined receipt
kind is introduced. Digest ordered
numeric receipts as rolling H(JSON([previousDigest,unitId,bodyHash,nativeSeconds,
nativeNanos])), seeded by H(JSON([])). A receipt's own native version is folded
only after it is observed, never guessed inside its creating transaction. Fold
any last pending receipt before release. Root native release version must equal
the original immutable release receipt's native updateTime exactly and be strictly
later than the literal barrierVersion; activeFrom still equals barrierVersion.
The release receipt binds the same immutable aggregate fields and plan/owner/epoch.
Do not include its unknown native version in a self-referential digest.

During the final bounded verification pass, create immutable kind verify receipts
with `proofKind:episode` or `proofKind:target-head`. Each carries one bounded
`proofImage` and its hash as afterHash. Episode proof images bind inventory ID/native
createTime, complete comment/union digests/counts, accepted opaque data generation,
and baseline/counter target head references. Target-head proof images bind exactly
the then-verified head targetKey/path/ownedField, logical apply unit/slot, physical
receipt unit/slot/kind and image hash. Exhaust the ordered episode/head traversals
under pause; bind their counts/rolling digests into the aggregate completion above.
For episodeProofDigest, start with H(JSON([])) and fold, in strictly ascending
episodeId order, H(JSON([previousDigest,episodeId,H(proofImage)])). Exactly one
proofKind episode receipt is required per frozen episode. Fold its ordered
ID/exact-createTime pair into the same inventory identity algorithm, and require
matching inventory count/digest; duplicates, omissions and reordering reject.
For headProofDigest use the same empty seed and fold, in strictly ascending
targetKey order, H(JSON([previousDigest,targetKey,H(proofImage)])). Exactly one
proofKind target-head receipt is allowed per key; duplicates/reordering reject.
Its proofImage also records chainTargetCount from the fully verified decreasing
predecessor-unit/slot ancestry. Every ancestry slot must have this same targetKey;
strictly decreasing units prevent cycles/repeat visits within a chain, while
distinct keys make chains disjoint. proofTargetSlotCount is the sum of every
owned target slot in the complete immutable apply prefix. headChainTargetSlotCount
is the sum of verified historical head ancestry slots; require exact equality,
as well as head count/digest. This covers every target slot without an unbounded
map, forbids omitted/forked histories and prevents substituting mutable heads.
Replay computes these counts/digests again with persisted current-key/chain cursor,
not an all-ID array or unbounded ancestry loop.
Receipt membership is the complete contiguous numeric range through releaseUnit,
not a caller-supplied subset. Historical proof checks every required receipt's
schema, sequence, plan, immutable native version and backup binding, and every
predecessor unit/slot/hash/version link back to its original backed-up boundary.
Issuance epochs remain historical. Current root/plan/release binding is rechecked
on every replay chunk and at final success. No current mutable head is timeless
proof. Restoration receipts added later do not enlarge the accepted apply proof
range; a root no longer at that accepted active release cannot claim this result.

**Private durable read-only replay progress.** Keep Firestore entirely read-only
for accepted replay. Extend the existing private encrypted count backup capability
with a narrowly purpose-bound local replay head, not a caller-supplied cursor or
new verifier. Its AEAD plaintext contains version 1, kind comment-count-replay,
projectId/root/planHash, exact native accepted root release identity and immutable
proof bounds/digests, owner, revision, predecessorHash, next numeric receipt cursor,
head/ancestry unit+slot cursor, rolling verified proof digests/counts, and expiry.
Every position is schema/range checked against that exact accepted proof. Bind AAD
to purpose/project/root/plan/release/key-custody identity/expiry. Only the private
capability can load or advance this head; caller diagnostic cursors never authorize
progress. An old authenticated payload selected by the caller cannot replace the
current durable head. Each new head authenticates its predecessor hash and advances
revision by 1 through compare-and-swap against the exact currently read head.

Serialize fresh processes using an exclusive 0600 no-follow lock in the already
verified 0700 private backup directory. Validate directory/file owner, inode/device,
key and expiry/custody before lock/read/CAS/publication. Publish a newly encrypted
head through a fresh exclusive 0600 file, fsync it, recheck the locked predecessor,
then atomic rename and directory fsync; read back/authenticate the exact published
head before reporting progress. Lock release checks its owned inode/token. A crash
or unknown publication acknowledgement reloads the exact authenticated durable
head or restarts verification from zero; it never trusts a caller-selected older
position. An abandoned or ambiguous lock fails closed for separate reviewed local
recovery; no age/PID boolean silently steals it. Missing/expired/unverifiable local
progress never grants success: restart proof from zero when safe custody permits,
or stop. Preserve finite backup expiry ceiling and at least 1hour recovery window
on every local/Firestore chunk and final readback. Expiry never automatically
deletes evidence. This local proof checkpoint contains only opaque IDs/native
metadata/hashes/counts, never canonical comment data, user identity or credentials.


### Full04-T09 private checkpoint coverage audit — accepted consolidated technical contract

This is the complete remaining bounded bookkeeping specification for the isolated
implementation, independently approved in
`.boss/technical-review/B15-checkpoint-audit-review.md`. Source/runtime gates
remain separate. Existing accepted
native identities, historical replay, isolation, encrypted custody, read caps,
normal baselines/contributions and restored-held semantics are unchanged. All
records remain in the accepted maintenance plan/episode/unit paths. No public
application wire, service, dependency or collection is added.

In addition to the accepted plan fields, persist these exact bounded fields. A
sequence is a safe nonnegative integer at most 999999999999; reject overflow before allocation; optional sequences
are null. Hashes use the accepted 64-lowercase-hex representation. IDs/cursors are
validated opaque IDs, or null; head IDs have the disjoint head-64hex form.

| Plan field | Type / initialization | Purpose and transition |
| --- | --- | --- |
| lastUnit | Optional sequence, initially null | Latest atomic control/item receipt; nextUnit is exactly lastUnit+1 after the first commit |
| foldedUnit | Optional sequence, initially null | Last native receipt folded into receiptDigest; null when lastUnit is null or 0, otherwise exactly lastUnit-1 |
| receiptDigest | Hash, empty seed initially | Rolling native receipt prefix through foldedUnit, excluding only the latest pending receipt |
| stageCursor | Optional episode ID, initially null | Last completely staged episode; currentEpisodeId identifies the only partial one |
| verifyStage | episodes / heads / receipts / complete, initialized episodes when entering verifying | Second source inventory, historical head proof, fixed prefix check, then barrier eligibility |
| headCursor | Optional head ID, initially null | Last completed historical head proof |
| headVerification | Null or fixed map below | One historical head/ancestry walk, never an all-head map |
| receiptVerification | Null or fixed map below | Frozen pre-barrier receipt-prefix verification; its own new checkpoints are outside its boundary |
| resumeMaxUnit | Optional sequence, initially null | Highest committed receipt captured before a recovery checkpoint is appended |
| resumePhase | receipts / heads / ready, initially ready | Prefix and every effective target head/ancestry must finish before normal maintenance work resumes |
| resumeVerifyUnit | Safe integer, initially 0 | Next receipt in the fixed recovery prefix; may equal resumeMaxUnit+1 at EOF |
| resumeReceiptDigest / resumeExpectedReceiptDigest | Working empty digest / expected hash or null | Recompute exactly the frozen original native prefix, independent of later recovery checkpoints |
| resumeHeadCursor | Optional head ID, initially null | Current/completed head cursor for recovery traversal |
| resumeChainUnit / resumeChainSlot | Optional sequence / slot 0..2, initially null | Exactly one physical predecessor step per logical unit |
| resumeExpectedHash | Optional hash, initially null | Expected current ancestry target projection |
| resumeChainCount | Safe integer, initially 0 | Diagnostic bounded-walk progress, not permission to skip a link |
| resumeHeadsComplete | Boolean, initially false | All ordered heads exhausted; a necessary fresh source pass remains within resumePhase heads |
| resumeSourceCursor / resumeSourceCount / resumeSourceDigest | Optional episode ID /0 / empty digest | Frozen native ID inventory recheck after lease loss in verifying/barrier phases |
| resumeSource | Null or {episodeId,verification} | One separate nine-field source verification scratch map, preserving immutable episode proof state |
| proofTargetSlotCount / headChainTargetSlotCount | Safe counters, initially 0 | All owned apply slots versus disjoint verified historical head ancestry coverage |
| episodeProofCount / episodeProofDigest / headProofCount / headProofDigest | Safe counters0 / empty hashes | Accepted ordered proof aggregation; counts/digests finalized only at exhausted EOF |
| proofMaxUnit / proofReceiptCount / proofReceiptDigest / releaseUnit / barrierVersion | Accepted completion types, absent until release | Exact accepted immutable prefix/release binding |

headVerification is exactly `{headId,image,unit,slot,expectedHash,chainTargetCount}`:
validated head ID, frozen bounded head image, optional sequence/slot, optional hash
and safe count. The frozen image must keep matching the current paused head;
physical predecessor links are checked one at a time. After complete ancestry, emit
one immutable target-head proof, advance headCursor, add count/digest, clear map.

receiptVerification is exactly `{maxUnit,cursor,count,digest,targetSlots,
expectedDigest}`: fixed sequence boundary, next sequence (allowed boundary+1),
safe counts and hashes. Capture maxUnit and expected native prefix digest BEFORE
creating the first verification checkpoint. Traverse only 0..maxUnit; compare exact
count/digest/slot coverage at EOF. Newly appended no-target verification receipts
do not enlarge that traversal; their guarded creation remains part of the final
rolling receiptDigest. No unbounded tail scan is permitted.

The existing per-episode record additionally stores `proofUnit` (null until its
single immutable episode proof exists). `verification` is the independently
approved exact nine-field map. Normal initial verification may initialize/restart
it only under that note's guards, before proof emission. Once proofUnit exists,
verify/recover that original proof; never overwrite original stage digests, reset
that completed proof map or emit another episode proof. Fresh post-recovery source
checks use the separate fixed plan.resumeSource scratch map and do not duplicate
historical proofs. An unfinished initial verification map remains separately
validated; missing/malformed progress never means fresh or complete.

For each unit receipt, add `rootHash`, `planImageHash` and
`episodeCheckpointHash` (hash or null). They hash the exact postcommit private
control/completion data; the receipt's native version must equal the root/plan and
any episode completion rewritten by that unit. Each episode lastUnit binds its
own latest completion receipt, even when another episode later advances the root.
These checks prevent adopting unowned/ABA controller edits. They do not hash raw
canonical comment content or put it in a ledger.

Count-specific encrypted unit payloads bind version/kind/project/root/plan/index,
unitKind, optional episodeId/commentId, at most 3 owned targets, source identity and
checkpoint hashes. Each target carries targetPath/ownedField, original encoded
native before image and owned after projection. Counter images contain only the
integer field; private record images validate only approved baseline/contribution
keys. Source contains only exact episode create/update identity, optional current
comment version/contribution 0..1 and the original private baseline image needed
for native receipt conversion. Checkpoint contains only before/after root/plan/
episode hashes. Optional proofKind/proofImage binds accepted bounded private proof
metadata. No whole canonical episode or comment, URL, author, user content or key
is included. The receipt and authenticated payload must agree on scope, slot count,
before/after projections, native source versions, checkpoint hashes and proof.

#### Phase / recovery coverage and maxItems 1 progress

1. Admission checks the owned transport/custody/old-path range. Initial acquisition
   atomically pauses root, creates plan and immutable no-target receipt. A new
   recovery lease verifies the sealed old controller, captures resumeMaxUnit and
   its expected native digest BEFORE appending its new recovery receipt, increments
   root/plan owner epoch, and resets all bounded resume progress. This is a capped
   admission/control transaction, not a recurring logical work item.
2. Inventory advances one episode ID/native-createTime pair or EOF per logical
   unit. Staging advances currentEpisodeId, one canonical comment, one contribution
   (including deleted tombstones), EOF flags, or final native baseline/counter;
   stageCursor advances only after both traversals and finalization.
3. Verification advances one canonical ID, comment, union row, EOF/comparison,
   head, ancestry link or receipt. Partial maps and immutable receipt/control
   checkpoint commit together. All sources remain transactionally fenced. Capture
   the finite receiptVerification boundary once; never chase its own appended
   verification receipts.
4. A recovery invocation continues the fixed resume prefix across calls, then
   ordered effective head/current-target CAS plus physical ancestry. For interrupted
   verifying/barrier work, re-enumerate complete current IDs/comments/union against
   immutable staged evidence using resumeSource before ready. A new lease loss
   captures a new finite boundary and restarts proof; an ordinary same-owner
   bounded continuation does not reset it. Issuance epochs stay historical.
5. Restore freezes restoreMaxApplyUnit before any restore receipts, descends only
   that original range and appends separate immutable inverses. Logical apply
   heads move backwards; physical heads move to new native restore versions.
   Complete restore stays paused/restored-held. Conditional inverse eligibility
   and native conversion rules are unchanged.
6. The rolling native receipt digest always has a tail of EXACTLY ONE pending
   latest receipt. Each next transaction folds that observed receipt then creates
   its adjacent next numeric receipt. The paused barrier is the final pending
   proof receipt. A bounded release transaction reads/folds just that one barrier
   receipt, sets proofMaxUnit to its index, proofReceiptCount to index+1 and
   releaseUnit to index+1, then creates the adjacent immutable release receipt.
   There is no reserved gap, omitted checkpoint, self-referential native version
   or unbounded final scan. Root/plan/barrier receipt/new-receipt absence need at
   most 4 point reads (within the existing 16-read CAS and invocation caps). Release
   native version is checked later than the literal paused barrier, with exact
   root/release-receipt readback. Recovery invalidates an old barrier and establishes
   a fresh one after required proof; it never releases a stale epoch's barrier.
7. With maxItems 1, fixed admission precedes exactly one finite logical step and
   the persisted cursor/EOF/ancestry/phase transition advances. Fixed admission
   does not spend that logical unit; same-owner continuation preserves progress.
   Recovery-prefix bounds remain fixed while new checkpoint receipts append.
   Read-only accepted replay uses its separate private durable encrypted progress;
   it performs no Firestore checkpoint writes. No cursor supplied by the caller
   may mark a phase complete.

Every transition rechecks current owner/epoch/plan/live lease and encrypted backup
custody/recovery window inside its transaction before all writes. Actual visible
callback attempts and application-issued reads obey the accepted 3-attempt/1536
read-equivalent ceiling; transport retries, provider billing and index-entry
charges remain unobserved. Typed malformed checkpoints, inconsistent boundaries,
missing receipts, changed native identity, failed comparisons or ambiguous commits
stop safely. No implicit restart/ready/activation guess is permitted.


### B16 T11 immutable no-op receipt seal — proposed independent review

The new-tool permanent regression records invalid historical-proof acceptance:
a genuine no-op item receipt can be deleted/recreated with identical data and a
new native create/update time while its unchanged target correctly retains the
literal observed version. Equality of receipt createTime/updateTime alone does
not establish the original receipt's identity. No target/count loss or production
execution is claimed. This amendment strengthens the existing private program
migration job; it introduces no collection, service, dependency or sender state.

Extend the exact version1 `program-date-migration` job field list with only:

| Field | Exact type and meaning |
|---|---|
| `receiptVersions` | Array of at most25 literal native Firestore Timestamps; element i is the independently sealed original createTime AND updateTime of immutable item receipt `{threeDigitIndex000Through024}` at index i. Its length is the authoritative contiguous sealed count. No nullable elements, transforms, epoch-ms identities, caller assertions or independently sorted versions. |
| `pendingReceiptIndex` | Null, or a safe integer0..24 identifying the sole committed item not yet sealed. It is exactly `nextIndex-1` when non-null. |

The original item receipt fields/actions/native target rules remain unchanged.
All other job fields retain their accepted meaning. Unknown/missing fields or old
unreleased demo jobs without the two new fields fail closed; no implicit empty
array, inferred seal, automatic backfill or historical receipt adoption is allowed.

#### Closed prefix states and transitions

1. New jobs initialize `receiptVersions:[]`, `pendingReceiptIndex:null`,
   `nextIndex:0`. An empty reviewed manifest may be `completed` only with that
   exact empty prefix, after the existing source/backup checks.
2. With no pending item, `receiptVersions.length==nextIndex`. An `applying` job
   normally has `nextIndex<entryCount`; `completed` requires
   `nextIndex==entryCount`, `receiptVersions.length==entryCount` and pending null.
   `rollback-held` always has pending null and preserves its entire sealed prefix;
   its nextIndex may describe a partial committed prefix.
3. An occurrence transaction requires pending null and a fully verified sealed
   prefix. It atomically writes the authorized V2 target if changed, creates the
   original immutable item receipt, advances nextIndex once and sets
   `pendingReceiptIndex` to that item's index. It does NOT append an assumed
   native version. The job remains `applying` even for the final occurrence.
4. The only legal pending shape is `receiptVersions.length==pendingReceiptIndex`
   and `nextIndex==pendingReceiptIndex+1<=entryCount`. In particular,
   `applying` with `nextIndex==entryCount` is legal ONLY while the last index is
   pending and the sealed array length is entryCount-1. No new status is added.
5. Before any next occurrence, independent lease/owner/generation rewrite,
   completion, rollback-held transition or verified result, a mandatory seal
   transaction must resolve that pending native commit. It reads the current job
   snapshot and the pending item receipt and requires the original receipt's
   native createTime AND updateTime to equal the job snapshot's native updateTime
   exactly in seconds/nanoseconds. The original occurrence transaction changed
   nextIndex/pending and created the receipt in the SAME atomic commit. Neither
   snapshot metadata may be replaced by serverTimestamp/REQUEST_TIME or a clock.
6. That seal transaction verifies the exact closed job/index/manifest body,
   current program/station/native identities, all applicable V1 before-images,
   target postimage/native proof, existing sealed receipt identities, immutable
   receipt body and the same reviewed private encrypted backup/custody/expiry.
   All reads precede writes. It CAS-checks the job native create/update identity,
   owner/generation and state it read. It then appends exactly the proven pending
   receipt native Timestamp once, clears pending and, for the final item only,
   changes `applying` to `completed` in that same successful seal commit.
7. A live lease permits sealing only by its current owner/epoch. A different live
   owner is refused. If the pending lease has expired, proof must STILL be resolved
   against the untouched original job/receipt commit before ownership changes.
   Only the same successful seal transaction may combine that append/clear with
   expired-lease acquisition: set the caller's validated owner, increment the
   current generation exactly once (reject overflow) and renew the120000ms lease.
   A same live owner may renew its lease as part of sealing without changing epoch.
   There is no preliminary renewal, clock override, operator isolation flag or
   ownership bypass. Recheck internal Date.now ownership/expiry immediately before
   mutation; retry/conflict never converts an unproven pending receipt to sealed.
8. Post-seal readback verifies the exact appended literal prefix/pending/state and
   unchanged target/source proof before reporting progress. Subsequent lease,
   completion and held rollback writes preserve every sealed literal byte-for-byte.
   Every prefix verification compares each immutable receipt's native createTime
   AND updateTime with its stored receiptVersions[i], in addition to the existing
   exact receipt body and target proof. No current receipt can supply its own new
   replacement identity. Missing, recreated or ABA-ed receipts stop without writes.

A crash/unknown ACK before seal leaves exactly one pending item. Cold resume first
validates the same atomic job/receipt native anchor and seals, or stops held; it
never repeats the occurrence or overwrites the anchor with a lease checkpoint.
An unknown seal ACK resumes from either the still-pending proven anchor or the
already-appended literal prefix. It never appends twice, shrinks/rewrites the
array, guesses an original version or replays a target mutation. Restore first
resolves any pending seal, then separately verifies the complete committed prefix
and records non-erasing `rollback-held`. It never changes V2 targets, program/
station/V1 sources or stamps, deletes suppression or fabricates source versions.

Each manifest still contains at most25 occurrences. Each call performs at most
maxItems (1..25) NEW occurrence transactions, each followed by at most one mandatory
seal; it may first resolve the single pending occurrence from an earlier call.
Prefix/proof enumeration remains bounded by the fixed manifest's at most25 entries
with at most2 V1 and1 V2 point reads per entry plus job/item/program/station reads.
Serial execution and maxAttempts3 apply to each application transaction; transport
retries/provider billing are not claimed bounded by these application checks.
Readback, custody and completion checks cannot be skipped to save the budget.
The array is bounded private checkpoint state, not a new receipt framework.

This proof detects a recreated single receipt even for an absent/unchanged no-op
target. It does not claim authenticity against an unisolated privileged actor
rewriting every job/source/proof in a coordinated transaction. Actual old/new
worker and collector isolation remains a production prerequisite; production
apply/restore stays unsupported and refuses before SDK initialization/writes.
Independent contract/source review and actual SDK native/unknown-ACK/expiry/ABA
rehearsal remain required. Existing T10 R13 RED, new-tool guard classifications,
17 original skipped-test identities, full Flutter/device and later approvals are
unchanged; no task/finding is closed.
