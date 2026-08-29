import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/station_content_repository.dart';
import 'station_content_state.dart';

class StationContentController extends StateNotifier<StationContentState> {
  StationContentController(this._stationId, this._repository)
    : super(const StationContentState()) {
    unawaited(_initialize());
  }

  final String _stationId;
  final StationContentRepository _repository;

  Future<void> _initialize() async {
    try {
      final cached = await _repository.readCache(_stationId);
      if (mounted &&
          (cached.programs.isNotEmpty || cached.episodes.isNotEmpty)) {
        state = state.copyWith(
          programs: cached.programs,
          episodes: cached.episodes,
          isInitialLoading: false,
          isOffline: true,
          rejectedRecords: cached.rejectedRecords,
        );
      }
    } on Object {
      // An unavailable content cache is expected on first launch.
    }
    if (!mounted) return;
    await refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(
      isInitialLoading: !state.hasContent,
      isRefreshing: state.hasContent,
      failure: StationContentFailure.none,
    );
    try {
      final result = await _repository.refresh(_stationId);
      if (!mounted) return;
      state = state.copyWith(
        programs: result.programs,
        episodes: result.episodes,
        isInitialLoading: false,
        isRefreshing: false,
        isOffline: false,
        failure: StationContentFailure.none,
        rejectedRecords: result.rejectedRecords,
      );
    } on Object {
      if (!mounted) return;
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

  void selectWeekday(int weekday) {
    if (weekday < DateTime.monday || weekday > DateTime.sunday) return;
    state = state.copyWith(selectedWeekday: weekday);
  }
}
