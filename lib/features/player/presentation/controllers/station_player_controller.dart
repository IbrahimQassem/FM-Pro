import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../home/domain/models/station.dart';
import '../../../station_content/domain/models/episode.dart';
import '../../domain/models/audio_playback_item.dart';
import '../../domain/models/audio_playback_phase.dart';
import '../../domain/repositories/audio_playback_repository.dart';
import 'station_player_state.dart';

class StationPlayerController extends StateNotifier<StationPlayerState> {
  StationPlayerController(this._repository, {bool Function()? canStartPlayback})
      : _canStartPlayback = canStartPlayback ?? (() => true),
        super(const StationPlayerState()) {
    _phaseSubscription = _repository.phaseChanges.listen(
      _onPhaseChanged,
      onError: _onPlaybackError,
    );
  }

  final AudioPlaybackRepository _repository;
  final bool Function() _canStartPlayback;
  int _generation = 0;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 3;
  Timer? _reconnectTimer;
  Timer? _stablePlaybackTimer;
  bool _playRequested = false;
  Timer? _sleepTimer;
  Future<void> _loads = Future.value();
  late final StreamSubscription<AudioPlaybackPhase> _phaseSubscription;

  Future<void> play(Station station) =>
      _playStation(station, resetReconnect: true);

  Future<void> _playStation(Station station,
      {required bool resetReconnect}) async {
    if (station.streamUrl.trim().isEmpty) {
      debugPrint('Station has no digital stream (terrestrial only).');
      return;
    }

    if (state.isSelected(station.id)) {
      if (state.status == StationPlaybackStatus.playing) {
        await pause();
        return;
      }
      if (state.status == StationPlaybackStatus.paused) {
        await resume();
        return;
      }
      if (state.status == StationPlaybackStatus.loading) return;
    }

    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _stablePlaybackTimer?.cancel();
    _stablePlaybackTimer = null;
    if (resetReconnect) _reconnectAttempts = 0;
    _playRequested = true;

    final generation = ++_generation;
    state = StationPlayerState(
      station: station,
      status: StationPlaybackStatus.loading,
      sleepTimerEnd: state.sleepTimerEnd,
    );
    try {
      await _loadCurrent(
        generation,
        AudioPlaybackItem(
          id: station.id,
          title: station.name,
          artworkUrl: station.logoUrl,
          streamUrls: [
            station.streamUrl,
            if (station.backupStreamUrl.isNotEmpty) station.backupStreamUrl,
          ],
        ),
      );
      if (mounted && generation == _generation) {
        if (!_canStartPlayback()) {
          _setFailure(
              StateError('Playback requires a foreground user action.'));
          return;
        }
        await _repository.play();
      }
    } on Object catch (error) {
      if (mounted && generation == _generation) {
        if (resetReconnect) {
          _setFailure(error);
        } else {
          _onPlaybackError(error, StackTrace.current);
        }
      }
    }
  }

  Future<void> playEpisode(Episode episode, Station station) async {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _stablePlaybackTimer?.cancel();
    _stablePlaybackTimer = null;
    _playRequested = true;
    if (state.isEpisodeSelected(episode.id)) {
      if (state.status == StationPlaybackStatus.playing) {
        await pause();
        return;
      }
      if (state.status == StationPlaybackStatus.paused) {
        await resume();
        return;
      }
      if (state.status == StationPlaybackStatus.loading) return;
    }

    final generation = ++_generation;
    state = StationPlayerState(
      station: station,
      episode: episode,
      status: StationPlaybackStatus.loading,
    );
    try {
      await _loadCurrent(
        generation,
        AudioPlaybackItem(
          id: 'episode:${episode.id}',
          isLive: false,
          title: episode.title,
          album: station.name,
          artworkUrl:
              episode.coverUrl.isEmpty ? station.logoUrl : episode.coverUrl,
          streamUrls: [episode.audioUrl],
        ),
      );
      if (mounted && generation == _generation) {
        if (!_canStartPlayback()) {
          _setFailure(
              StateError('Playback requires a foreground user action.'));
          return;
        }
        await _repository.play();
      }
    } on Object catch (error) {
      if (mounted && generation == _generation) _setFailure(error);
    }
  }

  Future<void> pause() async {
    if (state.station == null) return;
    final generation = ++_generation;
    _playRequested = false;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _stablePlaybackTimer?.cancel();
    _stablePlaybackTimer = null;
    try {
      await _repository.pause();
      if (mounted && generation == _generation) {
        state = state.copyWith(status: StationPlaybackStatus.paused);
      }
    } on Object catch (error) {
      if (mounted && generation == _generation) _setFailure(error);
    }
  }

  Future<void> resume() async {
    if (state.station == null) return;
    if (!_canStartPlayback()) {
      _setFailure(StateError('Playback requires a foreground user action.'));
      return;
    }
    final generation = _generation;
    _playRequested = true;
    state = state.copyWith(status: StationPlaybackStatus.loading);
    try {
      await _repository.play();
    } on Object catch (error) {
      if (mounted && generation == _generation) _setFailure(error);
    }
  }

  Future<void> retry() => _retry(automatic: false);

  Future<void> _retry({required bool automatic}) async {
    final station = state.station;
    if (station == null) return;
    final episode = state.episode;
    state = StationPlayerState(sleepTimerEnd: state.sleepTimerEnd);
    if (episode == null) {
      await _playStation(station, resetReconnect: !automatic);
    } else {
      await playEpisode(episode, station);
    }
  }

  Future<void> toggleCurrent() async {
    final station = state.station;
    if (station == null || state.status == StationPlaybackStatus.loading) {
      return;
    }
    if (state.status == StationPlaybackStatus.failure) {
      await retry();
    } else if (state.status == StationPlaybackStatus.playing) {
      await pause();
    } else {
      await resume();
    }
  }

  Future<void> stop() async {
    _playRequested = false;
    _stablePlaybackTimer?.cancel();
    _stablePlaybackTimer = null;
    _sleepTimer?.cancel();
    _sleepTimer = null;
    _reconnectTimer?.cancel();
    _reconnectAttempts = 0;
    final generation = ++_generation;
    try {
      await _repository.stop();
    } on Object catch (error) {
      debugPrint('Audio stop failed: ${error.runtimeType}.');
    } finally {
      if (mounted && generation == _generation) {
        state = const StationPlayerState();
      }
    }
  }

  void setSleepTimer(Duration? duration) {
    _sleepTimer?.cancel();
    _sleepTimer = null;
    if (duration == null || duration <= Duration.zero) {
      state = state.copyWith(clearSleepTimer: true);
      return;
    }
    final end = DateTime.now().add(duration);
    state = state.copyWith(sleepTimerEnd: end);
    _sleepTimer = Timer(duration, () {
      if (mounted) {
        unawaited(stop());
      }
    });
  }

  void cancelSleepTimer() {
    _sleepTimer?.cancel();
    _sleepTimer = null;
    state = state.copyWith(clearSleepTimer: true);
  }

  void playNextStation(List<Station> stations) {
    if (stations.isEmpty || state.station == null) return;
    final validStations =
        stations.where((s) => s.streamUrl.trim().isNotEmpty).toList();
    if (validStations.isEmpty) return;
    final currentIndex =
        validStations.indexWhere((s) => s.id == state.station!.id);
    if (currentIndex == -1) {
      unawaited(play(validStations.first));
      return;
    }
    final nextIndex = (currentIndex + 1) % validStations.length;
    unawaited(play(validStations[nextIndex]));
  }

  void playPreviousStation(List<Station> stations) {
    if (stations.isEmpty || state.station == null) return;
    final validStations =
        stations.where((s) => s.streamUrl.trim().isNotEmpty).toList();
    if (validStations.isEmpty) return;
    final currentIndex =
        validStations.indexWhere((s) => s.id == state.station!.id);
    if (currentIndex == -1) {
      unawaited(play(validStations.last));
      return;
    }
    final prevIndex =
        (currentIndex - 1 + validStations.length) % validStations.length;
    unawaited(play(validStations[prevIndex]));
  }

  void _onPhaseChanged(AudioPlaybackPhase phase) {
    if (!mounted || state.station == null) return;
    if (phase == AudioPlaybackPhase.idle) {
      _playRequested = false;
      _stablePlaybackTimer?.cancel();
      _stablePlaybackTimer = null;
      _reconnectTimer?.cancel();
      _reconnectAttempts = 0;
      state = const StationPlayerState();
      return;
    }
    if (phase == AudioPlaybackPhase.playing) {
      _reconnectTimer?.cancel();
      _reconnectTimer = null;
      // A brief ready/playing event is not proof a flapping stream recovered.
      _stablePlaybackTimer ??= Timer(const Duration(seconds: 30), () {
        _stablePlaybackTimer = null;
        if (mounted && state.status == StationPlaybackStatus.playing) {
          _reconnectAttempts = 0;
        }
      });
    } else if (phase == AudioPlaybackPhase.completed &&
        _playRequested &&
        state.episode == null &&
        state.station != null &&
        state.station!.streamUrl.isNotEmpty &&
        _reconnectAttempts < _maxReconnectAttempts) {
      _scheduleReconnect();
      return;
    }
    if (phase != AudioPlaybackPhase.playing) {
      _stablePlaybackTimer?.cancel();
      _stablePlaybackTimer = null;
    }
    final status = switch (phase) {
      AudioPlaybackPhase.idle => StationPlaybackStatus.idle,
      AudioPlaybackPhase.loading => StationPlaybackStatus.loading,
      AudioPlaybackPhase.playing => StationPlaybackStatus.playing,
      AudioPlaybackPhase.paused ||
      AudioPlaybackPhase.completed =>
        StationPlaybackStatus.paused,
    };
    state = state.copyWith(status: status);
  }

  void _onPlaybackError(Object error, StackTrace stackTrace) {
    _stablePlaybackTimer?.cancel();
    _stablePlaybackTimer = null;
    if (_playRequested &&
        state.station != null &&
        state.episode == null &&
        state.station!.streamUrl.isNotEmpty &&
        _reconnectAttempts < _maxReconnectAttempts) {
      _scheduleReconnect();
      return;
    }
    _setFailure(error);
  }

  void _scheduleReconnect() {
    if (_reconnectTimer?.isActive == true) return;
    if (!_canStartPlayback()) {
      _setFailure(StateError('Playback requires a foreground user action.'));
      return;
    }
    _stablePlaybackTimer?.cancel();
    _stablePlaybackTimer = null;
    final generation = _generation;
    _reconnectAttempts++;
    debugPrint(
      'Live audio disconnected, scheduling auto-reconnect '
      '(attempt $_reconnectAttempts of $_maxReconnectAttempts)...',
    );
    state = state.copyWith(status: StationPlaybackStatus.loading);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: _reconnectAttempts), () {
      _reconnectTimer = null;
      if (mounted &&
          generation == _generation &&
          _playRequested &&
          state.station != null &&
          state.episode == null) {
        if (_canStartPlayback()) {
          unawaited(_retry(automatic: true));
        } else {
          _setFailure(
              StateError('Playback requires a foreground user action.'));
        }
      }
    });
  }

  void _setFailure(Object error) {
    debugPrint('Audio playback failed: ${error.runtimeType}.');
    if (mounted && state.station != null) {
      state = state.copyWith(status: StationPlaybackStatus.failure);
    }
  }

  Future<void> _loadCurrent(int generation, AudioPlaybackItem item) {
    _loads = _loads.catchError((Object _) {}).then((_) async {
      if (!mounted || generation != _generation) return;
      await _repository.load(item);
    });
    return _loads;
  }

  @override
  void dispose() {
    _stablePlaybackTimer?.cancel();
    _sleepTimer?.cancel();
    _sleepTimer = null;
    ++_generation;
    _reconnectTimer?.cancel();
    unawaited(_phaseSubscription.cancel());
    super.dispose();
  }
}
