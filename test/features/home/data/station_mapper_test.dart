import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/error/app_data_exception.dart';
import 'package:hudhud_fm/features/home/data/mappers/station_mapper.dart';

void main() {
  group('StationMapper', () {
    test('maps a canonical station document', () {
      final station = StationMapper.fromMap(
        id: 'sanaa-radio',
        data: _validData(),
      );

      expect(station.id, 'sanaa-radio');
      expect(station.cityCode, 'sanaa');
      expect(station.subscribersCount, 1200);
      expect(station.programsCount, 14);
    });

    test('rejects a legacy document without cityCode', () {
      final data = _validData()..remove('cityCode');

      expect(
        () => StationMapper.fromMap(id: 'legacy', data: data),
        throwsA(isA<SchemaDataException>()),
      );
    });

    test('rejects a station with an invalid stream URL', () {
      final data = _validData()..['streamUrl'] = 'not-a-url';

      expect(
        () => StationMapper.fromMap(id: 'broken', data: data),
        throwsA(isA<SchemaDataException>()),
      );
    });

    test('maps a terrestrial station without a stream URL', () {
      final data = _validData()..['streamUrl'] = '';

      final station = StationMapper.fromMap(id: 'terrestrial', data: data);
      expect(station.streamUrl, '');
      expect(station.isLive, false);
      expect(station.frequency, '92.5 MHz');
    });

    test('maps public basic info and ignores management reference fields', () {
      final data = {
        ..._validData(),
        'websiteUrl': 'https://sanaa.fm',
        'facebookUrl': 'https://facebook.com/sanaafm',
        'instagramUrl': 'https://instagram.com/sanaafm',
        'youtubeUrl': 'https://youtube.com/@sanaafm',
        'twitterUrl': 'https://x.com/sanaafm',
        'whatsapp': '+967770000000',
        'owner': 'وزارة الإعلام',
        'address': 'صنعاء، التحرير',
        'contactPerson': 'مسؤول البث',
        'contactPhone': '01-200000',
        'contactEmail': 'info@sanaa.fm',
      };

      final station = StationMapper.fromMap(id: 'extended', data: data);
      expect(station.websiteUrl, 'https://sanaa.fm');
      expect(station.facebookUrl, 'https://facebook.com/sanaafm');
      expect(station.instagramUrl, 'https://instagram.com/sanaafm');
      expect(station.youtubeUrl, 'https://youtube.com/@sanaafm');
      expect(station.twitterUrl, 'https://x.com/sanaafm');
      expect(station.whatsapp, '+967770000000');
    });
  });
}

Map<String, dynamic> _validData() => {
      'name': 'إذاعة صنعاء',
      'nameEn': 'Sanaa Radio',
      'streamUrl': 'https://radio.example.com/live',
      'backupStreamUrl': '',
      'logoUrl': 'https://images.example.com/sanaa.webp',
      'thumbnailUrl': '',
      'frequency': '92.5 MHz',
      'countryCode': 'YE',
      'countryNameAr': 'اليمن',
      'cityCode': 'sanaa',
      'cityNameAr': 'صنعاء',
      'priority': 90,
      'isLive': true,
      'isActive': true,
      'isVerified': true,
      'isFeatured': false,
      'stats': {
        'programsCount': 14,
        'subscribersCount': 1200,
        'totalPlays': 5200
      },
    };
