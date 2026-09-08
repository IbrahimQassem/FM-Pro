import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hudhud_fm/app/providers.dart';
import 'package:hudhud_fm/core/theme/app_theme.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';
import 'package:hudhud_fm/features/home/domain/models/data_batch.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/home/domain/repositories/stations_repository.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_controller.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_item.dart';
import 'package:hudhud_fm/features/player/domain/models/audio_playback_phase.dart';
import 'package:hudhud_fm/features/player/domain/repositories/audio_playback_repository.dart';
import 'package:hudhud_fm/features/station_content/domain/models/episode.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_program.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_content_batch.dart';
import 'package:hudhud_fm/features/station_content/domain/repositories/station_content_repository.dart';
import '../features/home/presentation/home_controller_test.dart'
    show Banners, Locations, User, Preferences;
import '../features/favorites/presentation/favorites_controller_test.dart'
    show FakeAccountRepository, FakeFavoritesRepository;
import '../features/subscriptions/station_subscriptions_controller_test.dart'
    show FakeSubscriptions;

const reviewStation = Station(
    id: 's',
    name: 'إذاعة صنعاء — صوت المجتمع',
    streamUrl: 'https://example.test/live',
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    cityCode: 'sanaa',
    cityNameAr: 'صنعاء',
    priority: 1,
    isLive: true,
    isActive: true,
    isVerified: true,
    isFeatured: true,
    programsCount: 1,
    subscribersCount: 0,
    totalPlays: 0);
const reviewProgram = StationProgram(
    id: 'p',
    stationId: 's',
    title: 'صباح اليمن',
    description: 'حوار يومي عن المجتمع والثقافة',
    presenters: ['فريق البرنامج'],
    priority: 1,
    isActive: true,
    isFeatured: true,
    schedule: ProgramSchedule(
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        startMinute: 480,
        endMinute: 600,
        utcOffsetMinutes: 180),
    episodesCount: 1,
    subscribersCount: 0,
    totalPlays: 0);
final reviewEpisode = Episode(
    id: 'e',
    programId: 'p',
    stationId: 's',
    title: 'التعليم ومستقبل الشباب في المجتمع',
    audioUrl: 'https://example.test/episode.mp3',
    durationSeconds: 1800,
    priority: 1,
    isPublished: true,
    isFeatured: false,
    broadcastAt: DateTime.utc(2026, 9, 8),
    utcOffsetMinutes: 180,
    playsCount: 0,
    likesCount: 0,
    commentsCount: 0);

class ReviewStations implements StationsRepository {
  List<Station> items = [reviewStation];
  bool fail = false;
  Completer<void>? pending;
  int reads = 0;
  @override
  Future<DataBatch<Station>> readCache() async =>
      DataBatch(items: items, rejectedRecords: 0, isFromCache: true);
  @override
  Future<DataBatch<Station>> refresh() async {
    reads++;
    await pending?.future;
    if (fail) throw Exception('offline');
    return DataBatch(items: items, rejectedRecords: 0, isFromCache: false);
  }
}

class ReviewContent implements StationContentRepository {
  List<StationProgram> programs = [reviewProgram];
  List<Episode> episodes = [reviewEpisode];
  @override
  Future<StationContentBatch> readCache(String stationId) => refresh(stationId);
  @override
  Future<StationContentBatch> refresh(String stationId) async =>
      StationContentBatch(
          programs: programs,
          episodes: episodes,
          rejectedRecords: 0,
          isFromCache: false);
}

class ReviewAudio implements AudioPlaybackRepository {
  int plays = 0;
  @override
  Stream<AudioPlaybackPhase> get phaseChanges => const Stream.empty();
  @override
  Future<void> load(AudioPlaybackItem item) async {}
  @override
  Future<void> play() async {
    plays++;
  }

  @override
  Future<void> pause() async {}
  @override
  Future<void> stop() async {}
}

class ReviewHome extends HomeController {
  ReviewHome(super.stations, super.banners, super.locations, super.user,
      super.preferences);
  void show(HomeState value) {
    state = value;
  }
}

class ReviewHarness {
  final accounts = FakeAccountRepository();
  final subscriptions = FakeSubscriptions();
  final stations = ReviewStations();
  final content = ReviewContent();
  final audio = ReviewAudio();
  late final home =
      ReviewHome(stations, Banners(), Locations(), User(), Preferences());
  Widget app(Widget child, {String language = 'ar', double scale = 1}) =>
      ProviderScope(
          overrides: [
            accountRepositoryProvider.overrideWithValue(accounts),
            stationSubscriptionsRepositoryProvider
                .overrideWithValue(subscriptions),
            stationsRepositoryProvider.overrideWithValue(stations),
            stationContentRepositoryProvider.overrideWithValue(content),
            audioPlaybackRepositoryProvider.overrideWithValue(audio),
            favoritesRepositoryProvider
                .overrideWithValue(FakeFavoritesRepository()),
            homeControllerProvider.overrideWith((ref) => home)
          ],
          child: MaterialApp(
              theme: AppTheme.light(),
              locale: Locale(language),
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(scale),
                      disableAnimations: true),
                  child: child!),
              home: child));
}
