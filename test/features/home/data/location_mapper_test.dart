import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/error/app_data_exception.dart';
import 'package:hudhud_fm/features/home/data/mappers/location_mapper.dart';

void main() {
  group('LocationMapper', () {
    test('maps canonical Firebase reference data', () {
      final location = LocationMapper.fromMap({
        'countryCode': 'YE',
        'countryNameAr': 'اليمن',
        'cityCode': 'aden',
        'cityNameAr': 'عدن',
        'sortOrder': 2,
        'isActive': true,
      });

      expect(location.countryCode, 'YE');
      expect(location.cityCode, 'aden');
      expect(location.sortOrder, 2);
    });

    test('rejects free-text data without a city code', () {
      expect(
        () => LocationMapper.fromMap({
          'countryCode': 'YE',
          'countryNameAr': 'اليمن',
          'cityNameAr': 'عدن',
          'sortOrder': 2,
          'isActive': true,
        }),
        throwsA(isA<SchemaDataException>()),
      );
    });
  });
}
