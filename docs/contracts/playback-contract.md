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

### Reliability amendment — 2026-09-20

The just_audio 0.10 errorStream is authoritative for PlayerException values.
An error-bearing native idle/paused event must not erase the selected source as
if it were a user stop. Explicit notification drawable `ic_notification` comes
from upstream cdcf089 and is retained through Android resource shrinking.

Live reconnection uses at most three consecutive retries with 1/2/3-second delays.
Automatic retries preserve their budget and the sleep timer; only an explicit
new play/retry or 30 seconds of stable playing resets the budget. Duplicate
errors do not create parallel retry timers. Pause/stop/dispose cancel retries;
pause invalidates a pending load so it cannot start afterward. Episode errors
remain explicit failures. Device foreground-service restrictions still require
the real-device acceptance matrix; automated controller tests are not that proof.

On Android, app-initiated play/resume after an asynchronous load and retry timers
check foreground lifecycle before starting playback. If the app backgrounded,
retain the selection and expose failure/manual retry on return rather than
attempting an ineligible foreground-service start. Already-playing background
audio is not stopped. Native OS notification/headset actions remain owned by the
existing media handler and their platform exemptions; no battery exemption or
indefinitely paused foreground service is introduced.

- unit tests: metadata وprimary/backup، toggle، retry، stop/remote stop، phase mapping والأخطاء.
- widget tests: أزرار Home/Details وmini-player وحالات loading/failure.
- يدوي عند تغيير engine: stream فعلي، انقطاع شبكة، pause/resume، تبديل محطة،
  خلفية/مقدمة، interruption وسماعة/Bluetooth على المنصات المتأثرة.
- لا build ناجح يعوض اختبار السلوك الصوتي الفعلي.

Live stations and recorded episodes carry explicit `AudioPlaybackItem.isLive`
metadata. Controller load requests are serialized and invalidated by new selections,
stop and disposal; superseded load completions cannot start playback. Canonical
Station/Episode models currently contain media URLs internally; UI text, logs and
notification navigation payloads never expose them. This clarifies the earlier
blanket presentation-state wording without adding duplicate content models.

## Recorded-episode progress and seeking

NOV-10 uses the existing single player. `AudioPlaybackProgress` flows through the
existing datasource/repository and a separate auto-disposed StreamProvider into
`EpisodeProgressControls`; elapsed ticks do not update StationPlayerState or Home.
The datasource owns one500ms timer only while a recorded source is ready/playing
and has a listener, plus a generation-bound playback-event subscription. Paused
late subscribers get current progress. Replacement, stop and disposal clear
progress and cancel these resources.

Seeking is episode-ID-bound and serialized with loads in the controller, with
generation checks before and after the native request. It never starts playback
or changes pause intent. A positive native duration is required; catalog duration
alone proves no seek capability. Targets are clamped. A rejected seek disables
scrubbing for that source attempt and leaves elapsed playback visible; reloading
resets the attempt. Unknown duration and live sources have no seek control.
Slider movement holds a local draft; release submits one request. AR/EN labels,
semantic elapsed/total time and200-percent text are covered by widget tests.
The progress label, time and adjustable actions merge into one semantic control;
AR/EN tests exercise actual increase/decrease and Tab/arrow keyboard actions.
No persistence, speed control, download or second player is introduced.

Automated checks and simulator/debug builds do not prove device audio behavior.
Physical Android/iOS background, interruption, headset and long-listening gates
remain in the November acceptance matrix until exercised on actual devices.


## WO-02 timer and completed-replay reconciliation

The existing shared StationPlayerController owns one session sleep deadline. A
station/episode replacement, pause/resume, explicit retry or automatic live retry
preserves that deadline instead of restarting or cancelling it. Choosing a new
positive duration replaces the old deadline. Cancel, a null/non-positive duration,
local stop, remote/native idle or controller disposal cancels it. Expiry calls
stop for the then-current selection; a delayed earlier stop cannot clear a newer
generation or lend its old timer to the new session. Timer state and the existing
Now Playing indicator/cancel action describe the same deadline.

A completed recorded episode remains selected and paused; it does not become a
live-stream reconnect. An explicit play/toggle rewinds that same episode to zero
before play. If rewind is unavailable or throws, reload only that episode, using
the same repository/source and canonical episode: ID. Reload failure keeps a
retryable selection. Replay shares the existing serialized load/seek queue and
checks mount, selection, generation and play intent around asynchronous work.
Duplicate play requests consume completion once. Pause, stop, replacement or
disposal during rewind prevents a stale playback start; foreground eligibility
is checked again after rewind/reload. Ordinary episode seeking preserves its
chosen position and never implies autoplay. No second player, new persisted
playback state or navigation-driven autoplay is introduced.

Source: [controller](../../lib/features/player/presentation/controllers/station_player_controller.dart),
[datasource](../../lib/features/player/data/datasources/just_audio_player_data_source.dart).
Permanent regressions: [controller tests](../../test/features/player/presentation/station_player_controller_test.dart),
[native-source progress/reentrancy tests](../../test/features/player/data/audio_episode_progress_test.dart)
and [timer UI tests](../../test/features/player/presentation/now_playing_sheet_test.dart).
The [B07 revision evidence](../../.boss/technical-review/evidence/WO-02/B07-review-revision-provenance.json)
records the completed-replay reentrancy correction and focused GREEN checks.

Recorded integration evidence includes the earlier
[B07/B08 full Flutter suite](../../.boss/technical-review/evidence/integration/B07-B08-flutter-full-test.log)
(355 passes) and later [B09 full Flutter suite](../../.boss/technical-review/evidence/WO-03/B09-review-flutter-full-green.log)
(397 passes). [Build provenance](../../.boss/technical-review/evidence/integration/flutter-build-provenance.json)
records Android debug and iOS simulator debug builds, with physical acceptance NOT
RUN. These are historical candidate checks, not a fresh final merged-candidate
run or device proof. Full final Flutter checks and actual Android/iPhone
background/lock, interruption, headset/Bluetooth, timer and replay acceptance
remain mandatory; browser acceptance is also separate. No finding is closed by
this contract reconciliation.
