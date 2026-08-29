import 'episode.dart';
import 'station_program.dart';

class StationContentBatch {
  const StationContentBatch({
    required this.programs,
    required this.episodes,
    required this.rejectedRecords,
    required this.isFromCache,
  });

  final List<StationProgram> programs;
  final List<Episode> episodes;
  final int rejectedRecords;
  final bool isFromCache;
}
