import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/features/player/application/player_controller.dart';
import 'package:hudhudfm/src/features/player/domain/playback_engine.dart';
import 'package:hudhudfm/src/features/radio/domain/radio_info.dart';

void main() {
  test('plays valid radio through playback engine', () async {
    final engine = _RecordingPlaybackEngine();
    final controller = PlayerController(playbackEngine: engine);

    await controller.play(_radio(streamUrl: 'https://example.com/live.mp3'));

    expect(engine.playedUrl, 'https://example.com/live.mp3');
    expect(engine.playedTitle, 'إذاعة');
    expect(engine.playedArtworkUrl, 'https://example.com/logo.png');
    expect(controller.status, PlaybackStatus.playing);
    expect(controller.currentRadio?.radioId, 'radio-1');

    await controller.stop();
    expect(engine.didStop, isTrue);
    expect(controller.status, PlaybackStatus.idle);
  });

  test('fails before engine call when stream url is missing', () async {
    final engine = _RecordingPlaybackEngine();
    final controller = PlayerController(playbackEngine: engine);

    await controller.play(_radio(streamUrl: ''));

    expect(engine.playedUrl, isNull);
    expect(controller.status, PlaybackStatus.failed);
    expect(controller.errorMessage, isNotNull);
  });

  test('reports playback engine failures', () async {
    final engine = _RecordingPlaybackEngine(shouldFail: true);
    final controller = PlayerController(playbackEngine: engine);

    await controller.play(_radio(streamUrl: 'https://example.com/live.mp3'));

    expect(controller.status, PlaybackStatus.failed);
    expect(controller.errorMessage, 'تعذر تشغيل البث');
  });
}

RadioInfo _radio({required String streamUrl}) {
  return RadioInfo(
    id: 'radio-1',
    radioId: 'radio-1',
    name: 'إذاعة',
    description: 'وصف',
    streamUrl: streamUrl,
    logoUrl: 'https://example.com/logo.png',
    city: 'صنعاء',
    channelFrequency: 'FM',
    priority: 1,
    disabled: false,
  );
}

class _RecordingPlaybackEngine implements PlaybackEngine {
  _RecordingPlaybackEngine({this.shouldFail = false});

  final bool shouldFail;
  String? playedUrl;
  String? playedTitle;
  String? playedArtworkUrl;
  bool didStop = false;

  @override
  Future<void> playUrl(String url, {String? title, String? artworkUrl}) async {
    if (shouldFail) {
      throw StateError('failed');
    }

    playedUrl = url;
    playedTitle = title;
    playedArtworkUrl = artworkUrl;
  }

  @override
  Future<void> pause() async {}

  @override
  Future<void> resume() async {}

  @override
  Future<void> stop() async {
    didStop = true;
  }

  @override
  Future<void> dispose() async {}
}
