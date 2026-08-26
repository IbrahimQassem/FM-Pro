# FM-Pro documentation map

هذا الفهرس هو مدخل التوثيق ومكان تحديد سلطة كل وثيقة. التفاصيل تعيش في عقد
واحد فقط، بينما تشير بقية الملفات إليه بدل تكراره.

## العقود الملزمة

- [العقد المعماري](contracts/architecture-contract.md)
- [عقد المنتج وتجربة المستخدم](contracts/product-ux-contract.md)
- [عقد Firebase والبيانات](contracts/firebase-data-contract.md)
- [عقد الأمان والخصوصية](contracts/security-privacy-contract.md)
- [عقد الجودة والإصدار](contracts/quality-release-contract.md)

## التنفيذ

- [خطة التنفيذ ومتتبع التقدم](roadmap/phased-delivery-plan.md)
- [سجل الدين التقني](roadmap/technical-debt-register.md)
- [تعريف الاكتمال](roadmap/definition-of-done.md)
- [خطة تدوير مفتاح التوقيع](security/signing-key-rotation-plan.md)
- [جرد Firebase الحالي](firebase/current-schema-inventory.md)
- [دليل اختبار ونشر قواعد Firebase](firebase/security-rules-runbook.md)
- [خط أساس المراقبة والأداء](observability/baseline.md)
- [خط الأساس الحالي](architecture/current-state.md)
- [المعمارية المستهدفة](architecture/target-state.md)

## القرارات

- [فهرس ADR](decisions/README.md)
- [ADR-0001: مصدر الحقيقة الواحد](decisions/ADR-0001-single-source-of-truth.md)
- [ADR-0002: تحديث أصلي تدريجي](decisions/ADR-0002-incremental-native-modernization.md)

## قواعد الصيانة

1. العقود تصف ما يجب أن يبقى صحيحًا، لا تفاصيل المهمة اليومية.
2. الخطة وحدها تحمل حالة المراحل، وسجل الدين وحده يحمل حالة الديون.
3. أي قرار يغيّر عقدًا أو اتجاهًا معماريًا يحتاج ADR.
4. الملفات المولدة أو التقارير المؤقتة لا تصبح مصدر حقيقة.
5. إذا لم يعد مستند يملك قرارًا فريدًا، احذفه واربط تاريخه عبر Git.
