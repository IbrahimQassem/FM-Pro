import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/domain/models/content_page.dart';

void main() {
  test('page cursor and nested raw values copy lists and reject mutations', () {
    final source = [1];
    final page = ContentPage(items: source);
    source.add(2);
    expect(page.items, [1]);
    expect(() => page.items.add(3), throwsUnsupportedError);
    final tuple = [
      ContentSortValue.timestamp(1, 123),
      ContentSortValue.scalar(0),
      ContentSortValue.scalar('e')
    ];
    final cursor = ContentCursor(
        root: 'HudHudDev',
        resource: 'episodes',
        stationId: 's',
        programId: 'p',
        values: tuple);
    tuple[0] = ContentSortValue.scalar(2);
    expect(cursor.values.first.value, (1, 123));
    expect(() => cursor.values.add(ContentSortValue.scalar(2)),
        throwsUnsupportedError);
    final bytes = [1, 2];
    final byteValue = ContentSortValue.bytes(bytes);
    bytes[0] = 3;
    expect(byteValue.value, [1, 2]);
    expect(() => (byteValue.value as List<int>).add(4), throwsUnsupportedError);
    final map = {'k': ContentSortValue.scalar(null)};
    final raw = ContentSortValue.map(map);
    map.clear();
    expect((raw.value as Map).length, 1);
    expect(() => (raw.value as Map).clear(), throwsUnsupportedError);
  });
  test(
      'wrong version root filter resource fingerprint and tuple metadata fail closed',
      () {
    final tuple = [
      ContentSortValue.timestamp(1, 0),
      ContentSortValue.scalar(0),
      ContentSortValue.scalar('e')
    ];
    for (final cursor in [
      ContentCursor(
          version: 2,
          root: 'HudHudDev',
          resource: 'episodes',
          stationId: 's',
          programId: 'p',
          values: tuple),
      ContentCursor(
          root: 'HudHudOfficial',
          resource: 'episodes',
          stationId: 's',
          programId: 'p',
          values: tuple),
      ContentCursor(
          root: 'HudHudDev',
          resource: 'episodes',
          stationId: 'other',
          programId: 'p',
          values: tuple),
      ContentCursor(
          root: 'HudHudDev',
          resource: 'programs',
          stationId: 's',
          values: tuple),
      ContentCursor(
          root: 'HudHudDev',
          resource: 'episodes',
          stationId: 's',
          programId: 'p',
          queryFingerprint: 'forged',
          values: tuple),
      ContentCursor(
          root: 'HudHudDev',
          resource: 'episodes',
          stationId: 's',
          programId: 'p',
          values: const []),
      ContentCursor(
          root: 'HudHudDev',
          resource: 'episodes',
          stationId: 's',
          programId: 'p',
          values: [...tuple.take(2), ContentSortValue.scalar('../foreign')]),
    ]) {
      expect(
          () => cursor.validate(
              root: 'HudHudDev',
              resource: 'episodes',
              stationId: 's',
              programId: 'p',
              server: true),
          throwsArgumentError);
    }
  });
  test(
      'malformed typed timestamp bytes reference and geographic metadata reject at construction',
      () {
    for (final make in <ContentSortValue Function()>[
      () => ContentSortValue.timestamp(1, 1000000000),
      () => ContentSortValue.timestamp(253402300800, 0),
      () => ContentSortValue.bytes([256]),
      () => ContentSortValue.reference('app', 'database', '../foreign'),
      () => ContentSortValue.geoPoint(91, 0),
      () => ContentSortValue.scalar(Object()),
    ]) {
      expect(make, throwsArgumentError);
    }
  });
}
