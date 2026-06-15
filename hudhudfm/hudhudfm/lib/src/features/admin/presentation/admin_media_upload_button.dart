import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../domain/admin_media_repository.dart';

class AdminMediaUploadButton extends StatefulWidget {
  const AdminMediaUploadButton({
    super.key,
    required this.label,
    required this.kind,
    required this.repository,
    required this.urlController,
    required this.parentIdResolver,
  });

  final String label;
  final AdminMediaKind kind;
  final AdminMediaRepository repository;
  final TextEditingController urlController;
  final String Function() parentIdResolver;

  @override
  State<AdminMediaUploadButton> createState() => _AdminMediaUploadButtonState();
}

class _AdminMediaUploadButtonState extends State<AdminMediaUploadButton> {
  final ImagePicker _imagePicker = ImagePicker();

  bool _isUploading = false;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: OutlinedButton.icon(
        onPressed: _isUploading ? null : _uploadImage,
        icon: _isUploading
            ? const SizedBox.square(
                dimension: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.cloud_upload_outlined),
        label: Text(widget.label),
      ),
    );
  }

  Future<void> _uploadImage() async {
    final parentId = widget.parentIdResolver().trim();
    if (parentId.isEmpty) {
      _showMessage('أدخل المعرف قبل رفع الصورة');
      return;
    }

    final pickedImage = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    if (pickedImage == null) {
      return;
    }

    setState(() => _isUploading = true);
    try {
      final bytes = await pickedImage.readAsBytes();
      final fileName = _safeFileName(pickedImage.name);
      final uploaded = await widget.repository.upload(
        AdminMediaUpload(
          parentId: parentId,
          fileName: fileName,
          bytes: bytes,
          contentType:
              pickedImage.mimeType ?? _contentTypeForFileName(fileName),
          kind: widget.kind,
        ),
      );
      if (!mounted) {
        return;
      }

      widget.urlController.text = uploaded.downloadUrl;
      _showMessage('تم رفع الصورة وتحديث الرابط');
    } on Object {
      if (!mounted) {
        return;
      }
      _showMessage('تعذر رفع الصورة');
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  String _safeFileName(String fileName) {
    final sanitized = fileName.trim().replaceAll(
      RegExp(r'[^A-Za-z0-9._-]'),
      '_',
    );
    if (sanitized.isNotEmpty) {
      return sanitized;
    }

    return 'image_${DateTime.now().millisecondsSinceEpoch}.jpg';
  }

  String _contentTypeForFileName(String fileName) {
    final normalized = fileName.toLowerCase();
    if (normalized.endsWith('.png')) {
      return 'image/png';
    }
    if (normalized.endsWith('.webp')) {
      return 'image/webp';
    }

    return 'image/jpeg';
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}
