# Quality and release contract

الحالة: ملزم  
المالك: Quality release role

## هرم الاختبار

1. Domain: filtering, sorting, schema-independent rules and state projections.
2. Data: mappers valid/invalid، repository cache/server behavior عبر fakes.
3. Controller: transitions, concurrency, retry, disposal and failure mapping.
4. Widget: الرحلات الحرجة، RTL، empty/offline/error، playback controls.
5. Platform/manual: Firebase config، audio lifecycle، Android/iOS build وتشغيل فعلي.

كل bug fix يبدأ باختبار يفشل عندما يمكن عزله دون ربط الاختبار بخطأ التنفيذ نفسه.

## بوابات الدمج

```bash
./tool/verify-governance.sh
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build apk --debug
```

عند إضافة أو تغيير Firestore write أو Rules شغّل أيضًا:

```bash
npm run emulators:test
```

أضف `flutter build ios --simulator --debug` عند تغيير Dart مشترك ذي أثر منصة،
plugin، playback، Firebase bootstrap أو ملفات iOS. تغييرات UI تحتاج فحص هاتف صغير
وكبير، RTL و200% text scale، ولقطات قبل/بعد عند تغير بصري جوهري.

## قواعد الأدلة

- سجل الأمر ونتيجته وإصدار Flutter والمنصة المستهدفة.
- `not run` ليست `passed`; اذكر السبب وأثره.
- لا تعتمد على Firebase production أو بيانات حقيقية في unit/widget tests.
- لا تضف golden baseline لإخفاء regression بصري غير مفهوم.
- warnings الجديدة إما تصلح أو تسجل بمالك وسبب؛ لا تخف بتعطيل lint عام.

## بوابات الإصدار

- Firebase environment وpackage/bundle IDs محسومة لكل منصة.
- Android production signing لا يستخدم debug key.
- privacy/store declarations تطابق Firebase وaudio/network الفعلي.
- playback matrix ناجحة على جهاز فعلي، لا simulator فقط.
- artifact سابق وrollback موثقان قبل rollout.
- لا production release من جذر `HudHudDev` أو مع قواعد غير مراجعة.

## تعريف الاكتمال

- معايير القبول تعمل والحالات البديلة ممثلة.
- العقود محدثة فقط إن تغير قرار ملزم.
- الاختبارات والتحليل والبناء المتأثر ناجحة أو القيود معلنة.
- لا secret أو PII أو stream URL في diff/logs.
- المخاطر وما لم يختبر وخطة rollback مذكورة.
