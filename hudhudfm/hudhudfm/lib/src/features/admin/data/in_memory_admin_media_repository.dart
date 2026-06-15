import '../../../core/constants/firebase_paths.dart';
import '../domain/admin_media_repository.dart';

class InMemoryAdminMediaRepository implements AdminMediaRepository {
  final uploads = <String, AdminMediaUpload>{};

  @override
  Future<UploadedAdminMedia> upload(AdminMediaUpload upload) async {
    final path = FirebasePaths.mediaObjectPath(
      parentId: upload.parentId,
      fileName: upload.fileName,
    );
    uploads[path] = upload;

    return UploadedAdminMedia(path: path, downloadUrl: 'memory://$path');
  }
}
