# عقد آلية النشر للإنتاج (Deployment Mechanism Contract)

الحالة: ملزم  
التاريخ: 2026-09-14  
النطاق: منصة هدهد إف إم (HudHud FM) - بيئة الإنتاج الرسمية (`HudHudOfficial`)

---

## 1. الهدف

تأسيس وتثبيت المرجعية التعاقدية الصارمة لكافة عمليات البناء، والتحقق، والنشر السحابي (Cloud Deployment) إلى مشروع Firebase المعتمد (`sanadev-fm`)، ومزامنة الشيفرة مع المستودع السحابي (Git Remote)، بما يضمن استقرار بيئة الإنتاج الرسمية `HudHudOfficial` وحمايتها من أي تسريب لبيانات أو إعدادات بيئة التطوير `HudHudDev`.

---

## 2. الثوابت التعاقدية للبيئة (Environment Invariants)

1. **مشروع Firebase المعتمد:**
   - معرف المشروع الأساسي: `sanadev-fm` (Project Number: `641426561966`).
   - المنطقة المعتمدة للوظائف وقواعد البيانات: `us-central1`.

2. **جذر الإنتاج (Production Root):**
   - جذر البيانات الرسمي هو حصرياً: `HudHudOfficial`.
   - يُلزم تعيين متغير البناء: `VITE_FIRESTORE_ROOT=HudHudOfficial`.
   - يُحظر نشر أي واجهة أو وظيفة موجهة لـ `HudHudDev` على أهداف الإنتاج العامة.

3. **أهداف الاستضافة (Hosting Targets):**
   - **البوابة العامة (`hudhud_public`):** موقع `sanadev-fm` المرتبط بمجلد مخرجات `web_hudhud/dist`.
   - **لوحة الإدارة (`hudhud_admin`):** موقع `hudhud-fm-admin-sanadev` المرتبط بمجلد مخرجات `web_admin/dist`.

---

## 3. مصفوفة المكونات وبوابات التحقق (Verification Gates)

| المكون | بوابة البناء والتحقق (Pre-flight Gate) | أمر النشر المعتمد |
| :--- | :--- | :--- |
| **قواعد وفهارس Firestore** | التحقق من دعم `HudHudOfficial` والامتثال للأمان | `firebase deploy --only firestore:rules,firestore:indexes` |
| **قواعد Storage** | حظر الكتابة المباشرة بدون وسيط برمجي خادمي معتمد | `firebase deploy --only storage` |
| **الوظائف السحابية (Cloud Functions)** | اجتياز اختبارات `npm test` و `npm run lint` (Node 22) | `firebase deploy --only functions` |
| **الموقع العام (`web_hudhud`)** | `VITE_FIRESTORE_ROOT=HudHudOfficial npm run build` | `firebase deploy --only hosting:hudhud_public` |
| **لوحة الإدارة (`web_admin`)** | `VITE_FIRESTORE_ROOT=HudHudOfficial npm run build` | `firebase deploy --only hosting:hudhud_admin` |
| **مستودع الأكواد (Git)** | التحقق من نظافة بيئة العمل وخلو `flutter analyze` من الأخطاء | `git push origin hudhud_fm` |

---

## 4. ترتيب دورة النشر الإلزامية (Deployment Execution Order)

تُنفذ إجراءات النشر وفق التسلسل المنطقي التالي لضمان عدم وجود فجوات في التوافق:

1. **المرحلة الأولى: الفحص المسبق والتحقق (Pre-flight Validation):**
   - التأكد من اجتياز كافة اختبارات الوظائف الخلفية وفحص الواجهات.
   - التحقق من توافق معايير TypeScript و Linter.

2. **المرحلة الثانية: بناء حزم الواجهات للإنتاج:**
   - بناء `web_hudhud` صراحة لجذر `HudHudOfficial`.
   - بناء `web_admin` صراحة لجذر `HudHudOfficial`.

3. **المرحلة الثالثة: نشر البنية التحتية وقواعد الأمان:**
   - نشر قواعد وفهارس `firestore`.
   - نشر قواعد `storage`.

4. **المرحلة الرابعة: نشر المنطق الخلفي (Backend Functions):**
   - نشر الدوال السحابية المحدثة (`functions`) إلى `sanadev-fm`.

5. **المرحلة الخامسة: نشر واجهات الويب (Hosting):**
   - نشر `hosting:hudhud_public` و `hosting:hudhud_admin`.

6. **المرحلة السادسة: المزامنة السحابية (Git Sync):**
   - دفع التغييرات المعتمدة إلى فرع `hudhud_fm` على المستودع البعيد `origin`.
