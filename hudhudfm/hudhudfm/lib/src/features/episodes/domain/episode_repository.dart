import 'episode.dart';

abstract class EpisodeRepository {
  Future<List<Episode>> fetchEpisodes(String radioId);
}
