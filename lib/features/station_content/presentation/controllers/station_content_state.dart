import '../../domain/models/content_page.dart';
import '../../domain/models/episode.dart';
import '../../domain/models/station_program.dart';

enum StationContentFailure { none, load }

class StationContentState {
  const StationContentState({
    this.programs = const [],
    this.episodes = const [],
    this.isInitialLoading = true,
    this.isRefreshing = false,
    this.isOffline = false,
    this.failure = StationContentFailure.none,
    this.rejectedRecords = 0,
    this.selectedWeekday = 0,
    this.programCursor,
    this.episodeCursor,
    this.selectedProgramId,
    this.isLoadingPrograms = false,
    this.isLoadingEpisodes = false,
    this.programPageFailed = false,
    this.episodePageFailed = false,
    this.hasLoadedEpisodePage = false,
  });

  final List<StationProgram> programs;
  final List<Episode> episodes;
  final bool isInitialLoading;
  final bool isRefreshing;
  final bool isOffline;
  final StationContentFailure failure;
  final int rejectedRecords;
  final int selectedWeekday;
  final ContentCursor? programCursor;
  final ContentCursor? episodeCursor;
  final String? selectedProgramId;
  final bool isLoadingPrograms;
  final bool isLoadingEpisodes;
  final bool programPageFailed;
  final bool episodePageFailed;
  final bool hasLoadedEpisodePage;

  bool get hasContent => programs.isNotEmpty || episodes.isNotEmpty;

  List<Episode> episodesFor(String programId) => List.unmodifiable(
        episodes.where((episode) => episode.programId == programId),
      );

  int resolvedWeekday(DateTime now) {
    if (selectedWeekday != 0) return selectedWeekday;
    var offsetMinutes = 180;
    for (final program in programs) {
      final schedule = program.schedule;
      if (schedule != null) {
        offsetMinutes = schedule.utcOffsetMinutes;
        break;
      }
    }
    return now.toUtc().add(Duration(minutes: offsetMinutes)).weekday;
  }

  List<StationProgram> scheduledPrograms(DateTime now) {
    final weekday = resolvedWeekday(now);
    final values = programs
        .where((program) => program.schedule?.includesWeekday(weekday) == true)
        .toList();
    values.sort(
      (first, second) =>
          first.schedule!.startMinute.compareTo(second.schedule!.startMinute),
    );
    return List.unmodifiable(values);
  }

  StationContentState copyWith({
    List<StationProgram>? programs,
    List<Episode>? episodes,
    bool? isInitialLoading,
    bool? isRefreshing,
    bool? isOffline,
    StationContentFailure? failure,
    int? rejectedRecords,
    int? selectedWeekday,
    ContentCursor? programCursor,
    ContentCursor? episodeCursor,
    String? selectedProgramId,
    bool clearSelectedProgram = false,
    bool clearProgramCursor = false,
    bool clearEpisodeCursor = false,
    bool? isLoadingPrograms,
    bool? isLoadingEpisodes,
    bool? programPageFailed,
    bool? episodePageFailed,
    bool? hasLoadedEpisodePage,
  }) {
    return StationContentState(
      programs: programs ?? this.programs,
      episodes: episodes ?? this.episodes,
      isInitialLoading: isInitialLoading ?? this.isInitialLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isOffline: isOffline ?? this.isOffline,
      failure: failure ?? this.failure,
      rejectedRecords: rejectedRecords ?? this.rejectedRecords,
      selectedWeekday: selectedWeekday ?? this.selectedWeekday,
      programCursor:
          clearProgramCursor ? null : programCursor ?? this.programCursor,
      episodeCursor:
          clearEpisodeCursor ? null : episodeCursor ?? this.episodeCursor,
      selectedProgramId: clearSelectedProgram
          ? null
          : selectedProgramId ?? this.selectedProgramId,
      isLoadingPrograms: isLoadingPrograms ?? this.isLoadingPrograms,
      isLoadingEpisodes: isLoadingEpisodes ?? this.isLoadingEpisodes,
      programPageFailed: programPageFailed ?? this.programPageFailed,
      episodePageFailed: episodePageFailed ?? this.episodePageFailed,
      hasLoadedEpisodePage: hasLoadedEpisodePage ?? this.hasLoadedEpisodePage,
    );
  }
}
