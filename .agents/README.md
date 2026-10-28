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
| Station content | `roles/station-content.md` | البرامج والحلقات والجدول وربط صوت الحلقة |
| Account/community/notifications | `roles/account-community-notifications.md` | الحساب والتعليقات وإعلانات FCM وخصوصيتها |
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

## مهارات التنفيذ والمراجعة

- [`project-maestro-implementer`](skills/project-maestro-implementer/SKILL.md):
  تنفيذ التغيير المصرح به بعد فحص المصدر والعقود، ثم التحقق ومراجعة الفرق.
- [`project-maestro-reviewer`](skills/project-maestro-reviewer/SKILL.md):
  مراجعة للقراءة فقط بنتائج مرتبة حسب الأولوية وأدلة وحدود تحقق واضحة.

المهارتان مقتبستان من سير عمل Groshe ومكيّفتان لعقود HudHud ومكوناته الحالية.
تستخدمان مهارات Flutter والويب وFirebase الموجودة عند الحاجة، ولا تشغّلان
Maestro أو تفوّضان وكلاء تلقائيًا. تفاصيل الاكتشاف والاستخدام في
[إعداد Codex](../docs/operations/codex-workspace-setup.md).

## التشخيص وجاهزية الإصدار

- [`hudhud-playback-diagnostics`](skills/hudhud-playback-diagnostics/SKILL.md):
  تتبع أعطال الصوت والتزامن والخلفية بأدلة آمنة، مع فصل اختبارات المصدر عن الأجهزة.
- [`hudhud-release-readiness`](skills/hudhud-release-readiness/SKILL.md):
  ربط مرشح الإصدار بأدلة التحقق والبوابات المتبقية وملاحظات الإصدار العربية والإنجليزية.

فحوص البيئة وبنية المهارات تعمل عند الطلب من `tool/codex/` حسب دليل الإعداد؛
لا تثبت اتصال MCP أو قبول الأجهزة أو صلاحية النشر.
