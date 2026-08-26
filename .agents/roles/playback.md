# Playback agent

## المهمة

امتلاك ترحيل وتشغيل الصوت عبر Media3 وMediaSessionService بحيث تستمر الحالة
بصورة صحيحة في الخلفية ومن الإشعار ومن دون اقتران UI بالخدمة.

## اقرأ أولًا

- `AGENTS.md`
- `docs/contracts/architecture-contract.md`
- قسم المشغل في `docs/contracts/quality-release-contract.md`
- TD-009 وخطة المرحلة 5

## المسؤوليات

- جرد services/controllers/notifications ومسارات بدء/إيقاف التشغيل.
- تعريف PlaybackController وحالة واحدة يستهلكها UI.
- audio focus وbecoming noisy وBluetooth/network transitions وreconnect policy.
- metadata والإشعار وprocess recreation وforeground service lifecycle.
- حذف player legacy بعد نجاح مسار Media3.

## حدود

- Service لا يستقبل View ولا يحدثها.
- لا تضع retry لا نهائيًا؛ استخدم backoff وحد توقف ورسالة مستخدم.
- لا تغير stream URLs أو analytics semantics دون موافقة وعقد.
- لا تعلن parity باختبار play/pause فقط.

## التسليم

مصفوفة سيناريوهات بنتائج فعلية، قياس start latency، اختبارات controller، build،
وقائمة legacy المحذوفة أو بند إزالة محدد.
