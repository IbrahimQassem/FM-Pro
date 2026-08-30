import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:hudhud_fm/features/home/data/mappers/banner_mapper.dart';
import 'package:hudhud_fm/features/home/data/mappers/location_mapper.dart';
import 'package:hudhud_fm/features/home/data/mappers/station_mapper.dart';
import 'package:hudhud_fm/features/station_content/data/mappers/episode_mapper.dart';
import 'package:hudhud_fm/features/station_content/data/mappers/program_mapper.dart';

void main() {
  test('Development seed matches the canonical mappers', () async {
    final file = File('tool/firebase_seed/development_seed.json');
    final seed = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    final locations = seed['locations'] as List<dynamic>;
    final stations = seed['stations'] as List<dynamic>;
    final banners = seed['banners'] as List<dynamic>;
    final users = seed['users'] as List<dynamic>;
    final programs = seed['programs'] as List<dynamic>;
    final episodes = seed['episodes'] as List<dynamic>;
    final comments = seed['comments'] as List<dynamic>;
    final favorites = seed['favorites'] as List<dynamic>;
    final subscriptions = seed['subscriptions'] as List<dynamic>;

    expect(seed['projectId'], 'sanadev-fm');
    expect(seed['root'], 'HudHudDev');
    expect(locations, hasLength(2));
    expect(stations, hasLength(4));
    expect(banners, hasLength(1));
    expect(users, hasLength(3));
    expect(programs, hasLength(5));
    expect(episodes, hasLength(6));
    expect(comments, hasLength(12));
    expect(favorites, hasLength(6));
    expect(subscriptions, hasLength(4));

    final cityCodes = <String>{};
    final declaredProgramCounts = <String, int>{};
    final stationIds = <String>{};
    for (final value in locations) {
      final entry = value as Map<String, dynamic>;
      final location = LocationMapper.fromMap(
        entry['data'] as Map<String, dynamic>,
      );
      cityCodes.add(location.cityCode);
    }

    for (final value in stations) {
      final entry = value as Map<String, dynamic>;
      final station = StationMapper.fromMap(
        id: entry['id'] as String,
        data: entry['data'] as Map<String, dynamic>,
      );
      expect(Uri.parse(station.streamUrl).scheme, 'https');
      expect(cityCodes, contains(station.cityCode));
      expect(station.isVerified, isFalse);
      stationIds.add(station.id);
      declaredProgramCounts[station.id] = station.programsCount;
    }

    final bannerEntry = banners.single as Map<String, dynamic>;
    final banner = BannerMapper.fromMap(
      id: bannerEntry['id'] as String,
      data: bannerEntry['data'] as Map<String, dynamic>,
    );
    expect(Uri.parse(banner.imageUrl).scheme, 'https');
    expect(banner.isActive, isTrue);

    final programIds = <String>{};
    final programStationIds = <String, String>{};
    final declaredEpisodeCounts = <String, int>{};
    final actualProgramCounts = <String, int>{};
    for (final value in programs) {
      final entry = value as Map<String, dynamic>;
      final program = ProgramMapper.fromMap(
        id: entry['id'] as String,
        data: entry['data'] as Map<String, dynamic>,
      );
      programIds.add(program.id);
      programStationIds[program.id] = program.stationId;
      declaredEpisodeCounts[program.id] = program.episodesCount;
      actualProgramCounts.update(
        program.stationId,
        (currentCount) => currentCount + 1,
        ifAbsent: () => 1,
      );
      expect(stationIds, contains(program.stationId));
    }

    for (final entry in declaredProgramCounts.entries) {
      expect(entry.value, actualProgramCounts[entry.key] ?? 0);
      expect(entry.value, greaterThan(0));
    }

    final episodeIds = <String>{};
    final declaredCommentCounts = <String, int>{};
    final actualEpisodeCounts = <String, int>{};
    for (final value in episodes) {
      final entry = value as Map<String, dynamic>;
      final data = Map<String, dynamic>.from(
        entry['data'] as Map<String, dynamic>,
      );
      data['broadcastAt'] = Timestamp.fromDate(
        DateTime.parse(data['broadcastAt'] as String),
      );
      final publishedAt = data['publishedAt'];
      if (publishedAt is String) {
        data['publishedAt'] = Timestamp.fromDate(DateTime.parse(publishedAt));
      }
      final episode = EpisodeMapper.fromMap(
        id: entry['id'] as String,
        data: data,
      );
      expect(programIds, contains(episode.programId));
      expect(episode.stationId, programStationIds[episode.programId]);
      episodeIds.add(episode.id);
      declaredCommentCounts[episode.id] = episode.commentsCount;
      actualEpisodeCounts.update(
        episode.programId,
        (currentCount) => currentCount + 1,
        ifAbsent: () => 1,
      );
    }

    for (final entry in declaredEpisodeCounts.entries) {
      expect(entry.value, actualEpisodeCounts[entry.key] ?? 0);
      expect(entry.value, greaterThan(0));
    }

    final userNames = <String, String>{};
    for (final value in users) {
      final entry = value as Map<String, dynamic>;
      final id = entry['id'] as String;
      final data = entry['data'] as Map<String, dynamic>;
      expect(id, isNotEmpty);
      expect(data['displayName'], isA<String>());
      expect((data['displayName'] as String).trim(), isNotEmpty);
      expect(data['isActive'], isTrue);
      expect(data['role'], 'listener');
      expect(DateTime.tryParse(data['createdAt'] as String), isNotNull);
      expect(DateTime.tryParse(data['updatedAt'] as String), isNotNull);
      userNames[id] = data['displayName'] as String;
    }

    final actualCommentCounts = <String, int>{};
    final usedAuthors = <String>{};
    for (final value in comments) {
      final entry = value as Map<String, dynamic>;
      final data = entry['data'] as Map<String, dynamic>;
      final episodeId = data['episodeId'] as String;
      final authorId = data['authorId'] as String;
      final content = (data['content'] as String).trim();
      expect(episodeIds, contains(episodeId));
      expect(userNames, contains(authorId));
      expect(data['authorName'], userNames[authorId]);
      expect(content, isNotEmpty);
      expect(content.length, lessThanOrEqualTo(1000));
      expect(DateTime.tryParse(data['createdAt'] as String), isNotNull);
      expect(data['isEdited'], isA<bool>());
      usedAuthors.add(authorId);
      actualCommentCounts.update(
        episodeId,
        (currentCount) => currentCount + 1,
        ifAbsent: () => 1,
      );
    }

    for (final entry in declaredCommentCounts.entries) {
      expect(entry.value, actualCommentCounts[entry.key] ?? 0);
      expect(entry.value, greaterThan(0));
    }
    expect(usedAuthors, unorderedEquals(userNames.keys));

    final engagementUsers = <String>{};
    for (final value in favorites) {
      final entry = value as Map<String, dynamic>;
      final userId = entry['userId'] as String;
      final data = entry['data'] as Map<String, dynamic>;
      expect(userNames, contains(userId));
      expect(['station', 'program', 'episode'], contains(data['targetType']));
      expect(data['targetId'], isA<String>());
      expect(DateTime.tryParse(data['createdAt'] as String), isNotNull);
      engagementUsers.add(userId);
    }
    for (final value in subscriptions) {
      final entry = value as Map<String, dynamic>;
      final userId = entry['userId'] as String;
      final data = entry['data'] as Map<String, dynamic>;
      expect(userNames, contains(userId));
      expect(['station', 'program'], contains(data['targetType']));
      expect(data['targetId'], isA<String>());
      expect(data['notificationsEnabled'], isA<bool>());
      expect(data['isActive'], isTrue);
      expect(DateTime.tryParse(data['createdAt'] as String), isNotNull);
      expect(DateTime.tryParse(data['updatedAt'] as String), isNotNull);
      engagementUsers.add(userId);
    }
    expect(engagementUsers, unorderedEquals(userNames.keys));
  });
}
