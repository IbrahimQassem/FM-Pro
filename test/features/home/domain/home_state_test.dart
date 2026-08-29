import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/location_reference.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';

void main() {
  group('HomeState', () {
    final stations = [
      _station(id: 'sanaa', cityCode: 'sanaa', cityName: 'صنعاء'),
      _station(id: 'aden', cityCode: 'aden', cityName: 'عدن'),
      _station(
        id: 'riyadh',
        cityCode: 'riyadh',
        cityName: 'الرياض',
        countryCode: 'SA',
      ),
    ];
    final locations = [
      _location(cityCode: 'aden', cityName: 'عدن', sortOrder: 1),
      _location(cityCode: 'aden', cityName: 'عدن', sortOrder: 1),
      _location(cityCode: 'sanaa', cityName: 'صنعاء', sortOrder: 2),
      _location(cityCode: 'taiz', cityName: 'تعز', sortOrder: 3),
    ];

    test('defaults to Yemen and exposes only cities with stations', () {
      final state = HomeState(
        stations: stations,
        referenceLocations: locations,
        isInitialLoading: false,
      );

      expect(state.visibleStations.map((item) => item.id), ['sanaa', 'aden']);
      expect(state.cities.map((city) => city.code), ['aden', 'sanaa']);
    });

    test('combines city and text filters', () {
      final state = HomeState(
        stations: stations,
        referenceLocations: locations,
        selectedCityCode: 'aden',
        searchQuery: 'عدن',
        isInitialLoading: false,
      );

      expect(state.visibleStations.single.id, 'aden');
    });

    test('searches by frequency', () {
      final state = HomeState(
        stations: stations,
        referenceLocations: locations,
        searchQuery: '92.5',
        isInitialLoading: false,
      );

      expect(state.visibleStations.single.id, 'sanaa');
    });
  });
}

Station _station({
  required String id,
  required String cityCode,
  required String cityName,
  String countryCode = 'YE',
}) {
  return Station(
    id: id,
    name: 'إذاعة $cityName',
    streamUrl: 'https://radio.example.com/$id',
    countryCode: countryCode,
    countryNameAr: countryCode == 'YE' ? 'اليمن' : 'السعودية',
    cityCode: cityCode,
    cityNameAr: cityName,
    frequency: id == 'sanaa' ? '92.5 MHz' : '88.3 MHz',
    priority: 1,
    isLive: true,
    isActive: true,
    isVerified: false,
    isFeatured: false,
    programsCount: 1,
    subscribersCount: 2,
    totalPlays: 3,
  );
}

LocationReference _location({
  required String cityCode,
  required String cityName,
  required int sortOrder,
}) {
  return LocationReference(
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    cityCode: cityCode,
    cityNameAr: cityName,
    sortOrder: sortOrder,
    isActive: true,
  );
}
