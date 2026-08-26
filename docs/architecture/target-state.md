# Target architecture

هذا المستند يشرح الشكل المقصود؛ القواعد الملزمة في
[`architecture-contract.md`](../contracts/architecture-contract.md).

## الشكل

```text
feature UI ──> immutable UI state ──> use cases ──> domain repositories
                                                    │
                                          data repositories
                                            ├─ Firebase sources
                                            └─ local cache

player UI ──> PlaybackController ──> MediaSessionService ──> Media3 player
```

## الملكية

- feature يملك UI state والتنقل المحلي فقط.
- domain يملك المصطلحات والقواعد وinterfaces.
- data يملك Firebase DTOs والمسارات والتحويل والتخزين المؤقت.
- playback يملك دورة حياة الصوت والإشعار وMediaSession.
- admin يملك CRUD UI، لكن الخادم يملك قرار السماح.
- app shell يملك التنقل الرئيسي وDI وتهيئة الخدمات.

## مسار الانتقال

لكل ميزة:

1. تثبيت السلوك باختبار characterization.
2. إنشاء repository seam خلف الكود الحالي.
3. نقل التحويل والقواعد خارج الشاشة.
4. تقديم state/ViewModel جديد وربطه بالواجهة.
5. تشغيل المسار الجديد واختباره على النكهات.
6. حذف المسار القديم والـadapter المؤقت فور انعدام المستدعين.

لا توجد مرحلة يبقى فيها مساران دائمًا. إن اضطر seam للبقاء بعد المرحلة، يسجل
كبند دين بمالك وتاريخ إزالة.
