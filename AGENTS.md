# FM-Pro Agent Instructions

## Scope

هذه التعليمات تخص مستودع `FM-Pro` فقط. لا تقرأ أو تعدّل أو تنقل كودًا من
`../hudhudfm`. التطبيق المطلوب هنا Android أصلي، ويجب تطويره تدريجيًا داخل
هذا المستودع مع المحافظة على نكهات المنتج الحالية.

## Single source of truth

| الموضوع | المصدر المعتمد |
|---|---|
| السلوك القابل للتنفيذ | `app/src/` واختباراته |
| حدود المعمارية | `docs/contracts/architecture-contract.md` |
| تجربة المستخدم والمنتج | `docs/contracts/product-ux-contract.md` |
| Firebase والبيانات | `docs/contracts/firebase-data-contract.md` |
| الأمان والخصوصية | `docs/contracts/security-privacy-contract.md` |
| الجودة والإصدار | `docs/contracts/quality-release-contract.md` |
| ترتيب التنفيذ وحالته | `docs/roadmap/phased-delivery-plan.md` |
| الدين التقني | `docs/roadmap/technical-debt-register.md` |
| القرارات الملزمة | `docs/decisions/` |

لا تنسخ قرارًا أو مخططًا إلى ملف آخر. اربط بالمصدر المعتمد. عند اختلاف الكود
مع العقد، لا تفترض أن أحدهما صحيح: أوقف التوسع، وثّق الفرق، ثم حدّث الكود
والعقد معًا في نفس التغيير أو أنشئ ADR يقرّ الاستثناء.

## Required reading

قبل أي تغيير، اقرأ هذا الملف ثم `docs/README.md`. بعد ذلك اقرأ فقط العقد
والدور والمهارة المطابقة للمهمة. لا تبدأ من لقطات أو مستندات خارج المستودع.

## Change rules

1. افحص المستدعين والموارد وManifest ونكهات Gradle قبل التعديل.
2. نفّذ شريحة رأسية صغيرة قابلة للبناء والاختبار؛ لا تنفّذ إعادة كتابة شاملة.
3. استخدم واجهة واحدة ونموذجًا واحدًا لكل مفهوم جديد. اربط الكود القديم عبر
   adapter مؤقت مسجّل في سجل الدين التقني.
4. لا تضف وصول Firebase جديدًا من Activity أو Fragment أو Adapter. مرّره عبر
   repository وحدود البيانات المحددة في العقد.
5. لا تضف كودًا معلّقًا أو بدائل تحمل أسماء `Old`, `New`, `Temp`, `V2` دون
   خطة إزالة محددة. Git هو أرشيف الكود المحذوف.
6. لا تحذف كودًا إلا بعد إثبات عدم وجود مراجع Java/XML/Manifest أو استخدام
   انعكاسي، ثم ابنِ النكهات المتأثرة.
7. حافظ على RTL، النصوص العربية، وإمكانية الوصول. لا تضع نصًا ظاهرًا للمستخدم
   داخل Java/XML خارج موارد `strings.xml`.
8. صلاحيات الإدارة يثبتها الخادم وقواعد Firebase؛ الحالة المحلية لا تمنح
   صلاحية كتابة.
9. لا تعرض أو تسجل الرموز أو البريد أو الهاتف أو معرفات الأجهزة أو مفاتيح
   التوقيع.
10. حدّث سجل المرحلة والدين التقني في نفس التغيير عند إغلاق بند أو إنشاء seam.

## Skills routing

- تخطيط أو بدء مرحلة: `.agents/skills/plan-fm-pro-phase/SKILL.md`
- تحديث ميزة أصلية: `.agents/skills/modernize-fm-pro-feature/SKILL.md`
- UI/UX وRTL: `.agents/skills/implement-fm-pro-ux/SKILL.md`
- المشغل الصوتي: `.agents/skills/migrate-fm-pro-playback/SKILL.md`
- Firebase والصلاحيات: `.agents/skills/secure-fm-pro-firebase/SKILL.md`
- إزالة الدين والكود الميت: `.agents/skills/retire-fm-pro-debt/SKILL.md`
- التحقق والإصدار: `.agents/skills/verify-fm-pro-release/SKILL.md`

## Agent roles

ملفات الأدوار في `.agents/roles/` هي عقود تسليم للوكلاء الفرعيين وليست إعدادًا
سحريًا للتشغيل. عند التفويض، أرسل للوكيل مسار الدور والمهمة المحددة ومعايير
القبول. لا تجعل وكيلين يعدّلان الملف نفسه بالتوازي.

## Verification

شغّل من جذر `FM-Pro` وباستخدام JDK 17:

```bash
./tools/verify-governance.sh
./tools/audit-technical-debt.sh
./gradlew testHudhudfm_google_playDebugUnitTest
./gradlew app:assembleHudhudfm_google_playDebug
```

للتغييرات المشتركة ابنِ أيضًا نكهتي `hudhud_fm` و`internews` المتأثرتين.
لا تدّع نجاح الاختبار إذا لم يعمل، وسجّل السبب والبديل المستخدم.
