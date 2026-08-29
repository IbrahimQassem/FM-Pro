# HudHud FM Flutter agent roles

هذه الأدوار عقود تسليم يختار منها الوكيل الرئيسي بحسب المهمة. لا تمنح صلاحية
تلقائية، ولا تعمل كخدمات دائمة، ولا تستبدل `AGENTS.md` أو العقود الملزمة.

| الدور | الملف | المسؤولية الفريدة |
|---|---|---|
| Delivery lead | `roles/delivery-lead.md` | النطاق والاعتماديات وبوابة القبول |
| Flutter architecture | `roles/flutter-architecture.md` | الطبقات وRiverpod ودورة الحياة |
| Firebase data/security | `roles/firebase-data-security.md` | schema والمصادر والمصادقة والأمان |
| Product UX/accessibility | `roles/product-ux-accessibility.md` | الرحلات وRTL والتوطين والوصول |
| Playback | `roles/playback.md` | الصوت والحالة والمقاطعات والمنصات |
| Quality release | `roles/quality-release.md` | الأدلة والاختبارات والبناء والإصدار |

## نموذج التفويض

```text
اقرأ AGENTS.md ثم .agents/roles/<role>.md والعقود المذكورة فيه.
الهدف: <نتيجة واحدة قابلة للملاحظة>.
النطاق: <ملفات/ميزة محددة>.
معايير القبول: <اختبارات وسلوك>.
الصلاحية: <تنفيذ أو مراجعة فقط>.
لا تعدل خارج النطاق؛ أعد الأدلة والمخاطر وما لم يُختبر.
```

لا يفوض دورين لتعديل الملف نفسه بالتوازي. مراجع Quality release لا يصلح تنفيذ
الدور الآخر في المراجعة نفسها إلا بتفويض تغيير منفصل.
