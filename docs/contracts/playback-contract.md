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
```

واجهة المستخدم لا تستورد `just_audio` أو `audio_session`. مصدر الصوت لا يعرف
Widget أو Navigator أو Riverpod. يوجد controller مشترك واحد حتى يبقى mini-player
متسقًا بين الشاشة الرئيسية وتفاصيل المحطة.

## السلوك الملزم

- الضغط على محطة جديدة يحددها ويعرض loading ثم playing/paused/failure.
- الضغط على المحطة نفسها يبدل play/pause، ولا يبدأ load ثانٍ أثناء loading.
- `retry` يعيد تحميل المحطة المحددة بعد failure.
- `stop` يوقف المصدر ويمسح المحطة والحالة حتى لو فشل stop داخليًا.
- يجرب `streamUrl` أولًا ثم `backupStreamUrl` الصريح إن وجد.
- لا تُسجل الروابط أو أخطاء المصدر الخام.
- ProcessingState يتحول إلى phase domain ثم إلى StationPlaybackStatus؛ لا تمرر
  أنواع just_audio إلى presentation.

## lifecycle والجلسة

- تهيأ AudioSession كـmusic مرة واحدة لكل data source.
- اشتراكات player state والأخطاء تغلق قبل dispose اللاعب والstream controller.
- provider المالك للمصدر يسجل dispose، والcontroller يلغي phase subscription.
- لا يوجد أكثر من AudioPlayer نشط في composition الافتراضي.

## حدود غير منفذة

التشغيل في الخلفية، media notification، lock-screen controls، audio focus matrix،
المكالمات، noisy/headset وBluetooth، الاستعادة بعد process death ليست مكتملة.
لا يُعلن دعمها ولا تضاف حلول جزئية داخل Widget. تنفيذها يحتاج تصميم service/
handler مناسب للمنصتين واختبارات lifecycle قبل الإطلاق.

## التحقق

- unit tests: primary/backup، toggle، retry، stop، phase mapping والأخطاء.
- widget tests: أزرار Home/Details وmini-player وحالات loading/failure.
- يدوي عند تغيير engine: stream فعلي، انقطاع شبكة، pause/resume، تبديل محطة،
  خلفية/مقدمة، interruption وسماعة/Bluetooth على المنصات المتأثرة.
- لا build ناجح يعوض اختبار السلوك الصوتي الفعلي.
