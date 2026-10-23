# Station Governorates, Stream Health, Brand Identity, and Import Deduplication Contract

الحالة: ملزم (Binding Contract)  
تاريخ الاعتماد: 2026-10-20 (محدث وفق قرارات خارطة طريق 2026-10)  
النطاق: Firestore Schemas, Cloud Functions, Web Admin (`web_admin`), Public Web (`web_hudhud`), Flutter Mobile App (`lib/`)  

---

## 1. الحدود المعمارية والمسؤوليات (Architectural Boundaries)

```text
[Firestore Root: HudHudDev / HudHudOfficial]
 ├── locations/locations/{locationId}           <-- Canonical Yemeni Governorates (locationType: 'governorate') & National ('national')
 ├── stations/stations/{stationId}              <-- Stations with strictly validated cityCode, locationType & health metadata
 ├── programs/programs/{programId}              <-- Station Programs (deduplicated by stationId + normalizedTitle)
 ├── episodes/episodes/{episodeId}              <-- Episodes (deduplicated by programId + normalizedAudioUrl / deterministic SHA-256 ID)
 ├── importKeys/importKeys/{keyHash}            <-- Concurrency reservations for batch imports
 ├── auditLogs/auditLogs/{logId}                <-- Immutable append-only editorial audit log (server-written only)
 └── users/users/{uid}/subscriptions/station_{id} <-- Follow/Subscription records (server-callable managed)

[Web Admin]
 ├── LocationPicker in ContentEditor (stations)  <-- Synchronizes (cityCode, cityNameAr, countryCode, countryNameAr, locationType)
 ├── BatchImport Engine (batch-import.ts)        <-- Strict intra-sheet & cross-database deduplication with diffs & concurrency locks
 ├── Healthy & Stopped Stream Filter Badges      <-- Real-time health reflection and 45-min freshness window
 └── Admin Save Callable Integration             <-- Atomic content save with server-stamped audit metadata & log entry

[Flutter & Web Public Clients]
 ├── Luxury Radio Mascot (station_placeholder.webp) <-- Universal fallback for stations without logoUrl
 ├── Stream Stoppage Notice Banner & Disclaimer     <-- Source outage attribution & liability disclaimer (stopped/no-source states)
 ├── StationFollowControls                           <-- Calls setStationSubscription; self-healing profile for verified listener/admin
 └── Modernized StationCard (Grid & List)           <-- 20px radius, subtle border, metadata chips, accessible (200% text scale)
```

---

## 2. عقد المحافظات وهوية المواقع (Governorates & Location Identity Contract)

### 2.1 الثوابت المرجعية لمحافظات اليمن (Canonical Governorates & National Location)
1. تحتوي مجموعة `locations/locations` في كلا الجذرين (`HudHudDev` و `HudHudOfficial`) على جميع المحافظات الـ 22 الرئيسية في اليمن وموقع الإذاعات الوطنية المستقل:
   - **المحافظات الـ 22 (`locationType: 'governorate'`)**:
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
   - **الموقع الوطني المستقل (`locationType: 'national'`)**:
     - `yemen` (الإذاعات العامة / الوطنية) — يبقى موقعاً وطنياً مستقلاً للإذاعات العامة؛ لا يُحتسب ضمن الـ 22 محافظة ولا يُعرض كخيار محافظة محلية.
2. تتضمن كل وثيقة موقع الحقول الإلزامية:
   ```ts
   {
     id: string,               // e.g. 'sanaa', 'yemen'
     cityCode: string,         // e.g. 'sanaa', 'yemen'
     cityNameAr: string,       // e.g. 'صنعاء', 'الجمهورية اليمنية (إذاعات وطنية)'
     countryCode: 'YE',
     countryNameAr: 'اليمن',
     locationType: 'governorate' | 'national',
     sortOrder: number,
     isActive: true
   }
   ```
3. البذرة (Seeding Script) تكون idempotent وتعمل بنمط dry-run افتراضياً، وتقارن الجذرين وتصدر الفروق قبل أي كتابة، وتكتب بدفعات محدودة مع سجل manifest يتيح الاستئناف الآمن.

### 2.2 التزامن والنزاهة في المحطات (Station-Location Integrity)
1. **إلزامية منتقي المدينة والموقع (`LocationPicker`)**:
   - لا يُسمح بإدخال أو تعديل محطة في لوحة الإدارة دون اختيار صريح للموقع من القائمة المرجعية النشطة.
   - عند الاختيار، تُسند الحقول الخمسة ذرياً في نموذج المحطة:
     ```ts
     cityCode: selected.cityCode,
     cityNameAr: selected.cityNameAr,
     countryCode: 'YE',
     countryNameAr: 'اليمن',
     locationType: selected.locationType // 'governorate' | 'national'
     ```
   - يُسمح باختيار الموقع الوطني (`national`) فقط عندما تكون المحطة محددة كنطاق وطني (`isNational: true` أو `scope === 'national'`)، ويُحظر اختيارها كمحافظة عادية.
   - يتوقف الحفظ ويرفض إذا كان المرجع غير نشط، أو إذا لم تتطابق الحقول الأربعة المخزنة في المحطة مع الوثيقة المرجعية المحدثة.
2. **الترحيل الآمن للمواقع القديمة (Safe Migration)**:
   - يعمل سكربت الترحيل `tool/migrate_station_locations.mjs` بالوضع الافتراضي `--dry-run`، ولا يكتب إلى Firestore أبداً دون تمرير `--apply --report <path>` صراحة مع تقرير مطابق وبصمة تاريخية.
   - قواعد المطابقة حتمية: مطابقة رمز مرجعي معتمد أولاً، ثم مطابقة الاسم بعد Unicode NFKC وتوحيد المسافات. إذا اختلف الرمز والاسم أو نتج أكثر من مرشح، تُصنف الحالة كـ `ambiguous` ولا تُعدل تلقائياً.
   - الترحيل يحدّث حقول الموقع الأربعة من الوثيقة المرجعية، ويحدّث `adminRelationRevision` للمدن المتأثرة دون المساس بحقول خارج الموقع، ويوثق أي استثناء دون إعلان اكتمال زائف.

---

## 3. عقد الأصول الافتراضية والشعار (Station Brand Identity & Placeholder Contract)

### 3.1 الشعار الافتراضي الموحد (`station_placeholder.webp`)
1. الصورة المعتمدة رسمياً للمحطات التي لا تملك شعاراً هي تميمة الراديو الفاخرة بالألوان الدافئة: `station_placeholder.webp`.
2. يتوافر الملف في المسارات العامة للمنصات الثلاث:
   - `web_admin/public/images/station_placeholder.webp`
   - `web_hudhud/public/images/station_placeholder.webp`
   - `assets/images/branding/station_placeholder.webp` (وفي Flutter asset manifest).
3. **قاعدة العرض في جميع المنصات**:
   - إذا كان `logoUrl` أو `thumbnailUrl` فارغاً أو غير صالح أو فشل تحميله (`onError`)، يتم عرض `station_placeholder.webp` كخلفية افتراضية بانحناء زوايا مطابق للشعار (18px في Flutter، `rounded-xl` في الويب).
   - إعادة محاولة تحميل الأصل الافتراضي لا تتكرر في حلقة لانهائية، مع معالج فشل نهائي ثابت.
   - لا يُعرض حرف مجرد أو أيقونة مفرغة كبديل رئيسي للشعار عند توفر أصل التميمة الفاخرة.

---

## 4. عقد إتاحة البث وإخلاء المسؤولية (Stream Stoppage & Health Disclaimer Contract)

### 4.1 إشعار إخلاء المسؤولية المعتمد
عندما تكون المحطة في حالة توقف مؤقت أو تعثر في البث (`StationStreamHealthState.temporarilyStopped` أو `noOnlineSource` حصراً)، يُلزم النظام بإبراز البيان التالي بنص واضح ومحدد:

> **«تنويه البث المباشر:»**  
> *«البث المباشر لهذه الإذاعة متوقف حالياً من المصدر الإذاعي نفسه. هدهد إف إم منصة ناقلة ولا تتحمل مسؤولية الانقطاعات الفنية الصادرة من استوديوهات المحطة. بإمكانك تجربة إعادة الاتصال أو الاستماع إلى أرشيف البرامج والحلقات المسجلة.»*

الحالات غير المعروفة أو المفقودة تُعرض بحالة محايدة غير متاحة دون أن تنسب العطل للمصدر.

### 4.2 قواعد الواجهة وتجربة المستخدم (UI/UX Invariants)
1. **عدم الحذف أو الإخفاء**:
   - توقف البث لا يعني إخفاء المحطة من الشاشة الرئيسية، ولا حذفها من المفضلة، ولا منع الوصول لأرشيفها وحلقاتها المسجلة.
2. **زر التشغيل التعويضي (`Try Listening`)**:
   - يتحول زر التشغيل الرئيسي إلى زر «محاولة الاستماع» بنبرة تحذيرية هادئة (Amber/Warning Tonal)، مع إتاحة محاولة يدوية واحدة لكل تفاعل دون الدخول في حلقة إعادة اتصال تلقائية غير محدودة.
3. **بانر التنويه**:
   - في شاشة تفاصيل المحطة في Flutter وموقع الويب، يظهر كارت التنويه متضمناً نص إخلاء المسؤولية المصدرية وأيقونة توقف البث، مع الترجمة الإنجليزية المعتمدة في ملفات ARB ومفاتيح الويب وتسميات وصول مناسبة (RTL/LTR).

---

## 5. عقد فلاق وتصفية البث السليم (Healthy Stream Flag & Filter Contract)

### 5.1 تعريف البث السليم (Healthy Stream Criteria)
تُعد المحطة ذات «بث سليم ومتاح» حصراً باجتماع الشروط الثلاثة التالية:
1. `healthStatus === 'online'`
2. `consecutiveFailures === 0`
3. تاريخ آخر فحص `lastCheckedAt` صالح وعمره ≤ 45 دقيقة (عند الحد 45 دقيقة بالضبط يعد سليماً، وبعده أو عند غياب/فساد التاريخ لا يُعد سليماً).

### 5.2 الشارة والفلتر في لوحة الإدارة (Admin Badges & Filter)
1. **فلتر سريع صريح**:
   - إضافة فلتر `healthy` إلى شريط تصفية المحطات السريعة:
     ```ts
     type FeatureFilter = 'all' | 'healthy' | 'live' | 'featured' | 'verified' | 'stopped';
     ```
2. **شارة بصرية خضراء تفاعلية**:
   - عرض شارة `🟢 بث سليم (أساسي)` أو `🟢 بث سليم (بديل)` بحسب `streamHealthSource` فقط عند تحقق الشروط الثلاثة.
   - Tooltip يعرض توقيت آخر فحص محلياً من دون كشف رابط البث المباشر.
   - توضيح حالات الرصد السبع بوضوح بالأيقونة والنص واللون وبديل نصي لا يعتمد على اللون وحده.

---

## 6. عقد استيراد المحتوى الذكي ومنع التكرار (Batch Import Deduplication Contract)

### 6.1 تطبيع النصوص والروابط (Normalization Standards)
1. **النصوص والعناوين**:
   - تطبيع بـ Unicode NFKC، trim، دمج المسافات المتتابعة، وتحويل الأحرف اللاتينية إلى lowercase، مع الحفاظ الكامل على الحروف وعلامات الترقيم العربية.
2. **روابط الحلقات (`audioUrl`)**:
   - تحليل URL وخفض حالة المضيف (Host) إلى lowercase وإزالة جزء الـ fragment (`#...`) فقط؛ يُحافظ تماماً على مسار الـ path وبارامترات الـ query لأنها قد تحمل صلاحية الوصول أو هوية المورد.

### 6.2 منع التكرار داخل نفس الملف المرفوع (Intra-Sheet Deduplication)
1. **تكرار المعرفات الصريحة (`id`)**:
   - إذا تكرر معرف صريح داخل نفس الورقة، يُرفض الصف اللاحق بخطأ صريح يتضمن رقم السطر.
2. **تكرار محتوى البرامج**:
   - يُرفض الصف عند تكرار `(stationId, normalizedTitle)` داخل ورقة البرامج.
3. **تكرار محتوى الحلقات**:
   - يُرفض الصف عند تكرار `(programId, normalizedAudioUrl)` أو `(programId, normalizedTitle)` داخل ورقة الحلقات لتفادي الالتباس.

### 6.3 المطابقة مع قاعدة البيانات والتحويل إلى تحديث (Cross-Database Deduplication)
1. **البرامج**:
   - تُطابق البرامج القائمة وفق الزوج `(stationId, normalizedTitle)`.
   - تطابق تام في المحتوى: يُصنف الصف كـ `unchanged` (تخطي دون كتابة).
   - اختلاف في الحقول: يُصنف كـ `update` مع توليد فروقات (`diff`) واشتراط موافقة صريحة (`allowUpdates`) قبل الكتابة.
   - وجود أكثر من تطابق لنفس الزوج: يُصنف كـ `conflict` ويُوقف الصف ولا يُكتب تلقائياً.
2. **الحلقات**:
   - تُطابق الحلقات القائمة حصراً وفق الزوج `(programId, normalizedAudioUrl)`؛ لا يُستخدم العنوان وحده لمطابقة حلقة قائمة في قاعدة البيانات.
   - تطابق تام: يُصنف كـ `unchanged`.
   - اختلاف في المحتوى: يُصنف كـ `update` مع عرض diff.
   - أكثر من تطابق: يُصنف كـ `conflict`.
3. **الهوية الحتمية (Deterministic Identity)**:
   - عند غياب المعرف الصريح للحلقة، يُولد معرّف حتمي مكوّن من 64 حرف hex لتجزئة SHA-256 للمفتاح `programId + '\n' + normalizedAudioUrl`.
   - عند غياب معرف البرنامج، يُولد من SHA-256 لـ `stationId + '\n' + normalizedTitle`.
   - إذا تعارض المعرف الحتمي مع مستند مختلف في قاعدة البيانات، يُوقف الصف كـ `conflict`.
4. **حجز مفاتيح الاستيراد ومنع التزامن (Concurrency Keys)**:
   - لمنع سباق الاستيرادات المتزامنة لنفس المورد، يتم حجز وثائق هوية حتمية في `{root}/importKeys/importKeys/{keyHash}` داخل معاملة الكتابة.
   - تعارض أو سبق حجز المفتاح يوقف الصف كـ `conflict`.
5. **معاينة الفروق وسلامة الحقول**:
   - شاشة المعاينة تعرض تصنيفات (create, update, unchanged, invalid, conflict) وتفاصيل diff.
   - لا تُستبدل حقول غير واردة في ملف الاستيراد، ولا تُمسح الحقول الممتلئة بحقول فارغة من الملف إلا بخيار مسح صريح.

---

## 7. عقد متابعة واشتراك المحطات (Station Subscriptions & Follow Contract)

### 7.1 الحسابات المسموح لها بالمتابعة والأهلية
1. **معيار الأهلية الصارم**:
   - حساب موثق بـ Firebase Auth مع بريد إلكتروني مؤكد (`emailVerified === true`) وحساب نشط (`disabled !== true`).
   - يُسمح بمتابعة المحطات لجميع الأدوار المؤهلة: `listener`, `station_admin`, `super_admin`. الدور الإداري لا يمنع صاحبه من متابعة المحطات كمستمع.
   - الحساب غير الموثق أو المعطل يُرفض فوراً برسالة خطأ قياسية مستقرة دون إنشاء بروفايل له.
2. **المسار السحابي الموحد والتهيئة الذاتية للبروفايل**:
   - الدالة السحابية Callable `setStationSubscription` هي **المسار المرجعي الوحيد** لإنشاء/التحقق من ملف المتابع وتسجيل الاشتراك داخل معاملة ذرية واحدة.
   - يُحظر على العميل كتابة أو تعديل وثيقة البروفايل `${root}/users/users/${uid}` مباشرة.
   - تقوم الدالة بالتحقق من وجود البروفايل، فإن كان مفقوداً تنشئه تلقائياً (idempotent) مع الحفاظ على البيانات الشخصية، وترفض إعادة تفعيل البروفايلات المعطلة أو المحذوفة.
   - يتم التحقق من أن المحطة المستهدفة نشطة وموجودة قبل تسجيل المتابعة.
3. **سلوك عميل Flutter**:
   - تطبيق الهاتف يستدعي دالة Callable فقط ولا ينفذ تهيئة محلية مزدوجة.
   - يعرض حالات التحميل والنجاح والخطأ القابل لإعادة المحاولة.

---

## 8. عقد تصميم وتجربة كارد الإذاعات (Station Card Modernization Contract)

### 8.1 المواصفات البصرية (Visual Specifications)
1. **انحناء الحواف والشكل**:
   - انحناء الحواف المعتمد: `BorderRadius.circular(20)`.
   - حد خارجي رفيع وفاخر: `Border.all(color: colorScheme.outlineVariant.withValues(alpha: 0.35), width: 1)`.
   - ظل ناعم خفيف يبرز عمق الكارت (`BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: Offset(0, 4))`).
2. **شريحة الموقع والتردد (Metadata Chip)**:
   - دمج اسم المحافظة والتردد في شريحة أنيقة متباينة:  
     `صنعاء · 90.9 FM` بخط واضح ومريح للعين، مع التعامل السلس مع غياب أحدهما.
3. **تكامل شارات البث (Integrated Health Badge)**:
   - تموضع شارة البث في الزاوية العلوية المقابلة للشعار دون تكدس، مع مراعاة التمدد واللغات (RTL/LTR) ومقاييس إمكانية الوصول حتى 200% (textScaler 2.0) بدون تجاوز أو قص.
4. **أزرار الإجراءات وإمكانية الوصول**:
   - زر تشغيل رئيسي بارز وواضح بتصميم Tonal/Filled مع semantics واضحة.
   - زر المفضلة التفاعلي بحركة خفيفة تحترم إعدادات تقليل الحركة (`MediaQuery.disableAnimations`).

---

## 9. عقد سجلات التدقيق وتتبع المسؤولية التحريرية (Editorial Audit Log & Responsibility Tracking Contract)

### 9.1 حقول التدقيق المباشرة في الوثيقة (Inline Document Audit Fields)
تُدار عمليات الحفظ والإنشاء والتعديل التحريري عبر مسار مركزي محمي يضمن حقن الحقول التالية ذرياً:
1. **عند الإنشاء (`create`)**:
   - `createdBy`: معرّف المشرف القائم بالعملية (`adminUid` من سياق التوثيق المعتمد).
   - `createdByName`: اسم أو بريد المشرف (`displayName` أو `email` الموثق).
   - `createdAt`: توقيت الخادم (`serverTimestamp()`).
2. **عند التعديل (`update`)**:
   - `updatedBy`: معرّف المشرف القائم بآخر تعديل (`adminUid`).
   - `updatedByName`: اسم أو بريد المشرف الموثق.
   - `updatedAt`: توقيت الخادم (`serverTimestamp()`).
   - الحفاظ التام على `createdBy`, `createdByName`, `createdAt` دون مساس.
3. **النطاق**: يشمل وثائق المحطات (`stations`)، البرامج (`programs`)، الحلقات (`episodes`)، والمدن (`locations`).

### 9.2 سجل تدقيق العمليات التحريرية (Editorial Audit Log Collection)
1. مجموعة محمية في Firestore:
   `{root}/auditLogs/auditLogs/{logId}`
2. يتم تسجيل كل عملية حفظ أو تعديل أو استيراد أو حذف ذرياً داخل المعاملة (Transaction):
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
   - الملخص لا يحتوي على بيانات سرية أو روابط بث مباشر.
   - عمليات الاستيراد تسجل لكل عنصر أو كدفعة مستندات محددة الأهداف.
3. **حماية القواعد والذرية (Firestore Rules & Transaction Atomicity)**:
   - حظر تام على العميل لإنشاء أو تعديل أو حذف وثائق التدقيق مباشرة.
   - القراءة مقصورة على مدراء النظام المعتمدين (`isSuperAdmin() || isAdmin()`).
   - عند فشل كتابة سجل التدقيق، تفشل المعاملة التحريرية بالكامل ولا يُحفظ المحتوى منعاً لفقدان التتبع.
4. **العرض في واجهة لوحة الإدارة (Admin UI)**:
   - عرض شريط تدقيق أسفل كل نموذج للمحتوى الذي يحتوي على حقول تدقيق:  
     *«أنشئ بواسطة: {createdByName} في {createdAt} · آخر تعديل بواسطة: {updatedByName} في {updatedAt}»*.
   - إبراز حالة واضحة للسجلات القديمة التي تفتقر إلى بيانات التدقيق دون انهيار الواجهة.

---

## 10. مصفوفة التحقق والقبول (Verification & Test Matrix)

| البند | مسار الفحص والاختبار | معيار القبول |
|---|---|---|
| **المحافظات والمدن (PKG-01)** | `tool/firebase_seed/`, `location-relations.emulator.test.ts` | 22 محافظة وموقع وطني مستقل بـ `locationType` في كلا الجذرين، وبذرة idempotent مع تقرير تحقق |
| **منتقي الموقع (PKG-02)** | `content-editor.tsx`, `location-relations.emulator.test.ts` | اختيار المحافظة يزامن الحقول الـ 4 و`locationType`، ويمنع حفظ محطة دون موقع أو بموقع غير متطابق |
| **ترحيل المواقع (PKG-03)** | `tool/migrate_station_locations.mjs` | الوضع الافتراضي dry-run ينتج تقريراً دقيقاً، و`--apply` يتطلب تقريراً وبصمة، وتصنيف الحالات دون سجلات معلقة |
| **الشعار الافتراضي (PKG-04)** | `station-logo.tsx`, `public-home.tsx`, Flutter widgets | التميمة المعتمدة تظهر افتراضياً عند غياب الشعار في المنصات الثلاث بانحناء مطابق |
| **تنويه توقف البث (PKG-05)** | `StationDetailsScreen`, `web_hudhud`, ARB files | ظهور بيان إخلاء المسؤولية المصدرية وزر «محاولة الاستماع» لحالات التوقف فقط مع دعم كامل للغات |
| **فلتر البث السليم (PKG-06)** | `web_admin/components/admin/admin-app.tsx`, `resource-filters.ts` | فلتر `healthy` وشارة خضراء تفاعلية تعتمد معايير الصحة الثلاثة ونافذة الـ 45 دقيقة بدقة |
| **منع تكرار الاستيراد (PKG-07)** | `batch-import.ts`, `batch-import.test.ts` | تطبيع NFKC، منع التكرار الداخلي، مطابقة URL للحلقات والبرامج، هويات حتمية SHA-256، وحجز importKeys |
| **زر المتابعة والبروفايل (PKG-08)** | `setStationSubscription`, `station-subscriptions.test.js` | مسار كولابل يضمن البروفايل ذرياً ويقبل الحسابات المؤهلة من جميع الأدوار ويمنع غير الموثقين |
| **ترقية كارد الإذاعات (PKG-09)** | `station_card.dart`, Widget & Screen acceptance tests | انحناء 20px، شريحة الموقع والتردد، خلو من أي overflow عند 1.0x و 2.0x في الوضعين الليلي والنهاري |
| **حقول وسجل التدقيق (PKG-10)** | `save-content.ts`, `firestore.rules`, Rules tests | حقول التدقيق وسجل العمليات مسجلة ذرياً، غير قابلة للتعديل أو الحذف من العملاء، وقراءة مقصورة للإدارة |
| **بوابة القبول الشامل (PKG-11)** | كامل أدوات الفحص والاختبارات في جميع المنصات | صفر أخطاء وصفر فشل في الاختبارات ونجاح بناء المشاريع الثلاثة بالكامل |
