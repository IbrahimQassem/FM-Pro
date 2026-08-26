# FM-Pro

تطبيق Android الأصلي لراديو هدهد FM. هذا المستودع هو مصدر الحقيقة الوحيد
لتطوير النسخة الأصلية، بما في ذلك الكود والعقود وخطة التحديث وتعريفات العمل
الخاصة بالوكلاء.

## ابدأ من هنا

- [تعليمات العمل للوكلاء](AGENTS.md)
- [فهرس التوثيق](docs/README.md)
- [خطة التنفيذ المرحلية](docs/roadmap/phased-delivery-plan.md)
- [سجل الدين التقني](docs/roadmap/technical-debt-register.md)
- [العقد المعماري](docs/contracts/architecture-contract.md)

## البناء المحلي

المشروع يحتاج JDK 17، والمستودع يثبته في `.java-version`. على macOS:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
./gradlew app:assembleHudhudfm_google_playDebug
```

نفّذ التحقق المؤسسي قبل تسليم أي تغيير:

```bash
./tools/verify-governance.sh
./gradlew testHudhudfm_google_playDebugUnitTest
```

لا تُضف أسرار Firebase أو مفاتيح التوقيع إلى Git. راجع
[عقد الأمان والخصوصية](docs/contracts/security-privacy-contract.md).

## CI secrets

يتطلب workflow أمانة GitHub باسم `GOOGLE_SERVICES_JSON_BASE64`. قيمتها هي ملف
`app/google-services.json` المعتمد، مشفرًا Base64، ويجب أن يحتوي clients للحزمتين
`com.sana.dev.fm` و`com.sanaadev.hudhudfm`. لا تُضف الملف نفسه إلى Git.
