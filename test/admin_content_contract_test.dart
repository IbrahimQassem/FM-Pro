import 'dart:convert';
import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/data/mappers/station_mapper.dart';
import 'package:hudhud_fm/features/home/data/mappers/location_mapper.dart';
import 'package:hudhud_fm/features/home/data/mappers/banner_mapper.dart';
import 'package:hudhud_fm/features/station_content/data/mappers/program_mapper.dart';
import 'package:hudhud_fm/features/station_content/data/mappers/episode_mapper.dart';

void main() {
  test('guided admin fixtures map to Flutter content without contract repair',
      () {
    final fixtures = jsonDecode(
        File('test/fixtures/admin-content-contract.json')
            .readAsStringSync()) as Map<String, dynamic>;
    Map<String, dynamic> record(String kind) {
      final data = Map<String, dynamic>.from(fixtures[kind] as Map);
      for (final key in [
        'broadcastAt',
        'publishedAt',
        'startAt',
        'expiresAt'
      ]) {
        if (data[key] is String) {
          data[key] = Timestamp.fromDate(DateTime.parse(data[key] as String));
        }
      }
      return data;
    }

    final station =
        StationMapper.fromMap(id: 'station', data: record('stations'));
    expect(station.streamUrl, 'http://example.test/live');
    expect(
        station.cityCode, LocationMapper.fromMap(record('locations')).cityCode);
    final program =
        ProgramMapper.fromMap(id: 'program', data: record('programs'));
    expect(program.stationId, station.id);
    expect(program.schedule!.endMinute, 1440);
    expect(
        ProgramMapper.fromMap(
            id: 'program',
            data: {...record('programs'), 'schedule': null}).schedule,
        isNull);
    final episode =
        EpisodeMapper.fromMap(id: 'episode', data: record('episodes'));
    expect(episode.programId, program.id);
    expect(episode.stationId, station.id);
    expect(episode.isPublished, isFalse);
    expect(episode.utcOffsetMinutes, 180);
    expect(episode.broadcastAt.toUtc(), DateTime.utc(2030, 1, 1, 21));
    final banner = BannerMapper.fromMap(id: 'banner', data: record('banners'));
    expect(banner.targetType, 'none');
    expect(banner.expiresAt!.toUtc(), DateTime.utc(2030, 1, 2));
  });
}
