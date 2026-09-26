import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/services/share_service.dart';
import 'package:hudhud_fm/core/utils/store_url_helper.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/station_content/domain/models/episode.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';
import 'package:share_plus/share_plus.dart';

void main() {
  const station = Station(
    id: 'station-test',
    name: 'Test Station',
    streamUrl: 'https://audio.example.test/private-live',
    backupStreamUrl: 'https://audio.example.test/private-backup',
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    cityCode: 'AD',
    cityNameAr: 'عدن',
    priority: 0,
    isLive: true,
    isActive: true,
    isVerified: true,
    isFeatured: false,
    programsCount: 1,
    subscribersCount: 0,
    totalPlays: 0,
  );
  final episode = Episode(
    id: 'episode-test',
    programId: 'program-test',
    stationId: station.id,
    title: 'Test Episode',
    audioUrl: 'https://audio.example.test/private-episode.mp3',
    durationSeconds: 60,
    priority: 0,
    isPublished: true,
    isFeatured: false,
    broadcastAt: DateTime.utc(2026),
    utcOffsetMinutes: 0,
    playsCount: 0,
    likesCount: 0,
    commentsCount: 0,
  );

  for (final language in ['en', 'ar']) {
    testWidgets(
        '$language shares app, station and episode using public store links',
        (tester) async {
      late BuildContext shareContext;
      await tester.pumpWidget(MaterialApp(
        locale: Locale(language),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(builder: (context) {
          shareContext = context;
          return const Scaffold(body: Text('Share test'));
        }),
      ));
      final plugin = _SharePlugin();
      final service = ShareService(sharePlugin: plugin);
      await service.shareApp(shareContext);
      await service.shareStation(shareContext, station);
      await service.shareEpisode(shareContext, episode, station,
          programTitle: 'Distinct Program');
      expect(plugin.calls, hasLength(3));
      for (final params in plugin.calls) {
        expect(params.text, contains(StoreUrlHelper.getStoreUrl()));
        expect(params.text, isNot(contains(station.streamUrl)));
        expect(params.text, isNot(contains(station.backupStreamUrl)));
        expect(params.text, isNot(contains(episode.audioUrl)));
        expect(params.sharePositionOrigin, isNotNull);
        expect(params.sharePositionOrigin!.isEmpty, isFalse);
      }
      expect(plugin.calls[1].text, contains(station.name));
      expect(plugin.calls[1].subject, station.name);
      expect(plugin.calls[2].text, contains(episode.title));
      expect(plugin.calls[2].text, contains(station.name));
      expect(plugin.calls[2].subject, episode.title);
      expect(plugin.calls[2].text, contains('Distinct Program'));
    });

    testWidgets('$language shares app with mascot image attachment',
        (tester) async {
      late BuildContext shareContext;
      await tester.pumpWidget(MaterialApp(
        locale: Locale(language),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(builder: (context) {
          shareContext = context;
          return const Scaffold(body: Text('Share test'));
        }),
      ));
      final plugin = _SharePlugin();
      final mascotFile = XFile(
        '/tmp/hudhud_fm_mascot.webp',
        mimeType: 'image/webp',
        name: 'hudhud_fm_mascot.webp',
      );
      final service = ShareService(
        sharePlugin: plugin,
        mascotImageLoader: () async => mascotFile,
      );
      await service.shareApp(shareContext);

      expect(plugin.calls, hasLength(1));
      final call = plugin.calls.first;
      expect(call.files, isNotNull);
      expect(call.files!.single.name, 'hudhud_fm_mascot.webp');
      expect(call.text, contains(StoreUrlHelper.getStoreUrl()));
      if (language == 'ar') {
        expect(call.text, contains('صوت اليمن يجمعنا أينما كنا!'));
      } else {
        expect(call.text, contains('The voice of Yemen brings us together'));
      }
    });

    testWidgets('$language falls back to text-only if file share fails',
        (tester) async {
      late BuildContext shareContext;
      await tester.pumpWidget(MaterialApp(
        locale: Locale(language),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Builder(builder: (context) {
          shareContext = context;
          return const Scaffold(body: Text('Share test'));
        }),
      ));
      final plugin = _FailingFileSharePlugin();
      final mascotFile = XFile(
        '/tmp/hudhud_fm_mascot.webp',
        mimeType: 'image/webp',
        name: 'hudhud_fm_mascot.webp',
      );
      final service = ShareService(
        sharePlugin: plugin,
        mascotImageLoader: () async => mascotFile,
      );
      await service.shareApp(shareContext);

      expect(plugin.calls, hasLength(2));
      // First attempt had file and threw
      expect(plugin.calls[0].files, isNotNull);
      // Fallback attempt had text only
      expect(plugin.calls[1].files, isNull);
      expect(plugin.calls[1].text, contains(StoreUrlHelper.getStoreUrl()));
    });
  }
}

class _FailingFileSharePlugin implements SharePlus {
  final calls = <ShareParams>[];
  @override
  Future<ShareResult> share(ShareParams params) async {
    calls.add(params);
    if (params.files != null && params.files!.isNotEmpty) {
      throw UnsupportedError('File sharing unsupported');
    }
    return const ShareResult('test', ShareResultStatus.success);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _SharePlugin implements SharePlus {
  final calls = <ShareParams>[];
  @override
  Future<ShareResult> share(ShareParams params) async {
    calls.add(params);
    return const ShareResult('test', ShareResultStatus.success);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
