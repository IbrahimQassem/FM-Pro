import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';

Station station(String id, DateTime? checked,
        {String city = 'aden',
        String country = 'YE',
        String health = 'online',
        int failures = 0,
        String stream = 'https://radio.example/live'}) =>
    Station(
      id: id,
      name: 'إذاعة $id',
      streamUrl: stream,
      countryCode: country,
      countryNameAr: 'اليمن',
      cityCode: city,
      cityNameAr: city,
      priority: 1,
      isLive: true,
      isActive: true,
      isVerified: false,
      isFeatured: false,
      programsCount: 0,
      subscribersCount: 0,
      totalPlays: 0,
      healthStatus: health,
      consecutiveFailures: failures,
      lastCheckedAt: checked,
    );
void main() {
  test(
      'regional scope remains visible and selectable without admitting unrelated countries',
      () {
    final state = HomeState(stations: [
      station('regional', DateTime.utc(2026),
          country: 'ARAB', city: 'global-ar'),
      station('other-country', null, country: 'EG')
    ], selectedCityCode: 'global-ar');
    expect(state.hasStations, true);
    expect(state.visibleStations.map((s) => s.id), ['regional']);
  });
  final now = DateTime.utc(2026, 10, 24, 12);
  test(
      'working streams require a source, online, zero failures and a check no older than45 minutes',
      () {
    expect(
        station('fresh', now.subtract(const Duration(minutes: 45)))
            .isWorkingStream(now: now),
        true);
    for (final item in [
      station(
          'stale', now.subtract(const Duration(minutes: 45, milliseconds: 1))),
      station('unknown', null),
      station('offline', now, health: 'offline'),
      station('backup-degraded', now, health: 'degraded'),
      station('failures', now, failures: 1),
      station('invalid', now, failures: -1),
      station('no-source', now, stream: '')
    ]) {
      expect(item.isWorkingStream(now: now), false, reason: item.id);
    }
  });
  test(
      'filter is optional and combines city, search and favorites without removing archive-only stations from the default',
      () {
    final items = [
      station('match', now),
      station('nonfavorite', now),
      station('other-city', now, city: 'sanaa'),
      station('archive', null, stream: '')
    ];
    final state = HomeState(
        stations: items,
        selectedCityCode: 'aden',
        searchQuery: 'match',
        isFavoritesOnly: true,
        favoriteStationIds: const {'match', 'archive'});
    expect(state.isWorkingStreamsOnly, false);
    expect(HomeState(stations: items).filterStations(now: now).length, 4);
    expect(
        state
            .copyWith(isWorkingStreamsOnly: true)
            .filterStations(now: now)
            .map((item) => item.id),
        ['match']);
    expect(
        state
            .copyWith(isWorkingStreamsOnly: true, searchQuery: 'archive')
            .filterStations(now: now),
        isEmpty);
    expect(
        state
            .copyWith(searchQuery: 'archive')
            .filterStations(now: now)
            .single
            .id,
        'archive');
  });
  test(
      'next change schedules the exact expiry and future-clock entry boundaries',
      () {
    expect(
        station('edge', now.subtract(const Duration(minutes: 45)))
            .nextStreamHealthChange(now: now),
        now.add(const Duration(milliseconds: 1)));
    expect(
        station('future', now.add(const Duration(minutes: 50)))
            .nextStreamHealthChange(now: now),
        now.add(const Duration(minutes: 5)));
    expect(station('unknown', null).nextStreamHealthChange(now: now), null);
  });
}
