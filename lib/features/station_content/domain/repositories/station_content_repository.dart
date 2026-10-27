import '../models/content_page.dart';
import '../models/episode.dart';
import '../models/station_program.dart';
import '../models/station_content_batch.dart';

abstract interface class StationContentRepository {
  Future<StationContentBatch> readCache(String stationId);

  Future<StationContentBatch> refresh(String stationId);
  Future<ContentPage<StationProgram>> readProgramsPage(String stationId,
      {ContentCursor? cursor, bool fromCache = false});
  Future<ContentPage<Episode>> readEpisodesPage(
      String stationId, String programId,
      {ContentCursor? cursor, bool fromCache = false});
  Future<ResolvedEpisode?> resolveEpisode(
      String stationId, String programId, String episodeId);
}
