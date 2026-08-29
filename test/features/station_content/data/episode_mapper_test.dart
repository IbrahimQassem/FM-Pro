import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/error/app_data_exception.dart';
import 'package:hudhud_fm/features/station_content/data/mappers/episode_mapper.dart';

void main() {
  test('maps a canonical published episode', () {
    final episode = EpisodeMapper.fromMap(id: 'episode-1', data: _validEpisode);

    expect(episode.programId, 'morning');
    expect(episode.durationSeconds, 1800);
    expect(episode.broadcastAt.toUtc(), DateTime.utc(2026, 8, 29, 5));
    expect(episode.playsCount, 50);
  });

  test('rejects an episode without a Firestore timestamp', () {
    final data = Map<String, dynamic>.from(_validEpisode)
      ..['broadcastAt'] = '2026-08-29T05:00:00Z';

    expect(
      () => EpisodeMapper.fromMap(id: 'episode-1', data: data),
      throwsA(isA<SchemaDataException>()),
    );
  });

  test('rejects an insecure episode audio URL', () {
    final data = Map<String, dynamic>.from(_validEpisode)
      ..['audioUrl'] = 'http://audio.example.com/episode.mp3';

    expect(
      () => EpisodeMapper.fromMap(id: 'episode-1', data: data),
      throwsA(isA<SchemaDataException>()),
    );
  });
}

final _validEpisode = <String, dynamic>{
  'programId': 'morning',
  'stationId': 'sanaa-radio',
  'title': 'حلقة التعليم',
  'description': 'حلقة عن التعليم.',
  'audioUrl': 'https://audio.example.com/episode.mp3',
  'durationSeconds': 1800,
  'coverUrl': 'https://images.example.com/episode.png',
  'presenter': 'أحمد',
  'priority': 10,
  'isPublished': true,
  'isFeatured': false,
  'broadcastAt': Timestamp.fromDate(DateTime.utc(2026, 8, 29, 5)),
  'utcOffsetMinutes': 180,
  'stats': {'playsCount': 50, 'likesCount': 4, 'commentsCount': 2},
};
