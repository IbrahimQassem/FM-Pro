import '../domain/date_time_model.dart';
import '../domain/episode.dart';
import '../domain/episode_repository.dart';

class InMemoryEpisodeRepository implements EpisodeRepository {
  @override
  Future<List<Episode>> fetchEpisodes(String radioId) async {
    return _episodes
        .where((episode) => episode.radioId == radioId && episode.isVisible)
        .toList(growable: false);
  }

  static const _episodes = [
    Episode(
      episodeId: 'morning-sanaa-1',
      programId: 'morning-sanaa',
      radioId: 'sanaa-fm',
      name: 'بداية اليوم',
      description: 'حلقة تجريبية لواجهة الحلقات وجدول البث.',
      announcer: 'فريق هدهد',
      profileUrl: '',
      streamUrl: 'https://example.com/episode.mp3',
      programName: 'صباح هدهد',
      disabled: false,
      schedule: [
        DateTimeModel(
          dateStart: '',
          dateEnd: '',
          timeStart: '08:00',
          timeEnd: '09:00',
          weekdays: ['SATURDAY', 'SUNDAY'],
          asMainTime: true,
        ),
      ],
    ),
    Episode(
      episodeId: 'news-sanaa-1',
      programId: 'news-sanaa',
      radioId: 'sanaa-fm',
      name: 'ملخص الأخبار',
      description: 'حلقة تجريبية مرتبطة ببرنامج الأخبار.',
      announcer: 'غرفة الأخبار',
      profileUrl: '',
      streamUrl: 'https://example.com/news.mp3',
      programName: 'نشرة الأخبار',
      disabled: false,
      schedule: [],
    ),
  ];
}
