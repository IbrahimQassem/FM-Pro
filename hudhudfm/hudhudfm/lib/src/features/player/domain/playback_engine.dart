abstract class PlaybackEngine {
  Future<void> playUrl(String url, {String? title, String? artworkUrl});

  Future<void> pause();

  Future<void> resume();

  Future<void> stop();

  Future<void> dispose();
}

class NoopPlaybackEngine implements PlaybackEngine {
  @override
  Future<void> playUrl(String url, {String? title, String? artworkUrl}) async {}

  @override
  Future<void> pause() async {}

  @override
  Future<void> resume() async {}

  @override
  Future<void> stop() async {}

  @override
  Future<void> dispose() async {}
}
