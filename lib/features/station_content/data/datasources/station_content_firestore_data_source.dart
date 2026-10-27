import 'dart:typed_data';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/config/firestore_paths.dart';
import '../../domain/models/content_page.dart';

class StationContentFirestoreDataSource {
  const StationContentFirestoreDataSource(this._firestore);
  final FirebaseFirestore _firestore;

  void _validateId(String id) {
    if (id.isEmpty || id.contains('/') || id == '.' || id == '..') {
      throw ArgumentError('Invalid content identity.');
    }
  }

  Future<List<QueryDocumentSnapshot<Map<String, dynamic>>>> readPrograms({
    required String stationId,
    required Source source,
    ContentCursor? cursor,
  }) async {
    _validateId(stationId);
    cursor?.validate(
        root: FirestorePaths.root,
        resource: 'programs',
        stationId: stationId,
        server: source != Source.cache);
    Query<Map<String, dynamic>> query = FirestorePaths.programs(_firestore)
        .where('stationId', isEqualTo: stationId)
        .where('isActive', isEqualTo: true)
        .orderBy('isFeatured', descending: true)
        .orderBy('priority', descending: true)
        .orderBy('title')
        .orderBy(FieldPath.documentId);
    if (cursor != null) {
      query = query.startAfter(cursor.values.map(_decodeSortValue).toList());
    }
    return (await query.limit(51).get(GetOptions(source: source))).docs;
  }

  Future<List<QueryDocumentSnapshot<Map<String, dynamic>>>> readEpisodes({
    required String stationId,
    required Source source,
    required String programId,
    ContentCursor? cursor,
  }) async {
    _validateId(stationId);
    _validateId(programId);
    cursor?.validate(
        root: FirestorePaths.root,
        resource: 'episodes',
        stationId: stationId,
        programId: programId,
        server: source != Source.cache);
    Query<Map<String, dynamic>> query = FirestorePaths.episodes(_firestore)
        .where('stationId', isEqualTo: stationId)
        .where('programId', isEqualTo: programId)
        .where('isPublished', isEqualTo: true)
        .orderBy('broadcastAt', descending: true)
        .orderBy('priority', descending: true)
        .orderBy(FieldPath.documentId);
    if (cursor != null) {
      query = query.startAfter(cursor.values.map(_decodeSortValue).toList());
    }
    return (await query.limit(51).get(GetOptions(source: source))).docs;
  }

  bool hasValidSortFields(Map<String, dynamic> data, String resource) =>
      data['priority'] is int &&
      (resource == 'programs'
          ? data['isFeatured'] is bool && data['title'] is String
          : data['broadcastAt'] is Timestamp);

  ContentCursor cursorFor(
      {required QueryDocumentSnapshot<Map<String, dynamic>> document,
      required String resource,
      required String stationId,
      String? programId,
      required bool fromCache}) {
    final data = document.data();
    final raw = resource == 'programs'
        ? [data['isFeatured'], data['priority'], data['title'], document.id]
        : [data['broadcastAt'], data['priority'], document.id];
    return ContentCursor(
        root: FirestorePaths.root,
        resource: resource,
        stationId: stationId,
        programId: programId,
        isFromCache: fromCache,
        values: raw.map(_encodeSortValue).toList());
  }

  ContentSortValue _encodeSortValue(Object? value) {
    if (value is Timestamp) {
      return ContentSortValue.timestamp(value.seconds, value.nanoseconds);
    }
    if (value is DateTime) {
      final timestamp = Timestamp.fromDate(value);
      return ContentSortValue.timestamp(
          timestamp.seconds, timestamp.nanoseconds);
    }
    if (value is Blob) return ContentSortValue.bytes(value.bytes);
    if (value is Uint8List) return ContentSortValue.bytes(value);
    if (value is DocumentReference) {
      return ContentSortValue.reference(
          value.firestore.app.name, value.firestore.databaseId, value.path);
    }
    if (value is GeoPoint) {
      return ContentSortValue.geoPoint(value.latitude, value.longitude);
    }
    if (value is VectorValue) return ContentSortValue.vector(value.toArray());
    if (value is List) {
      return ContentSortValue.array(value.map(_encodeSortValue).toList());
    }
    if (value is Map<String, dynamic>) {
      return ContentSortValue.map(
          value.map((key, item) => MapEntry(key, _encodeSortValue(item))));
    }
    return ContentSortValue.scalar(value);
  }

  Object? _decodeSortValue(ContentSortValue value) {
    switch (value.kind) {
      case ContentSortKind.scalar:
        return value.value;
      case ContentSortKind.timestamp:
        final (seconds, nanoseconds) = value.value as (int, int);
        return Timestamp(seconds, nanoseconds);
      case ContentSortKind.bytes:
        return Blob(Uint8List.fromList(value.value as List<int>));
      case ContentSortKind.reference:
        final (appName, databaseId, path) =
            value.value as (String, String, String);
        final firestore = appName == _firestore.app.name &&
                databaseId == _firestore.databaseId
            ? _firestore
            : FirebaseFirestore.instanceFor(
                app: Firebase.app(appName), databaseId: databaseId);
        return firestore.doc(path);
      case ContentSortKind.geoPoint:
        final (latitude, longitude) = value.value as (double, double);
        return GeoPoint(latitude, longitude);
      case ContentSortKind.vector:
        return VectorValue(value.value as List<double>);
      case ContentSortKind.array:
        return (value.value as List<ContentSortValue>)
            .map(_decodeSortValue)
            .toList();
      case ContentSortKind.map:
        return (value.value as Map<String, ContentSortValue>)
            .map((key, item) => MapEntry(key, _decodeSortValue(item)));
    }
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> readProgram(String id) {
    _validateId(id);
    return FirestorePaths.programs(_firestore)
        .doc(id)
        .get(const GetOptions(source: Source.server));
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> readEpisode(String id) {
    _validateId(id);
    return FirestorePaths.episodes(_firestore)
        .doc(id)
        .get(const GetOptions(source: Source.server));
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> readStation(String id) {
    _validateId(id);
    return FirestorePaths.stations(_firestore)
        .doc(id)
        .get(const GetOptions(source: Source.server));
  }
}
