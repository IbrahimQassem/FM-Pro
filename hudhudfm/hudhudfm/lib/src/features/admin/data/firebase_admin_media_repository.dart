import 'package:firebase_storage/firebase_storage.dart';

import '../../../core/constants/firebase_paths.dart';
import '../domain/admin_media_repository.dart';

class FirebaseAdminMediaRepository implements AdminMediaRepository {
  FirebaseAdminMediaRepository({
    required FirebaseStorage storage,
    this.baseDocument = FirebasePaths.defaultBaseDocument,
  }) : _storage = storage;

  final FirebaseStorage _storage;
  final String baseDocument;

  @override
  Future<UploadedAdminMedia> upload(AdminMediaUpload upload) async {
    final path = FirebasePaths.mediaObjectPath(
      parentId: upload.parentId,
      fileName: upload.fileName,
      base: baseDocument,
    );
    final reference = _storage.ref().child(path);
    final metadata = SettableMetadata(contentType: upload.contentType);

    await reference.putData(upload.bytes, metadata);

    return UploadedAdminMedia(
      path: path,
      downloadUrl: await reference.getDownloadURL(),
    );
  }
}
