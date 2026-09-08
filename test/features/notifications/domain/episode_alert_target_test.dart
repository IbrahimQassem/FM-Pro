import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/notifications/domain/models/episode_alert_target.dart';

void main() {
  final valid = <String, dynamic>{
    'version': '1',
    'type': 'episode',
    'root': 'HudHudDev',
    'eventId': 'HudHudDev:e',
    'stationId': 's',
    'programId': 'p',
    'episodeId': 'e'
  };
  test('accepts a versioned same-root target', () {
    expect(
        EpisodeAlertTarget.parse(valid, expectedRoot: 'HudHudDev')?.episodeId,
        'e');
  });
  test('rejects cross-root, unknown types, malformed IDs and forged events',
      () {
    for (final entry in <String, dynamic>{
      'root': 'HudHudOfficial',
      'version': '2',
      'type': 'url',
      'episodeId': '../e',
      'eventId': 'forged'
    }.entries) {
      expect(
          EpisodeAlertTarget.parse({...valid, entry.key: entry.value},
              expectedRoot: 'HudHudDev'),
          isNull);
    }
  });
}
