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
      await _repository.load(
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
      await _repository.play();
    } on Object catch (error) {
      _setFailure(error);
    }
  }

  Future<void> playEpisode(Episode episode, Station station) async {
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

    state = StationPlayerState(
      station: station,
      episode: episode,
      status: StationPlaybackStatus.loading,
    );
    try {
      await _repository.load(
        AudioPlaybackItem(
          id: 'episode:${episode.id}',
          title: episode.title,
          album: station.name,
          artworkUrl: episode.coverUrl.isEmpty
              ? station.logoUrl
              : episode.coverUrl,
          streamUrls: [episode.audioUrl],
        ),
      );
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
    final episode = state.episode;
    state = const StationPlayerState();
    if (episode == null) {
      await play(station);
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
    if (phase == AudioPlaybackPhase.idle) {
      state = const StationPlayerState();
      return;
    }
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
