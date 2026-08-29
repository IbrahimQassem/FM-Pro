import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/data/mappers/banner_mapper.dart';
import 'package:hudhud_fm/features/home/data/mappers/location_mapper.dart';
import 'package:hudhud_fm/features/home/data/mappers/station_mapper.dart';

void main() {
  test('Development seed matches the canonical mappers', () async {
    final file = File('tool/firebase_seed/development_seed.json');
    final seed = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    final locations = seed['locations'] as List<dynamic>;
    final stations = seed['stations'] as List<dynamic>;
    final banners = seed['banners'] as List<dynamic>;

    expect(seed['projectId'], 'sanadev-fm');
    expect(seed['root'], 'HudHudDev');
    expect(locations, hasLength(2));
    expect(stations, hasLength(4));
    expect(banners, hasLength(1));

    final cityCodes = <String>{};
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
    }

    final bannerEntry = banners.single as Map<String, dynamic>;
    final banner = BannerMapper.fromMap(
      id: bannerEntry['id'] as String,
      data: bannerEntry['data'] as Map<String, dynamic>,
    );
    expect(Uri.parse(banner.imageUrl).scheme, 'https');
    expect(banner.isActive, isTrue);
  });
}
