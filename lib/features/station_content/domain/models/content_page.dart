import '../../../home/domain/models/station.dart';
import 'episode.dart';
import 'station_program.dart';

enum ContentSortKind {
  scalar,
  timestamp,
  bytes,
  reference,
  geoPoint,
  array,
  vector,
  map
}

/// Immutable raw ordering data, independent of Firebase SDK types. Invalid
/// business fields still have a precise position in Firestore's total order.
class ContentSortValue {
  const ContentSortValue._(this.kind, this.value);
  final ContentSortKind kind;
  final Object? value;
  factory ContentSortValue.scalar(Object? value) {
    if (value != null && value is! bool && value is! num && value is! String) {
      throw ArgumentError('Invalid raw scalar sort value.');
    }
    return ContentSortValue._(ContentSortKind.scalar, value);
  }
  factory ContentSortValue.timestamp(int seconds, int nanoseconds) {
    if (seconds < -62135596800 ||
        seconds > 253402300799 ||
        nanoseconds < 0 ||
        nanoseconds >= 1000000000) {
      throw ArgumentError('Invalid raw timestamp metadata.');
    }
    return ContentSortValue._(
        ContentSortKind.timestamp, (seconds, nanoseconds));
  }
  factory ContentSortValue.bytes(List<int> value) {
    if (value.any((v) => v < 0 || v > 255)) {
      throw ArgumentError('Invalid byte metadata.');
    }
    return ContentSortValue._(
        ContentSortKind.bytes, List<int>.unmodifiable(value));
  }
  factory ContentSortValue.reference(
      String appName, String databaseId, String path) {
    final parts = path.split('/');
    if (appName.isEmpty ||
        databaseId.isEmpty ||
        parts.length.isOdd ||
        parts.any((p) => p.isEmpty || p == '.' || p == '..')) {
      throw ArgumentError('Invalid reference metadata.');
    }
    return ContentSortValue._(
        ContentSortKind.reference, (appName, databaseId, path));
  }
  factory ContentSortValue.geoPoint(double latitude, double longitude) {
    if (!latitude.isFinite ||
        !longitude.isFinite ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180) {
      throw ArgumentError('Invalid geographic metadata.');
    }
    return ContentSortValue._(ContentSortKind.geoPoint, (latitude, longitude));
  }
  factory ContentSortValue.array(List<ContentSortValue> value) =>
      ContentSortValue._(
          ContentSortKind.array, List<ContentSortValue>.unmodifiable(value));
  factory ContentSortValue.vector(List<double> value) => ContentSortValue._(
      ContentSortKind.vector, List<double>.unmodifiable(value));
  factory ContentSortValue.map(Map<String, ContentSortValue> value) =>
      ContentSortValue._(ContentSortKind.map,
          Map<String, ContentSortValue>.unmodifiable(value));
}

/// A value-only cursor. Firebase snapshots never cross the data boundary.
class ContentCursor {
  ContentCursor(
      {this.version = 1,
      required this.root,
      required this.resource,
      required this.stationId,
      this.programId,
      required List<ContentSortValue> values,
      this.isFromCache = false,
      String? queryFingerprint})
      : values = List.unmodifiable(values),
        queryFingerprint = queryFingerprint ?? fingerprint(resource);
  static String fingerprint(String resource) => resource == 'programs'
      ? 'v1:active:featured-desc:priority-desc:title-asc:id-asc'
      : 'v1:published:broadcast-desc:priority-desc:id-asc';
  final String queryFingerprint;
  final int version;
  final String root;
  final String resource;
  final String stationId;
  final String? programId;
  final List<ContentSortValue> values;
  final bool isFromCache;

  void validate(
      {required String root,
      required String resource,
      required String stationId,
      String? programId,
      required bool server}) {
    final validScope = version == 1 &&
        queryFingerprint == fingerprint(resource) &&
        this.root == root &&
        (root == 'HudHudDev' || root == 'HudHudOfficial') &&
        this.resource == resource &&
        this.stationId == stationId &&
        this.programId == programId &&
        (!server || !isFromCache);
    final validTuple = resource == 'programs'
        ? values.length == 4
        : resource == 'episodes' && values.length == 3;
    final last = values.isEmpty ? null : values.last;
    final id = last?.kind == ContentSortKind.scalar ? last?.value : null;
    if (!validScope ||
        !validTuple ||
        id is! String ||
        id.isEmpty ||
        id.contains('/') ||
        id == '.' ||
        id == '..') {
      throw ArgumentError('Invalid content cursor scope or ordering.');
    }
  }
}

class ContentPage<T> {
  ContentPage(
      {required List<T> items,
      this.nextCursor,
      this.rejectedRecords = 0,
      this.isFromCache = false,
      this.rawReadCount = 0})
      : items = List.unmodifiable(items);
  final List<T> items;
  final ContentCursor? nextCursor;
  final int rejectedRecords;
  final bool isFromCache;
  final int rawReadCount;
  bool get hasMore => nextCursor != null;
}

class ResolvedEpisode {
  const ResolvedEpisode(
      {required this.station, required this.program, required this.episode});
  final Station station;
  final StationProgram program;
  final Episode episode;
}
