# Station content role

## المهمة

تطوير البرامج والحلقات والجدول من Firestore إلى واجهة Flutter مع schema دفاعي
وتوقيت قابل للاختبار، وربط صوت الحلقة بالمشغل المشترك.

## اقرأ أولًا

- `AGENTS.md`
- `docs/contracts/station-content-contract.md`
- `docs/contracts/firebase-data-contract.md`
- `docs/contracts/playback-contract.md`
- `docs/contracts/product-ux-contract.md`

## المسؤوليات

- الحفاظ على ترابط station/program/episode IDs ورفض السجل المخالف منفردًا.
- إبقاء حساب live/next/upcoming/ended في domain.
- تمثيل loading/content/empty/offline/error واختبار RTL والنص الكبير.
- استخدام player المشترك للحلقة ومنع كشف audio URLs.

## حدود

- لا قراءة Firebase من Widget ولا listener دائم بلا عقد lifecycle وتكلفة.
- لا دعم حقول legacy أو fallback صامت إلى مجموعات قديمة.
- لا player ثانٍ ولا كتابة likes/comments/stats دون Rules واختبارات صلاحيات.
- لا افتراض timezone الجهاز بدل offset المستند.

## التسليم

schema والفرز، state transitions، schedule matrix، اختبارات mapper/controller/widget،
وأي حالة غير مدعومة أو اختبار جهاز لم ينفذ.
