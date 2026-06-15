import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/features/admin/data/in_memory_admin_content_repository.dart';
import 'package:hudhudfm/src/features/admin/domain/admin_content_service.dart';
import 'package:hudhudfm/src/features/admin/domain/admin_role.dart';
import 'package:hudhudfm/src/features/episodes/domain/episode.dart';

void main() {
  test('blocks content writes for non-admin roles', () async {
    final service = GuardedAdminContentService(
      role: const AdminRole(userId: 'user-1', role: UserRole.user),
      repository: InMemoryAdminContentRepository(),
    );

    expect(
      () => service.saveEpisode(_episode(episodeId: 'episode-1')),
      throwsA(isA<UnauthorizedAdminAction>()),
    );
  });

  test('preserves episode id when admin saves episode edits', () async {
    final repository = InMemoryAdminContentRepository();
    final service = GuardedAdminContentService(
      role: const AdminRole(userId: 'admin-1', role: UserRole.superAdmin),
      repository: repository,
    );

    await service.saveEpisode(_episode(episodeId: 'episode-1'));
    await service.saveEpisode(_episode(episodeId: 'episode-1', name: 'معدل'));

    expect(repository.episodes, hasLength(1));
    expect(repository.episodes['episode-1']?.episodeId, 'episode-1');
    expect(repository.episodes['episode-1']?.name, 'معدل');
  });
}

Episode _episode({required String episodeId, String name = 'حلقة'}) {
  return Episode(
    episodeId: episodeId,
    programId: 'program-1',
    radioId: 'radio-1',
    name: name,
    description: 'وصف',
    announcer: 'مذيع',
    profileUrl: '',
    streamUrl: 'https://example.com/episode.mp3',
    programName: 'برنامج',
    disabled: false,
    schedule: const [],
  );
}
