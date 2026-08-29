import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/data_batch.dart';
import '../../domain/models/location_reference.dart';
import '../../domain/repositories/locations_repository.dart';
import '../datasources/home_firestore_data_source.dart';
import '../mappers/location_mapper.dart';

class FirebaseLocationsRepository implements LocationsRepository {
  const FirebaseLocationsRepository(this._dataSource);

  final HomeFirestoreDataSource _dataSource;

  @override
  Future<DataBatch<LocationReference>> readCache() => _read(Source.cache);

  @override
  Future<DataBatch<LocationReference>> refresh() => _read(Source.server);

  Future<DataBatch<LocationReference>> _read(Source source) async {
    try {
      final documents = await _dataSource.readLocations(source);
      final locations = <LocationReference>[];
      var rejectedRecords = 0;

      for (final document in documents) {
        try {
          final location = LocationMapper.fromMap(document.data());
          if (location.isActive) locations.add(location);
        } on SchemaDataException {
          rejectedRecords++;
          debugPrint('Rejected a location document with an invalid schema.');
        }
      }

      locations.sort((first, second) {
        final countryOrder = first.countryCode.compareTo(second.countryCode);
        if (countryOrder != 0) return countryOrder;
        final sortOrder = first.sortOrder.compareTo(second.sortOrder);
        if (sortOrder != 0) return sortOrder;
        return first.cityNameAr.compareTo(second.cityNameAr);
      });
      return DataBatch(
        items: List.unmodifiable(locations),
        rejectedRecords: rejectedRecords,
        isFromCache: source == Source.cache,
      );
    } on FirebaseException catch (error) {
      throw NetworkDataException(
        'Firestore locations read failed (${error.code}).',
      );
    }
  }
}
