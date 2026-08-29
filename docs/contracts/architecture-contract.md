# Architecture contract

الحالة: ملزم  
المالك: Flutter architecture role

## الهدف

إبقاء تطبيق Flutter صغيرًا، قابلًا للاختبار، عربيًا أولًا، مع حدود واضحة بين
الواجهة والقواعد ومصادر البيانات، ومن دون ربط Widgets مباشرة بالخدمات الخارجية.

## الاتجاه الملزم

```text
Widget/View -> Riverpod controller + immutable state -> domain repository
                                                   <- data repository <- data source

app/providers.dart -> composition and lifecycle only
```

- `presentation` يملك Widgets، التنقل المحلي، controller وحالة العرض.
- `domain` يملك النماذج canonical وrepository interfaces والقواعد الخالصة.
- `data` يملك Firebase/just_audio DTO mapping والمصادر وتنفيذ repositories.
- `app` يهيئ التطبيق ويركب providers؛ لا يملك filtering أو mapping أو I/O rules.
- `core` يملك الأنواع والسياسات المشتركة الصغيرة فقط، لا يتحول إلى مجلد عام.

لا يستورد domain Flutter UI أو Firebase أو just_audio. تعتمد التفاصيل الخارجية
على interfaces داخلية. يسمح باستيراد نموذج domain canonical بين ميزتين عندما
تمثلان المفهوم نفسه، مثل `Station` في home وplayer وstation details.

## إدارة الحالة ودورة الحياة

- Riverpod هو نمط الحالة والـDI الوحيد.
- حالات الميزة immutable وتكشف loading/content/empty/offline/error بوضوح.
- لا يبدأ Widget طلب شبكة أو تخزين داخل `build`.
- `autoDispose` يستخدم للحالة المرتبطة بعمر الشاشة؛ المشغل يبقى مشتركًا ما دام
  التطبيق يحتاج mini-player عبر أكثر من شاشة.
- كل StreamSubscription وAudioPlayer وcontroller خارجي له مالك وdispose مثبت.
- لا تخزّن `BuildContext` أو Widget داخل controller أو repository.

## التنقل والتطبيق

- `MaterialApp` و`Navigator`/`MaterialPageRoute` هما المسار الحالي.
- لا يضاف router package أو shell/bottom navigation قبل وجود رحلة منتج تستحقه
  وخطة إزالة للمسار السابق.
- الشاشة الرئيسية وجهة واحدة حاليًا، وتفاصيل المحطة route فوقها.
- العربية locale الافتراضي الحالي؛ دعم الإنجليزية في ARB لا يعني وجود مبدل لغة.

## إضافة أو تغيير ميزة

1. ثبّت السلوك المراد باختبار domain/controller أو widget مناسب.
2. عرّف نموذج domain وrepository interface واحدًا عند الحاجة.
3. أضف data source/mapping في data، ولا تمرر Firebase snapshots إلى presentation.
4. أضف state/controller، ثم اربط Widget عبر provider في `app/providers.dart`.
5. احذف المسار المستبدل فور تحقق التكافؤ؛ لا تترك `Old`, `New`, `V2` دائمًا.

## بوابة القبول

- اتجاه الاعتماد مطابق للعقد ولا يوجد وصول Firebase/audio من Widget.
- لا نماذج أو providers متنافسة للمفهوم نفسه.
- الحالات غير المتزامنة قابلة للملاحظة والاختبار.
- الموارد تملك lifecycle واضحًا.
- `flutter analyze` والاختبارات والبناء المتأثر ناجحة.
