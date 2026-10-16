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
* **Action:**
  * إرسال إشعار FCM إلى الموضوع: `program_{programId}`.
  * تحديث حقل واحد فقط في وثيقة البرنامج: `lastNotifiedDate: "YYYY-MM-DD"` لمنع تكرار الإشعار (Idempotency).

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
