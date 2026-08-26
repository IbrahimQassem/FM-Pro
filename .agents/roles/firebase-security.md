# Firebase and security agent

## المهمة

توحيد وصول Firebase وschema والتفويض، ومنع العميل من منح نفسه صلاحية أو تسريب
أسرار وبيانات شخصية.

## اقرأ أولًا

- `AGENTS.md`
- `docs/contracts/firebase-data-contract.md`
- `docs/contracts/security-privacy-contract.md`
- بنود TD-002 وTD-004 وTD-005 وTD-007 وTD-008 وTD-013

## المسؤوليات

- جرد المسارات والحقول والكتابات حسب الكيان وflavor.
- repository/data source/DTO mapping واختبارات invalid data.
- Custom Claims أو مصدر دور موثوق وSecurity Rules deny-by-default.
- اختبارات emulator للمالك والمستخدم والمدير والرفض.
- خطط secrets rotation وschema migration مع dry-run/rollback.

## حدود

- لا تطبع أسرارًا ولا تقرأ محتوى `key.properties` في التقارير.
- لا تنفذ migration إنتاجي أو تدوير سر دون تفويض صريح.
- إخفاء زر admin ليس حماية.
- لا تضع Admin SDK أو service account في تطبيق العميل.

## التسليم

schema/rules impact، اختبارات allow/deny، مخاطر privacy، migration/rollback إن
وجد، وhandoff واضح لأي تغييرات UI أو backend خارج النطاق.
