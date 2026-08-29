import 'dart:async';

import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';

import '../../domain/models/audio_playback_phase.dart';
import 'audio_player_data_source.dart';

class JustAudioPlayerDataSource implements AudioPlayerDataSource {
  JustAudioPlayerDataSource({AudioPlayer? player})
    : _player = player ?? AudioPlayer() {
    _playerStateSubscription = _player.playerStateStream.listen((state) {
      _phaseController.add(_mapPhase(state));
    });
    _playbackErrorSubscription = _player.playbackEventStream.listen(
      (_) {},
      onError: (Object error, StackTrace stackTrace) {
        _phaseController.addError(error, stackTrace);
      },
    );
  }

  final AudioPlayer _player;
  final StreamController<AudioPlaybackPhase> _phaseController =
      StreamController<AudioPlaybackPhase>.broadcast();
  late final StreamSubscription<PlayerState> _playerStateSubscription;
  late final StreamSubscription<PlaybackEvent> _playbackErrorSubscription;
  bool _isSessionConfigured = false;

  @override
  Stream<AudioPlaybackPhase> get phaseChanges => _phaseController.stream;

  AudioPlaybackPhase _mapPhase(PlayerState state) {
    return switch (state.processingState) {
      ProcessingState.idle => AudioPlaybackPhase.idle,
      ProcessingState.loading ||
      ProcessingState.buffering => AudioPlaybackPhase.loading,
      ProcessingState.ready =>
        state.playing ? AudioPlaybackPhase.playing : AudioPlaybackPhase.paused,
      ProcessingState.completed => AudioPlaybackPhase.completed,
    };
  }

  @override
  Future<void> load(List<String> streamUrls) async {
    await _configureSession();
    await _player.stop();

    for (final streamUrl in streamUrls) {
      try {
        await _player.setUrl(streamUrl);
        return;
      } on Object {
        // Try the explicitly configured backup without exposing either URL.
      }
    }

    throw const AudioSourceUnavailableException();
  }

  @override
  Future<void> play() {
    unawaited(_player.play().catchError((Object _) {}));
    return Future<void>.value();
  }

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> stop() => _player.stop();

  Future<void> _configureSession() async {
    if (_isSessionConfigured) return;
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
    _isSessionConfigured = true;
  }

  @override
  Future<void> dispose() async {
    await _playerStateSubscription.cancel();
    await _playbackErrorSubscription.cancel();
    await _phaseController.close();
    await _player.dispose();
  }
}
