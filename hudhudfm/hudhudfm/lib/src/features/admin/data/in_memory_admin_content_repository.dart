import '../../episodes/domain/episode.dart';
import '../../programs/domain/radio_program.dart';
import '../../radio/domain/radio_info.dart';
import '../domain/admin_content_repository.dart';

class InMemoryAdminContentRepository implements AdminContentRepository {
  final Map<String, RadioInfo> radios = {};
  final Map<String, RadioProgram> programs = {};
  final Map<String, Episode> episodes = {};

  @override
  Future<void> saveRadio(RadioInfo radio) async {
    radios[radio.radioId] = radio;
  }

  @override
  Future<void> saveProgram(RadioProgram program) async {
    programs[program.programId] = program;
  }

  @override
  Future<void> saveEpisode(Episode episode) async {
    episodes[episode.episodeId] = episode;
  }

  @override
  Future<void> deleteRadio(String radioId) async {
    radios.remove(radioId);
  }

  @override
  Future<void> deleteProgram({
    required String radioId,
    required String programId,
  }) async {
    programs.remove(programId);
  }

  @override
  Future<void> deleteEpisode({
    required String radioId,
    required String episodeId,
  }) async {
    episodes.remove(episodeId);
  }
}
