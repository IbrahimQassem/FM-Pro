import '../../domain/models/audio_playback_progress.dart';
import 'dart:async';

import 'package:audio_session/audio_session.dart';
import 'package:audio_service/audio_service.dart';
import 'package:just_audio/just_audio.dart';

import '../../domain/models/audio_playback_item.dart';
import '../../domain/models/audio_playback_phase.dart';
import 'audio_player_data_source.dart';
import '../../../../core/services/crash_reporting.dart';

class JustAudioPlayerDataSource implements AudioPlayerDataSource {
  JustAudioPlayerDataSource(
      {AudioPlayer? player, Future<void> Function()? configureSession})
      : _configureSessionOverride = configureSession,
        _player = player ??
            AudioPlayer(
              handleInterruptions: true,
              androidApplyAudioAttributes: true,
              handleAudioSessionActivation: true,
            ) {
    _playerStateSubscription = _player.playerStateStream.listen((state) {
      if (_disposed) return;
      _syncProgressClock(state);
      if (!_isReplacingSource) _captureProgress();
      // Errors carry idle/paused transitions too. Retain the source for retry;
      // errorStream is authoritative for this event, not an apparent stop.
      if (_player.playbackEvent.errorCode != null) return;
      if (_isReplacingSource && state.processingState == ProcessingState.idle) {
        return;
      }
      final phase = _mapPhase(state);
      if (_lastReportedPhase != phase) {
        _lastReportedPhase = phase;
        unawaited(CrashReporting.playbackEvent(phase.name));
      }
      _phaseController.add(phase);
    });
    _playbackErrorSubscription = _player.errorStream.listen(
      (error) {
        _cancelProgressClock();
        unawaited(CrashReporting.playbackEvent('failure'));
        if (!_isReplacingSource && !_phaseController.isClosed) {
          _phaseController.addError(error, StackTrace.current);
        }
      },
    );
  }

  final AudioPlayer _player;
  final Future<void> Function()? _configureSessionOverride;
  final _progressController =
      StreamController<AudioPlaybackProgress>.broadcast();
  AudioPlaybackProgress _progress = const AudioPlaybackProgress();
  AudioPlaybackItem? _progressItem;
  Duration? _nativeDuration;
  bool _seekFailed = false;
  bool _disposed = false;
  Timer? _progressTimer;
  StreamSubscription<PlaybackEvent>? _progressEvents;
  final StreamController<AudioPlaybackPhase> _phaseController =
      StreamController<AudioPlaybackPhase>.broadcast();
  late final StreamSubscription<PlayerState> _playerStateSubscription;
  late final StreamSubscription<PlayerException> _playbackErrorSubscription;
  Future<void>? _sessionConfiguration;
  int _generation = 0;
  bool _isReplacingSource = false;
  AudioPlaybackPhase? _lastReportedPhase;

  @override
  Stream<AudioPlaybackPhase> get phaseChanges => _phaseController.stream;

  @override
  Stream<String?> get icyTitleChanges => _player.icyMetadataStream
      .map((metadata) => metadata?.info?.title?.trim())
      .where((title) => title == null || title.isNotEmpty)
      .distinct();

  @override
  Stream<AudioPlaybackProgress> get progressChanges =>
      Stream<AudioPlaybackProgress>.multi((listener) {
        if (_disposed) {
          listener.close();
          return;
        }
        final subscription = _progressController.stream.listen(listener.add,
            onError: listener.addError, onDone: listener.close);
        _captureProgress();
        listener.add(_progress);
        if (_progressItem != null) _syncProgressClock(_player.playerState);
        listener.onCancel = () async {
          await subscription.cancel();
          if (!_progressController.hasListener) _cancelProgressClock();
        };
      }, isBroadcast: true)
          .distinct();

  void _emitProgress(AudioPlaybackProgress value) {
    if (_disposed || _progressController.isClosed) {
      return;
    }
    if (value.itemId == _progress.itemId &&
        value.position == _progress.position &&
        value.duration == _progress.duration &&
        value.isLive == _progress.isLive &&
        value.seekFailed == _progress.seekFailed) {
      return;
    }
    _progress = value;
    _progressController.add(value);
  }

  void _captureProgress([PlaybackEvent? event]) {
    final item = _progressItem;
    if (_disposed || item == null || _isReplacingSource) return;
    if (event != null) _nativeDuration = event.duration;
    _emitProgress(AudioPlaybackProgress(
        itemId: item.id,
        isLive: item.isLive,
        position: item.isLive ? Duration.zero : _player.position,
        duration: item.isLive ? null : _nativeDuration,
        seekFailed: _seekFailed));
  }

  bool _canRunProgressClock(PlayerState state) =>
      !_disposed &&
      !_isReplacingSource &&
      _progressItem?.isLive == false &&
      _progressController.hasListener &&
      state.playing &&
      state.processingState == ProcessingState.ready;

  void _cancelProgressClock() {
    _progressTimer?.cancel();
    _progressTimer = null;
  }

  void _syncProgressClock(PlayerState state) {
    if (!_canRunProgressClock(state)) {
      _cancelProgressClock();
      return;
    }
    _progressTimer ??= Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (!_canRunProgressClock(_player.playerState)) {
        _cancelProgressClock();
        return;
      }
      _captureProgress();
    });
  }

  Future<void> _clearProgress() async {
    _cancelProgressClock();
    final events = _progressEvents;
    _progressEvents = null;
    _progressItem = null;
    _nativeDuration = null;
    _seekFailed = false;
    _emitProgress(const AudioPlaybackProgress());
    await events?.cancel();
  }

  @override
  Future<bool> seek(Duration position, {required String itemId}) async {
    if (_disposed ||
        _isReplacingSource ||
        _progress.itemId != itemId ||
        !_progress.canSeek ||
        ![ProcessingState.ready, ProcessingState.completed]
            .contains(_player.playerState.processingState)) {
      return false;
    }
    final generation = _generation;
    final target = _progress.clampPosition(position);
    try {
      await _player.seek(target);
      if (_disposed ||
          generation != _generation ||
          _progressItem?.id != itemId) {
        return false;
      }
      _captureProgress();
      return true;
    } on Object {
      if (!_disposed &&
          generation == _generation &&
          _progressItem?.id == itemId) {
        _seekFailed = true;
        _captureProgress();
      }
      return false;
    }
  }

  AudioPlaybackPhase _mapPhase(PlayerState state) {
    return switch (state.processingState) {
      ProcessingState.idle => AudioPlaybackPhase.idle,
      ProcessingState.loading ||
      ProcessingState.buffering =>
        AudioPlaybackPhase.loading,
      ProcessingState.ready =>
        state.playing ? AudioPlaybackPhase.playing : AudioPlaybackPhase.paused,
      ProcessingState.completed => AudioPlaybackPhase.completed,
    };
  }

  @override
  Future<void> load(AudioPlaybackItem item) async {
    final generation = ++_generation;
    await _clearProgress();
    if (_disposed || generation != _generation) return;
    await _configureSession();
    if (generation != _generation) return;
    _isReplacingSource = true;
    try {
      await _player.stop();

      final mediaItem = MediaItem(
        id: item.id,
        title: item.title,
        album: item.album.isEmpty ? null : item.album,
        artUri: _safeHttpsUri(item.artworkUrl),
        isLive: item.isLive,
      );
      for (final streamUrl in item.streamUrls) {
        if (generation != _generation) return;
        try {
          final duration = await _player.setAudioSource(
            AudioSource.uri(Uri.parse(streamUrl), tag: mediaItem),
          );
          if (_disposed || generation != _generation) {
            return;
          }
          _progressItem = item;
          _nativeDuration = item.isLive ? null : duration;
          if (!item.isLive) {
            _progressEvents = _player.playbackEventStream.listen((event) {
              if (generation == _generation) _captureProgress(event);
            }, onError: (Object _, StackTrace __) {
              if (_disposed ||
                  generation != _generation ||
                  _progressController.isClosed) {
                return;
              }
              _nativeDuration = null;
              _captureProgress();
              _progressController
                  .addError(const AudioSourceUnavailableException());
            });
          }
          return;
        } on Object {
          // Try the explicitly configured backup without exposing either URL.
        }
      }
    } finally {
      if (generation == _generation && !_disposed) {
        _isReplacingSource = false;
        _captureProgress();
        if (_progressItem != null) _syncProgressClock(_player.playerState);
      }
    }

    throw const AudioSourceUnavailableException();
  }

  @override
  Future<void> play() async {
    unawaited(_playAndReportErrors());
  }

  Future<void> _playAndReportErrors() async {
    final generation = _generation;
    try {
      await _player.play();
    } on Object catch (error, stackTrace) {
      if (generation == _generation && !_phaseController.isClosed) {
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
  Future<void> stop() async {
    ++_generation;
    _isReplacingSource = false;
    try {
      await _clearProgress();
    } finally {
      await _player.stop();
    }
  }

  Future<void> _configureSession() async {
    await (_sessionConfiguration ??= _configureSessionOnce());
  }

  Future<void> _configureSessionOnce() async {
    try {
      if (_configureSessionOverride != null) {
        await _configureSessionOverride();
      } else {
        final session = await AudioSession.instance;
        await session.configure(const AudioSessionConfiguration.music());
      }
    } on Object {
      _sessionConfiguration = null;
      rethrow;
    }
  }

  @override
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    ++_generation;
    await _clearProgress();
    await _playerStateSubscription.cancel();
    await _playbackErrorSubscription.cancel();
    await _phaseController.close();
    await _progressController.close();
    await _player.dispose();
  }
}
