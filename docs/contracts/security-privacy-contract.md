# Security and privacy contract

Direct campaigns follow [the advertising contract](advertising-contract.md):
private super-admin-only commercial records, public allowlisted creative delivery,
short-lived deduplicated receipts and aggregate reports without account/device
identifiers. This is the explicit guest-callable exception to read-only browsing;
it grants no direct Firestore writes or access to commercial terms.

الحالة: ملزم  
المالك: Firebase data and security role

## الأسرار والإعدادات

- هذه الملفات محلية ومستبعدة من Git ولا يجوز عرض محتواها أو نسخه بين المشاريع:
  - `android/app/google-services.json`
  - `ios/Runner/GoogleService-Info.plist`
  - `lib/firebase_options.dart`
- لا تسجل API keys أو project IDs أو connection details أو signing material.
- إعداد Android يخص `com.sana.dev.fm` وإعداد iOS يخص bundle المسجل له؛
  لا يفترض أن ملف منصة صالح للأخرى.
- لا تدخل بيئة production أو secrets إلى CI دون مخزن أسرار وصلاحية دنيا.

## المصادقة والبيانات الشخصية

حدود هوية Auth المشتركة وحذف الجذرين موثقة في
[ADR 0002](../decisions/0002-store-release-boundaries.md).


- Firebase Auth هو مصدر هوية المستخدم الوحيد؛ بيانات UI لا تمنح صلاحية.
- توثيق البريد بالرمز خادمي فقط. يخزن challenge خاصًا ومؤقتًا يحتوي hash للرمز
  مع pepper من Secret Manager والبريد المقصود وأوقات الانتهاء والحدود؛ لا يقرأه
  العميل ولا يخزن الرمز الصريح أو يكتب `email_verified`.
- يطبق حد الإرسال على UID وعلى HMAC للبريد عبر الحسابات، وتحذف سجلات الحد
  المنتهية يوميًا دون تخزين عنوان البريد داخلها.
- إعداد إرسال البريد JSON secret باسم `EMAIL_VERIFICATION_CONFIG` ويحتوي إعداد
  Resend والمرسل وpepper قويًا. لا يدخل أي منها إلى Git أو logs أو Analytics.
- رموز OAuth وaccess tokens وauthorization codes لا تخزن في Firestore أو
  SharedPreferences ولا تسجل. لا يطلب التطبيق إلا `email` و`public_profile`
  اللازمين، وتبقى أسرار Meta وتهيئة Apple/Google في قنوات المنصة الآمنة.
- guest fallback للعرض فقط ولا يمثل حسابًا موثقًا.
- UID والاسم والصورة أقل projection عام. يظهر email من Firebase Auth داخل شاشة
  الحساب فقط ولا يكتب في Firestore أو SharedPreferences ولا يسجل. الهاتف خارج النطاق.
- إثبات قبول شروط UGC يخزن الإصدار ووقت الخادم فقط تحت UID؛ لا يكرر البريد أو
  الاسم أو نص الشروط داخل الوثيقة.
- بلاغ التعليق أو المستخدم خاص بصاحبه والمشرف، ولا ينسخ نص التعليق أو البريد. يخزن معرّفات
  الهدف والسبب والتفاصيل المحدودة وسجل القرار الإداري فقط.
- قائمة الحظر خاصة بمالكها والمشرف؛ لا يقرأها مستخدم آخر ولا تغير المحتوى العام.
- FCM اختياري ويستخدم topic ثابتًا؛ لا يخزن التطبيق token أو device ID في
  Firestore أو التخزين المحلي. SharedPreferences يحتفظ باختيار الاشتراك فقط.
- أي كتابة مستقبلية تتحقق منها Rules جهة الخادم، مع allow/deny tests للضيف
  والمستخدم والمالك والمشرف. إخفاء زر في UI ليس authorization.
- إنشاء التعليق يتطلب إثبات قبول الإصدار الحالي من شروط UGC في Rules.
- Rules تتحقق من وجود التعليق ومؤلفه عند البلاغ، وتمنع البلاغ الذاتي والمكرر،
  وتفرض هوية المشرف ووقت الخادم على قرار الإشراف.
- حذف الحساب يتطلب إعادة مصادقة حديثة، ولا يرسل كلمة المرور إلى Firestore أو
  Cloud Functions. تحذف الدالة Auth والملف والتعليقات والبيانات التابعة ولا
  تسجل UID أو البريد أو المحتوى في logs.
- بعد حذف المحتوى وAuth تبقى علامة أمان خادمية مؤقتة تحمل حالة الحذف وموعد
  انتهائها فقط، مرتبطة بمعرّف الحساب، لمنع إعادة البيانات برمز دخول قديم.
  تنتهي بعد 24 ساعة وتزيلها المهمة اليومية عند التأكد من غياب Auth. لا تحتوي
  البريد أو الاسم أو التعليقات؛ تراقب أعطال التنظيف وتعلن هذه المدة في الخصوصية.
- يحذف مسار الحساب أيضًا challenge التحقق المؤقت إن كان الحساب غير موثق.

## الشبكة والمحتوى الخارجي

- صور البانرات HTTPS فقط؛ صور المستخدم HTTPS أو أحد أصول الماسكوت الأربعة
  المعتمدة وفق ADR 0002، ولا تحفظ مسارات الجهاز. رفع الكاميرا/المعرض يمر عبر callable موثقة تعيد ترميز الصورة دون EXIF، وتمنع Storage Rules الوصول المباشر. رابط العرض HTTPS قابل للمشاهدة لمن يملكه، وتزال الصور المستبدلة مع تنظيف خادمي قابل لإعادة المحاولة.
- روابط البث قد تكون HTTP بسبب المصدر، لكنها بيانات حساسة تشغيليًا: لا تسجل
  الرابط ولا تعرضه في رسالة خطأ ولا ترسله إلى analytics.
- لا يفتح banner أو deep link حتى توجد allowlist وسياسة `targetType` واختبارات.
- إشعارات FCM الحالية إعلانات نصية فقط؛ النقر يفتح التطبيق دون تفسير data
  payload أو تنقل حتى اعتماد allowlist مستقلة.
- رسائل الخطأ للمستخدم آمنة ولا تتضمن Firebase codes أو stack traces أو paths.

## التخزين والسجلات

- `SharedPreferences` يخزن اختيار grid/list وإكمال الجولة وتفضيلات الإشعارات
  العامة وعلم تفعيل إشعارات المحطات على الجهاز؛ لا credentials أو tokens أو PII.
- Firestore cache تديره SDK ولا يُعامل كصلاحية للوصول بعد تغير الهوية.
- debug logging يقتصر على نوع الخطأ وأعداد accepted/rejected دون وثائق أو URLs.
- لا تضف crash/analytics payload يحتوي user data قبل مراجعة الخصوصية.

## المنصات والإصدار

- Android release يرفض إعداد توقيع إنتاجي ناقص ولا يستخدم debug signing.
  مفتاح debug مخصص لبناء التطوير فقط.
- أي signing production أو App Store/Play upload يحتاج تفويضًا منفصلًا، secret
  storage، rotation وrollback.
- لا تنشر Firebase Rules أو تعدّل بيانات production ضمن build أو اختبار عادي.

## Developer-tool source indexing amendment — 2026-09-15

- Atlas Scout is an optional, local, read-only navigation service for trusted
  Codex and Antigravity sessions. It may read repository source only to build
  its disposable structural index; it is not an application dependency and it
  has no Firebase, production, deployment or signing authority.
- Antigravity uses the workspace-scoped `/.agents/mcp_config.json` entry. The
  file is local machine configuration and remains excluded from Git; do not
  replace it with credentials, remote URLs, or a path to a different checkout.
- The generated `/.atlas/` SQLite index is disposable tooling state and is
  excluded from Git. It is never a source of truth and must not be copied into
  logs, analytics, crash reports, user-visible output, Firebase, or release
  artifacts.
- Atlas Scout results are navigation evidence only. Confirm literals with text
  search and behavior with the applicable tests, analyzer, build, emulator or
  device checks before treating a result as proof. An unavailable, partial or
  stale index must not weaken the quality, security or release gates.
- Do not index directories containing credentials, generated production data or
  unrelated private repositories. If a source-handling or license concern is
  discovered, stop using the index and remove the local `/.atlas/` directory.

## بوابة القبول

- فحص التغيير لا يكشف config أو secret أو PII.
- لا وصول Firebase جديد خارج data boundary.
- كل write جديد له Rules واختبارات رفض وقبول قبل الدمج.
- لا release production مع debug signing أو إعداد Development.
- لا يقدم رابط حذف الحساب إلى Play Console قبل نشر الدالة والصفحة العامة
  واختبارهما بحساب Development قابل للتخلص منه.


## Station subscription development amendment — 2026-09-08

[ADR 0003](../decisions/0003-station-subscriptions-and-alerts.md) owns the station
follow flow, callable mutations, private device registrations, publication jobs,
retention, consent and allowlisted episode notification navigation. This supersedes
the earlier topic-only/no-payload-navigation boundary for version-1 episode alerts
only. General announcements remain independent; arbitrary URLs remain rejected.
Private device/job paths are denied by the default Rules, including admin clients.
No production deployment or app release is included.


## Public web amendment — 2026-09-13

[ADR 0004](../decisions/0004-public-web-accounts-and-discovery.md) extends guest-only
web browsing with optional email/password accounts and browser episode alerts.
Guest content remains read-only; personal mutations reuse the existing callables.
The web persists only local station IDs/history and a push opt-in boolean outside
Firebase SDK-managed Auth/Messaging storage. No production publication is implied.
