import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:image_picker/image_picker.dart';

import '../../domain/services/profile_image_picker.dart';

class DeviceProfileImagePicker implements ProfileImagePicker {
  DeviceProfileImagePicker({ImagePicker? picker})
      : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<Uint8List?> pick(ProfileImageSource source) async {
    try {
      final file = await _picker.pickImage(
        source: source == ProfileImageSource.camera
            ? ImageSource.camera
            : ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
        requestFullMetadata: false,
      );
      if (file == null) return null;
      if (await file.length() > 4 * 1024 * 1024) {
        throw const ProfileImageException(tooLarge: true);
      }
      final bytes = await file.readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes);
      try {
        final frame = await codec.getNextFrame();
        try {
          final data =
              await frame.image.toByteData(format: ui.ImageByteFormat.png);
          if (data == null) throw const ProfileImageException();
          if (data.lengthInBytes > 1024 * 1024) {
            throw const ProfileImageException(tooLarge: true);
          }
          return data.buffer
              .asUint8List(data.offsetInBytes, data.lengthInBytes);
        } finally {
          frame.image.dispose();
        }
      } finally {
        codec.dispose();
      }
    } on ProfileImageException {
      rethrow;
    } catch (_) {
      throw const ProfileImageException();
    }
  }
}
