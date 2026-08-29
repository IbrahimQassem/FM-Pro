import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/banner_item.dart';
import '../../domain/models/data_batch.dart';
import '../../domain/repositories/banners_repository.dart';
import '../datasources/home_firestore_data_source.dart';
import '../mappers/banner_mapper.dart';

class FirebaseBannersRepository implements BannersRepository {
  const FirebaseBannersRepository(this._dataSource);

  final HomeFirestoreDataSource _dataSource;

  @override
  Future<DataBatch<BannerItem>> readCache() => _read(Source.cache);

  @override
  Future<DataBatch<BannerItem>> refresh() => _read(Source.server);

  Future<DataBatch<BannerItem>> _read(Source source) async {
    try {
      final now = DateTime.now();
      final documents = await _dataSource.readBanners(source);
      final banners = <BannerItem>[];
      var rejectedRecords = 0;

      for (final document in documents) {
        try {
          final banner = BannerMapper.fromMap(
            id: document.id,
            data: document.data(),
          );
          if (banner.isVisibleAt(now)) banners.add(banner);
        } on SchemaDataException {
          rejectedRecords++;
          debugPrint('Rejected a banner document with an invalid schema.');
        }
      }

      banners.sort(
        (first, second) => second.priority.compareTo(first.priority),
      );
      return DataBatch(
        items: List.unmodifiable(banners),
        rejectedRecords: rejectedRecords,
        isFromCache: source == Source.cache,
      );
    } on FirebaseException catch (error) {
      throw NetworkDataException(
        'Firestore banners read failed (${error.code}).',
      );
    }
  }
}
