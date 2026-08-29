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
    final programs = seed['programs'] as List<dynamic>;
    final episodes = seed['episodes'] as List<dynamic>;

    expect(seed['projectId'], 'sanadev-fm');
    expect(seed['root'], 'HudHudDev');
    expect(locations, hasLength(2));
    expect(stations, hasLength(4));
    expect(banners, hasLength(1));
    expect(programs, hasLength(3));
    expect(episodes, hasLength(3));

    final cityCodes = <String>{};
    final declaredProgramCounts = <String, int>{};
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
    final actualProgramCounts = <String, int>{};
    for (final value in programs) {
      final entry = value as Map<String, dynamic>;
      final program = ProgramMapper.fromMap(
        id: entry['id'] as String,
        data: entry['data'] as Map<String, dynamic>,
      );
      programIds.add(program.id);
      actualProgramCounts.update(
        program.stationId,
        (currentCount) => currentCount + 1,
        ifAbsent: () => 1,
      );
      expect(
        stations.any(
          (value) => (value as Map<String, dynamic>)['id'] == program.stationId,
        ),
        isTrue,
      );
    }

    for (final entry in declaredProgramCounts.entries) {
      expect(entry.value, actualProgramCounts[entry.key] ?? 0);
    }

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
    }
  });
}
