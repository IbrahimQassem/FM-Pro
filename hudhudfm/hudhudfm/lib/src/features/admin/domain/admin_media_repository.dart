import 'dart:typed_data';

enum AdminMediaKind { radioLogo, programProfile, episodeProfile }

class AdminMediaUpload {
  const AdminMediaUpload({
    required this.parentId,
    required this.fileName,
    required this.bytes,
    required this.contentType,
    required this.kind,
  });

  final String parentId;
  final String fileName;
  final Uint8List bytes;
  final String contentType;
  final AdminMediaKind kind;
}

class UploadedAdminMedia {
  const UploadedAdminMedia({required this.path, required this.downloadUrl});

  final String path;
  final String downloadUrl;
}

abstract class AdminMediaRepository {
  Future<UploadedAdminMedia> upload(AdminMediaUpload upload);
}
