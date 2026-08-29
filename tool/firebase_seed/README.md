# HudHud FM Development seed

هذه أداة مستقلة لإضافة أول شريحة بيانات canonical إلى مشروع Firebase
`sanadev-fm`. لا تستخدم حقول legacy ولا تغيّر أي وثيقة موجودة.

المحتوى الحالي:

- مدينتان معتمدتان: صنعاء وعدن.
- أربع محطات ذات روابط HTTPS أعادت `audio/mpeg` عند التحقق.
- بانر HudHud أصلي مخزن في Firebase Storage تحت
  `HudHudDev/banners/welcome-v1/hudhud-discovery-v1.jpg`.

جميع المحطات تبدأ بـ `isVerified: false` إلى أن تعتمد من لوحة الإدارة.
أصل البانر محفوظ محليًا في
`assets/images/banners/hudhud-discovery-v1.jpg`، ويجب رفعه إلى Storage قبل تشغيل
seed على مشروع Firebase جديد.

## الصلاحيات

تستخدم الأداة حزمة Firestore الإدارية المباشرة مع Application Default Credentials
لحساب لديه صلاحية إنشاء وثائق Firestore.
لا تضع service-account JSON داخل المشروع أو Git.

## التشغيل

```bash
cd tool/firebase_seed
npm install
npm run seed:dry
npm run seed:apply
```

`seed:dry` لا يتصل بـ Firestore. أما `seed:apply` فيقبل مشروع `sanadev-fm`
فقط، وينشئ جميع الوثائق داخل batch ذري باستخدام `create`. إذا وجد أي Document
ID مسبقًا تفشل العملية كاملة بدل استبداله.

## مصادر التحقق

- أسماء وترددات المحطات: ملف الجرد المرجعي في `FM-Pro`.
- روابط البث المحلولة وحالتها: Radio Browser API.
- تم اختبار الروابط الأربعة مباشرة، وجميعها أعادت بث `audio/mpeg`.
