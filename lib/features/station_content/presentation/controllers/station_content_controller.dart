import '../../domain/models/episode.dart';
import '../../domain/models/station_program.dart';
import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/station_content_repository.dart';
import 'station_content_state.dart';

class StationContentController extends StateNotifier<StationContentState> {
  StationContentController(this._stationId, this._repository,
      {String? programId, bool deferInitialLoad = false})
      : _programId = programId,
        super(StationContentState(
            isInitialLoading: !deferInitialLoad,
            selectedProgramId: programId)) {
    if (!deferInitialLoad) {
      unawaited(_initialize());
    }
  }

  int _generation = 0;
  int _episodeGeneration = 0;
  final String _stationId;
  final String? _programId;
  final StationContentRepository _repository;

  Future<void> _initialize() async {
    if (_programId != null) {
      final generation = _episodeGeneration;
      try {
        final cached = await _repository
            .readEpisodesPage(_stationId, _programId, fromCache: true);
        if (!mounted || generation != _episodeGeneration) return;
        if (cached.items.isNotEmpty) {
          state = state.copyWith(
              selectedProgramId: _programId,
              episodes: cached.items,
              isInitialLoading: false,
              isOffline: true,
              clearEpisodeCursor: true,
              rejectedRecords: cached.rejectedRecords);
        }
      } on Object {/* Missing scoped cache is expected on first use. */}
      if (!mounted || generation != _episodeGeneration) return;
      await selectProgram(_programId);
      return;
    }
    final generation = _generation;
    try {
      final cached = await _repository.readCache(_stationId);
      if (mounted &&
          generation == _generation &&
          (cached.programs.isNotEmpty || cached.episodes.isNotEmpty)) {
        state = state.copyWith(
          programs: cached.programs,
          episodes: cached.episodes,
          isInitialLoading: false,
          isOffline: true,
          rejectedRecords: cached.rejectedRecords,
          selectedProgramId: cached.selectedProgramId,
          clearProgramCursor: true,
          clearEpisodeCursor: true,
        );
      }
    } on Object {
      // An unavailable content cache is expected on first launch.
    }
    if (!mounted || generation != _generation) return;
    await refresh();
  }

  Future<void> refresh() async {
    if (!mounted) return;
    if (_programId != null) {
      await selectProgram(_programId);
      return;
    }
    final generation = ++_generation;
    _episodeGeneration++;
    state = state.copyWith(
      isInitialLoading: !state.hasContent,
      isRefreshing: state.hasContent,
      failure: StationContentFailure.none,
      isLoadingPrograms: false,
      isLoadingEpisodes: false,
      clearProgramCursor: true,
      clearEpisodeCursor: true,
      programPageFailed: false,
      episodePageFailed: false,
    );
    try {
      final result = await _repository.refresh(_stationId);
      if (!mounted || generation != _generation) return;
      state = state.copyWith(
        programs: result.programs,
        episodes: result.episodes,
        isInitialLoading: false,
        isRefreshing: false,
        isOffline: false,
        failure: StationContentFailure.none,
        rejectedRecords: result.rejectedRecords,
        selectedProgramId: result.selectedProgramId,
        clearSelectedProgram: result.selectedProgramId == null,
        programCursor: result.programPage?.nextCursor,
        episodeCursor: result.episodePage?.nextCursor,
        clearProgramCursor: result.programPage?.nextCursor == null,
        clearEpisodeCursor: result.episodePage?.nextCursor == null,
      );
    } on Object {
      if (!mounted || generation != _generation) return;
      state = state.copyWith(
        isInitialLoading: false,
        isRefreshing: false,
        isOffline: true,
        failure: state.hasContent
            ? StationContentFailure.none
            : StationContentFailure.load,
      );
    }
  }

  Future<void> loadMorePrograms() async {
    final cursor = state.programCursor;
    if (!mounted ||
        state.isOffline ||
        state.isRefreshing ||
        state.isInitialLoading ||
        state.isLoadingPrograms ||
        cursor == null) {
      return;
    }
    final generation = _generation;
    state = state.copyWith(isLoadingPrograms: true, programPageFailed: false);
    try {
      final page =
          await _repository.readProgramsPage(_stationId, cursor: cursor);
      if (!mounted || generation != _generation) return;
      final byId = <String, StationProgram>{
        for (final p in state.programs) p.id: p
      };
      for (final p in page.items) {
        byId[p.id] = p;
      }
      final values = byId.values.toList();
      state = state.copyWith(
          programs: values.length > 100
              ? values.sublist(values.length - 100)
              : values,
          programCursor: page.nextCursor,
          clearProgramCursor: !page.hasMore,
          isLoadingPrograms: false,
          rejectedRecords: state.rejectedRecords + page.rejectedRecords);
    } on Object {
      if (mounted && generation == _generation) {
        state =
            state.copyWith(isLoadingPrograms: false, programPageFailed: true);
      }
    }
  }

  Future<void> selectProgram(String programId,
      {Episode? highlightedEpisode}) async {
    if (!mounted) return;
    final generation = ++_episodeGeneration;
    final refreshGeneration = _generation;
    state = state.copyWith(
        selectedProgramId: programId,
        episodes: highlightedEpisode != null
            ? [highlightedEpisode]
            : state.selectedProgramId == programId
                ? state.episodes
                : const [],
        clearEpisodeCursor: true,
        isLoadingEpisodes: true,
        episodePageFailed: false);
    try {
      final page = await _repository.readEpisodesPage(_stationId, programId);
      if (!mounted ||
          generation != _episodeGeneration ||
          refreshGeneration != _generation) {
        return;
      }
      final values = <String, Episode>{
        if (highlightedEpisode != null)
          highlightedEpisode.id: highlightedEpisode
      };
      for (final e in page.items) {
        values[e.id] = e;
      }
      state = state.copyWith(
          episodes: values.values.toList(),
          hasLoadedEpisodePage: true,
          isInitialLoading: false,
          isOffline: false,
          isLoadingEpisodes: false,
          episodeCursor: page.nextCursor,
          clearEpisodeCursor: !page.hasMore,
          rejectedRecords: state.rejectedRecords + page.rejectedRecords);
    } on Object {
      if (mounted &&
          generation == _episodeGeneration &&
          refreshGeneration == _generation) {
        state = state.copyWith(
            isInitialLoading: false,
            isOffline: true,
            isLoadingEpisodes: false,
            episodePageFailed: true);
      }
    }
  }

  Future<void> loadMoreEpisodes() async {
    final cursor = state.episodeCursor;
    final program = state.selectedProgramId;
    if (!mounted ||
        state.isOffline ||
        state.isRefreshing ||
        state.isInitialLoading ||
        state.isLoadingEpisodes ||
        cursor == null ||
        program == null) {
      return;
    }
    final generation = _episodeGeneration;
    final refreshGeneration = _generation;
    state = state.copyWith(isLoadingEpisodes: true, episodePageFailed: false);
    try {
      final page = await _repository.readEpisodesPage(_stationId, program,
          cursor: cursor);
      if (!mounted ||
          generation != _episodeGeneration ||
          refreshGeneration != _generation) {
        return;
      }
      final values = <String, Episode>{for (final e in state.episodes) e.id: e};
      for (final e in page.items) {
        values[e.id] = e;
      }
      final rows = values.values.toList();
      state = state.copyWith(
          episodes: rows.length > 100 ? rows.sublist(rows.length - 100) : rows,
          isLoadingEpisodes: false,
          episodeCursor: page.nextCursor,
          clearEpisodeCursor: !page.hasMore,
          rejectedRecords: state.rejectedRecords + page.rejectedRecords);
    } on Object {
      if (mounted &&
          generation == _episodeGeneration &&
          refreshGeneration == _generation) {
        state = state.copyWith(
            isInitialLoading: false,
            isLoadingEpisodes: false,
            episodePageFailed: true);
      }
    }
  }

  void selectWeekday(int weekday) {
    if (weekday < DateTime.monday || weekday > DateTime.sunday) return;
    state = state.copyWith(selectedWeekday: weekday);
  }
}
