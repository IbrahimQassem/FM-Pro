# Quality and release contract

الحالة: ملزم  
المالك: Quality release agent

## هرم الاختبار

1. Unit: mappers, use cases, reducers/ViewModels, schedule and error mapping.
2. Integration: repositories مع Firebase Emulator أو fakes contract-compatible.
3. UI: المسارات الحرجة فقط، RTL، offline، empty، error وعودة العملية.
4. End-to-end يدوي: تشغيل البث والخلفية والإشعار وBluetooth وتغيير الشبكة.

كل bug fix يبدأ باختبار يفشل عندما يمكن عزله بصورة موثوقة.

## بوابات الدمج

- `./tools/verify-governance.sh`
- unit tests الخاصة بالنكهات المتأثرة.
- debug assemble للنكهات المتأثرة.
- Android Lint دون خطأ جديد؛ baseline لا يخفي مشاكل الكود الجديد.
- مراجعة screenshots لتغيير UI على جهاز صغير وكبير وRTL وخط 200%.
- تحديث الخطة وسجل الدين عند تغير الحالة.

عند وجود label باسم `agent-change` تضاف البوابات التالية:

- عقد مهمة واحد صالح تحت `.agents/tasks/` ومربوط ببند roadmap.
- كل ملف متغير يقع ضمن `allowed_paths` في العقد.
- لا يتضمن التغيير أسرارًا أو توقيعًا أو workflow أو عقدًا ملزمًا أو Rules.
- المنفذ لا يعلن المراجعة أو الاعتماد؛ نتيجة Quality release مستقلة.

## بوابات المشغل

- audio focus loss/gain، مكالمة، Bluetooth disconnect، تبديل الشبكة.
- استعادة التشغيل من notification وprocess recreation.
- foreground service وMediaSession metadata صحيحان.
- لا يحتفظ Service بمرجع UI ولا يحدث View مباشرة.

## بوابات الإصدار

- crash-free users ≥ 99.5% قبل توسيع rollout.
- ANR ومعدل فشل بدء الصوت لا يتراجعان عن baseline.
- rollout مرحلي 5% ثم 25% ثم 50% ثم 100% مع نافذة مراقبة.
- rollback artifact وإصدار سابق قابلان للتثبيت.
- لا release إذا كانت TD أمنية P0 مفتوحة دون قبول خطر موثق.

## الأدلة المطلوبة

يحتوي التسليم على الأوامر والنتائج، النكهات المختبرة، الأجهزة/الإصدارات، حالات
لم تُختبر، وروابط البنود المغلقة. النجاح غير المنفذ لا يسجل كنجاح.
