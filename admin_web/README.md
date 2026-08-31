# HudHud FM Admin

لوحة إدارة عربية RTL مرتبطة بمشروع Development `sanadev-fm` والجذر
`HudHudDev`.

## الصلاحيات

- الدخول عبر Firebase Auth Email/password فقط.
- يمكن للمشرف طلب رسالة إعادة تعيين كلمة المرور من شاشة الدخول.
- لا يكفي تسجيل الدخول؛ يجب أن يحتوي ID token على custom claim باسم
  `admin=true`.
- لا تنشئ اللوحة حسابات إدارية ولا تخزن كلمات مرور أو service-account keys.
- عمليات المحتوى والعدادات العلاقية تستخدم Firestore atomic batches.

لمنح حساب موجود الصلاحية، ابدأ بـdry-run من `tool/firebase_seed`:

```bash
npm run admin:grant -- --project sanadev-fm --email ADMIN_EMAIL
npm run admin:grant -- --project sanadev-fm --email ADMIN_EMAIL --apply
```

## التشغيل

انسخ `.env.example` إلى `.env.local` وأضف إعداد Firebase Web App من قناة آمنة،
ثم:

```bash
npm install
npm run dev
```

`.env.local` مستبعد من Git. تُحقن إعدادات Firebase العامة في حزمة المتصفح وقت
البناء، ولا توضع قيمها داخل ملفات المصدر.

## الاستضافة

تُبنى اللوحة كتطبيق React ثابت وتُنشر إلى موقع Firebase Hosting المستقل
`hudhud-fm-admin-sanadev` عبر target باسم `hudhud_admin`، لذلك لا يتأثر موقع
المشروع الافتراضي.

## نطاق الإدارة

- المحطات والبرامج والجداول والحلقات والإعلانات: قراءة وإنشاء وتعديل وحذف آمن.
- يمنع حذف محطة لها برامج، أو برنامج له حلقات، أو حلقة لها تعليقات.
- تحديث عدادات البرامج والحلقات والتعليقات يتم في batch مع العملية الأصلية.
- المستخدمون read-only لتجنب حذف Auth أو بيانات تابعة بصورة جزئية.
- التعليقات والمفضلة والاشتراكات قابلة للمراجعة والإزالة بواسطة المشرف.
