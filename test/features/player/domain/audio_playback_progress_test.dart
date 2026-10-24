import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_progress.dart';

void main() {
  test(
      'only a loaded recorded item with a positive native duration allows seeking',
      () {
    expect(
        const AudioPlaybackProgress(
                itemId: 'episode:e',
                isLive: false,
                duration: Duration(seconds: 60))
            .canSeek,
        true);
    for (final value in [
      const AudioPlaybackProgress(),
      const AudioPlaybackProgress(
          itemId: 'live', duration: Duration(seconds: 60)),
      const AudioPlaybackProgress(itemId: 'episode:e', isLive: false),
      const AudioPlaybackProgress(
          itemId: 'episode:e', isLive: false, duration: Duration.zero),
      const AudioPlaybackProgress(
          itemId: '', isLive: false, duration: Duration(seconds: 60))
    ]) {
      expect(value.canSeek, false);
    }
  });
  test('a failed seek disables this attempt without erasing elapsed playback',
      () {
    const value = AudioPlaybackProgress(
        itemId: 'episode:e',
        isLive: false,
        duration: Duration(seconds: 60),
        position: Duration(seconds: 12),
        seekFailed: true);
    expect(value.canSeek, false);
    expect(value.clampPosition(value.position), const Duration(seconds: 12));
  });
  test('native duration bounds both ends of a requested position', () {
    const value = AudioPlaybackProgress(
        itemId: 'episode:e', isLive: false, duration: Duration(seconds: 60));
    expect(value.clampPosition(const Duration(seconds: -1)), Duration.zero);
    expect(value.clampPosition(const Duration(seconds: 61)),
        const Duration(seconds: 60));
    expect(value.clampPosition(const Duration(seconds: 20)),
        const Duration(seconds: 20));
  });
  test(
      'unknown duration can still display nonnegative elapsed time without enabling seek',
      () {
    const value = AudioPlaybackProgress(itemId: 'episode:e', isLive: false);
    expect(value.clampPosition(const Duration(seconds: 42)),
        const Duration(seconds: 42));
    expect(value.clampPosition(const Duration(seconds: -1)), Duration.zero);
  });
}
