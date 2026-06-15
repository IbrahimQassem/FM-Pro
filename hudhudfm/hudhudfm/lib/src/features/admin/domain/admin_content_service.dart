import '../../episodes/domain/episode.dart';
import '../../programs/domain/radio_program.dart';
import '../../radio/domain/radio_info.dart';
import 'admin_content_repository.dart';
import 'admin_role.dart';

class UnauthorizedAdminAction implements Exception {
  const UnauthorizedAdminAction(this.action);

  final String action;

  @override
  String toString() => 'UnauthorizedAdminAction: $action';
}

class GuardedAdminContentService {
  const GuardedAdminContentService({
    required AdminRole role,
    required AdminContentRepository repository,
  }) : _role = role,
       _repository = repository;

  final AdminRole _role;
  final AdminContentRepository _repository;

  Future<void> saveRadio(RadioInfo radio) {
    _ensureCanManage('saveRadio');
    return _repository.saveRadio(radio);
  }

  Future<void> saveProgram(RadioProgram program) {
    _ensureCanManage('saveProgram');
    return _repository.saveProgram(program);
  }

  Future<void> saveEpisode(Episode episode) {
    _ensureCanManage('saveEpisode');
    return _repository.saveEpisode(episode);
  }

  Future<void> deleteRadio(String radioId) {
    _ensureCanManage('deleteRadio');
    return _repository.deleteRadio(radioId);
  }

  Future<void> deleteProgram({
    required String radioId,
    required String programId,
  }) {
    _ensureCanManage('deleteProgram');
    return _repository.deleteProgram(radioId: radioId, programId: programId);
  }

  Future<void> deleteEpisode({
    required String radioId,
    required String episodeId,
  }) {
    _ensureCanManage('deleteEpisode');
    return _repository.deleteEpisode(radioId: radioId, episodeId: episodeId);
  }

  void _ensureCanManage(String action) {
    if (!_role.canManageContent) {
      throw UnauthorizedAdminAction(action);
    }
  }
}
