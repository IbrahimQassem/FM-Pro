import 'package:hudhud_fm/features/station_content/domain/models/content_page.dart';
import 'package:hudhud_fm/features/station_content/domain/models/episode.dart';
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_content_batch.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_program.dart';
import 'package:hudhud_fm/features/station_content/domain/repositories/station_content_repository.dart';
import 'package:hudhud_fm/features/station_content/presentation/controllers/station_content_controller.dart';
import 'package:hudhud_fm/features/station_content/presentation/controllers/station_content_state.dart';

void main() {
  test(
      'failed refresh retains visible content without restoring obsolete cursors and retry recovers',
      () async {
    final repo = _RefreshPagingRepository();
    final controller =
        StationContentController('sanaa-radio', repo, deferInitialLoad: true);
    StationContentBatch batch(String id) => StationContentBatch(
        programs: const [],
        episodes: [_episode(id, 'p')],
        rejectedRecords: 0,
        isFromCache: false,
        selectedProgramId: 'p',
        episodePage:
            ContentPage(items: [_episode(id, 'p')], nextCursor: _cursor('p')));
    final first = controller.refresh();
    repo.requests.single.complete(batch('old'));
    await first;
    final failed = controller.refresh();
    repo.requests.last.completeError(Exception('synthetic failure'));
    await failed;
    expect(controller.state.episodes.single.id, 'old');
    expect(controller.state.episodeCursor, null);
    expect(controller.state.programCursor, null);
    await controller.loadMoreEpisodes();
    expect(repo.episodeCalls, 0);
    final retry = controller.refresh();
    repo.requests.last.complete(batch('fresh'));
    await retry;
    expect(controller.state.episodes.single.id, 'fresh');
    expect(controller.state.episodeCursor, isNotNull);
    expect(controller.state.isOffline, false);
    controller.dispose();
  });

  for (final episode in [false, true]) {
    test(
        'pending refresh blocks old ${episode ? 'episode' : 'program'} cursor before IO and ignores old completion',
        () async {
      final repo = _RefreshPagingRepository();
      final controller =
          StationContentController('sanaa-radio', repo, deferInitialLoad: true);
      StationContentBatch batch(String id) => StationContentBatch(
          programs: const [],
          episodes: [_episode(id, 'p')],
          rejectedRecords: 0,
          isFromCache: false,
          selectedProgramId: 'p',
          programPage: ContentPage(
              items: const [],
              nextCursor: ContentCursor(
                  root: 'HudHudDev',
                  resource: 'programs',
                  stationId: 'sanaa-radio',
                  values: [false, 0, 'title', 'old']
                      .map(ContentSortValue.scalar)
                      .toList())),
          episodePage: ContentPage(
              items: [_episode(id, 'p')], nextCursor: _cursor('p')));
      final initial = controller.refresh();
      repo.requests.single.complete(batch('old'));
      await initial;
      final stale = episode
          ? controller.loadMoreEpisodes()
          : controller.loadMorePrograms();
      final refresh = controller.refresh();
      final obsolete = episode
          ? controller.loadMoreEpisodes()
          : controller.loadMorePrograms();
      final calls = episode ? repo.episodeCalls : repo.programCalls;
      repo.requests.last.complete(batch('fresh'));
      await refresh;
      for (final page in repo.programPages) {
        page.complete(ContentPage(items: const []));
      }
      for (final page in repo.episodePages) {
        page.complete(ContentPage(items: [_episode('stale', 'p')]));
      }
      await stale;
      await obsolete;
      expect(calls, 1,
          reason:
              'Only the request begun before refresh may exist; no old-cursor IO while pending');
      expect(controller.state.episodes.single.id, 'fresh');
      controller.dispose();
    });
  }

  test('resolved direct-target controller starts no implicit page or cache IO',
      () async {
    final repo = _PagingRepository();
    final controller = StationContentController('sanaa-radio', repo,
        programId: 'p', deferInitialLoad: true);
    await pumpEventQueue();
    expect(repo.pages, isEmpty);
    expect(controller.state.isInitialLoading, false);
    final requested = controller.refresh();
    expect(repo.pages.length, 1);
    repo.pages.single
        .complete(ContentPage(items: [_episode('requested', 'p')]));
    await requested;
    expect(controller.state.hasLoadedEpisodePage, true);
    controller.dispose();
  });

  test(
      'program-scoped cache stays visible through failed refresh and explicit retry',
      () async {
    final repo = _ProgramCacheRepository();
    final controller =
        StationContentController('sanaa-radio', repo, programId: 'p');
    repo.cachePage.complete(ContentPage(
        items: [_episode('cached', 'p')],
        nextCursor: _cursor('p'),
        isFromCache: true));
    await pumpEventQueue();
    expect(controller.state.episodes.single.id, 'cached');
    expect(controller.state.isOffline, true);
    expect(controller.state.episodeCursor, null);
    repo.pages.single.completeError(Exception('synthetic offline'));
    await pumpEventQueue();
    expect(controller.state.episodes.single.id, 'cached');
    expect(controller.state.episodePageFailed, true);
    final retry = controller.refresh();
    repo.pages.last.complete(ContentPage(items: [_episode('server', 'p')]));
    await retry;
    expect(controller.state.episodes.single.id, 'server');
    expect(controller.state.isOffline, false);
    controller.dispose();
  });
  test('late program cache cannot replace explicit server refresh', () async {
    final repo = _ProgramCacheRepository();
    final controller =
        StationContentController('sanaa-radio', repo, programId: 'p');
    final refresh = controller.refresh();
    repo.pages.single.complete(ContentPage(items: [_episode('server', 'p')]));
    await refresh;
    repo.cachePage.complete(
        ContentPage(items: [_episode('late-cache', 'p')], isFromCache: true));
    await pumpEventQueue();
    expect(controller.state.episodes.single.id, 'server');
    expect(repo.pages.length, 1);
    controller.dispose();
  });
  test('program change discards delayed episode result and duplicate load-more',
      () async {
    final repo = _PagingRepository();
    final controller = StationContentController('sanaa-radio', repo);
    await pumpEventQueue();
    final first = controller.selectProgram('first');
    final second = controller.selectProgram('second');
    repo.pages[1].complete(ContentPage(
        items: [_episode('new', 'second')], nextCursor: _cursor('second')));
    await second;
    repo.pages[0].complete(ContentPage(items: [_episode('stale', 'first')]));
    await first;
    expect(controller.state.episodes.single.id, 'new');
    final next = controller.loadMoreEpisodes();
    await controller.loadMoreEpisodes();
    expect(repo.pages.length, 3);
    repo.pages.last.complete(ContentPage(
        items: [_episode('new', 'second'), _episode('next', 'second')]));
    await next;
    expect(controller.state.episodes.map((e) => e.id), ['new', 'next']);
    expect(controller.state.episodeCursor, null);
    controller.dispose();
  });
  test('later-page failure preserves data and cursor for retry', () async {
    final repo = _PagingRepository();
    final controller = StationContentController('sanaa-radio', repo);
    await pumpEventQueue();
    final select = controller.selectProgram('p');
    repo.pages.single.complete(
        ContentPage(items: [_episode('a', 'p')], nextCursor: _cursor('p')));
    await select;
    final next = controller.loadMoreEpisodes();
    repo.pages.last.completeError(Exception('synthetic'));
    await next;
    expect(controller.state.episodes.single.id, 'a');
    expect(controller.state.episodePageFailed, true);
    expect(controller.state.episodeCursor, isNotNull);
    final retry = controller.loadMoreEpisodes();
    repo.pages.last.complete(ContentPage(items: [_episode('b', 'p')]));
    await retry;
    expect(controller.state.episodes.map((e) => e.id), ['a', 'b']);
    expect(controller.state.episodePageFailed, false);
    controller.dispose();
  });
  test(
      'bounded episode window never retains more than100 and refresh invalidates pending next page',
      () async {
    final repo = _PagingRepository();
    final controller = StationContentController('sanaa-radio', repo);
    await pumpEventQueue();
    final select = controller.selectProgram('p');
    repo.pages.single.complete(ContentPage(
        items: [for (var i = 0; i < 50; i++) _episode('e$i', 'p')],
        nextCursor: _cursor('p')));
    await select;
    for (var page = 1; page < 3; page++) {
      final load = controller.loadMoreEpisodes();
      repo.pages.last.complete(ContentPage(items: [
        for (var i = page * 50; i < (page + 1) * 50; i++) _episode('e$i', 'p')
      ], nextCursor: _cursor('p')));
      await load;
    }
    expect(controller.state.episodes.length, 100);
    expect(controller.state.episodes.first.id, 'e50');
    final load = controller.loadMoreEpisodes();
    await controller.refresh();
    repo.pages.last.complete(ContentPage(items: [_episode('stale', 'p')]));
    await load;
    expect(controller.state.episodes, isEmpty);
    controller.dispose();
  });
  test('disposal suppresses pending program-page completion', () async {
    final repo = _PagingRepository();
    final controller = StationContentController('sanaa-radio', repo);
    await pumpEventQueue();
    final select = controller.selectProgram('p');
    controller.dispose();
    repo.pages.single.complete(ContentPage(items: [_episode('late', 'p')]));
    await select;
  });
  test('late cache cannot replace an explicit server refresh', () async {
    final repository = _DelayedRepository();
    final controller = StationContentController('sanaa-radio', repository);
    final refresh = controller.refresh();
    repository.requests.single.complete(_batch(const [_program]));
    await refresh;
    repository.cache.complete(_batch(const []));
    await pumpEventQueue();
    expect(repository.requests, hasLength(1));
    expect(controller.state.programs, [_program]);
    expect(controller.state.isOffline, isFalse);
    controller.dispose();
  });

  test('newer refresh wins over older success and failure', () async {
    final repository = _DelayedRepository();
    final controller = StationContentController('sanaa-radio', repository);
    repository.cache.complete(_batch(const []));
    await pumpEventQueue();
    final latest = controller.refresh();
    repository.requests.last.complete(_batch(const [_program]));
    await latest;
    repository.requests.first.completeError(Exception('stale'));
    await pumpEventQueue();
    expect(controller.state.programs, [_program]);
    expect(controller.state.isOffline, isFalse);
    final older = controller.refresh();
    final newer = controller.refresh();
    repository.requests.last.complete(_batch(const []));
    await newer;
    repository.requests[2].complete(_batch(const [_program]));
    await older;
    expect(controller.state.programs, isEmpty);
    controller.dispose();
  });

  test('disposal during cache read starts no server request', () async {
    final repository = _DelayedRepository();
    final controller = StationContentController('sanaa-radio', repository);
    controller.dispose();
    repository.cache.complete(_batch(const [_program]));
    await pumpEventQueue();
    expect(repository.requests, isEmpty);
  });

  test('publishes refreshed station content', () async {
    final repository = _FakeStationContentRepository();
    final controller = StationContentController('sanaa-radio', repository);
    await pumpEventQueue();

    expect(controller.state.programs, [_program]);
    expect(controller.state.isInitialLoading, isFalse);
    expect(controller.state.isOffline, isFalse);
    expect(controller.state.failure, StationContentFailure.none);
    controller.selectWeekday(DateTime.sunday);
    expect(controller.state.selectedWeekday, DateTime.sunday);
    controller.dispose();
  });

  test('shows cached content as offline when refresh fails', () async {
    final repository = _FakeStationContentRepository(
      cachePrograms: const [_program],
      shouldFailRefresh: true,
    );
    final controller = StationContentController('sanaa-radio', repository);
    await pumpEventQueue();

    expect(controller.state.programs, [_program]);
    expect(controller.state.isOffline, isTrue);
    expect(controller.state.failure, StationContentFailure.none);
    controller.dispose();
  });

  test('exposes a recoverable failure without cache', () async {
    final repository = _FakeStationContentRepository(shouldFailRefresh: true);
    final controller = StationContentController('sanaa-radio', repository);
    await pumpEventQueue();

    expect(controller.state.failure, StationContentFailure.load);
    expect(controller.state.isInitialLoading, isFalse);
    controller.dispose();
  });
}

class _FakeStationContentRepository implements StationContentRepository {
  @override
  Future<ContentPage<StationProgram>> readProgramsPage(String stationId,
          {ContentCursor? cursor, bool fromCache = false}) async =>
      ContentPage(
          items: (await refresh(stationId)).programs, isFromCache: fromCache);
  @override
  Future<ContentPage<Episode>> readEpisodesPage(
          String stationId, String programId,
          {ContentCursor? cursor, bool fromCache = false}) async =>
      ContentPage(
          items: (await refresh(stationId))
              .episodes
              .where((e) => e.programId == programId)
              .toList(),
          isFromCache: fromCache);
  @override
  Future<ResolvedEpisode?> resolveEpisode(
          String stationId, String programId, String episodeId) async =>
      null;

  _FakeStationContentRepository({
    this.cachePrograms = const [],
    this.shouldFailRefresh = false,
  });

  final List<StationProgram> cachePrograms;
  final bool shouldFailRefresh;

  @override
  Future<StationContentBatch> readCache(String stationId) async {
    return StationContentBatch(
      programs: cachePrograms,
      episodes: const [],
      rejectedRecords: 0,
      isFromCache: true,
    );
  }

  @override
  Future<StationContentBatch> refresh(String stationId) async {
    if (shouldFailRefresh) throw const FormatException('test failure');
    return const StationContentBatch(
      programs: [_program],
      episodes: [],
      rejectedRecords: 0,
      isFromCache: false,
    );
  }
}

const _program = StationProgram(
  id: 'morning',
  stationId: 'sanaa-radio',
  title: 'صباح اليمن',
  priority: 10,
  isActive: true,
  isFeatured: false,
  schedule: ProgramSchedule(
    weekdays: [DateTime.saturday],
    startMinute: 480,
    endMinute: 600,
    utcOffsetMinutes: 180,
  ),
  episodesCount: 1,
  subscribersCount: 2,
  totalPlays: 3,
);

StationContentBatch _batch(List<StationProgram> programs) =>
    StationContentBatch(
        programs: programs,
        episodes: const [],
        rejectedRecords: 0,
        isFromCache: false);

class _DelayedRepository implements StationContentRepository {
  @override
  Future<ContentPage<StationProgram>> readProgramsPage(String stationId,
          {ContentCursor? cursor, bool fromCache = false}) async =>
      ContentPage(
          items: (await refresh(stationId)).programs, isFromCache: fromCache);
  @override
  Future<ContentPage<Episode>> readEpisodesPage(
          String stationId, String programId,
          {ContentCursor? cursor, bool fromCache = false}) async =>
      ContentPage(
          items: (await refresh(stationId))
              .episodes
              .where((e) => e.programId == programId)
              .toList(),
          isFromCache: fromCache);
  @override
  Future<ResolvedEpisode?> resolveEpisode(
          String stationId, String programId, String episodeId) async =>
      null;

  final cache = Completer<StationContentBatch>();
  final requests = <Completer<StationContentBatch>>[];
  @override
  Future<StationContentBatch> readCache(String stationId) => cache.future;
  @override
  Future<StationContentBatch> refresh(String stationId) {
    final request = Completer<StationContentBatch>();
    requests.add(request);
    return request.future;
  }
}

ContentCursor _cursor(String program) => ContentCursor(
        root: 'HudHudDev',
        resource: 'episodes',
        stationId: 'sanaa-radio',
        programId: program,
        values: [
          ContentSortValue.timestamp(1800000000, 0),
          ContentSortValue.scalar(0),
          ContentSortValue.scalar('e')
        ]);
Episode _episode(String id, String program) => Episode(
    id: id,
    programId: program,
    stationId: 'sanaa-radio',
    title: id,
    audioUrl: 'https://example.test/audio',
    durationSeconds: 60,
    priority: 0,
    isPublished: true,
    isFeatured: false,
    broadcastAt: DateTime.utc(2026),
    utcOffsetMinutes: 180,
    playsCount: 0,
    likesCount: 0,
    commentsCount: 0);

class _PagingRepository extends _FakeStationContentRepository {
  final pages = <Completer<ContentPage<Episode>>>[];
  @override
  Future<ContentPage<Episode>> readEpisodesPage(
      String stationId, String programId,
      {ContentCursor? cursor, bool fromCache = false}) {
    final page = Completer<ContentPage<Episode>>();
    pages.add(page);
    return page.future;
  }
}

class _ProgramCacheRepository extends _PagingRepository {
  final cachePage = Completer<ContentPage<Episode>>();
  @override
  Future<ContentPage<Episode>> readEpisodesPage(
          String stationId, String programId,
          {ContentCursor? cursor, bool fromCache = false}) =>
      fromCache
          ? cachePage.future
          : super.readEpisodesPage(stationId, programId, cursor: cursor);
}

class _RefreshPagingRepository extends _FakeStationContentRepository {
  final requests = <Completer<StationContentBatch>>[];
  final programPages = <Completer<ContentPage<StationProgram>>>[];
  final episodePages = <Completer<ContentPage<Episode>>>[];
  int get programCalls => programPages.length;
  int get episodeCalls => episodePages.length;
  @override
  Future<StationContentBatch> refresh(String stationId) {
    final c = Completer<StationContentBatch>();
    requests.add(c);
    return c.future;
  }

  @override
  Future<ContentPage<StationProgram>> readProgramsPage(String stationId,
      {ContentCursor? cursor, bool fromCache = false}) {
    final c = Completer<ContentPage<StationProgram>>();
    programPages.add(c);
    return c.future;
  }

  @override
  Future<ContentPage<Episode>> readEpisodesPage(
      String stationId, String programId,
      {ContentCursor? cursor, bool fromCache = false}) {
    final c = Completer<ContentPage<Episode>>();
    episodePages.add(c);
    return c.future;
  }
}
