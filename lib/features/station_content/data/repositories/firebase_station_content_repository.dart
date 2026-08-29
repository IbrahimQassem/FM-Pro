import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/episode.dart';
import '../../domain/models/station_content_batch.dart';
import '../../domain/models/station_program.dart';
import '../../domain/repositories/station_content_repository.dart';
import '../datasources/station_content_firestore_data_source.dart';
import '../mappers/episode_mapper.dart';
import '../mappers/program_mapper.dart';

class FirebaseStationContentRepository implements StationContentRepository {
  const FirebaseStationContentRepository(this._dataSource);

  final StationContentFirestoreDataSource _dataSource;

  @override
  Future<StationContentBatch> readCache(String stationId) {
    return _read(stationId, Source.cache);
  }

  @override
  Future<StationContentBatch> refresh(String stationId) {
    return _read(stationId, Source.server);
  }

  Future<StationContentBatch> _read(String stationId, Source source) async {
    try {
      final results = await Future.wait([
        _dataSource.readPrograms(stationId: stationId, source: source),
        _dataSource.readEpisodes(stationId: stationId, source: source),
      ]);
      final programs = <StationProgram>[];
      final episodes = <Episode>[];
      var rejectedRecords = 0;

      for (final document in results[0]) {
        try {
          final program = ProgramMapper.fromMap(
            id: document.id,
            data: document.data(),
          );
          if (program.isActive && program.stationId == stationId) {
            programs.add(program);
          }
        } on SchemaDataException {
          rejectedRecords++;
        }
      }
      for (final document in results[1]) {
        try {
          final episode = EpisodeMapper.fromMap(
            id: document.id,
            data: document.data(),
          );
          if (episode.isPublished && episode.stationId == stationId) {
            episodes.add(episode);
          }
        } on SchemaDataException {
          rejectedRecords++;
        }
      }

      programs.sort(_comparePrograms);
      episodes.sort(_compareEpisodes);
      debugPrint(
        'Station content read completed '
        '(source=${source.name}, programs=${programs.length}, '
        'episodes=${episodes.length}, rejected=$rejectedRecords).',
      );
      return StationContentBatch(
        programs: List.unmodifiable(programs),
        episodes: List.unmodifiable(episodes),
        rejectedRecords: rejectedRecords,
        isFromCache: source == Source.cache,
      );
    } on FirebaseException catch (error) {
      debugPrint('Firestore station content read failed (${error.code}).');
      throw NetworkDataException(
        'Firestore station content read failed (${error.code}).',
      );
    }
  }

  static int _comparePrograms(StationProgram first, StationProgram second) {
    final featured = _rank(
      second.isFeatured,
    ).compareTo(_rank(first.isFeatured));
    if (featured != 0) return featured;
    final priority = second.priority.compareTo(first.priority);
    return priority != 0 ? priority : first.title.compareTo(second.title);
  }

  static int _compareEpisodes(Episode first, Episode second) {
    final date = second.broadcastAt.compareTo(first.broadcastAt);
    if (date != 0) return date;
    return second.priority.compareTo(first.priority);
  }

  static int _rank(bool value) => value ? 1 : 0;
}
