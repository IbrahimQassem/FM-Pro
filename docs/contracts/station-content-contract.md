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
  <- {root}/programs + {root}/episodes (`HudHudDev` or `HudHudOfficial`)
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
- لا كتابة لإحصاءات الاستماع أو الإعجاب أو عدادات التعليقات من العميل.
- عرض/إضافة التعليقات مملوك لعقد الحساب والتعليقات؛ تنزيل الحلقات خارج النطاق. المشاركة الحالية تستخدم وصف الحلقة والبرنامج
  والمحطة ورابط المتجر العام، ولا تكشف رابط الصوت.

## التحقق

- mapper valid/invalid لكل نوع وتوقيت Firestore حقيقي في الاختبار.
- domain tests لحالات الجدول وحدود المنطقة الزمنية.
- controller tests لـserver/cache/offline/error واختيار اليوم.
- widget tests للتنقل من البرنامج ولتشغيل الحلقة وحالات الفراغ والخطأ.


Episode alerts may refresh canonical station content before opening ProgramDetails,
with the selected episode highlighted first; they do not introduce another player
or automatically play. The station-level snapshot/read contract remains unchanged;
program-scoped pagination is deferred until measured catalog growth justifies it.

## B01 contract amendment — C03/C04, 2026-10-26

Status: implementation target approved by the user's completion-plan decisions;
independent contract review and implementation evidence remain required. This
amendment supersedes the earlier station-only/local-sort read policy, the
no-additional-program-read restriction, the deferred-pagination paragraph, and
fixed-Yemen interpretation of schedule evaluation. All other architecture,
playback, privacy and account boundaries remain unchanged.

### C03 bounded content interface

- Keep `presentation -> domain <- data`, Riverpod composition and the existing
  player. Data sources own SDK queries; domain cursors contain values, never
  Firebase snapshots. The existing cache-first/server-refresh entry point remains
  available while consumers migrate; a partial page must not masquerade as a
  complete `StationContentBatch`.
- Active programs query by canonical `stationId` and `isActive == true`, ordered
  `isFeatured DESC, priority DESC, title ASC, documentId ASC`. The title tie rule
  retains Flutter's existing featured/priority/title intent; the last ID removes
  ambiguity. Firestore server ordering is authoritative, not locale-sorting a
  partial page. Public web adopts the same order, explicitly replacing its former
  priority/title-only order.
- Published episodes query by canonical `stationId` and `isPublished == true`,
  additionally `programId` for a program page, ordered `broadcastAt DESC,
  priority DESC, documentId ASC`. Public web's former title date-tie order is
  replaced by priority/ID; existing Flutter date/priority intent remains.
- Return at most 50 items from at most 51 raw documents per request (one
  lookahead). The next cursor uses the last consumed raw document, not the
  lookahead or last successfully mapped item. An empty mapped page with a cursor
  is not end-of-data. Reject invalid documents individually and report counts
  without their values. Never loop automatically through discarded pages.
- A cursor includes version 1, root, resource, station/program scope, canonical
  filter/order fingerprint and the full last-consumed sort tuple including ID.
  Preserve timestamp seconds/nanoseconds in cursor values. Reject wrong version,
  malformed tuples or cross-root/filter/sort/parent cursor reuse before IO.
- Cache pages are scoped by the same identity and explicitly marked cache/offline.
  Never advance a server traversal with a cache-derived cursor. Refresh creates
  a new generation and discards stale completions; filter/parent/root changes
  invalidate old cursors. A later-page error preserves loaded items with retry.
  Deduplicate IDs. Concurrent mutations do not provide snapshot isolation;
  provide refresh for documents moved before the cursor.
- Initial station content loads the active-program page, then an episode page
  for the explicitly selected program or the first active program in that page;
  with no active program it returns no episode page. It is not a complete station
  archive. Program cards use canonical `stats.episodesCount`, never the size of a
  partially loaded episode list. Selecting another program starts its scoped
  page; a directly linked unloaded program is validated by direct lookup. This
  avoids treating absent parents in a partial program page as invalid and avoids
  unbounded parent hydration.
- ProgramDetails obtains its program-scoped episode page through the repository;
  it does not infer completeness from the station page. Deep links directly read
  and validate episode/program/station, root, visibility and canonical parent
  IDs, within three document reads, never traverse pages or autoplay.
- Initial content uses at most one programs query and one episodes query (51 raw
  documents each). Render at most 100 episode rows; group once per page change.
  Existing URL parameters and public sharing contracts remain compatible.

### C03 preparation and acceptance

Ordering fields must exist and have the mapper/validator types before enabling
ordered production queries. In particular, no missing `broadcastAt` is fabricated
from now or an unrelated timestamp. Missing required flags/title/time/parent data
is an unresolved repair record. Explicit reviewed repair may set missing priority
to integer 0 and missing `isFeatured` to false only; it must not invent visibility,
parents or chronology. Add only indexes derived from the query tuples above and
actual admin resource queries. Emulator success does not prove deployed index
readiness. Legacy audit, conditional repair and index readiness remain deployment
prerequisites, with old read compatibility retained until that cutover.

Test 101+ mixed draft/published records, equal sort values, empty/malformed pages,
missing legacy fields, stale cache, cancellation and concurrent reorder/delete.
A distant episode beyond 10,000 must open through validated direct lookup. No
archive-size array or unbounded listener is introduced.

### C04 schedule semantics

The schedule's accepted fixed `utcOffsetMinutes` controls weekday, minute and
local date for both client status and program alerts. Yemen data remains 180;
other accepted offsets remain valid. ISO weekdays stay Monday 1 through Sunday 7,
end-of-day stays 1440, and overnight periods remain unsupported. This is a fixed
UTC offset contract, not a new IANA timezone/DST feature. Durable alert identity,
conservative legacy cutover and send-state rules are defined by ADR 0006.
