import 'dart:typed_data';
import '../../domain/services/profile_image_picker.dart';
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "../../../../core/config/profile_avatar.dart";

import "../../../../app/providers.dart";
import "../../../../core/widgets/mascot_avatar.dart";
import "../../../../l10n/generated/app_localizations.dart";
import "../../domain/models/account_user.dart";

class EditProfileBottomSheet extends ConsumerStatefulWidget {
  const EditProfileBottomSheet({
    required this.user,
    super.key,
  });

  final AccountUser user;

  static Future<void> show(BuildContext context, AccountUser user) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => EditProfileBottomSheet(user: user),
    );
  }

  @override
  ConsumerState<EditProfileBottomSheet> createState() =>
      _EditProfileBottomSheetState();
}

class _EditProfileBottomSheetState
    extends ConsumerState<EditProfileBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late String? _selectedPhotoUrl;
  bool _isSaving = false;
  bool _isPicking = false;
  Uint8List? _photoBytes;

  static const _mascotAvatars = ProfileAvatar.assets;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.user.displayName);
    _selectedPhotoUrl = ProfileAvatar.sanitize(widget.user.photoUrl);
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _pick(ProfileImageSource source) async {
    if (_isPicking || _isSaving) return;
    setState(() => _isPicking = true);
    try {
      final bytes = await ref.read(profileImagePickerProvider).pick(source);
      if (mounted && bytes != null) {
        setState(() {
          _photoBytes = bytes;
          _selectedPhotoUrl = null;
        });
      }
    } on ProfileImageException catch (error) {
      if (mounted) {
        final strings = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(error.tooLarge
                ? strings.profileImageTooLarge
                : strings.profileImagePickFailed)));
      }
    } finally {
      if (mounted) setState(() => _isPicking = false);
    }
  }

  Future<void> _save() async {
    if (_isSaving || _isPicking || !_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    final success =
        await ref.read(accountControllerProvider.notifier).updateProfile(
              displayName: _nameController.text.trim(),
              photoUrl: _selectedPhotoUrl,
              photoBytes: _photoBytes,
            );

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        final strings = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(strings.profileUpdated)),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(AppLocalizations.of(context).profileUpdateFailed)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: bottomInset + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: colors.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                strings.editProfile,
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: _photoBytes == null
                    ? MascotAvatar(imageUrl: _selectedPhotoUrl, radius: 44)
                    : ClipOval(
                        child: Image.memory(_photoBytes!,
                            width: 88,
                            height: 88,
                            fit: BoxFit.cover,
                            semanticLabel: strings.profileImage)),
              ),
              const SizedBox(height: 16),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                children: [
                  OutlinedButton.icon(
                      onPressed: _isSaving || _isPicking
                          ? null
                          : () => _pick(ProfileImageSource.camera),
                      icon: const Icon(Icons.photo_camera_outlined),
                      label: Text(strings.takeProfilePhoto)),
                  OutlinedButton.icon(
                      onPressed: _isSaving || _isPicking
                          ? null
                          : () => _pick(ProfileImageSource.gallery),
                      icon: const Icon(Icons.photo_library_outlined),
                      label: Text(strings.chooseProfilePhoto)),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                strings.chooseMascotAvatar,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: colors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 64,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _mascotAvatars.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final asset = _mascotAvatars[index];
                    final isSelected = _selectedPhotoUrl == asset;
                    return InkWell(
                      key: Key('mascot-avatar-$index'),
                      onTap: _isSaving || _isPicking
                          ? null
                          : () => setState(() {
                                _selectedPhotoUrl = asset;
                                _photoBytes = null;
                              }),
                      borderRadius: BorderRadius.circular(32),
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected
                                ? colors.primary
                                : Colors.transparent,
                            width: 2.5,
                          ),
                        ),
                        child: MascotAvatar(
                          imageUrl: asset,
                          radius: 28,
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),
              TextFormField(
                key: const Key('edit-display-name'),
                controller: _nameController,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _save(),
                decoration: InputDecoration(
                  labelText: strings.displayName,
                  prefixIcon: const Icon(Icons.person_outline_rounded),
                ),
                validator: (value) => (value?.trim().length ?? 0) >= 2
                    ? null
                    : strings.displayNameValidation,
              ),
              const SizedBox(height: 24),
              FilledButton(
                key: const Key('save-profile-button'),
                onPressed: _isSaving || _isPicking ? null : _save,
                child: _isSaving
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(strings.saveChanges),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
