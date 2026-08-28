# ADR-0003: اعتماد المعمارية والتسميات القياسية لـ Firebase Firestore و Storage

- الحالة: معتمد (Accepted)
- التاريخ: 2026-08-28
- أصحاب القرار: Delivery Lead, Firebase Security Agent, Android Modernization Agent

## السياق (Context)

كانت قاعدة بيانات Firestore تعاني من:
1. تكرار مفرط في مسارات المجموعات (مثل `/{root}/RadioProgram/{radioId}/RadioProgram/RadioProgram/{programId}`).
2. تسميات غير قياسية واختصارات مبهمة (`prName`, `prDesc`, `epName`, `epAnnouncer`, `nickNme`).
3. تخزين تفاعلات الإعجاب داخل وثيقة الحلقة كـ `Map` مما يهدد بتجاوز حد 1 MiB للوثيقة ويسبب نزاعات كتابة متزامنة.
4. تضارب أنواع التواريخ واستخدام سلاسل نصية بدلاً من كائنات `Timestamp`.
5. مسارات غير مصنفة في Firebase Storage تخلط بين الوسائط العامة والشخصية دون ضغط WebP أو ترويسات Caching.

## القرار (Decision)

1. **تسطيح المجموعات واعتماد مسارات مباشرة:**
   - المحطات: `/{root}/stations/{stationId}`
   - البرامج: `/{root}/programs/{programId}` (مع فهرسة `stationId`)
   - الحلقات: `/{root}/episodes/{episodeId}` (مع فهرسة `programId`, `stationId`)
   - المستخدمون: `/{root}/users/{uid}`
   - الإعلانات واللافتات: `/{root}/banners/{bannerId}`

2. **فصل التفاعلات إلى Subcollections:**
   - الإعجابات: `/{root}/episodes/{episodeId}/likes/{uid}`
   - التعليقات: `/{root}/episodes/{episodeId}/comments/{commentId}`
   - المفضلة: `/{root}/users/{uid}/favorites/{targetId}`
   - الاشتراكات: `/{root}/users/{uid}/subscriptions/{programId}`
   - إدارة العدادات حصرياً عبر كائن `stats` والعمليات الذرية `FieldValue.increment()`.

3. **توحيد التسميات والأنواع:**
   - استخدام `Timestamp` لجميع التواريخ.
   - استخدام `camelCase` الصريح (مثل `title`, `description`, `coverUrl`, `audioUrl`, `displayName`, `username`).
   - اعتماد قيم منطقية إيجابية مثل `isActive`, `isLive`, `isFeatured`, `isVerified`.

4. **معمارية Firebase Storage القياسية:**
   - بنية مجلدات وظيفية: `/{root}/{category}/{id}/{assetType}.webp`.
   - تحويل وضغط الصور تلقائياً إلى صيغة `WebP` قبل الرفع.
   - إضافة ترويسات `Cache-Control: public, max-age=31536000`.

## العواقب (Consequences)

- كود أنظف وأسهل في الصيانة وتوافق تام مع معايير الأندرويد الحديثة.
- تجنب كامل لمشاكل تحجيم الـ 1MB ونزاعات الكتابة المتزامنة في تفاعلات المستمعين.
- تقليل استهلاك الباندويث وسرعة التحميل بفضل WebP و Cache-Control.
- قواعد أمان `firestore.rules` و `storage.rules` أكثر إحكاماً وقابلية للاختبار الصارم.
