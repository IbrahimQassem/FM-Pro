import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/data/mappers/station_mapper.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';

void main() {
  group('StationStreamHealthState resolution', () {
    final now = DateTime(2026, 10, 20, 12, 0);

    const sentinel = Object();
    Station createStation({
      String streamUrl = 'https://stream.example.com/live',
      String backupStreamUrl = 'https://backup.example.com/live',
      String healthStatus = 'online',
      String streamHealthSource = 'primary',
      int consecutiveFailures = 0,
      Object? lastCheckedAt = sentinel,
    }) {
      final DateTime? resolvedLastChecked = identical(lastCheckedAt, sentinel)
          ? now.subtract(const Duration(minutes: 5))
          : lastCheckedAt as DateTime?;

      return Station(
        id: 'station-1',
        name: 'إذاعة هدهد',
        streamUrl: streamUrl,
        backupStreamUrl: backupStreamUrl,
        countryCode: 'YE',
        countryNameAr: 'اليمن',
        cityCode: 'ADE',
        cityNameAr: 'عدن',
        priority: 1,
        isLive: true,
        isActive: true,
        isVerified: true,
        isFeatured: false,
        programsCount: 5,
        subscribersCount: 120,
        totalPlays: 1500,
        healthStatus: healthStatus,
        streamHealthSource: streamHealthSource,
        consecutiveFailures: consecutiveFailures,
        lastCheckedAt: resolvedLastChecked,
      );
    }

    test('resolves to deviceConnectionError if device error is present', () {
      final station = createStation();
      expect(
        station.resolveStreamHealthState(
          now: now,
          hasDeviceConnectionError: true,
        ),
        StationStreamHealthState.deviceConnectionError,
      );
    });

    test(
        'resolves to noOnlineSource when both primary and backup URLs are empty',
        () {
      final station = createStation(streamUrl: '', backupStreamUrl: '');
      expect(
        station.resolveStreamHealthState(now: now),
        StationStreamHealthState.noOnlineSource,
      );
    });

    test('resolves to unverified when lastCheckedAt is null', () {
      final station = createStation(lastCheckedAt: null);
      expect(
        station.resolveStreamHealthState(now: now),
        StationStreamHealthState.unverified,
      );
    });

    test(
        'resolves to unverified when probe is older than freshness threshold (45 min)',
        () {
      final station = createStation(
        lastCheckedAt: now.subtract(const Duration(minutes: 50)),
      );
      expect(
        station.resolveStreamHealthState(now: now),
        StationStreamHealthState.unverified,
      );
    });

    test('resolves to available when primary stream is fresh and healthy', () {
      final station = createStation(
        healthStatus: 'online',
        streamHealthSource: 'primary',
        consecutiveFailures: 0,
      );
      expect(
        station.resolveStreamHealthState(now: now),
        StationStreamHealthState.available,
      );
    });

    test(
        'resolves to backupAvailable when primary degraded but backup is healthy',
        () {
      final station = createStation(
        healthStatus: 'degraded',
        streamHealthSource: 'backup',
        consecutiveFailures: 0,
      );
      expect(
        station.resolveStreamHealthState(now: now),
        StationStreamHealthState.backupAvailable,
      );
    });

    test('resolves to unstable when consecutive failures < 3', () {
      final station = createStation(
        healthStatus: 'degraded',
        streamHealthSource: 'none',
        consecutiveFailures: 2,
      );
      expect(
        station.resolveStreamHealthState(now: now),
        StationStreamHealthState.unstable,
      );
    });

    test(
        'resolves to temporarilyStopped when healthStatus is offline or failures >= 3',
        () {
      final stationOffline = createStation(
        healthStatus: 'offline',
        consecutiveFailures: 3,
      );
      expect(
        stationOffline.resolveStreamHealthState(now: now),
        StationStreamHealthState.temporarilyStopped,
      );

      final stationThreshold = createStation(
        healthStatus: 'degraded',
        consecutiveFailures: 3,
      );
      expect(
        stationThreshold.resolveStreamHealthState(now: now),
        StationStreamHealthState.temporarilyStopped,
      );
    });
  });

  group('StationMapper health field mapping', () {
    test('parses stream health fields correctly', () {
      final rawData = <String, dynamic>{
        'name': 'إذاعة صنعاء',
        'streamUrl': 'https://stream.example.com/sanaa',
        'backupStreamUrl': 'https://backup.example.com/sanaa',
        'countryCode': 'YE',
        'countryNameAr': 'اليمن',
        'cityCode': 'SA',
        'cityNameAr': 'صنعاء',
        'priority': 10,
        'isLive': true,
        'isActive': true,
        'isVerified': true,
        'isFeatured': false,
        'healthStatus': 'degraded',
        'streamHealthSource': 'backup',
        'consecutiveFailures': 1,
        'lastCheckedAt': '2026-10-20T00:00:00.000Z',
      };

      final station = StationMapper.fromMap(id: 'sanaa', data: rawData);
      expect(station.healthStatus, 'degraded');
      expect(station.streamHealthSource, 'backup');
      expect(station.consecutiveFailures, 1);
      expect(station.lastCheckedAt, isNotNull);
      expect(station.lastCheckedAt, DateTime.parse('2026-10-20T00:00:00.000Z'));
    });
  });
}
