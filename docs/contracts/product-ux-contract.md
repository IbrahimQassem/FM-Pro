# Product, UX, and accessibility contract

الحالة: ملزم  
المالك: Product UX and accessibility role

## وعد المنتج الحالي

تطبيق عربي أولًا لاكتشاف الإذاعات اليمنية وتشغيل البث المباشر. الرحلة الحالية:

```text
Splash/Firebase gate -> Home discovery -> Station details
                                  |        -> Programs -> Program episodes
                                  |                    -> Episode comments
                                  |        -> Weekly schedule
                                  |-> Account (guest/sign in/register/reset/logout)
                                  |-> Announcement notifications (opt in)
                                  \-> shared live/episode mini player
```

- Android هدف الإصدار الأول، وiOS مدعوم في التطوير.
- لا bottom navigation حاليًا ولا لوحة إدارة. زر الإعدادات يفتح الحساب، وزر
  الإشعارات يفتح تفضيل إعلانات FCM وقائمة رسائل الجلسة الحالية.
- الأزرار المؤجلة تعرض رسالة localized ولا تنشئ تدفقًا وهميًا.
- تفاصيل المحطة تعرض البرامج والجدول الأسبوعي وحالات التحميل/الفراغ/الخطأ.
- تفاصيل البرنامج تعرض الوصف والمقدم والتوقيت والحلقات المنشورة وتشغيلها.
- كل حلقة تفتح تعليقات عامة؛ إضافة التعليق تتطلب حسابًا مسجلًا وتوجه الضيف للدخول.

## الحساب والإشعارات

- التصفح والاستماع لا يتطلبان حسابًا، ولا يظهر permission prompt عند التشغيل.
- Email/password هو المزود الوحيد في هذه المرحلة، مع إنشاء واستعادة وخروج.
- تفعيل الإشعارات فعل صريح من المستخدم. رفض إذن النظام حالة واضحة وغير حاجبة.
- قائمة الإشعارات داخل التطبيق مؤقتة للجلسة؛ مركز النظام هو سجل الخلفية.

## الشاشة الرئيسية

- تعرض المستخدم أو guest، offline status، banners غير حاجبة، البحث، city filters،
  grid/list، وحالات التحميل/الفراغ/الفشل.
- البحث يطابق الاسم العربي والإنجليزي والمدينة والتردد بعد trim/case normalization.
- تعرض محطات اليمن فقط حاليًا (`YE`). تغيير الدولة قرار منتج وبيانات معًا.
- city filters تأتي من Location reference النشط والمتقاطع مع المحطات فقط.
- اختيار grid/list محفوظ محليًا، ويعود grid عند غياب قيمة صالحة.
- مع text scale أعلى من 1.4 تستخدم القائمة بدل grid لتجنب قص المحتوى.

## الحالات والتغذية الراجعة

- initial loading لا يعرض empty أو failure قبله.
- refresh يبقي المحتوى القابل للاستخدام ظاهرًا.
- cache الصالح يظهر مع offline banner وإمكانية retry.
- لا stations بعد فشل الشبكة: خطأ قابل لإعادة المحاولة.
- لا نتائج بعد search/filter: empty state مختلف عن فشل التحميل.
- rejected records لا تعرض بيانات فاسدة، ويمكن إظهار عدد آمن للتشخيص الداخلي.

## RTL والتوطين

- العربية هي locale الافتراضي واتجاه الواجهة RTL.
- كل نص ظاهر أو semantics label أو رسالة خطأ يأتي من ARB.
- الإنجليزية تبقى متزامنة لكل مفتاح، حتى قبل توفير مبدل اللغة.
- استخدم `EdgeInsetsDirectional`, `AlignmentDirectional` وواجهات اتجاهية.
- لا تضع نصًا عربيًا أو إنجليزيًا خامًا داخل Widget.

## إمكانية الوصول والاستجابة

- أهداف اللمس 48x48 logical pixels على الأقل.
- الأيقونات غير الواضحة لها tooltip/semantics، وحالات التشغيل لها label وحالة.
- الصور لها fallback ولا تحمل المعلومة الوحيدة بلا نص.
- اختبر 200% text scale، هاتفًا صغيرًا وكبيرًا، RTL، وTalkBack/VoiceOver عند
  تغيير رحلة حرجة.
- loading animations لا تمنع reduced motion ولا تسبب وميضًا متكررًا.
- mini-player لا يغطي محتوى أو زرًا، ويظل سلوكه متسقًا بين Home وDetails.

## بوابة القبول

- loading/content/empty/offline/error/search-empty قابلة للملاحظة.
- لا overflow أو نص مقصوص في RTL و200% text scale.
- كل فعل قابل للوصول بلوحة المفاتيح/قارئ الشاشة حيث تدعم المنصة.
- widget tests تغطي السلوك لا مجرد وجود نص ثابت.
