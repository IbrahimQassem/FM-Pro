import '../models/data_batch.dart';
import '../models/location_reference.dart';

abstract interface class LocationsRepository {
  Future<DataBatch<LocationReference>> readCache();

  Future<DataBatch<LocationReference>> refresh();
}
