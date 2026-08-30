# HudHud FM documentation map

هذا الفهرس يحدد سلطة التوثيق لتطبيق Flutter المستقل. لا تنسخ القرارات بين
الملفات؛ اربط بالعقد المالك للقرار.

## العقود الملزمة

- [المعمارية وإدارة الحالة](contracts/architecture-contract.md)
- [Firebase والبيانات](contracts/firebase-data-contract.md)
- [الأمان والخصوصية](contracts/security-privacy-contract.md)
- [المنتج وUX وإمكانية الوصول](contracts/product-ux-contract.md)
- [التشغيل الصوتي](contracts/playback-contract.md)
- [البرامج والحلقات والجدول](contracts/station-content-contract.md)
- [الحسابات والتعليقات والإشعارات](contracts/account-comments-notifications-contract.md)
- [الجودة والإصدار](contracts/quality-release-contract.md)

## التشغيل

- `README.md`: إعداد المطور والأوامر المختصرة.
- `AGENTS.md`: حدود العمل، قراءة العقود، توزيع الأدوار والتحقق.
- `.agents/roles/`: مسؤوليات التسليم وحدود كل دور.

## مراجع التخطيط

- [حصر قدرات التطبيق القديم](reference/legacy-app-capability-inventory.md):
  لقطة غير ملزمة للعمليات والخدمات والمميزات وحالتها وقرار ترحيلها المقترح.

## قواعد الصيانة

1. العقد يصف ما يجب أن يبقى صحيحًا، والكود والاختبارات يثبتان السلوك الحالي.
2. أي تغيير state management أو routing أو schema أو بيئة Firebase أو تقنية
   playback ملزمة يحتاج قرارًا موثقًا قبل إنشاء مسارين متنافسين.
3. ملفات Firebase المحلية والأدلة المؤقتة ونتائج build ليست مصادر حقيقة.
4. لا يحمل هذا المشروع حالة أو عقود تطبيق `FM-Pro`؛ الجرد التاريخي مرجع
   للتخطيط فقط ولا يتقدم على عقود Flutter.
