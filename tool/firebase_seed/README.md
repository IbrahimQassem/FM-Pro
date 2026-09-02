# HudHud FM Development seed

هذه أداة مستقلة لإضافة سيناريو عرض canonical مترابط إلى مشروع Firebase
`sanadev-fm`. لا تستخدم حقول legacy ولا تغيّر أي وثيقة موجودة. تتحقق من كامل
الرسم العلاقي والعدادات قبل تحميل مكتبة Firestore أو فتح اتصال.

المحتوى الحالي:

- مدينتان معتمدتان: صنعاء وعدن.
- ثلاث محطات يمنية، ومحطة هدهد تجريبية بصنعاء تستخدم ملف HTTPS ثابتًا لضمان
  إمكانية عرض رحلة التشغيل دون الاعتماد على رابط إذاعة متعثر.
- خمسة برامج؛ لكل محطة برنامج واحد على الأقل وجدول أسبوعي بتوقيت اليمن.
- ست حلقات منشورة؛ لكل برنامج حلقة واحدة على الأقل وملف HTTPS قابل للتشغيل.
- ثلاثة ملفات مستمعين تجريبيين و12 تعليقًا؛ تعليقان لكل حلقة مع كاتب مطابق.
- 6 عناصر مفضلة و4 اشتراكات مرتبطة بالمستمعين وأهداف المحتوى.
- عدادات `programsCount` و`episodesCount` و`commentsCount` مطابقة للعلاقات.
- بانر HudHud أصلي مخزن في Firebase Storage تحت
  `HudHudDev/banners/welcome-v1/hudhud-discovery-v1.jpg`.

جميع المحطات تبدأ بـ `isVerified: false` إلى أن تعتمد من لوحة الإدارة.
أصل البانر محفوظ محليًا في
`assets/images/banners/hudhud-discovery-v1.jpg`، ويجب رفعه إلى Storage قبل تشغيل
seed على مشروع Firebase جديد.

## الصلاحيات

تستخدم الأداة حزمة Firestore الإدارية المباشرة مع Application Default Credentials
لحساب لديه صلاحية إنشاء وثائق Firestore.
لا تضع service-account JSON داخل المشروع أو Git.

## التشغيل

```bash
cd tool/firebase_seed
npm install
npm test
npm run verify:urls
npm run seed:dry
npm run seed:apply
npm run seed:content:dry
npm run seed:content:apply
npm run seed:engagement:dry
npm run seed:engagement:apply
```

لتهيئة التعليقات الموجودة قبل نشر Rules التي تتطلب `status`:

```bash
npm run comments:status:dry
npm run comments:status:apply
```

يعرض dry-run عدد التعليقات القديمة دون كتابة. يقبل apply مشروع `sanadev-fm`
فقط، ويضيف `status=published` للوثائق التي لا تملك حالة؛ يتوقف إذا وجد قيمة
حالة غير معروفة ولا يغيرها.

`seed:dry` لا يتصل بـ Firestore. أما `seed:apply` فيقبل مشروع `sanadev-fm`
فقط، وينشئ جميع الوثائق داخل batch ذري باستخدام `create`. إذا وجد أي Document
ID مسبقًا تفشل العملية كاملة بدل استبداله.

`verify:urls` يتصل فقط بأصول العرض ويطبع النوع والمعرف والحالة دون طباعة URL؛
شغّله قبل apply لأن روابط البث والصوت والصور موارد خارجية قابلة للتغير.

للبيئة التي تحتوي المحطات بالفعل، يستخدم `seed:content:apply` batch ذريًا ينشئ
ملفات المستمعين والبرامج والحلقات والتعليقات ويشتق تحديث
`stats.programsCount` لكل المحطات الأربع من العلاقات. لا يستبدل وثيقة موجودة؛
تعارض أي ID يلغي العملية كاملة.

`seed:engagement:apply` مخصص لبيئة زرعت المحتوى سابقًا؛ ينشئ المفضلة
والاشتراكات فقط تحت ملفات المستخدمين ولا يعدل المحتوى أو العدادات.

ملفات المستمعين الثلاثة ليست حسابات Firebase Auth ولا تحتوي بريدًا أو كلمة مرور.
هدفها إظهار تعليقات مترابطة فقط. لاختبار إنشاء حساب وإضافة تعليق جديد، أنشئ حساب
Email/password من التطبيق بعد تفعيل المزود ونشر قواعد Development.

خريطة التغطية الكاملة موجودة في `DEMO_COVERAGE.md`. لا يمكن زرع FCM كوثائق؛
لذلك يوفر `fcm_announcement.example.json` payload نصيًا آمنًا للـtopic المعتمد،
ولا ترسله الأداة تلقائيًا أو تتعامل مع access tokens.

## مصادر التحقق

- أسماء وترددات المحطات الحقيقية: ملف الجرد المرجعي في `FM-Pro`.
- روابط البث المحلولة وحالتها: Radio Browser API.
- محطة هدهد مصنفة بوضوح كتجريبية ولا تدّعي أنها إذاعة حقيقية.
