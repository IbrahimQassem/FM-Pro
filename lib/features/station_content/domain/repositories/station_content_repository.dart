import '../models/station_content_batch.dart';

abstract interface class StationContentRepository {
  Future<StationContentBatch> readCache(String stationId);

  Future<StationContentBatch> refresh(String stationId);
}
