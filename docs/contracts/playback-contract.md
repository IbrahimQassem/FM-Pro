# Playback contract

الحالة: ملزم
المالك: Playback role

## الحدود الحالية

```text
Home/Details UI
  -> StationPlayerController + StationPlayerState
  -> AudioPlaybackRepository
  -> AudioPlayerDataSource
  -> JustAudioPlayerDataSource (just_audio + audio_session)
  -> just_audio_background/audio_service platform handler
```

واجهة المستخدم لا تستورد `just_audio` أو `audio_session`. مصدر الصوت لا يعرف
Widget أو Navigator أو Riverpod. يوجد controller مشترك واحد للبث المباشر وملف
الحلقة حتى يبقى mini-player متسقًا بين Home وStationDetails وProgramDetails.

## السلوك الملزم

- الضغط على محطة جديدة يحددها ويعرض loading ثم playing/paused/failure.
- الضغط على المحطة نفسها يبدل play/pause، ولا يبدأ load ثانٍ أثناء loading.
- الضغط على الحلقة نفسها يبدل play/pause، واختيار حلقة أو محطة أخرى يستبدل
  المصدر الحالي داخل AudioPlayer نفسه.
- `retry` يعيد تحميل المحطة المحددة بعد failure.
- `stop` يوقف المصدر ويمسح المحطة والحالة حتى لو فشل stop داخليًا.
- يجرب `streamUrl` أولًا ثم `backupStreamUrl` الصريح إن وجد.
- لا تُسجل الروابط أو أخطاء المصدر الخام.
- ProcessingState يتحول إلى phase domain ثم إلى StationPlaybackStatus؛ لا تمرر
  أنواع just_audio إلى presentation.
- يحمل `AudioPlaybackItem` هوية المحطة واسمها وصورتها وروابط primary/backup؛
  يستخدم الإشعار الهوية والاسم ولا يستخدم رابط البث كمعرّف أو metadata ظاهر.
- الحلقة تستخدم ID مسبوقًا بـ`episode:` وعنوان الحلقة واسم المحطة كـalbum، ولا
  يخرج رابط الملف الصوتي إلى presentation state أو logs.
- لا يقبل artwork في جلسة الوسائط إلا من رابط HTTPS صالح.

## lifecycle والجلسة

- تهيأ AudioSession كـmusic مرة واحدة لكل data source.
- اشتراكات player state والأخطاء تغلق قبل dispose اللاعب والstream controller.
- provider المالك للمصدر يسجل dispose، والcontroller يلغي phase subscription.
- لا يوجد أكثر من AudioPlayer نشط في composition الافتراضي.
- تهيئة background handler تتم مرة واحدة قبل `runApp`، ونفس اللاعب يخدم واجهة
  التطبيق والإشعار وشاشة القفل وأزرار الوسائط.
- Android يملك foreground media service وmedia button receiver وwake lock،
  وiOS يعلن background mode للصوت.

## مصفوفة الخلفية والمقاطعات

| الحدث | السلوك الملزم |
|---|---|
| انتقال التطبيق للخلفية أو قفل الشاشة أثناء التشغيل | يستمر البث عبر جلسة الوسائط وخدمة Android foreground أو iOS audio background mode |
| Play/Pause من الإشعار أو شاشة القفل أو headset | يتحكم في AudioPlayer المشترك وتنعكس phase على واجهة التطبيق |
| Stop من جلسة الوسائط | يوقف المصدر؛ وعند وصول idle يمسح controller المحطة المحددة |
| فقد Audio Focus مؤقتًا أو بدء مكالمة | يتولى just_audio/audio_session الإيقاف المؤقت، ويستأنف فقط إذا كان يعمل قبل المقاطعة وفق إشارة النظام |
| Duck | تطبق المنصة خفض الصوت المؤقت وفق إعداد music ثم تعيد المستوى عند استرجاع focus |
| becoming noisy مثل فصل سماعة سلكية أو فقد مسار Bluetooth | يوقف مؤقتًا ولا يبدأ التشغيل تلقائيًا على السماعة الخارجية |
| إيقاف المستخدم يدويًا قبل/أثناء المقاطعة | لا يستأنف تلقائيًا |

الاستعادة بعد قتل العملية `process death` ليست منفذة؛ لا تحفظ آخر محطة ولا يبدأ
البث تلقائيًا عند إعادة إنشاء العملية. Bluetooth route switching التفصيلي يعتمد
على نظام التشغيل ويجب اعتماده باختبار جهاز فعلي قبل الإعلان عنه.

## التحقق

- unit tests: metadata وprimary/backup، toggle، retry، stop/remote stop، phase mapping والأخطاء.
- widget tests: أزرار Home/Details وmini-player وحالات loading/failure.
- يدوي عند تغيير engine: stream فعلي، انقطاع شبكة، pause/resume، تبديل محطة،
  خلفية/مقدمة، interruption وسماعة/Bluetooth على المنصات المتأثرة.
- لا build ناجح يعوض اختبار السلوك الصوتي الفعلي.
