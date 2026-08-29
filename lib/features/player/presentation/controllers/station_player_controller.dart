import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../home/domain/models/station.dart';
import '../../domain/models/audio_playback_phase.dart';
import '../../domain/repositories/audio_playback_repository.dart';
import 'station_player_state.dart';

class StationPlayerController extends StateNotifier<StationPlayerState> {
  StationPlayerController(this._repository)
    : super(const StationPlayerState()) {
    _phaseSubscription = _repository.phaseChanges.listen(
      _onPhaseChanged,
      onError: _onPlaybackError,
    );
  }

  final AudioPlaybackRepository _repository;
  late final StreamSubscription<AudioPlaybackPhase> _phaseSubscription;

  Future<void> play(Station station) async {
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

    state = StationPlayerState(
      station: station,
      status: StationPlaybackStatus.loading,
    );
    try {
      await _repository.load([
        station.streamUrl,
        if (station.backupStreamUrl.isNotEmpty) station.backupStreamUrl,
      ]);
      await _repository.play();
    } on Object catch (error) {
      _setFailure(error);
    }
  }

  Future<void> pause() async {
    if (state.station == null) return;
    try {
      await _repository.pause();
    } on Object catch (error) {
      _setFailure(error);
    }
  }

  Future<void> resume() async {
    if (state.station == null) return;
    state = state.copyWith(status: StationPlaybackStatus.loading);
    try {
      await _repository.play();
    } on Object catch (error) {
      _setFailure(error);
    }
  }

  Future<void> retry() async {
    final station = state.station;
    if (station == null) return;
    state = const StationPlayerState();
    await play(station);
  }

  Future<void> stop() async {
    try {
      await _repository.stop();
    } on Object catch (error) {
      debugPrint('Audio stop failed: ${error.runtimeType}.');
    } finally {
      state = const StationPlayerState();
    }
  }

  void _onPhaseChanged(AudioPlaybackPhase phase) {
    if (state.station == null) return;
    final status = switch (phase) {
      AudioPlaybackPhase.idle => StationPlaybackStatus.idle,
      AudioPlaybackPhase.loading => StationPlaybackStatus.loading,
      AudioPlaybackPhase.playing => StationPlaybackStatus.playing,
      AudioPlaybackPhase.paused ||
      AudioPlaybackPhase.completed => StationPlaybackStatus.paused,
    };
    state = state.copyWith(status: status);
  }

  void _onPlaybackError(Object error, StackTrace stackTrace) {
    _setFailure(error);
  }

  void _setFailure(Object error) {
    debugPrint('Audio playback failed: ${error.runtimeType}.');
    if (state.station != null) {
      state = state.copyWith(status: StationPlaybackStatus.failure);
    }
  }

  @override
  void dispose() {
    unawaited(_phaseSubscription.cancel());
    super.dispose();
  }
}
