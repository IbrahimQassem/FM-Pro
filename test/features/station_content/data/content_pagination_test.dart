import 'package:firebase_core/firebase_core.dart';
import 'dart:typed_data';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/data/datasources/station_content_firestore_data_source.dart';
import 'package:hudhud_fm/features/station_content/data/repositories/firebase_station_content_repository.dart';

void main() {
  for (final bad in <Object?>[
    0.5,
    'legacy',
    null,
    false,
    Timestamp(1, 2),
    GeoPoint(1, 2),
    Blob(Uint8List.fromList([1, 2])),
    <Object?>[1, 'x'],
    <String, Object?>{'old': true},
    const VectorValue([1.0, 2.0]),
    FixtureReference(FixtureFirestore({}), 'metadata/value')
  ]) {
    test(
        'malformed episode priority ${bad.runtimeType} preserves raw continuation to valid later row',
        () async {
      final db = FixtureFirestore({
        'episodes': [
          for (var i = 0; i < 51; i++)
            FixtureDocument('bad-${i.toString().padLeft(3, '0')}',
                {...episodeData(), 'priority': bad}),
          FixtureDocument('valid-tail',
              {...episodeData(), 'broadcastAt': Timestamp(1700000000, 1)}),
        ]
      });
      final repo = FirebaseStationContentRepository(
          StationContentFirestoreDataSource(db));
      final first = await repo.readEpisodesPage('station', 'program');
      expect(first.items, isEmpty);
      expect(first.rejectedRecords, 50);
      expect(first.hasMore, true);
      final second = await repo.readEpisodesPage('station', 'program',
          cursor: first.nextCursor);
      expect(second.items.single.id, 'valid-tail');
      expect(second.rejectedRecords, 1);
      expect(second.hasMore, false);
      expect(db.returned, [51, 2]);
    });
  }
  for (final field in ['isFeatured', 'title', 'priority']) {
    test(
        'malformed program $field raw sort values cannot trap following valid rows',
        () async {
      final db = FixtureFirestore({
        'programs': [
          for (var i = 0; i < 51; i++)
            FixtureDocument('bad-${i.toString().padLeft(3, '0')}', {
              ...programData(),
              field: field == 'isFeatured' ? 'bad' : null
            }),
          FixtureDocument('valid', programData()),
        ]
      });
      final repo = FirebaseStationContentRepository(
          StationContentFirestoreDataSource(db));
      final first = await repo.readProgramsPage('station');
      expect(first.hasMore, true);
      final second =
          await repo.readProgramsPage('station', cursor: first.nextCursor);
      expect([...first.items, ...second.items].map((p) => p.id), ['valid']);
      expect(first.rejectedRecords + second.rejectedRecords, 51);
      expect(second.hasMore, false);
    });
  }
  for (final bad in <Object?>['legacy', null, false, 0.5]) {
    test(
        'malformed episode broadcastAt ${bad.runtimeType} advances rather than casting Timestamp',
        () async {
      final db = FixtureFirestore({
        'episodes': [
          for (var i = 0; i < 51; i++)
            FixtureDocument('bad-${i.toString().padLeft(3, '0')}',
                {...episodeData(), 'broadcastAt': bad}),
          FixtureDocument('valid', episodeData()),
        ]
      });
      final repo = FirebaseStationContentRepository(
          StationContentFirestoreDataSource(db));
      final first = await repo.readEpisodesPage('station', 'program');
      expect(first.hasMore, true);
      final second = await repo.readEpisodesPage('station', 'program',
          cursor: first.nextCursor);
      expect([...first.items, ...second.items].map((e) => e.id), ['valid']);
      expect(first.rejectedRecords + second.rejectedRecords, 51);
      expect(second.hasMore, false);
    });
  }
  test('published content beyond the first 100 drafts remains reachable',
      () async {
    final firestore = FixtureFirestore({
      'programs': [FixtureDocument('program', programData())],
      'episodes': [
        for (var i = 0; i < 101; i++)
          FixtureDocument('draft-$i', episodeData(published: false)),
        FixtureDocument('published-101', episodeData()),
      ],
    });
    final result = await FirebaseStationContentRepository(
      StationContentFirestoreDataSource(firestore),
    ).refresh('station');
    expect(result.episodes.map((e) => e.id), contains('published-101'));
  });

  test(
      'active programs paginate with deterministic featured priority title ID ties',
      () async {
    final firestore = FixtureFirestore({
      'programs': [
        for (var i = 0; i < 101; i++)
          FixtureDocument('inactive-$i', {...programData(), 'isActive': false}),
        for (var i = 0; i < 51; i++)
          FixtureDocument('p-${i.toString().padLeft(3, '0')}', programData()),
      ]
    });
    final repo = FirebaseStationContentRepository(
        StationContentFirestoreDataSource(firestore));
    final first = await repo.readProgramsPage('station');
    final next =
        await repo.readProgramsPage('station', cursor: first.nextCursor);
    expect(first.items.length, 50);
    expect(first.nextCursor!.values.map((v) => v.value),
        [false, 0, 'Synthetic program', 'p-049']);
    expect(next.items.single.id, 'p-050');
    expect(firestore.returned, [51, 1]);
  });
  test('empty program page never triggers an unscoped station archive query',
      () async {
    final firestore = FixtureFirestore({
      'programs': [],
      'episodes': [FixtureDocument('e', episodeData())]
    });
    final batch = await FirebaseStationContentRepository(
            StationContentFirestoreDataSource(firestore))
        .refresh('station');
    expect(batch.episodes, isEmpty);
    expect(firestore.queries.length, 1);
  });
  test(
      'three bounded pages retain timestamp nanoseconds and reach 101 equal-date episodes',
      () async {
    final firestore = FixtureFirestore({
      'episodes': [
        for (var i = 0; i < 101; i++)
          FixtureDocument('e-${i.toString().padLeft(3, '0')}', episodeData())
      ]
    });
    final repository = FirebaseStationContentRepository(
        StationContentFirestoreDataSource(firestore));
    final first = await repository.readEpisodesPage('station', 'program');
    final second = await repository.readEpisodesPage('station', 'program',
        cursor: first.nextCursor);
    final third = await repository.readEpisodesPage('station', 'program',
        cursor: second.nextCursor);
    expect(first.items.length, 50);
    expect(second.items.length, 50);
    expect(third.items.length, 1);
    expect({
      ...first.items.map((e) => e.id),
      ...second.items.map((e) => e.id),
      ...third.items.map((e) => e.id)
    }, hasLength(101));
    expect(firestore.returned, [51, 51, 1]);
    expect(third.hasMore, false);
    expect(first.nextCursor!.values.map((v) => v.value),
        [(1800000000, 123456789), 0, 'e-049']);
  });
  test('all-invalid consumed page still advances using raw 50th not lookahead',
      () async {
    final firestore = FixtureFirestore({
      'episodes': [
        for (var i = 0; i < 51; i++)
          FixtureDocument('e-${i.toString().padLeft(3, '0')}',
              {...episodeData(), if (i < 50) 'title': ''})
      ]
    });
    final repository = FirebaseStationContentRepository(
        StationContentFirestoreDataSource(firestore));
    final first = await repository.readEpisodesPage('station', 'program');
    expect(first.items, isEmpty);
    expect(first.rejectedRecords, 50);
    expect(first.hasMore, true);
    expect(first.nextCursor!.values.last.value, 'e-049');
    final second = await repository.readEpisodesPage('station', 'program',
        cursor: first.nextCursor);
    expect(second.items.single.id, 'e-050');
  });
  test(
      'cache cursor cannot advance server traversal and cross-program reuse fails before IO',
      () async {
    final firestore = FixtureFirestore({
      'episodes': [
        for (var i = 0; i < 51; i++) FixtureDocument('e-$i', episodeData())
      ]
    });
    final repository = FirebaseStationContentRepository(
        StationContentFirestoreDataSource(firestore));
    final cache = await repository.readEpisodesPage('station', 'program',
        fromCache: true);
    expect(cache.isFromCache, true);
    final reads = firestore.queries.length;
    await expectLater(
        repository.readEpisodesPage('station', 'program',
            cursor: cache.nextCursor),
        throwsArgumentError);
    await expectLater(
        repository.readEpisodesPage('station', 'other',
            cursor: cache.nextCursor, fromCache: true),
        throwsArgumentError);
    expect(firestore.queries.length, reads);
  });
  test('initial content reads only first active program and its published page',
      () async {
    final firestore = FixtureFirestore({
      'programs': [
        FixtureDocument('program', programData()),
        FixtureDocument('inactive', {...programData(), 'isActive': false})
      ],
      'episodes': [
        FixtureDocument('e', episodeData()),
        FixtureDocument('other', {...episodeData(), 'programId': 'other'})
      ]
    });
    final batch = await FirebaseStationContentRepository(
            StationContentFirestoreDataSource(firestore))
        .refresh('station');
    expect(batch.isPartial, true);
    expect(batch.selectedProgramId, 'program');
    expect(batch.episodes.single.id, 'e');
    expect(firestore.queries.length, 2);
    expect(firestore.queries.every((q) => q.maximum == 51), true);
  });
  test(
      'distant direct target validates all three documents without traversing pages',
      () async {
    final firestore = FixtureFirestore({
      'stations': [
        FixtureDocument('station', {
          'isActive': true,
          'name': 'Synthetic station',
          'countryCode': 'YE',
          'countryNameAr': 'Yemen',
          'cityCode': 'aden',
          'cityNameAr': 'Aden',
          'priority': 0,
          'isLive': false,
          'isVerified': false,
          'isFeatured': false
        })
      ],
      'programs': [FixtureDocument('program', programData())],
      'episodes': [FixtureDocument('episode-10001', episodeData())]
    });
    final repo = FirebaseStationContentRepository(
        StationContentFirestoreDataSource(firestore));
    expect(
        (await repo.resolveEpisode('station', 'program', 'episode-10001'))!
            .episode
            .id,
        'episode-10001');
    expect(firestore.directReads, 3);
    expect(firestore.queries, isEmpty);
    firestore.records['episodes']!.single.value['isPublished'] = false;
    expect(
        await repo.resolveEpisode('station', 'program', 'episode-10001'), null);
    expect(firestore.directReads, 4);
    firestore.records['episodes']!.single.value['isPublished'] = true;
    expect(
        await repo.resolveEpisode('station', 'foreign', 'episode-10001'), null);
    expect(firestore.directReads, 5);
  });
}

Map<String, dynamic> programData() => {
      'stationId': 'station',
      'title': 'Synthetic program',
      'priority': 0,
      'isActive': true,
      'isFeatured': false,
      'stats': {'episodesCount': 102, 'subscribersCount': 0, 'totalPlays': 0},
    };
Map<String, dynamic> episodeData({bool published = true}) => {
      'stationId': 'station',
      'programId': 'program',
      'title': 'Synthetic episode',
      'audioUrl': 'https://example.test/episode.mp3',
      'durationSeconds': 60,
      'priority': 0,
      'isPublished': published,
      'isFeatured': false,
      'broadcastAt': Timestamp(1800000000, 123456789),
      'utcOffsetMinutes': 180,
      'stats': {'playsCount': 0, 'likesCount': 0, 'commentsCount': 0},
    };

// SDK doubles execute actual filters/order/limit before mapping, rather than
// returning canned pages that could conceal the filter-before-limit regression.
class FixtureFirestore implements FirebaseFirestore {
  FixtureFirestore(this.records);
  final Map<String, List<FixtureDocument>> records;
  @override
  FirebaseApp get app => FixtureApp();
  @override
  String get databaseId => '(default)';
  @override
  DocumentReference<Map<String, dynamic>> doc(String path) =>
      FixtureReference(this, path);
  final List<int> returned = [];
  int directReads = 0;
  final List<FixtureQuery> queries = [];
  @override
  CollectionReference<Map<String, dynamic>> collection(String path) =>
      FixtureQuery(this, path);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class FixtureDocument implements QueryDocumentSnapshot<Map<String, dynamic>> {
  FixtureDocument(this.id, this.value);
  @override
  final String id;
  final Map<String, dynamic> value;
  @override
  Map<String, dynamic> data() => value;
  @override
  bool get exists => true;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FixtureSnapshot implements QuerySnapshot<Map<String, dynamic>> {
  FixtureSnapshot(this.docs);
  @override
  final List<FixtureDocument> docs;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class FixtureQuery implements CollectionReference<Map<String, dynamic>> {
  FixtureQuery(this.firestore, this.path,
      {this.filters = const [],
      this.orders = const [],
      this.maximum,
      this.after});
  @override
  final FixtureFirestore firestore;
  @override
  final String path;
  final List<(Object, Object?)> filters;
  final List<(Object, bool)> orders;
  final int? maximum;
  final List<Object?>? after;
  FixtureQuery copy(
          {String? path,
          List<(Object, Object?)>? filters,
          List<(Object, bool)>? orders,
          int? maximum,
          List<Object?>? after}) =>
      FixtureQuery(firestore, path ?? this.path,
          filters: filters ?? this.filters,
          orders: orders ?? this.orders,
          maximum: maximum ?? this.maximum,
          after: after ?? this.after);
  @override
  DocumentReference<Map<String, dynamic>> doc([String? path]) =>
      FixtureReference(firestore, '${this.path}/$path');
  @override
  Query<Map<String, dynamic>> where(Object field,
          {Object? isEqualTo,
          Object? isNotEqualTo,
          Object? isLessThan,
          Object? isLessThanOrEqualTo,
          Object? isGreaterThan,
          Object? isGreaterThanOrEqualTo,
          Object? arrayContains,
          Iterable<Object?>? arrayContainsAny,
          Iterable<Object?>? whereIn,
          Iterable<Object?>? whereNotIn,
          bool? isNull}) =>
      copy(filters: [...filters, (field, isEqualTo)]);
  @override
  Query<Map<String, dynamic>> orderBy(Object field,
          {bool descending = false}) =>
      copy(orders: [...orders, (field, descending)]);
  @override
  Query<Map<String, dynamic>> limit(int value) => copy(maximum: value);
  @override
  Query<Map<String, dynamic>> startAfter(Iterable<Object?> values) =>
      copy(after: values.toList());
  Object? field(FixtureDocument doc, Object key) =>
      key == FieldPath.documentId ? doc.id : doc.value[key];
  int compare(Object? a, Object? b) {
    int rank(Object? v) => v == null
        ? 0
        : v is bool
            ? 1
            : v is num
                ? 2
                : v is Timestamp
                    ? 3
                    : v is String
                        ? 4
                        : v is Blob
                            ? 5
                            : v is DocumentReference
                                ? 6
                                : v is GeoPoint
                                    ? 7
                                    : v is List
                                        ? 8
                                        : v is VectorValue
                                            ? 9
                                            : 10;
    final order = rank(a).compareTo(rank(b));
    if (order != 0) return order;
    if (a == null) return 0;
    if (a is Timestamp && b is Timestamp) return a.compareTo(b);
    if (a is bool && b is bool) return (a ? 1 : 0).compareTo(b ? 1 : 0);
    if (a is GeoPoint && b is GeoPoint) {
      final x = a.latitude.compareTo(b.latitude);
      return x != 0 ? x : a.longitude.compareTo(b.longitude);
    }
    if (a is DocumentReference && b is DocumentReference) {
      return a.path.compareTo(b.path);
    }
    List<Object?>? sequence(Object? v) => v is Blob
        ? v.bytes.toList()
        : v is List
            ? v.cast<Object?>()
            : v is VectorValue
                ? v.toArray()
                : null;
    final left = sequence(a), right = sequence(b);
    if (left != null && right != null) {
      for (var i = 0; i < left.length && i < right.length; i++) {
        final result = compare(left[i], right[i]);
        if (result != 0) return result;
      }
      return left.length.compareTo(right.length);
    }
    if (a is Map && b is Map) {
      final keys = a.keys.cast<String>().toList()..sort();
      final other = b.keys.cast<String>().toList()..sort();
      for (var i = 0; i < keys.length && i < other.length; i++) {
        final k = keys[i].compareTo(other[i]);
        if (k != 0) return k;
        final v = compare(a[keys[i]], b[other[i]]);
        if (v != 0) return v;
      }
      return keys.length.compareTo(other.length);
    }
    return (a as Comparable).compareTo(b);
  }

  int compareTuple(FixtureDocument doc, List<Object?> tuple) {
    for (var i = 0; i < orders.length; i++) {
      var result = compare(field(doc, orders[i].$1), tuple[i]);
      if (orders[i].$2) result = -result;
      if (result != 0) return result;
    }
    return 0;
  }

  @override
  Future<QuerySnapshot<Map<String, dynamic>>> get([GetOptions? options]) async {
    firestore.queries.add(this);
    var rows = [
      ...(firestore.records[path.split('/').last] ?? <FixtureDocument>[])
    ];
    rows = rows
        .where((doc) =>
            filters.every((f) => field(doc, f.$1) == f.$2) &&
            orders.every((o) =>
                o.$1 == FieldPath.documentId || doc.value.containsKey(o.$1)))
        .toList();
    if (orders.isNotEmpty) {
      rows.sort((a, b) =>
          compareTuple(a, orders.map((o) => field(b, o.$1)).toList()));
    }
    if (after != null) {
      rows = rows.where((d) => compareTuple(d, after!) > 0).toList();
    }
    if (maximum != null) {
      rows = rows.take(maximum!).toList();
    }
    firestore.returned.add(rows.length);
    return FixtureSnapshot(rows);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ignore: subtype_of_sealed_class
class FixtureReference implements DocumentReference<Map<String, dynamic>> {
  FixtureReference(this.firestore, this.path);
  @override
  final FixtureFirestore firestore;
  @override
  final String path;
  @override
  String get id => path.split('/').last;
  @override
  CollectionReference<Map<String, dynamic>> collection(String collectionPath) =>
      FixtureQuery(firestore, '$path/$collectionPath');
  @override
  Future<DocumentSnapshot<Map<String, dynamic>>> get(
      [GetOptions? options]) async {
    firestore.directReads++;
    return firestore.records[path.split('/')[path.split('/').length - 2]]!
        .firstWhere((d) => d.id == id);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FixtureApp implements FirebaseApp {
  @override
  String get name => 'synthetic-pagination';
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
