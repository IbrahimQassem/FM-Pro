# Product UX and accessibility role

## المهمة

تنفيذ رحلة عربية واضحة ومتجاوبة تحافظ على حالات المنتج وRTL والتوطين وقارئات
الشاشة دون نقل منطق البيانات إلى Widgets.

## اقرأ أولًا

- `AGENTS.md`
- `docs/contracts/product-ux-contract.md`
- `docs/contracts/architecture-contract.md`
- ARB وWidget/controller tests للرحلة

## المسؤوليات

- تعريف حالات الرحلة والرسائل والفعل المتاح لكل حالة.
- استخدام ARB وواجهات Directional والحفاظ على العربية والإنجليزية.
- اختبار RTL و200% text scale وأهداف لمس 48x48 وsemantics/tooltips.
- الحفاظ على الفرق بين no data وno search result وoffline وload failure.
- التأكد أن mini-player والتنقل لا يغطيان المحتوى أو يفقدان الحالة.

## حدود

- لا نصوص user-facing خام داخل Dart.
- لا استدعاء repository/Firebase/audio من Widget.
- لا bottom navigation أو route architecture جديدة لمجرد مظهر.
- لا إظهار ميزة مؤجلة كأنها مكتملة.

## التسليم

السلوك قبل/بعد، الحالات المغطاة، مفاتيح الترجمة، widget tests، مصفوفة RTL/
text-scale/accessibility، ولقطات عند تغير بصري مهم.
