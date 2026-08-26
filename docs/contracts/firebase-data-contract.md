# Firebase and data contract

الحالة: ملزم  
المالك: Firebase security agent

## السلطة الحالية

- اسم جذر البيانات يأتي فقط من `BuildConfig.BASE_FB_DB` لكل flavor.
- أسماء collections الحالية تعرف فقط في
  `app/src/main/java/com/sana/dev/fm/utils/AppConstant.java` حتى إنشاء schema
  typed بديل واعتماد ADR.
- collections المعروفة: `RadioInfo`, `RadioProgram`, `Episode`, `Users`,
  `Comment`, `Advertisement`.

لا تكرر اسم collection نصيًا في شاشة أو Adapter. أي مسار جديد يمر عبر data
source أو repository واحد.

## ملكية البيانات

| الكيان | المعرف الثابت | جهة الكتابة | سلوك الغياب |
|---|---|---|---|
| Station | `radioId` | Admin فقط | استبعاد السجل وتسجيل خطأ schema |
| Program | `programId` + `radioId` | Admin فقط | حالة محتوى غير متاح |
| Episode | `epId` + parent IDs | Admin فقط | لا تعرض رابطًا فارغًا |
| User | Firebase UID | المستخدم/خدمة موثوقة | anonymous listener mode |
| Comment | document ID + author UID | مستخدم موثق | رفض الكتابة مع رسالة تسجيل دخول |

يجب تثبيت الحقول الإلزامية وأنواعها في اختبارات mapper قبل أي migration بيانات.
حتى ذلك الوقت، لا تغير أسماء الحقول أو شكل المسارات ضمن تحديث واجهة فقط.

## حدود القراءة والكتابة

- UI يطلب use case ويستهلك domain state.
- repository يملك الاستعلام، pagination، retries والتحويل.
- DTO يطابق Firebase؛ domain model لا يحمل `DocumentSnapshot` أو `Task`.
- أخطاء permission وoffline وnot-found وinvalid-data أنواع مختلفة.
- الاستماع realtime يملك lifecycle واضحًا ويتم إلغاؤه عند انتهاء المالك.

## التوافق والترحيل

أي تغيير schema يستخدم expand/migrate/contract:

1. قراءة القديم والجديد مع telemetry.
2. backfill قابل للاستئناف مع dry-run وعدّ السجلات.
3. تحويل القراء إلى الشكل الجديد.
4. إيقاف الكتابة القديمة.
5. حذف التوافق بعد فترة تحقق ومسجل في سجل الدين.

لا تنفذ migration إنتاجي من تطبيق العميل. استخدم أداة إدارية موثوقة مع سجل
تدقيق وخطة rollback.

## التخزين المحلي

القيم المشتقة أو القابلة لإعادة الجلب يمكن تخزينها مؤقتًا. tokens وبيانات
التوقيع لا تخزن في SharedPreferences عادية. يجب تعريف TTL وسياسة invalidation
قبل إضافة cache جديد.
