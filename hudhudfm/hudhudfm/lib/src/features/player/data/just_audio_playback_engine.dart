import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';

import '../domain/playback_engine.dart';

class JustAudioPlaybackEngine implements PlaybackEngine {
  JustAudioPlaybackEngine({AudioPlayer? audioPlayer})
    : _audioPlayer = audioPlayer ?? AudioPlayer();

  final AudioPlayer _audioPlayer;
  bool _isSessionConfigured = false;

  @override
  Future<void> playUrl(String url, {String? title, String? artworkUrl}) async {
    await _configureSession();
    await _audioPlayer.setAudioSource(
      AudioSource.uri(
        Uri.parse(url),
        tag: MediaItem(
          id: url,
          album: 'هدهد FM',
          title: title?.trim().isNotEmpty == true ? title!.trim() : 'هدهد FM',
          artUri: _artworkUri(artworkUrl),
        ),
      ),
    );
    await _audioPlayer.play();
  }

  @override
  Future<void> pause() {
    return _audioPlayer.pause();
  }

  @override
  Future<void> resume() {
    return _audioPlayer.play();
  }

  @override
  Future<void> stop() {
    return _audioPlayer.stop();
  }

  @override
  Future<void> dispose() {
    return _audioPlayer.dispose();
  }

  Future<void> _configureSession() async {
    if (_isSessionConfigured) {
      return;
    }

    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
    _isSessionConfigured = true;
  }

  Uri? _artworkUri(String? artworkUrl) {
    final url = artworkUrl?.trim();
    if (url == null || url.isEmpty) {
      return null;
    }

    return Uri.tryParse(url);
  }
}
