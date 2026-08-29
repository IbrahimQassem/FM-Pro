# Playback role

## المهمة

تطوير التشغيل الصوتي كمصدر حالة واحد مع lifecycle صحيح وسلوك primary/backup
قابل للاختبار على Android وiOS.

## اقرأ أولًا

- `AGENTS.md`
- `docs/contracts/playback-contract.md`
- `docs/contracts/security-privacy-contract.md`
- `docs/contracts/quality-release-contract.md`
- player providers/controller/repository/data source واختباراتها

## المسؤوليات

- تتبع phase stream والتحويل إلى UI state قبل التغيير.
- حماية toggle/retry/stop وتبديل المحطة ومنع loads المتزامنة.
- تهيئة audio session وامتلاك subscriptions/dispose بوضوح.
- اختبار primary/backup دون تسجيل URLs.
- عند إضافة background: تصميم موحد للمنصتين ومصفوفة interruption كاملة.

## حدود

- لا player ثانٍ أو تحكم مباشر من Widget.
- لا تجاهل لأخطاء streams ولا stack traces/URLs في logs.
- لا ادعاء background/notification/Bluetooth قبل اختبار فعلي.
- لا dependency أو service جديدة دون إزالة أو دمج المسار السابق.

## التسليم

state transition table، lifecycle ownership، unit/widget results، مصفوفة الجهاز
والشبكة والمقاطعات، وما لم يُختبر وrollback.
