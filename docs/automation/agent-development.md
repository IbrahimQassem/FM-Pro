# Agent development runbook

هذا دليل تشغيل لمسار تطوير وكيلي محدود داخل `FM-Pro`. سلطة السلوك والجودة تبقى
في `AGENTS.md` والعقود وخطة التسليم؛ هذا الملف لا ينشئ مصدر حالة جديدًا.

## الضمانات

- كل تغيير وكيلي يخص حزمة عمل واحدة وعقد JSON واحدًا تحت `.agents/tasks/`.
- المنسق، المنفذ، ومراجع Quality release مسؤوليات منفصلة.
- أوامر التحقق معرفة في `tools/agent-task.py` ولا تؤخذ كأوامر shell من العقد.
- CI يقارن diff بالعقد ويرفض أي ملف خارج `allowed_paths`.
- الـworkflow يرفض تعديل المدقق أو الحوكمة قبل تشغيل نسخة المدقق القادمة من PR.
- المسار ينتهي عند PR ولا يدمج أو يطلق أو يكتب إلى الإنتاج.

المسار لا يقبل تلقائيًا ملفات الأسرار والتوقيع، `.github/`، قواعد Firebase،
عقود `docs/contracts/` أو إعدادات Gradle الحساسة. هذه الملفات تحتاج تغييرًا
بشريًا مستقلًا حتى لو كان الهدف الأصلي منخفض المخاطر.

## دورة المهمة

1. افتح issue عبر نموذج `Agent development task` أو اختر بندًا واحدًا مباشرة من
   `docs/roadmap/phased-delivery-plan.md`. النموذج يجمع المدخلات فقط ولا يمنح
   تفويضًا أو يغيّر حالة الخطة.
2. أنشئ فرع عمل مستقلًا عن `base_branch`.
3. انسخ `.agents/tasks/examples/example-task.json` إلى
   `.agents/tasks/<task-id>-<slug>.json` واملأ القيم الفعلية، ثم شغّل:

```bash
python3 tools/agent-task.py preflight .agents/tasks/<task>.json
```

4. نفذ عبر `$orchestrate-fm-pro-task` ثم شغّل البوابات الثابتة:

```bash
python3 tools/agent-task.py run-gates .agents/tasks/<task>.json
python3 tools/agent-task.py scope .agents/tasks/<task>.json \
  --base-ref origin/<base-branch> --head-ref HEAD --include-working-tree
```

5. افتح PR وأضف label باسم `agent-change`. يجب أن يضيف أو يعدّل PR عقد مهمة
   واحدًا فقط؛ عندها يشغّل `agent-task-gate.yml` تحقق العقد والنطاق.
6. يسلم المنفذ تقرير `build/reports/agent-task/<task-id>.json` لمراجع Quality
   release. الدمج قرار منفصل يخضع لعقد الجودة.

## مستويات الاستقلالية

| risk | autonomy المسموح | النتيجة القصوى |
|---|---|---|
| low | `local-auto`, `pr-only` | تغيير محلي أو PR |
| medium | `pr-only` | PR يحتاج مراجعة |
| high / critical | `plan-only` | خطة وأدلة فقط، دون تنفيذ |

لا تغيّر `risk` أو `allowed_paths` بعد ظهور diff غير متوقع. أوقف المهمة، افصل
التغيير أو اطلب عقدًا جديدًا بمراجعة مستقلة.

## إعداد GitHub مرة واحدة

- أنشئ label باسم `agent-ready` للـissues و`agent-change` للـPRs.
- اجعل `Android CI` و`Agent Task Gate` مطلوبين قبل دمج فروع الوكلاء.
- لا تضع أسرار إنتاجية في workflow الخاص بالوكلاء. يستخدم gate صلاحية
  `contents: read` فقط.

إنشاء الـlabel أو branch protection تغيير خارجي ولا ينفذه هذا المستودع تلقائيًا.
