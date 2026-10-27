import 'episode.dart';
import 'content_page.dart';
import 'station_program.dart';

class StationContentBatch {
  const StationContentBatch({
    required this.programs,
    required this.episodes,
    required this.rejectedRecords,
    required this.isFromCache,
    this.programPage,
    this.episodePage,
    this.selectedProgramId,
  });

  final ContentPage<StationProgram>? programPage;
  final ContentPage<Episode>? episodePage;
  final String? selectedProgramId;
  bool get isPartial => programPage != null;

  final List<StationProgram> programs;
  final List<Episode> episodes;
  final int rejectedRecords;
  final bool isFromCache;
}
