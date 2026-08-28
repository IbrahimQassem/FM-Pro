# Firebase and data contract

الحالة: ملزم
المالك: Firebase security agent
القرار المرجعي: [ADR-0003](../decisions/ADR-0003-standard-firebase-architecture.md)

## 1. السلطة والمجموعات المعيارية

- اسم جذر البيانات يأتي فقط من `BuildConfig.BASE_FB_DB` لكل flavor (`HudHudFM`, `HudHudFmGooglePlay`, `InterNews`).
- أسماء المجموعات والمسارات المعيارية تعرف مركزياً في `com.sana.dev.fm.utils.AppConstant`:
  - `stations`: محطات البث الإذاعي `/{root}/stations/{stationId}`
  - `programs`: البرامج الإذاعية `/{root}/programs/{programId}`
  - `episodes`: الحلقات المسجلة `/{root}/episodes/{episodeId}`
  - `users`: ملفات المستخدمين `/{root}/users/{uid}`
  - `banners`: اللافتات والإعلانات `/{root}/banners/{bannerId}`

### المجموعات الفرعية (Subcollections):
- `episodes/{episodeId}/likes/{uid}`: سجل إعجابات الحلقة
- `episodes/{episodeId}/comments/{commentId}`: تعليقات المستمعين
- `users/{uid}/favorites/{targetId}`: العناصر المفضلة للمستخدم
- `users/{uid}/subscriptions/{programId}`: اشتراكات المستخدم في البرامج

---

## 2. ملكية البيانات والصلاحيات

| الكيان | المسار المعتمد | جهة الكتابة | سلوك الغياب / القراءة غير المصرح بها |
|---|---|---|---|
| Station | `/{root}/stations/{stationId}` | Admin فقط | استبعاد السجل وتسجيل خطأ schema |
| Program | `/{root}/programs/{programId}` | Admin فقط | حالة محتوى غير متاح |
| Episode | `/{root}/episodes/{episodeId}` | Admin فقط | لا تعرض رابطاً فارغاً |
| Episode Like | `/{root}/episodes/{episodeId}/likes/{uid}` | المستخدم الموثق (UID) | قراءة الحالة للمستخدم فقط |
| Comment | `/{root}/episodes/{episodeId}/comments/{commentId}` | الكاتب الموثق (UID) | رفض الكتابة مع رسالة تسجيل دخول |
| User | `/{root}/users/{uid}` | صاحب الـ UID فقط / Admin | وضع المستمع الزائر (Anonymous) |
| Banner | `/{root}/banners/{bannerId}` | Admin فقط | تجاهل اللافتة |

---

## 3. معايير أنواع البيانات والتسميات

1. **التواريخ:** تستخدم كائنات `com.google.firebase.Timestamp` حصرياً مع `FieldValue.serverTimestamp()` لجميع حقول الوقت (`createdAt`, `updatedAt`, `publishedAt`, `broadcastDate`, `lastActiveAt`, `expiresAt`).
2. **العدادات:** تجمع كافة الإحصاءات في خريطة `stats` وتحدث ذرياً بواسطة `FieldValue.increment()`.
3. **الحالات المنطقية:** تصاغ بإيجابية دلالية (`isActive`, `isLive`, `isFeatured`, `isVerified`, `isPublished`).
4. **التخزين في Storage:**
   - مجلدات وظيفية: `/{root}/{category}/{id}/{assetType}.webp`.
   - تحويل وضغط الصور محلياً بصيغة `WebP` قبل الرفع.
   - ترويسات `Cache-Control: public, max-age=31536000`.

---

## 4. حدود القراءة والكتابة والمعمارية

- لا وصول مباشر لـ Firebase من Activities أو Fragments أو Adapters. يمر كل طلب عبر Repository مخصص.
- DTOs تطابق وثائق Firestore وتتحول إلى Domain Models نقية وغير قابلة للتعديل عبر Mappers دفاعية تضمن سلامة الـ Null-Safety.
- استعلامات Realtime تملك Lifecycle منضبط يتم إلغاؤه فور تدمير واجهة العرض.
