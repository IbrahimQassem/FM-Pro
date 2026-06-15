import '../../episodes/domain/episode.dart';
import '../../programs/domain/radio_program.dart';
import '../../radio/domain/radio_info.dart';

abstract class AdminContentRepository {
  Future<void> saveRadio(RadioInfo radio);

  Future<void> saveProgram(RadioProgram program);

  Future<void> saveEpisode(Episode episode);

  Future<void> deleteRadio(String radioId);

  Future<void> deleteProgram({
    required String radioId,
    required String programId,
  });

  Future<void> deleteEpisode({
    required String radioId,
    required String episodeId,
  });
}
