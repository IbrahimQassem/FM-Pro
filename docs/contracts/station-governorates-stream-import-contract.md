# Station Governorates, Stream Health, Brand Identity, and Import Deduplication Contract

الحالة: ملزم (Binding Contract)  
تاريخ الاعتماد: 2026-10-20  
النطاق: Firestore Schemas, Cloud Functions, Web Admin (`web_admin`), Public Web (`web_hudhud`), Flutter Mobile App (`lib/`)  

---

## 1. الحدود المعمارية والمسؤوليات (Architectural Boundaries)

```text
[Firestore Root: HudHudDev / HudHudOfficial]
 ├── locations/locations/{locationId}           <-- Canonical Yemeni Governorates & Cities
 ├── stations/stations/{stationId}              <-- Stations with strictly validated cityCode & health metadata
 ├── programs/programs/{programId}              <-- Station Programs (deduplicated by stationId + title)
 ├── episodes/episodes/{episodeId}              <-- Episodes (deduplicated by programId + audioUrl / deterministic ID)
 └── users/users/{uid}/subscriptions/station_{id} <-- Follow/Subscription records (self & server managed)

[Web Admin]
 ├── LocationPicker in ContentEditor (stations)  <-- Synchronizes (cityCode, cityNameAr, countryCode, countryNameAr)
 ├── BatchImport Engine (batch-import.ts)        <-- Strict intra-sheet & cross-database deduplication
 └── Healthy & Stopped Stream Filter Badges      <-- Real-time health reflection and filters

[Flutter & Web Public Clients]
 ├── Luxury Radio Mascot (station_placeholder.webp) <-- Universal fallback for stations without logoUrl
 ├── Stream Stoppage Notice Banner & Disclaimer     <-- Source outage attribution & liability disclaimer
 ├── StationFollowControls                           <-- Self-healing listener profile & multi-role support
 └── Modernized StationCard (Grid & List)           <-- 20px radius, subtle border, metadata chips, accessible
```

---

## 2. عقد المحافظات وهوية المواقع (Governorates & Location Identity Contract)

### 2.1 الثوابت المرجعية لمحافظات اليمن (Canonical Governorates)
1. تحتوي مجموعة `locations/locations` في كلا الجذرين (`HudHudDev` و `HudHudOfficial`) على جميع المحافظات والمراكز الإذاعية الـ 22 الرئيسية في اليمن:
   - `sanaa` (صنعاء / أمانة العاصمة)
   - `aden` (عدن)
   - `taiz` (تعز)
   - `mukalla` (المكلا - حضرموت الساحل)
   - `seiyun` (سيئون - وادي حضرموت)
   - `hudaydah` (الحديدة)
   - `ibb` (إب)
   - `marib` (مأرب)
   - `dhamar` (ذمار)
   - `shabwah` (شبوة - عتق)
   - `al_mahrah` (المهرة - الغيضة)
   - `lahj` (لحج - الحوطة)
   - `abyan` (أبين - زنجبار)
   - `socotra` (سقطرى - حديبو)
   - `saadah` (صعدة)
   - `amran` (عمران)
   - `hajjah` (حجة)
   - `al_mahwit` (المحويت)
   - `raymah` (ريمة)
   - `al_jawf` (الجوف)
   - `al_bayda` (البيضاء)
   - `al_dhalee` (الضالع)
   - `yemen` (الإذاعات العامة / الوطنية)
2. تكون جميع هذه الوثائق مفعّلة بـ `isActive: true` و `countryCode: 'YE'` و `countryNameAr: 'اليمن'` مع ترتيب فرز رقمي `sortOrder`.

### 2.2 التزامن والنزاهة في المحطات (Station-Location Integrity)
1. **إلزامية منتقي المدينة (`LocationPicker`)**:
   - لا يُسمح بإدخال أو تعديل محطة في لوحة الإدارة دون اختيار صريح للمدينة من القائمة المرجعية المعتمدة.
   - عند الاختيار، تُسند الحقول الأربعة ذرياً في نموذج المحطة:
     ```ts
     cityCode: selected.cityCode,
     cityNameAr: selected.cityNameAr,
     countryCode: 'YE',
     countryNameAr: 'اليمن'
     ```
2. **حظر الفشل الصامت للمواقع القديمة**:
   - يتم تشغيل سكربت معالجة وتطهير جذري للبيانات القديمة لربط كل محطة قائمة بمعرف `cityCode` معتمد، وتحديث مؤشرات `adminRelationRevision` تلقائياً لمنع ظهور خطأ: `"تغيّرت بيانات المدينة. أعد اختيار المدينة قبل الحفظ"`.

---

## 3. عقد الأصول الافتراضية والشعار (Station Brand Identity & Placeholder Contract)

### 3.1 الشعار الافتراضي الموحد (`station_placeholder.webp`)
1. الصورة المعتمدة رسمياً للمحطات التي لا تملك شعاراً هي تميمة الراديو الفاخرة بالألوان الدافئة:
   `station_placeholder.webp`.
2. يتم نسخ الملف إلى المجلدات العامة للمنصات:
   - `web_admin/public/images/station_placeholder.webp`
   - `web_hudhud/public/images/station_placeholder.webp`
   - `lib/assets/images/branding/station_placeholder.webp` (موجود بالفعل في Flutter).
3. **قاعدة العرض في جميع المنصات**:
   - إذا كان `logoUrl` أو `thumbnailUrl` فارغاً أو غير صالح أو فشل تحميله (`onError`)، يتم عرض `station_placeholder.webp` كخلفية افتراضية بانحناء زوايا مطابق للشعار (18px في Flutter، `rounded-xl` في الويب).
   - لا يُعرض حرف مجرد أو أيقونة مفرغة كبديل رئيسي للشعار عند توفر أصل التميمة الفاخرة.

---

## 4. عقد إتاحة البث وإخلاء المسؤولية (Stream Stoppage & Health Disclaimer Contract)

### 4.1 إشعار إخلاء المسؤولية المعتمد
عندما تكون المحطة في حالة توقف مؤقت أو تعثر في البث (`StationStreamHealthState.temporarilyStopped` أو `noOnlineSource`)، يُلزم النظام بإبراز البيان التالي بنص واضح ومحدد:

> **«تنويه البث المباشر:»**  
> *«البث المباشر لهذه الإذاعة متوقف حالياً من المصدر الإذاعي نفسه. هدهد إف إم منصة ناقلة ولا تتحمل مسؤولية الانقطاعات الفنية الصادرة من استوديوهات المحطة. بإمكانك تجربة إعادة الاتصال أو الاستماع إلى أرشيف البرامج والحلقات المسجلة.»*

### 4.2 قواعد الواجهة وتجربة المستخدم (UI/UX Invariants)
1. **عدم الحذف أو الإخفاء**:
   - توقف البث لا يعني إخفاء المحطة من الشاشة الرئيسية، ولا حذفها من المفضلة، ولا منع الوصول لأرشيفها وحلقاتها المسجلة.
2. **زر التشغيل التعويضي (`Try Listening`)**:
   - يتحول زر التشغيل الرئيسي إلى زر «محاولة الاستماع» بنبرة تحذيرية هادئة (Amber/Warning Tonal)، مع إتاحة المحاولة اليدوية للمستمع دون الدخول في حلقة إعادة اتصال غير محدودة.
3. **بانر التنويه**:
   - في شاشة تفاصيل المحطة في Flutter وموقع الويب، يظهر كارت التنويه تحت زر التشغيل متضمناً نص إخلاء المسؤولية وأيقونة توقف البث.

---

## 5. عقد فلاق وتصفية البث السليم (Healthy Stream Flag & Filter Contract)

### 5.1 تعريف البث السليم (Healthy Stream Criteria)
تُعد المحطة ذات «بث سليم ومتاح» إذا تحققت الشروط الآتية:
1. `healthStatus === 'online'`
2. `consecutiveFailures === 0`
3. الفحص سارٍ ضمن نافذة الحداثة الزمنية (Freshness Window ≤ 45 دقيقة).

### 5.2 الشارة والفلتر في لوحة الإدارة (Admin Badges & Filter)
1. **فلتر سريع صريح**:
   - إضافة فلتر `healthy` إلى شريط تصفية المحطات السريعة:
     ```ts
     type FeatureFilter = 'all' | 'healthy' | 'live' | 'featured' | 'verified' | 'stopped';
     ```
2. **شارة بصرية خضراء نشطة**:
   - عرض شارة `🟢 بث سليم (أساسي)` أو `🟢 بث سليم (بديل)` مع تفاصيل زمن آخر فحص عند التمرير (Tooltip).
   - تمييز حالات الرصد السبع بوضوح بالأيقونة والنص واللون في جدول وبطاقات الإدارة.

---

## 6. عقد استيراد المحتوى الذكي ومنع التكرار (Batch Import Deduplication Contract)

### 6.1 منع التكرار داخل نفس الملف المرفوع (Intra-Sheet Deduplication)
1. يفحص المحرك أي تكرار للمعرفات (`id`) داخل أوراق العمل؛ وإذا تكرر المعرف يُرفض الصف المكرر بخطأ:  
   `"المعرّف مكرر داخل هذا الملف في السطر {X}"`.
2. يفحص المحرك تكرار المحتوى داخل الملف:
   - البرامج: لا يُسمح بوجود صفين بنفس `(stationId + title)`.
   - الحلقات: لا يُسمح بوجود صفين بنفس `(programId + audioUrl)` أو `(programId + title)`.

### 6.2 المطابقة مع قاعدة البيانات والتحويل إلى تحديث (Cross-Database Deduplication)
1. **البرامج**:
   - إذا استورد برنامج بعنوان موجود مسبقاً لنفس المحطة (`stationId`)، يتم التعرف عليه ومطابقته مع الوثيقة القائمة تلقائياً:
     - إذا كانت البيانات مطابقة: يُصنف كـ `unchanged` (تخطي دون كتابة مكررة).
     - إذا كانت البيانات مختلفة: يُصنف كـ `update` مع عرض الفوارق (`diff`) لتحديثه ذرياً بدلاً من إنشاء برنامج مكرر.
2. **الحلقات**:
   - إذا استوردت حلقة برابط صوت `audioUrl` موجود مسبقاً لنفس البرنامج (`programId`)، تُطابق مع الحلقة القائمة:
     - إذا كانت متطابقة: تُصنف كـ `unchanged`.
     - إذا كانت مختلفة: تُصنف كـ `update` لمنع مضاعفة الحلقات لنفس الملف الصوتي.
3. **الهوية الحتمية (Deterministic Identity)**:
   - عند غياب المعرف الصريح، تُولد المعرفات عبر تجزئة حتمية `hash(programId + audioUrl)` لضمان عدم توليد UUID عشوائي جديد عند تكرار الاستيراد.

---

## 7. عقد متابعة واشتراك المحطات (Station Subscriptions & Follow Contract)

### 7.1 الحسابات المسموح لها بالمتابعة
1. جميع المستخدمين الموثقين يحق لهم متابعة المحطات (`listener`, `station_admin`, `super_admin`). لا يُحظر المستخدم الإداري من متابعة المحطات كمستمع.
2. إذا كان المستخدم موثقاً ولكنه يفتقر إلى وثيقة ملف مستمع في مسار `${root}/users/users/${uid}`، **تتكفل الدالة السحابية `setStationSubscription` باستدعاء `ensureListenerProfile` ذرياً** وإنشاء الوثيقة تلقائياً بدلاً من إرجاع خطأ `failed-precondition: An active listener profile is required`.
3. في تطبيق الهاتف، يتأكد العميل من وجود الملف الشخصي أو يطلبه تلقائياً قبل تسجيل المتابعة لضمان عدم فشل العملية.

---

## 8. عقد تصميم وتجربة كارد الإذاعات (Station Card Modernization Contract)

### 8.1 المواصفات البصرية (Visual Specifications)
1. **انحناء الحواف والشكل**:
   - انحناء الحواف المعتمد: `BorderRadius.circular(20)`.
   - حد خارجي رفيع وفاخر: `Border.all(color: colorScheme.outlineVariant.withValues(alpha: 0.35), width: 1)`.
   - ظل ناعم خفيف يبرز عمق الكارت (`BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: Offset(0, 4))`).
2. **شريحة الموقع والتردد (Metadata Chip)**:
   - دمج اسم المحافظة والتردد في شريحة أنيقة متباينة:  
     `صنعاء · 90.9 FM` بخط واضح ومريح للعين.
3. **تكامل شارات البث (Integrated Health Badge)**:
   - تموضع شارة البث في الزاوية العلوية المقابلة للشعار دون تكدس، مع مراعاة التمدد واللغات (RTL/LTR) ومقاييس إمكانية الوصول حتى 2.0x.
4. **أزرار الإجراءات**:
   - زر تشغيل رئيسي بارز وواضح بتصميم Tonal/Filled.
   - زر المفضلة التفاعلي بأنيميشن نابض وسلس.

---

## 9. عقد سجلات التدقيق وتتبع المسؤولية التحريرية (Editorial Audit Log & Responsibility Tracking Contract)

### 9.1 حقول التدقيق المباشرة في الوثيقة (Inline Document Audit Fields)
تلتزم جميع عمليات الحفظ والإنشاء والتحديث للمحتوى الإداري في [`saveWithRelations`](file:///Users/iq/AndroidStudioProjects/accelerate/hudhud_fm/web_admin/lib/save-content.ts) بحقن وتحديث الحقول التالية تلقائياً:
1. **عند الإنشاء (`create`)**:
   - `createdBy`: معرّف المشرف القائم بالعملية (`adminUid`).
   - `createdByName`: اسم أو بريد المشرف (`adminEmail` / `displayName`).
   - `createdAt`: توقيت الخادم (`serverTimestamp()`).
2. **عند التعديل (`update`)**:
   - `updatedBy`: معرّف المشرف القائم بآخر تعديل (`adminUid`).
   - `updatedByName`: اسم أو بريد المشرف (`adminEmail` / `displayName`).
   - `updatedAt`: توقيت الخادم (`serverTimestamp()`).
   - يتم الحفاظ على `createdBy` و `createdAt` الأصليين دون تغيير.
3. **النطاق**: يشمل وثائق المحطات (`stations`)، البرامج (`programs`)، الحلقات (`episodes`)، والمدن (`locations`).

### 9.2 سجل تدقيق العمليات التحريرية (Editorial Audit Log Collection)
1. إنشاء مجموعة محمية في Firestore:
   `{root}/auditLogs/auditLogs/{logId}`
2. يتم تسجيل كل عملية حفظ أو تعديل أو استيراد أو حذف تلقائياً داخل المعاملة (Transaction):
   ```ts
   {
     targetKind: 'stations' | 'programs' | 'episodes' | 'locations',
     targetId: string,
     targetTitle: string,
     action: 'create' | 'update' | 'delete' | 'import',
     actorUid: string,
     actorEmail: string,
     timestamp: serverTimestamp(),
     summary: string,
   }
   ```
3. **حماية القواعد (Firestore Rules)**:
   - القراءة مقصورة على مدراء النظام المعتمدين (`isSuperAdmin() || isAdmin()`).
   - الكتابة مقصورة على العمليات التحريرية المخولة؛ حظر تام لقراءة أو كتابة سجلات التدقيق من المستمعين أو الضيوف.
4. **العرض في واجهة لوحة الإدارة (Admin UI)**:
   - عرض شريط تدقيق أسفل كل نموذج:  
     *«أنشئ بواسطة: {createdByName} في {createdAt} · آخر تعديل بواسطة: {updatedByName} في {updatedAt}»*.

---

## 10. مصفوفة التحقق والقبول (Verification & Test Matrix)

| البند | مسار الفحص والاختبار | معيار القبول |
|---|---|---|
| **المحافظات والمدن** | `web_admin/test/location-relations.emulator.test.ts` & Seeding | اختيار المحافظة يزامن الحقول الـ 4، وحفظ المحطة ينجح دون خطأ المدينة |
| **الشعار الافتراضي** | `web_admin/test/*.test.ts` & `web_hudhud/test/*.test.mjs` | المحطات بلا شعار تعرض `station_placeholder.webp` في جميع المنصات |
| **توقف البث والتنويه** | Widget tests & Web tests | ظهور بانر التنويه وإخلاء المسؤولية بوضوح دون إخفاء الكارت أو الأرشيف |
| **فلتر البث السليم** | `web_admin` unit & UI tests | فلتر `healthy` يعزل المحطات ذات البث السليم مع شارة خضراء تفاعلية |
| **منع تكرار الاستيراد** | `web_admin/test/batch-import.test.ts` | تكرار الصفوف يرفض كـ invalid، ومطابقة الموجود تحوله لـ update أو unchanged |
| **زر المتابعة** | `station-subscriptions.test.js` & Flutter tests | متابعة المحطة تنجح للمستخدم الموثق وتضمن ملفه تلقائياً دون فشل |
| **تطوير الكارد** | `screen_acceptance_test.dart` & Widget tests | اجتياز اختبارات العرض عند 1.0x و 2.0x والوضع الليلي والنهاري |
| **تتبع المسؤولية واللوق** | `save-content.emulator.test.ts` & Rules tests | حقول `createdBy`/`updatedBy` تسجل تلقائياً ومحمية بقواعد الوصول |
