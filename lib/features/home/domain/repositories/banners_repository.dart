import '../models/banner_item.dart';
import '../models/data_batch.dart';

abstract interface class BannersRepository {
  Future<DataBatch<BannerItem>> readCache();

  Future<DataBatch<BannerItem>> refresh();
}
