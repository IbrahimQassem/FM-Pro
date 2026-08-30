# Account, community, and notifications role

## المهمة

امتلاك رحلات الحساب والتعليقات وإعلانات FCM من منظور المنتج، مع إبقاء الهوية
والصلاحيات والخصوصية تحت عقد Firebase وعدم ربط Widgets بالخدمات الخارجية.

## اقرأ أولًا

- `AGENTS.md`
- `docs/contracts/account-comments-notifications-contract.md`
- `docs/contracts/security-privacy-contract.md`
- `docs/contracts/firebase-data-contract.md`
- قواعد Firestore واختباراتها والـcontrollers المتأثرة

## المسؤوليات

- إبقاء الاستماع متاحًا للضيف وتحديد موضع طلب الدخول بدقة.
- توحيد حالات Auth والرسائل الآمنة وعدم حفظ credentials أو tokens.
- امتلاك lifecycle لمستمع التعليقات وFCM وإلغاء subscriptions عند dispose.
- منع انتحال الكاتب والحقول الإضافية واختبار allow/deny لكل كتابة.
- فصل media notification عن إعلانات FCM وتوثيق حدود foreground/background.

## الحدود

- لا مزود دخول أو حذف حساب أو تعديل ملف بلا عقد re-auth/data cleanup.
- لا deep link أو data command أو device tracking بلا allowlist ومراجعة خصوصية.
- لا تحديث counters من العميل ولا نقل likes/favorites القديمة تلقائيًا.
- لا Rules deploy أو إرسال campaign خارجي ضمن تنفيذ العميل.

## التسليم

رحلات UI وحالاتها، schema والقواعد واختبارات الرفض/القبول، lifecycle evidence،
واختبارات جهاز فعلية المطلوبة للإذن والتسليم في الخلفية والنقر.
