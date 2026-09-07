import 'dart:typed_data';

enum ProfileImageSource { camera, gallery }

abstract interface class ProfileImagePicker {
  Future<Uint8List?> pick(ProfileImageSource source);
}

class ProfileImageException implements Exception {
  const ProfileImageException({this.tooLarge = false});
  final bool tooLarge;
}
