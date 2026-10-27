# Content Automation & Lifecycle Contract (`content-automation-contract.md`)

**Project:** HudHud FM (تطبيق الهدهد - البث الإذاعي والبودكاست)  
**Environment:** Firebase (Firestore, Cloud Functions v2, Cloud Storage, FCM)  
**Target Region & Timezone:** Yemen (`Asia/Aden`, UTC+3 / `utcOffsetMinutes: 180`)  
**Design Philosophy:** Zero-Waste Billing, Fault-Tolerant for Unstable Networks, Client-Offloaded Where Possible.

---

## 1. Architectural Guardrails (قيود هندسية صارمة)

أي كود أتمتة يُكتب في مجلد `functions/` أو في تطبيق العميل يجب أن يلتزم بالقواعد التالية دون استثناء:

1. **Zero-Write on Stability (صفر كتابات عند الاستقرار):** يُمنع تحديث أي وثيقة في Firestore ضمن المهام المجدولة (Cron Jobs) إذا كانت الحالة المحسوبة الجديدة مطابقة للحالة المخزنة حالياً.
2. **No Server-Side High-Frequency Polling (منع التحديث اللحظي المكلف):** يُمنع بناء خدمات خلفية (Workers) تحدث حقولاً متغيرة كل ثانية/دقيقة في Firestore (مثل `nowPlaying`).
3. **Topic-Based Messaging Only (الإشعارات عبر المواضيع فقط):** يُمنع جلب قوائم المستخدمين (`users`) لإرسال إشعارات فردية (Multicast) للبرامج أو الحلقات؛ يجب استخدام **FCM Topics** حصرياً.
4. **External CDN First (أولوية الروابط الخارجية):** لا يتم نسخ ملفات الصوت إلى Firebase Storage إلا إذا كان المصدر الأصلي لا يدعم البث المباشر عبر HTTPS، لتجنب استنزاف حصة التحميل (Egress Bandwidth).

---

## 2. Live Stream Health Checker (عقد فحص جودة البث المباشر)

### Public network boundary — November 2026

Stream probes and RSS reads share `functions/lib/public-fetch.js`. Each HTTP(S)
hop validates the URL and all resolved IPv4/IPv6 addresses, rejects private,
loopback, link-local/metadata and reserved destinations, and pins the selected
address in the native request while preserving the original Host/TLS hostname.
Redirects are manual and revalidated, with at most three redirects. TLS checks
remain enabled. Credentials in URLs are rejected; public radio ports remain
supported. Raw resolver/socket errors are not exposed in application errors.

One deadline includes queueing, DNS, redirects, response headers and body reads:
8 seconds for a probe and 15 seconds for RSS. There are at most four concurrent
public fetches per Function instance; the existing station/feed iteration stays
sequential. HLS manifests are limited to 256 KiB decoded, RSS to 2 MiB decoded,
and a non-HLS probe consumes at most a 64 KiB prefix then closes the stream.
Gzip/deflate/Brotli responses are decoded under the same body limits. A bounded
probe is evidence of source response, not a guarantee of continuous playback or
HLS segment availability. No client-triggered polling is introduced.

* **Trigger:** Cloud Scheduler (`every 15 minutes`, Timezone: `Asia/Aden`).
* **Target Collection:** `{root}/stations/stations/{stationId}`
* **Execution Spec:**
  * لا يُستخدم بروتوكول `HEAD` (غير مدعوم في معظم سيرفرات Icecast/Shoutcast القديمة).
  * يُستخدم طلب `GET` مع `AbortController` بمهلة زمنية `8000ms`.
  * **لروابط HLS (`.m3u8`):** التحقق من وجود الترويسة `#EXTM3U` في النص المستلم.
  * **لروابط Icecast/Shoutcast (`MP3`/`AAC`):** قراءة أول Chunk من تيار البيانات (`reader.read()`) للتأكد من تدفق بايتات حقيقية (`value.length > 0`)، ثم تدمير الاتصال فوراً (`reader.cancel()`).

### Data Schema Mutation (تحديث وثيقة المحطة)
```json
{
  "isLive": true,
  "healthStatus": "online | degraded | offline",
  "consecutiveFailures": 0,
  "lastCheckedAt": "ServerTimestamp"
}
```

### State Machine & Thresholds (منطق التحول والتنبيه)

* **حالة النجاح (`isHealthy == true`):**
  * إذا كانت `healthStatus == "online"` و `consecutiveFailures == 0` -> **تجاهل (0 Writes)**.
  * غير ذلك -> تحديث إلى `isLive: true`, `healthStatus: "online"`, `consecutiveFailures: 0`.

* **حالة الفشل (`isHealthy == false`):**
  * زيادة العداد: `consecutiveFailures = prev + 1`.
  * إذا كان `consecutiveFailures < 3`: تُصنف `healthStatus: "degraded"` مع بقاء `isLive: true` (لتجنب إخفاء الإذاعة بسبب تذبذب الإنترنت اللحظي في اليمن).
  * إذا وصل `consecutiveFailures == 3`: تحول إلى `healthStatus: "offline"` و `isLive: false`، وإرسال تنبيه فوري واحد فقط إلى **Telegram Bot API**.

---

## 3. Live Schedule & "Now Playing" Contract (عقد جدول البث وشريط يُذاع الآن)

### A. ICY Metadata & Now Playing (توزيع المسؤولية)

* **Backend (Firestore):** لا يحتوي على حقل متغير لـ ICY Metadata.
* **Client App (Flutter / Mobile):**
  1. يستخرج عنوان البث المدمج (`IcyMetadata`) محلياً عبر مشغل الصوت (`just_audio` / `ExoPlayer`) من نفس اتصال البث المفتوح مجاناً.
  2. يحسب البرنامج المذاع حالياً رياضياً بمقارنة توقيت الجهاز (محولاً إلى `UTC+3`) مع عقدة البرامج المحملة مسبقاً (`weekdays`, `startMinute`, `endMinute`).

### B. Program Start FCM Notifier (إشعارات بدء البرامج)

* **Trigger:** Cloud Scheduler (`every 10 minutes`, Timezone: `Asia/Aden`).
* **Target Collection:** `{root}/programs/programs/{programId}` (أو المسار المعتمد في `station-content-contract.md`).
* **Selection Criteria:**
  * البرنامج نشط (`isActive == true`).
  * اليوم الحالي يطابق مصفوفة `weekdays`.
  * الفرق بين `startMinute` والوقت الحالي بتوقيت اليمن يقع بين `0` و `10` دقائق.
  * حقل `lastNotifiedDate` لا يساوي تاريخ اليوم (`YYYY-MM-DD`).
* **Action:** إرسال إلى موضوع البرنامج في بيئته؛ موضوع التطوير يبدأ بـ
  `hudhuddev_`، والإنتاج يحتفظ بـ`program_{programId}`.

### Durable delivery amendment — November 2026

Program operations live at `{root}/notificationOperations/operations/{sha256}`;
SHA-256 input is JSON `[programId, YemenDate]`, with the root scoped by the path.
`lastNotifiedDate` is a compatibility stamp after provider acknowledgement,
not the concurrency guard. Episode alerts retain the existing private job/device
receipt path and audience rules from [ADR0003](../decisions/0003-station-subscriptions-and-alerts.md).
That ADR permits per-device episode alerts; general program alerts remain topics.

Both senders use the same server-only transaction protocol:

- `pending/claimed`: a ten-minute lease, safely reclaimable if no send began.
- `pending/sending`: ownership is checked before starting the provider call.
  An expired sending lease becomes `unknown`, with no automatic resend.
- `sent`: provider acknowledgement recorded; does not guarantee device receipt.
- `failed`: definite rejection; only retryable provider codes or preparation
  failures retry with exponential backoff from two minutes up to one hour.
- `unknown`: transport/lost acknowledgement, malformed batch result or crash
  during send. Never automatically retry; inspect the safe reason/status through
  trusted operations access. Absence of a provider receipt is not proof of no send.

No exactly-once promise is made. If the provider acknowledged but writing the
receipt failed, the sending lease expires to unknown. A successful durable receipt
still prevents a resend if updating the compatibility program stamp fails.
Program preparation revalidates current schedule; episode preparation rechecks
job ownership, current station/program/episode visibility and relationships,
profile/subscription/opt-out, account-deletion barriers and device ownership.
Private receipts never store raw errors, tokens or user data.

Program and manual-broadcast receipts expire for retry purposes after24 hours and are removed in
bounded batches of20 after30 days. Episode receipts retain job expiry/recursive
cleanup. Existing legacy sent device receipts remain terminal. Client access to
these private collections remains denied, including admin web clients. Rollout
must quiesce older scheduler instances first: the old notifier does not honor
operation leases. Development tests use injected senders; no live FCM send or
real-device acceptance is claimed.

---

## 4. Episodes Ingestion Contract (عقد سحب ونشر الحلقات)

لتجنب حظر عناوين IP الخاصة بـ Cloud Functions وتجاوز حدود وقت التنفيذ:

| نوع المصدر | أداة السحب المعتمدة | سياسة تخزين الصوت (`audioUrl`) |
| --- | --- | --- |
| **RSS / Podcast Feeds** | Cloud Functions v2 (Scheduled `every 2 hours`) | ربط مباشر برابط الـ enclosure HTTPS الأصلي (بدون رفع إلى Firebase Storage). |
| **Direct Upload (`web_admin`)** | واجهة المشرف | رفع إلى Firebase Storage (`{root}/episodes_audio/{episodeId}.mp3`). |
| **YouTube / Social Media** | خارج Cloud Functions (يُنفذ عبر GitHub Actions Worker أو سكربت محلي/VPS عند الحاجة) | استخراج الصوت وضغطه (`64kbps AAC/Opus`) ثم رفعه إلى Storage. |

### Idempotency Rule (منع التكرار)

* يجب توليد معرف فريد ثابت لكل حلقة مسحوبة: `externalId` (مثل `guid` في RSS أو `videoId`).
* قبل إنشاء أي حلقة، يتم التحقق من عدم وجود وثيقة بنفس `externalId` داخل نفس البرنامج.

---

## 5. UGC Comment Moderation Contract (عقد الإشراف الآلي على التعليقات)

التزاماً بسياسات Google Play للمحتوى الذي ينشئه المستخدمون (UGC) وبأقل تكلفة API ممكنة:

* **Path:** `{root}/episodes/episodes/{episodeId}/comments/{commentId}`
* **Client Creation Rule:** عند كتابة تعليق من التطبيق، يُحفظ بالحالة المبدئية `status: "pending"`. (لا يظهر للعامة إلا إذا كان `status == "published"` أو للمستخدم صاحب التعليق نفسه).
* **Trigger:** Firestore `onDocumentCreated` على مسار التعليقات.
* **Two-Stage Filtering Pipeline (فلترة من مرحلتين):**
  1. **المرحلة 1 (Local Regex Filter - مجانية):** فحص النص مقابل قائمة الكلمات النابية والروابط (`http://`, `https://`, أرقام الهواتف المتكررة). إذا فشل -> `status: "rejected"`, `moderationReason: "local_blocklist"`.
  2. **المرحلة 2 (Gemini 2.5 Flash - للمحتوى المجتاز فقط):**
     * استدعاء نموذج `gemini-2.5-flash` مع `maxOutputTokens: 20` و `responseMimeType: "application/json"`.
     * النظام يفحص اللهجة اليمنية والعربية الفصحى ضد: (السب والقذف، التحريض المناطقي/الطائفي، الإعلانات).
     * النتيجة تغير الحقل إلى `status: "published"` أو `status: "flagged"`.

---

## 6. Banners Lifecycle Contract (عقد صلاحية البانرات الإعلانية)

* **Path:** `{root}/banners/{bannerId}`
* **No Cron Job Policy:** لا يتم إنشاء أي دالة مجدولة لتعطيل البانرات المنتهية.
* **Client/Query Enforcement:**
  * يتم جلب البانرات النشطة فقط عبر استعلام التطبيق، ويُفلتر محلياً بالشرط:
    `banner.isActive == true && (banner.endDate == null || banner.endDate > now)`.
  * تنظيف البانرات القديمة يتم تلقائياً عند فتح لوحة التحكم (`web_admin`) أو عبر سياسة **Firestore TTL (Time-to-Live)** المجانية على حقل `expireAt` إذا لزم الحذف النهائي.

---

## 7. Implementation Phasing (مراحل التنفيذ حسب الإمكانيات)

* **Phase 1 (Immediate - Zero Cost Overhead):**
  1. تطبيق فلترة البانرات وحساب "يُذاع الآن" (الجدول + ICY) داخل كود تطبيق العميل.
  2. نشر دالة `checkStationsStreamHealth` (الأولوية القصوى).

* **Phase 2 (Engagement):**
  1. نشر دالة `notifyUpcomingPrograms` باستخدام FCM Topics.
  2. نشر دالة `moderateEpisodeComment` (الفلتر المحلي أولاً، ثم ربط Gemini API).

* **Phase 3 (Expansion):**
  1. نشر دالة سحب خلاصات البودكاست القياسية (`RSS Ingestion`).

---

## 8. Google Sheets Ingestion Schema & Batch Import Contract

Google Sheets is an editorial staging surface in this phase. Content enters
Firestore only through a reviewed XLSX/CSV batch import in `web_admin`; there is
no live Sheets sync, scheduled import, or direct Sheets write to Firestore.
The importer must use the existing content validation and relationship-aware
save path. It must preview all rows and report row-level errors before writing.

### Programs sheet

| Column | Type | Validation and mapping |
| --- | --- | --- |
| `stationId` | String | Required; must identify an existing station in the selected root. |
| `programId` | String | Required stable identifier; becomes the Firestore document ID. |
| `title` | String | Required Arabic title. |
| `weekdays` | String | Required comma-separated ISO weekdays 1–7; reject empty, invalid, or duplicate values. |
| `startTime` | String `HH:mm` | Required 24-hour time; convert to integer minutes after midnight. |
| `endTime` | String `HH:mm` | Required and later than `startTime`; accept `24:00` only as the end-of-day sentinel and map it to `1440`. |
| `utcOffsetMinutes` | Number | Must equal `180` for this Yemen schedule import. |
| `isActive` | Boolean | Required explicit editorial choice; never infer activation from a missing cell. |
| `isFeatured` | Boolean | Required explicit value. |
| `priority` | Integer | Required ordering value. |

The importer constructs `schedule: {weekdays, startMinute, endMinute,
utcOffsetMinutes}` and initializes required `stats` fields to zero for new
programs. The Firestore document ID is canonical; `programId` is not duplicated
as a mutable data field unless a separate schema decision requires it.

### Episodes sheet

| Column | Type | Validation and mapping |
| --- | --- | --- |
| `episodeId` | String | Required stable identifier; becomes the Firestore document ID. |
| `programId` | String | Required; must identify a program in the selected root. |
| `title` | String | Required non-empty title. |
| `audioUrl` | URL | Required HTTPS URL with a valid authority. |
| `durationSec` | Number | Required non-negative integer; maps to `durationSeconds`. |
| `broadcastAt` | Date/time | Required valid timestamp; imported consistently as a Firestore Timestamp. |
| `utcOffsetMinutes` | Number | Must equal `180` for this Yemen content import. |
| `isPublished` | Boolean | Required explicit editorial decision; missing values must not publish an episode. |
| `isFeatured` | Boolean | Required explicit value. |
| `priority` | Integer | Required ordering value. |

The importer derives `stationId` from the referenced program and rejects a row
whose program or station relationship is missing or inconsistent. It maps
`durationSec` to the canonical `durationSeconds` field and initializes the
required episode `stats` counters to zero for new documents. Optional metadata
such as description, cover URL, presenter, guest and published date may be
added as columns only when they pass the existing canonical validation.

### Import and error policy

- Validate the selected Firestore root and all identifiers before any write.
- The preview shows normalized values, new versus existing document IDs, and
  every rejected row with a column-specific reason. No commit is allowed while
  any row is invalid; the editor may correct the sheet and preview again.
- Re-importing an unchanged row is a no-op. An existing ID with changed data
  requires an explicit update choice and a preview of the changed fields;
  import never deletes Firestore documents when rows are absent from a sheet.
- Commit through the existing `web_admin` relationship-aware save flow so
  station/program counters remain consistent. A failed row is reported and can
  be retried without duplicating successful rows.
- Do not import server-owned counters, moderation state, creation timestamps,
  notification markers, or other fields outside this schema.

### Manual broadcast operations

`adminBroadcastNotification` requires a stable `operationId` (16–100 ASCII
letters/digits/underscore/hyphen). The server scopes its SHA-256 key by caller and
root, binds it to a fingerprint of the normalized payload, and rejects reuse with
changed content. The admin composer keeps that ID on retries of the same payload
and creates a new intent after successful completion or content/account/root
changes. This ID is in memory: after reload, review history before composing a new
broadcast. It does not claim to deduplicate independently created intents/tabs.

History is recorded before a send begins. The private delivery receipt is the
source for `pending/sent/failed/unknown`; history updates read it transactionally.
A provider acknowledgement is retained before updating history so a failed
history write can be repaired on retry without another send. History timestamps
represent the latest recorded state, not proof of device receipt. Admin clients
may read/delete history but cannot create or forge outcomes. Removing history
does not remove delivery deduplication. The callable returns status/retryable;
only `sent` is success. Unknown/pending leave the composer intact with safe text.

Development announcements use `hudhuddev_hudhud_fm_announcements`; Official
retains `hudhud_fm_announcements`. Flutter reconciles previous topic memberships
when platform permission allows, unsubscribes both topics on opt-out, and rejects
payloads explicitly marked for another root. Denied-permission initialization
never requests a token/topic operation or permission prompt. Existing clients
need the compatible topic update before testing Development announcements.

## B01 automation amendment — C04, 2026-10-26

This amendment and ADR 0006 supersede fixed-Yemen program eligibility/receipt-key
semantics and the initial-pending comment description above. Scheduler trigger
cadence/timezone, public network controls, episode audience rules and delivery
states remain unchanged. It is an implementation target, not deployment evidence.

### RSS and historical identity

Decode the five predefined XML entities and valid decimal/hex numeric character
references exactly once in ordinary XML attributes/text before validation and
identity calculation; preserve CDATA literal semantics. Reject malformed/unknown
references and XML-invalid scalar values in the affected item. Reject feeds with
DTD/entity declarations without expansion, external resolution or new requests.
Retain existing document IDs. Resolve raw and decoded identity aliases, including
GUID-less enclosure fallback, against known episode IDs/import reservations before
creation; both aliases may bind only to the same existing episode. An alias
collision is a conflict, never an automatic merge. URL-only repairs preserve
publication, counters and audit identity and must not emit a real notification.

### Fair health progress

Preserve sequential station probes and the shared four-outbound-fetch cap. Each
root receives a 100,000ms budget inside the existing 300,000ms scheduler timeout;
reserve at least 40,000ms invocation-wide for cleanup/flush. Before starting each
primary+backup pair, require 16,000ms worst-case probe allowance plus 10,000ms
flush margin. Lease expiry is 120,000ms from acquisition. An injected clock and
probe make budget tests deterministic; no guessed performance claim.

Read stable document-ID pages of at most 50 stations. Advance the private cursor
only after a completed unit, not to the end of a prefetched page. Verify lease
owner/generation, current station existence and unchanged probed stream identity
before committing results and progress. A changed/deleted station is safely
skipped, never recreated or overwritten with stale health. End-of-catalog wraps
for the next invocation, not an unbounded loop in the current one. Expired leases
may be reclaimed with a new generation; a stale worker may not write or advance.
Give both roots budget even if one root has an active lease or slow sources.
Stable station documents retain zero-write/heartbeat rules; bounded lease/cursor
writes are an explicit operational exception and are counted separately.

### Comment counts and moderation

Client comment creation remains `published` as implemented by current Rules;
existing moderation can reject/flag/hide/remove it. Retain existing AI/error and
manual-decision precedence, with deterministic injected moderation in tests.
Use the single contribution authority and private state from the data contract
for automatic moderation, on-write/delete events, manual review and account
deletion. Remove competing decrement/recount-overwrite paths. Parent deletion,
replay, duplicate/out-of-order delivery and generation replacement must converge
without resurrecting content or producing negative counts. Legacy baseline uses
explicit enforced scoped write quiescence, verified complete staging and atomic
activation; no partial ledger or plain aggregate overwrite counts as a baseline.

Count-authority activation is a rollout precondition, as specified in the data
contract's operational cutover section. An absent fence keeps OLD deployed legacy
normal flow; it is not permission to enable NEW count-aware normal traffic without
an accepted baseline. Misordered new events retry, and count-affecting manual/
status/delete transactions fail before mutation; no legacy recount/clamp fallback
is introduced. Correct sequencing uses the already-approved maintenance isolation
and pause, complete baseline activation, then compatible traffic release. Rollback
keeps pause/isolation until compatible authority or reviewed rebaseline is ready;
it cannot resume old unsafe count writers over active ledgers. Native episode
creation identity and accepted data generation remain distinct from the root
lease epoch. These are deployment-safety clarifications, not new product flows.

### Program eligibility and durable occurrence identity

Use each accepted schedule's fixed UTC offset for weekday/minute/local date;
Yemen remains offset 180. Eligibility retains the inclusive upcoming 0..10-minute
window and active-program/valid-schedule checks. V2 operation key is SHA-256 of
JSON `['program-start-v2', programId, localDate]`, scoped by root path. One
program/local-date occurrence is not multiplied by changing the schedule.

Pass a canonical fingerprint of station identity, active state and complete
normalized schedule to existing `claimDelivery`. Its existing payload-conflict
behavior binds that occurrence intent. Revalidate current program/station,
visibility, fingerprint and current eligibility in the same read-before-write
transaction that changes the leased receipt to `pending/sending`; a separate
pre-read leaves an unacceptable schedule-edit race. Extend existing
`startDelivery` with an optional transaction validation callback, default absent
for unchanged callers; return false without starting a send if validation fails.
Do not duplicate or bypass the shared delivery protocol. This source must be
registered in B16's owned write set before implementation.

`pending/claimed`, `pending/sending`, `sent`, `failed`, `unknown`, leases, retry
backoff and provider acknowledgement semantics remain intact. A changed bound
schedule is not rebound or retried as a different payload for the same occurrence.
Unknown/sent never auto-retry. `lastNotifiedDate` is only an acknowledged-send
compatibility stamp: v2 writes local date with `lastNotifiedPolicyVersion: 2`,
conditionally against the still-matching schedule; the receipt owns deduplication.

Cutover pauses old/new workers. For each new local-day interval compute all
intersecting Yemen dates and check their legacy receipt keys and unversioned
compatibility stamp. Legacy sent/unknown or ambiguous sending evidence suppresses
the corresponding v2 occurrence conservatively. Ambiguous historical mapping is
suppressed for operator review, never deleted/reset to force delivery. Existing
expiry/retention does not grant permission to replay an acknowledged occurrence.
Rollback keeps both receipt namespaces and pauses/reconciles workers; it does not
blindly restore old keys. Live cutover timing and manifests remain a later scoped
operational approval, not an implementation default.

### C04-COUNTS maintenance enforcement follow-up — 2026-10-26

Count-baseline quiescence now uses the existing private root activation document
as an explicit paused/active transaction fence; see the data contract's
C04-COUNTS enforcement amendment. Episode identity-changing writes, comment
creation/status/deletion, RSS ingestion, editorial saves/deletes, automatic/manual
moderation and account-deletion comment cleanup all participate. Normal writer
pre-reads followed by unchecked batch writes are forbidden. Expired maintenance
leases leave the root paused, not automatically open.

Frozen inventory is a complete ordered list of episode document IDs and exact
Firestore create times captured after pause, then independently re-enumerated
and compared before activation. A replaced episode with the same ID conflicts.
Both new count and existing moderation event handlers retry paused work instead
of silently acknowledging it. Deferred RSS items cannot be marked accepted.
No real message/send is part of the maintenance proof.

Current apply/rehearsal is demo/emulator-only. Production mutation is refused
until supported platform enforcement verifies old/unowned Admin SDK writers are
quiescent as well as the cooperative source/Rules fence. Final inventory drift
detection cannot turn a non-enforced production freeze into a safe one. This
external G-O4-READY requirement does not block independently released C03,
C04-RSS, C04-HEALTH or C04-TIMEZONE source work.

### C04-TIMEZONE wire refinement — proposed B16 handoff

The data contract's B16 wire refinement defines the exact canonical schedule
fingerprint, offset-derived same-local-day minute predicate, V1/V2 key tuples,
private suppression/job/receipt shapes and start-transaction compatibility checks.
This retains the user-approved offset policy and existing topic/payload contracts. The exact legacy state matrix preserves safe
expired prepared-work reclaim and known retryable backoff, while terminal/
ambiguous sending remains suppressed. A V2 key never resets original attempts,
retryAt, expiry or nonretryable outcome; missing V1 fingerprint alone is valid.
Changing a schedule cannot issue a second intent for one program/local date.

The shared delivery addition is optional read-only validate(tx) at the existing
start boundary, default absent for episode/broadcast senders. Validate the fresh
program/station, fingerprint, eligibility and overlapping legacy receipts before
sending; build payload from those same transaction snapshots. Existing sent/
unknown/lease/backoff semantics remain. A compatibility suppression is unknown,
nonretryable, explicitly reasoned and never a fabricated provider acknowledgement.

Migration never deletes/rebinds sent/unknown, resets stamps, sends messages or
opens unsafe rollback. Hold raw64-hex program receipts regardless of cleanupAt;
preserve broadcast retention with a bounded prefix-specific query and review any
actual required index. Private delivery evidence is not TTL'd merely because a
backup expires. Cutover timing is an explicit future operator input, not a code
constant or product-policy reconsideration. Production mutation remains refused
without independently established old/new notifier/collector quiescence and drain.
