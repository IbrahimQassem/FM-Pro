import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/favorites/domain/models/favorite_item.dart';

void main() {
  group('FavoriteItem', () {
    test('constructs model and generates deterministic id correctly', () {
      final now = DateTime.utc(2026, 9, 4);
      final item = FavoriteItem(
        id: 'station_sanaa',
        targetType: FavoriteTargetType.station,
        targetId: 'sanaa',
        createdAt: now,
      );

      expect(item.id, 'station_sanaa');
      expect(item.targetType, FavoriteTargetType.station);
      expect(item.targetId, 'sanaa');
      expect(item.createdAt, now);
      expect(
        FavoriteItem.deterministicId(FavoriteTargetType.station, 'sanaa'),
        'station_sanaa',
      );
      expect(
        FavoriteItem.deterministicId(FavoriteTargetType.program, 'prog_1'),
        'program_prog_1',
      );
    });

    test('parses FavoriteTargetType from string', () {
      expect(FavoriteTargetType.fromString('station'), FavoriteTargetType.station);
      expect(FavoriteTargetType.fromString('program'), FavoriteTargetType.program);
      expect(FavoriteTargetType.fromString('episode'), FavoriteTargetType.episode);
      expect(() => FavoriteTargetType.fromString('unknown'), throwsArgumentError);
    });
  });
}
