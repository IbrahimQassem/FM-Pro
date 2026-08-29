import '../models/data_batch.dart';
import '../models/station.dart';

abstract interface class StationsRepository {
  Future<DataBatch<Station>> readCache();

  Future<DataBatch<Station>> refresh();
}
