import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/station_content/domain/models/program_schedule.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_content_batch.dart';
import 'package:hudhud_fm/features/station_content/domain/models/station_program.dart';
import 'package:hudhud_fm/features/station_content/domain/repositories/station_content_repository.dart';
import 'package:hudhud_fm/features/station_content/presentation/controllers/station_content_controller.dart';
import 'package:hudhud_fm/features/station_content/presentation/controllers/station_content_state.dart';

void main() {
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
