import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_content_batch.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_program.dart';
import 'package:hudhud_fm/features/station_content/domain/repositories/station_content_repository.dart';
import 'package:hudhud_fm/features/station_content/presentation/controllers/station_content_controller.dart';
import 'package:hudhud_fm/features/station_content/presentation/controllers/station_content_state.dart';

void main() {
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
