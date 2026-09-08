import 'dart:convert';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/data/mappers/episode_mapper.dart';

void main() {
  test('records synthetic episode mapping and ordering cost', () async {
    final results = <Map<String, Object>>[];
    final data = <String, dynamic>{
      'programId': 'p',
      'stationId': 's',
      'title': 'Synthetic episode',
      'description': 'Development fixture',
      'audioUrl': 'https://example.test/audio.mp3',
      'durationSeconds': 1800,
      'priority': 1,
      'isPublished': true,
      'isFeatured': false,
      'broadcastAt': Timestamp.fromDate(DateTime.utc(2026, 9, 8)),
      'utcOffsetMinutes': 180,
      'stats': {'playsCount': 0, 'likesCount': 0, 'commentsCount': 0}
    };
    for (final count in [100, 1000, 10000]) {
      final durations = <int>[];
      for (var sample = 0; sample < 6; sample++) {
        final watch = Stopwatch()..start();
        final episodes = List.generate(count,
            (index) => EpisodeMapper.fromMap(id: 'e-$index', data: data));
        episodes.sort((a, b) => b.broadcastAt.compareTo(a.broadcastAt));
        watch.stop();
        expect(episodes.length, count);
        expect(episodes.map((e) => e.id).toSet().length, count);
        if (sample > 0) durations.add(watch.elapsedMicroseconds);
      }
      durations.sort();
      results.add({
        'episodes': count,
        'medianMappingAndSortMicroseconds': durations[2],
        'estimatedReturnedEpisodeDocumentsPerServerRefresh': count
      });
    }
    final directory = Directory('build/review/continuation')
      ..createSync(recursive: true);
    await File('${directory.path}/catalog-measurement.json')
        .writeAsString(const JsonEncoder.withIndent('  ').convert({
      'environment':
          'Flutter test VM; synthetic; excludes network, rendering and billed reads',
      'queryShape':
          'One station-scoped programs query plus one station-scoped episodes query; no limit',
      'samples': results
    }));
  });
}
