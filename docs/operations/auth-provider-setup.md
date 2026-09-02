# إعداد توثيق البريد ومزودي الدخول

هذا الدليل يسجل الإعداد الخارجي المطلوب لتشغيل كود المصادقة دون وضع أي قيمة
حقيقية أو سر داخل المستودع.

## توثيق البريد بالرمز

اعتمدت الرحلة رمزًا رقميًا من ستة أرقام ترسله Cloud Functions عبر Resend. أنشئ
نطاق إرسال موثقًا في Resend، ثم خزّن JSON التالي في Firebase Secret Manager تحت
الاسم `EMAIL_VERIFICATION_CONFIG`:

```json
{
  "resendApiKey": "REPLACE_OUTSIDE_GIT",
  "from": "HudHud FM <verify@your-verified-domain.example>",
  "otpPepper": "REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS"
}
```

لا تحفظ ملف القيم. استخدم `firebase functions:secrets:set` بصورة تفاعلية، ثم
انشر `requestEmailVerificationCode` و`verifyEmailCode` و`ensureAccountProfile`
و`cleanupUnverifiedAccounts`. تحتفظ الخدمة بتحدي الحساب غير الموثق 30 يومًا،
ثم تحذف المهمة اليومية حساب Auth إذا ظل غير موثق ولم يكن له ملف مستمع؛ أما
الحساب الموثق أو ذو الملف القائم فلا يُحذف.

## Google

1. فعّل Google في Firebase Authentication لكل بيئة بصورة مستقلة.
2. سجل SHA-1 وSHA-256 لتوقيع Android Development ثم توقيع Play App Signing.
3. انسخ `ios/Flutter/AuthProviders.xcconfig.example` إلى الملف المحلي المستبعد
   `AuthProviders.xcconfig`، واملأ Client ID وURL scheme العكسي من إعداد Firebase.
4. اختبر النجاح والإلغاء وتبديل الحساب وربط المزود بحساب كلمة مرور قائم.

## Facebook

1. أنشئ Meta app واربط Android package وiOS bundle ID الفعليين.
2. فعّل Facebook في Firebase Authentication وأدخل App ID وApp Secret في Console.
3. مرر Android App ID وClient Token كـGradle properties باسم
   `HUDHUD_FACEBOOK_APP_ID` و`HUDHUD_FACEBOOK_CLIENT_TOKEN`؛ لا تضع القيم في Git.
4. أضف App ID وClient Token إلى `AuthProviders.xcconfig` المحلي؛ يستخدم
   `Info.plist` القيم كـbuild settings ولا يحتوي قيمة حقيقية في Git.
5. سجل key hashes لكل توقيع واختبر حسابًا لا يعيد بريدًا؛ يجب أن ينتقل إلى رمز
   البريد بدل إنشاء بريد وهمي.

## Apple

1. فعّل Sign in with Apple للـApp ID وفي Firebase Authentication.
2. حدّث provisioning profile؛ entitlement موجود في `Runner.entitlements`.
3. اختبر البريد العادي وPrivate Relay والربط والحذف مع إعادة المصادقة.

## بوابة التحقق

- لا قيمة سرية أو token في Git أو logs.
- كل provider يختبر فعليًا على Development في Android وiOS.
- ربط المزود يحافظ على UID والتعليقات والبيانات التابعة.
- الحساب غير الموثق يفشل في كل Rules الخاصة بالتعليقات والمفضلة والاشتراكات.
