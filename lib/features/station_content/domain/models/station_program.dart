import 'program_schedule.dart';

class StationProgram {
  const StationProgram({
    required this.id,
    required this.stationId,
    required this.title,
    required this.priority,
    required this.isActive,
    required this.isFeatured,
    required this.schedule,
    required this.episodesCount,
    required this.subscribersCount,
    required this.totalPlays,
    this.titleEn = '',
    this.description = '',
    this.coverUrl = '',
    this.thumbnailUrl = '',
    this.categories = const [],
    this.presenters = const [],
  });

  final String id;
  final String stationId;
  final String title;
  final String titleEn;
  final String description;
  final String coverUrl;
  final String thumbnailUrl;
  final List<String> categories;
  final List<String> presenters;
  final int priority;
  final bool isActive;
  final bool isFeatured;
  final ProgramSchedule? schedule;
  final int episodesCount;
  final int subscribersCount;
  final int totalPlays;
}
