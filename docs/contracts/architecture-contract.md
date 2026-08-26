# Architecture contract

الحالة: ملزم  
المالك: Android modernization agent

## الهدف

تحديث تطبيق Android الأصلي تدريجيًا مع إبقاء كل نسخة قابلة للبناء والإطلاق،
ومن دون إنشاء تنفيذين دائمين للميزة نفسها.

## الثوابت

1. يبقى `:app` وحدة Gradle الوحيدة حتى تصبح حدود الحزم مستقرة ومقاسة. إضافة
   وحدات جديدة قرار ADR وليست هدفًا بحد ذاته.
2. النكهات `hudhud_fm` و`hudhudfm_google_play` و`internews` تشترك في منطق
   التطبيق. الاختلافات تقتصر على الموارد والإعدادات ومعرّفات الخدمة.
3. شاشة Android لا تتصل مباشرة بـFirestore أو Storage أو Auth في الكود الجديد.
4. Service لا يحتفظ بمرجع إلى View أو Activity أو Fragment.
5. يوجد نموذج مجال canonical واحد لكل: `Station`, `Program`, `Episode`,
   `Schedule`, `Comment`, `User`. نماذج Firebase وواجهات legacy تتحول عند الحدود.
6. كل عملية غير متزامنة تنتج حالة صريحة: loading, content, empty, recoverable
   error أو terminal error. لا تمثل الأخطاء بقيمة `null`.

## اتجاه الاعتماد المستهدف

```text
Android UI -> ViewModel/state -> use case -> repository interface
                                      -> data repository -> Firebase/local cache
Android UI -> playback controller -> MediaSessionService
```

الطبقات الداخلية لا تستورد Android UI أو Firebase SDK. التفاصيل الخارجية
تعتمد على interfaces الداخلية، لا العكس.

## تنظيم الحزم المستهدف

يُطبّق على الملفات التي يتم لمسها فقط:

```text
com.sana.dev.fm
├── core/                 result, clock, logging, dispatchers
├── domain/               canonical models and repository interfaces
├── data/                 Firebase/local DTOs, mappers, repositories
├── feature/<feature>/    UI, state, ViewModel
├── playback/             controller, Media3 service, notification
├── admin/                role-gated administration UI
└── legacy/               temporary adapters with removal IDs
```

لا تنقل ملفات بالجملة لمجرد مطابقة الشجرة. كل نقل يجب أن يقلل اعتمادًا فعليًا
أو يفتح اختبارًا جديدًا.

## استراتيجية التحديث

- Java وXML مسموحان للكود المستقر غير الملموس.
- الميزات الجديدة أو المعاد بناؤها تستخدم Kotlin وViewModel وStateFlow ما لم
  يثبت قياس أو توافق flavor مانعًا واضحًا.
- Material 3 Views هو المسار الأقل مخاطرة. إدخال Compose يحتاج ADR وتجربة شاشة
  واحدة مع قياس حجم البناء والأداء وإمكانية الوصول.
- ButterKnife وواجهات callbacks القديمة لا تستخدم في الكود الجديد.
- كل مسار legacy يتم استبداله عبر seam واحد، ثم تزال النسخة القديمة في نفس
  المرحلة أو تسجل بموعد ومالك في سجل الدين.

## حدود التنقل

الوجهات الرئيسية أربع: الرئيسية، الجدول، البرامج، الحساب. المشغل المصغر حالة
مشتركة فوق شريط التنقل، وليس وجهة فارغة. الإدارة graph منفصل ولا تدخل في قائمة
المستمع العادية.

## قبول أي تغيير معماري

- اتجاه الاعتماد مطابق للرسم.
- لا يوجد مصدر بيانات أو نموذج منافس غير مسجل.
- يوجد اختبار للوحدة الجديدة أو seam يسمح باختبارها.
- لا يزيد عدد TODO أو الملفات المعلقة بالكامل.
- النكهات المتأثرة تبنى بنجاح.
- تم تحديث ADR أو سجل الدين عند تغيير الحدود.
