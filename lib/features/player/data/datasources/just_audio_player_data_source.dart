import 'dart:async';

import 'package:audio_session/audio_session.dart';
import 'package:audio_service/audio_service.dart';
import 'package:just_audio/just_audio.dart';

import '../../domain/models/audio_playback_item.dart';
import '../../domain/models/audio_playback_phase.dart';
import 'audio_player_data_source.dart';

class JustAudioPlayerDataSource implements AudioPlayerDataSource {
  JustAudioPlayerDataSource({AudioPlayer? player})
    : _player =
          player ??
          AudioPlayer(
            handleInterruptions: true,
            androidApplyAudioAttributes: true,
            handleAudioSessionActivation: true,
          ) {
    _playerStateSubscription = _player.playerStateStream.listen((state) {
      if (_isReplacingSource && state.processingState == ProcessingState.idle) {
        return;
      }
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
  bool _isReplacingSource = false;

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
  Future<void> load(AudioPlaybackItem item) async {
    await _configureSession();
    _isReplacingSource = true;
    try {
      await _player.stop();

      final mediaItem = MediaItem(
        id: item.id,
        title: item.title,
        album: item.album.isEmpty ? null : item.album,
        artUri: _safeHttpsUri(item.artworkUrl),
        isLive: true,
      );
      for (final streamUrl in item.streamUrls) {
        try {
          await _player.setAudioSource(
            AudioSource.uri(Uri.parse(streamUrl), tag: mediaItem),
          );
          return;
        } on Object {
          // Try the explicitly configured backup without exposing either URL.
        }
      }
    } finally {
      _isReplacingSource = false;
    }

    throw const AudioSourceUnavailableException();
  }

  @override
  Future<void> play() async {
    unawaited(_playAndReportErrors());
  }

  Future<void> _playAndReportErrors() async {
    try {
      await _player.play();
    } on Object catch (error, stackTrace) {
      if (!_phaseController.isClosed) {
        _phaseController.addError(error, stackTrace);
      }
    }
  }

  Uri? _safeHttpsUri(String value) {
    final uri = Uri.tryParse(value);
    if (uri == null || uri.scheme != 'https' || !uri.hasAuthority) return null;
    return uri;
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
