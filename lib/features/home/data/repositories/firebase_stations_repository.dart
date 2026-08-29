import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/data_batch.dart';
import '../../domain/models/station.dart';
import '../../domain/repositories/stations_repository.dart';
import '../datasources/home_firestore_data_source.dart';
import '../mappers/station_mapper.dart';

class FirebaseStationsRepository implements StationsRepository {
  const FirebaseStationsRepository(this._dataSource);

  final HomeFirestoreDataSource _dataSource;

  @override
  Future<DataBatch<Station>> readCache() => _read(Source.cache);

  @override
  Future<DataBatch<Station>> refresh() => _read(Source.server);

  Future<DataBatch<Station>> _read(Source source) async {
    try {
      final documents = await _dataSource.readStations(source);
      final stations = <Station>[];
      var rejectedRecords = 0;

      for (final document in documents) {
        try {
          final station = StationMapper.fromMap(
            id: document.id,
            data: document.data(),
          );
          if (station.isActive) stations.add(station);
        } on SchemaDataException {
          rejectedRecords++;
          debugPrint('Rejected a station document with an invalid schema.');
        }
      }

      stations.sort(_compareStations);
      debugPrint(
        'Stations read completed '
        '(source=${source.name}, documents=${documents.length}, '
        'accepted=${stations.length}, rejected=$rejectedRecords).',
      );
      return DataBatch(
        items: List.unmodifiable(stations),
        rejectedRecords: rejectedRecords,
        isFromCache: source == Source.cache,
      );
    } on FirebaseException catch (error) {
      debugPrint('Firestore stations read failed (${error.code}).');
      throw NetworkDataException(
        'Firestore stations read failed (${error.code}).',
      );
    }
  }

  static int _compareStations(Station first, Station second) {
    final featuredOrder = _boolRank(
      second.isFeatured,
    ).compareTo(_boolRank(first.isFeatured));
    if (featuredOrder != 0) return featuredOrder;

    final priorityOrder = second.priority.compareTo(first.priority);
    if (priorityOrder != 0) return priorityOrder;
    return first.name.compareTo(second.name);
  }

  static int _boolRank(bool value) => value ? 1 : 0;
}
