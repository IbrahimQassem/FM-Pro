# Architecture decision records

أنشئ ADR عندما يغير العمل اتجاه اعتماد، schema، تقنية UI، طريقة تشغيل الصوت،
سياسة أمان أو مصدر حقيقة. لا تحتاج refactors المحلية أو إصلاحات bugs إلى ADR.

الحالات: `proposed`, `accepted`, `superseded`, `rejected`.

كل ADR يحتوي: السياق، القرار، البدائل، النتائج، وخطة الرجوع أو الاستبدال. عند
استبداله لا تعدّل القرار القديم؛ أضف ADR جديدًا واربطهما.

## السجل

- [ADR-0001: مصدر الحقيقة الواحد](ADR-0001-single-source-of-truth.md) — accepted
- [ADR-0002: تحديث أصلي تدريجي](ADR-0002-incremental-native-modernization.md) — accepted
