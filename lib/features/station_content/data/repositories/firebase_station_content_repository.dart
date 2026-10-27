import '../../../home/data/mappers/station_mapper.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/config/firestore_paths.dart';
import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/content_page.dart';
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
  Future<StationContentBatch> readCache(String stationId) =>
      _read(stationId, true);
  @override
  Future<StationContentBatch> refresh(String stationId) =>
      _read(stationId, false);
  Future<StationContentBatch> _read(String stationId, bool cache) async {
    final programs = await readProgramsPage(stationId, fromCache: cache);
    final selected = programs.items.isEmpty ? null : programs.items.first.id;
    final episodes = selected == null
        ? null
        : await readEpisodesPage(stationId, selected, fromCache: cache);
    return StationContentBatch(
        programs: programs.items,
        episodes: episodes?.items ?? const [],
        rejectedRecords:
            programs.rejectedRecords + (episodes?.rejectedRecords ?? 0),
        isFromCache: cache,
        programPage: programs,
        episodePage: episodes,
        selectedProgramId: selected);
  }

  Future<T> _guard<T>(Future<T> Function() operation) async {
    try {
      return await operation();
    } on FirebaseException {
      throw const NetworkDataException('Content unavailable.');
    }
  }

  @override
  Future<ContentPage<StationProgram>> readProgramsPage(String stationId,
          {ContentCursor? cursor, bool fromCache = false}) =>
      _guard(() async {
        final docs = await _dataSource.readPrograms(
            stationId: stationId,
            source: fromCache ? Source.cache : Source.server,
            cursor: cursor);
        return _page(docs,
            stationId: stationId,
            resource: 'programs',
            cache: fromCache, map: (doc) {
          final p = ProgramMapper.fromMap(id: doc.id, data: doc.data());
          return p.isActive &&
                  p.stationId == stationId &&
                  !_deleting(doc.data())
              ? p
              : null;
        });
      });
  @override
  Future<ContentPage<Episode>> readEpisodesPage(
          String stationId, String programId,
          {ContentCursor? cursor, bool fromCache = false}) =>
      _guard(() async {
        final docs = await _dataSource.readEpisodes(
            stationId: stationId,
            programId: programId,
            source: fromCache ? Source.cache : Source.server,
            cursor: cursor);
        return _page(docs,
            stationId: stationId,
            programId: programId,
            resource: 'episodes',
            cache: fromCache, map: (doc) {
          final e = EpisodeMapper.fromMap(id: doc.id, data: doc.data());
          return e.isPublished &&
                  e.stationId == stationId &&
                  e.programId == programId &&
                  !_deleting(doc.data())
              ? e
              : null;
        });
      });
  ContentPage<T> _page<T>(
      List<QueryDocumentSnapshot<Map<String, dynamic>>> docs,
      {required String stationId,
      required String resource,
      String? programId,
      required bool cache,
      required T? Function(QueryDocumentSnapshot<Map<String, dynamic>>) map}) {
    final consumed = docs.take(50).toList();
    final items = <T>[];
    var rejected = 0;
    for (final doc in consumed) {
      try {
        if (!_dataSource.hasValidSortFields(doc.data(), resource)) {
          rejected++;
          continue;
        }
        final item = map(doc);
        if (item != null) {
          items.add(item);
        } else {
          rejected++;
        }
      } on SchemaDataException {
        rejected++;
      }
    }
    ContentCursor? cursor;
    if (docs.length > 50) {
      final last = consumed.last;
      cursor = _dataSource.cursorFor(
          document: last,
          resource: resource,
          stationId: stationId,
          programId: programId,
          fromCache: cache);
      cursor.validate(
          root: FirestorePaths.root,
          resource: resource,
          stationId: stationId,
          programId: programId,
          server: !cache);
    }
    return ContentPage(
        items: items,
        nextCursor: cursor,
        rejectedRecords: rejected,
        isFromCache: cache,
        rawReadCount: docs.length);
  }

  static bool _deleting(Map<String, dynamic> data) =>
      data['adminDeletionToken'] != null;
  @override
  Future<ResolvedEpisode?> resolveEpisode(
          String stationId, String programId, String episodeId) =>
      _guard(() async {
        final episodeDoc = await _dataSource.readEpisode(episodeId);
        final episodeData = episodeDoc.data();
        if (!episodeDoc.exists ||
            episodeData == null ||
            _deleting(episodeData)) {
          return null;
        }
        try {
          final episode =
              EpisodeMapper.fromMap(id: episodeDoc.id, data: episodeData);
          if (!episode.isPublished ||
              episode.stationId != stationId ||
              episode.programId != programId) {
            return null;
          }
          final programDoc = await _dataSource.readProgram(programId);
          final programData = programDoc.data();
          if (!programDoc.exists ||
              programData == null ||
              _deleting(programData)) {
            return null;
          }
          final program =
              ProgramMapper.fromMap(id: programDoc.id, data: programData);
          if (!program.isActive || program.stationId != stationId) return null;
          final stationDoc = await _dataSource.readStation(stationId);
          final stationData = stationDoc.data();
          if (!stationDoc.exists ||
              stationData == null ||
              stationData['isActive'] != true ||
              _deleting(stationData)) {
            return null;
          }
          return ResolvedEpisode(
              station:
                  StationMapper.fromMap(id: stationDoc.id, data: stationData),
              program: program,
              episode: episode);
        } on SchemaDataException {
          return null;
        }
      });
}
