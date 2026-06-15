import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/features/admin/data/in_memory_admin_media_repository.dart';
import 'package:hudhudfm/src/features/admin/domain/admin_media_repository.dart';

void main() {
  group('InMemoryAdminMediaRepository', () {
    test('stores media using the legacy Firebase Storage path shape', () async {
      final repository = InMemoryAdminMediaRepository();
      final bytes = Uint8List.fromList([1, 2, 3]);

      final uploaded = await repository.upload(
        AdminMediaUpload(
          parentId: 'sanaa-fm',
          fileName: 'logo.jpg',
          bytes: bytes,
          contentType: 'image/jpeg',
          kind: AdminMediaKind.radioLogo,
        ),
      );

      expect(uploaded.path, 'HudHudFmGooglePlay_Folder/sanaa-fm/logo.jpg');
      expect(
        uploaded.downloadUrl,
        'memory://HudHudFmGooglePlay_Folder/sanaa-fm/logo.jpg',
      );
      expect(repository.uploads, contains(uploaded.path));
      expect(repository.uploads[uploaded.path]!.bytes, bytes);
    });
  });
}
