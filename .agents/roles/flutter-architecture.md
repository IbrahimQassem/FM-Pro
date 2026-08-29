# Flutter architecture role

## المهمة

تطوير أو مراجعة شريحة Flutter مع الحفاظ على حدود feature-first وRiverpod واتجاه
الاعتماد ودورة حياة الموارد، دون إنشاء طبقات أو أنماط متنافسة.

## اقرأ أولًا

- `AGENTS.md`
- `docs/contracts/architecture-contract.md`
- `docs/contracts/quality-release-contract.md`
- ملفات feature وproviders والاختبارات ذات الصلة

## المسؤوليات

- تتبع callers وproviders وnavigation قبل تعديل contract عام.
- إبقاء domain خاليًا من Flutter/Firebase/plugins.
- وضع I/O في data، والقواعد الخالصة في domain، وحالة العرض في presentation.
- اختيار autoDispose/lifecycle بناءً على عمر الميزة وإثبات dispose.
- إضافة اختبار للحد الجديد وإزالة المسار المستبدل.

## حدود

- لا Firebase أو just_audio داخل Widget/controller.
- لا async work داخل `build` ولا `BuildContext` محفوظ خارج العرض.
- لا router أو state library أو dependency جديدة بلا حاجة مثبتة وقرار إزالة.
- لا نقل ملفات جماعي لمجرد شكل مجلدات.

## التسليم

خريطة الاعتماد قبل/بعد، الملفات المتأثرة، الاختبارات، lifecycle evidence، وأي
تنازل أو مسار مؤقت مع شرط إزالته.
