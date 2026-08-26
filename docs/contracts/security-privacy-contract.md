# Security and privacy contract

الحالة: ملزم  
المالك: Firebase security agent

## التفويض

- Firebase Auth يثبت الهوية فقط؛ الصلاحيات تأتي من Custom Claims أو وثيقة دور
  لا يستطيع المستخدم تعديلها، وتفرضها Security Rules.
- فحص `UserType` المحلي يستخدم لإظهار الواجهة فقط ولا يسمح بعملية كتابة.
- كل عملية admin تحتاج رفضًا افتراضيًا واختبار rules إيجابيًا وسلبيًا.

## الأسرار

- يمنع commit لـ`key.properties`, `google-services.json`, keystores, tokens أو
  ملفات service-account.
- `key.properties` المتتبع حاليًا حادثة يجب معالجتها في TD-002: تدوير بيانات
  التوقيع، إزالة الملف من التاريخ/التتبع وفق خطة متفق عليها، ثم توفير example.
- لا تطبع محتوى الملفات الحساسة أثناء الفحص.

## السجلات والبيانات الشخصية

يمنع تسجيل FCM tokens، access tokens، البريد، الهاتف، UID الكامل، محتوى تعليق
خاص أو استثناء يحتوي على هذه القيم. سجلات الإصدار release تستخدم أحداثًا
منظمة ومعرفات correlation غير قابلة لإرجاع الهوية.

## الشبكة والمنصة

- HTTPS هو الافتراضي. أي cleartext exception يحدد host والسبب وتاريخ الإزالة.
- اطلب أقل permissions ممكنة وفي لحظة الحاجة. راجع صلاحيات الهاتف والتخزين
  القديمة قبل رفع target SDK أو تحديث flow الصور.
- كل component exported يملك سببًا وpermission أو intent contract واضحًا.
- النسخ الاحتياطي يستبعد tokens وبيانات الحساب الحساسة.

## المحتوى المجتمعي

- التعليقات تحتاج تحقق طول ومحتوى ومعدل إرسال من الخادم قدر الإمكان.
- الإبلاغ والحظر لا يكشفان هوية المبلّغ، ويجب أن يكونا idempotent.
- الحذف والتعديل يراجعان ملكية المؤلف أو تفويض المشرف في rules.

## بوابة القبول

- لا أسرار جديدة في `git diff`.
- اختبارات Firebase Rules تغطي listener, signed-in user, owner, admin وdenied.
- لا logs حساسة في debug أو release.
- permissions وexported components ضمن نطاق الميزة فقط.
- أي استثناء أمني له ADR أو بند دين بمالك وموعد.
