import 'package:flutter/material.dart';

import '../../bootstrap/domain/app_remote_config.dart';
import '../domain/account_controller.dart';
import '../domain/user_profile.dart';
import '../domain/user_profile_repository.dart';
import '../../auth/domain/auth_session_repository.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    required this.controller,
    required this.remoteConfig,
    required this.profileRepository,
  });

  final AccountController controller;
  final AppRemoteConfig remoteConfig;
  final UserProfileRepository profileRepository;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final _profileFormKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _mobileController = TextEditingController();
  final _photoUrlController = TextEditingController();
  final _nickNameController = TextEditingController();
  final _bioController = TextEditingController();
  final _tagController = TextEditingController();
  final _countryController = TextEditingController();
  final _cityController = TextEditingController();

  bool _isProfileLoading = false;
  bool _isProfileSaving = false;
  String? _profileError;
  String? _loadedUserId;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _mobileController.dispose();
    _photoUrlController.dispose();
    _nickNameController.dispose();
    _bioController.dispose();
    _tagController.dispose();
    _countryController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (context, _) {
        final session = widget.controller.session;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'الحساب',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    _InfoRow(
                      label: 'الحالة',
                      value: session == null
                          ? 'غير مسجل'
                          : session.isAnonymous
                          ? 'جلسة مؤقتة'
                          : 'مسجل',
                    ),
                    const SizedBox(height: 8),
                    _InfoRow(
                      label: 'المعرف',
                      value: session?.userId.isNotEmpty == true
                          ? session!.userId
                          : 'غير متاح',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildProfileSection(session?.userId),
            const SizedBox(height: 16),
            _AuthProviderSection(
              remoteConfig: widget.remoteConfig,
              isEmailBusy: widget.controller.isAuthenticating,
              onEmailPressed: _showEmailAuthDialog,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: session == null || widget.controller.isSigningOut
                  ? null
                  : widget.controller.signOut,
              icon: widget.controller.isSigningOut
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.logout),
              label: const Text('تسجيل الخروج'),
            ),
            const SizedBox(height: 12),
            _DeleteAccountButton(
              isBusy: session == null || widget.controller.isDeletingAccount,
              onDelete: _confirmAndDeleteAccount,
            ),
          ],
        );
      },
    );
  }

  Widget _buildProfileSection(String? userId) {
    final canSave =
        userId != null &&
        userId.isNotEmpty &&
        !_isProfileLoading &&
        !_isProfileSaving;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _profileFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'الملف الشخصي',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (_isProfileLoading) ...[
                const SizedBox(height: 12),
                const LinearProgressIndicator(),
              ],
              if (_profileError != null) ...[
                const SizedBox(height: 12),
                Text(
                  _profileError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 12),
              _ProfileTextField(
                controller: _nameController,
                label: 'الاسم',
                validator: _requiredValidator,
              ),
              _ProfileTextField(
                controller: _emailController,
                label: 'البريد الإلكتروني',
                keyboardType: TextInputType.emailAddress,
                validator: _emailValidator,
              ),
              _ProfileTextField(
                controller: _mobileController,
                label: 'رقم الهاتف',
                keyboardType: TextInputType.phone,
                validator: _mobileValidator,
              ),
              _ProfileTextField(
                controller: _photoUrlController,
                label: 'رابط الصورة',
                keyboardType: TextInputType.url,
                validator: _optionalUrlValidator,
              ),
              _ProfileTextField(
                controller: _nickNameController,
                label: 'الاسم المختصر',
                isRequired: false,
              ),
              _ProfileTextField(
                controller: _tagController,
                label: 'الوسم',
                isRequired: false,
              ),
              _ProfileTextField(
                controller: _countryController,
                label: 'الدولة',
                isRequired: false,
              ),
              _ProfileTextField(
                controller: _cityController,
                label: 'المدينة',
                isRequired: false,
              ),
              _ProfileTextField(
                controller: _bioController,
                label: 'نبذة',
                maxLines: 3,
                isRequired: false,
              ),
              const SizedBox(height: 4),
              FilledButton.icon(
                onPressed: canSave ? _saveProfile : null,
                icon: _isProfileSaving
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.person_outline),
                label: const Text('حفظ الملف الشخصي'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _loadProfile() async {
    final userId = widget.controller.session?.userId;
    if (userId == null || userId.isEmpty || userId == _loadedUserId) {
      return;
    }

    setState(() {
      _isProfileLoading = true;
      _profileError = null;
    });

    try {
      final profile = await widget.profileRepository.fetchProfile(userId);
      if (!mounted || widget.controller.session?.userId != userId) {
        return;
      }

      _loadedUserId = userId;
      _applyProfile(profile);
    } on Object {
      if (!mounted) {
        return;
      }
      _profileError = 'تعذر تحميل الملف الشخصي';
    } finally {
      if (mounted) {
        setState(() => _isProfileLoading = false);
      }
    }
  }

  Future<void> _saveProfile() async {
    final userId = widget.controller.session?.userId;
    if (userId == null || userId.isEmpty) {
      _showMessage('لا توجد جلسة صالحة');
      return;
    }

    if (!_profileFormKey.currentState!.validate()) {
      return;
    }

    setState(() => _isProfileSaving = true);
    try {
      await widget.profileRepository.saveProfile(_profileFromForm(userId));
      if (!mounted) {
        return;
      }
      _loadedUserId = userId;
      _showMessage('تم حفظ الملف الشخصي');
    } on Object {
      if (!mounted) {
        return;
      }
      _showMessage('تعذر حفظ الملف الشخصي');
    } finally {
      if (mounted) {
        setState(() => _isProfileSaving = false);
      }
    }
  }

  void _applyProfile(UserProfile profile) {
    _nameController.text = profile.name;
    _emailController.text = profile.email;
    _mobileController.text = profile.mobile;
    _photoUrlController.text = profile.photoUrl;
    _nickNameController.text = profile.nickName;
    _bioController.text = profile.bio;
    _tagController.text = profile.tag;
    _countryController.text = profile.country;
    _cityController.text = profile.city;
  }

  UserProfile _profileFromForm(String userId) {
    return UserProfile(
      userId: userId,
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      mobile: _mobileController.text.trim(),
      photoUrl: _photoUrlController.text.trim(),
      nickName: _nickNameController.text.trim(),
      bio: _bioController.text.trim(),
      tag: _tagController.text.trim(),
      country: _countryController.text.trim(),
      city: _cityController.text.trim(),
    );
  }

  String? _requiredValidator(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'هذا الحقل مطلوب';
    }

    return null;
  }

  String? _emailValidator(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return null;
    }

    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(text)) {
      return 'أدخل بريدًا إلكترونيًا صحيحًا';
    }

    return null;
  }

  String? _mobileValidator(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return null;
    }

    if (!RegExp(r'^\+?[0-9 ]{6,20}$').hasMatch(text)) {
      return 'أدخل رقم هاتف صحيحًا';
    }

    return null;
  }

  String? _optionalUrlValidator(String? value) {
    final text = value?.trim() ?? '';
    if (text.isEmpty) {
      return null;
    }

    final uri = Uri.tryParse(text);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return 'أدخل رابطًا صحيحًا';
    }

    return null;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _showEmailAuthDialog() async {
    final result = await showDialog<_EmailAuthResult>(
      context: context,
      builder: (context) => _EmailAuthDialog(
        onSignIn: widget.controller.signInWithEmail,
        onRegister: widget.controller.registerWithEmail,
      ),
    );

    if (!mounted || result == null) {
      return;
    }

    _loadedUserId = null;
    await _loadProfile();
    if (!mounted) {
      return;
    }
    _showMessage(
      result == _EmailAuthResult.registered
          ? 'تم إنشاء الحساب بالبريد الإلكتروني'
          : 'تم تسجيل الدخول بالبريد الإلكتروني',
    );
  }

  Future<void> _confirmAndDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('حذف الحساب'),
          content: const Text('سيتم حذف الحساب الحالي ولا يمكن التراجع.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('إلغاء'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('حذف'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) {
      return;
    }

    try {
      await widget.controller.deleteAccount();
      if (!mounted) {
        return;
      }
      _showMessage('تم حذف الحساب');
    } on AccountDeletionRequiresRecentLogin {
      if (!mounted) {
        return;
      }
      _showMessage('أعد تسجيل الدخول قبل حذف الحساب');
    } on Object {
      if (!mounted) {
        return;
      }
      _showMessage('تعذر حذف الحساب');
    }
  }
}

class _AuthProviderSection extends StatelessWidget {
  const _AuthProviderSection({
    required this.remoteConfig,
    required this.isEmailBusy,
    required this.onEmailPressed,
  });

  final AppRemoteConfig remoteConfig;
  final bool isEmailBusy;
  final VoidCallback onEmailPressed;

  @override
  Widget build(BuildContext context) {
    final providers = <_AuthProviderAction>[
      if (remoteConfig.googleAuthEnabled)
        const _AuthProviderAction(
          label: 'متابعة بحساب Google',
          icon: Icons.g_mobiledata,
        ),
      if (remoteConfig.facebookAuthEnabled)
        const _AuthProviderAction(
          label: 'متابعة بحساب Facebook',
          icon: Icons.facebook,
        ),
      if (remoteConfig.phoneAuthEnabled)
        const _AuthProviderAction(
          label: 'متابعة برقم الهاتف',
          icon: Icons.phone_android,
        ),
      if (remoteConfig.emailAuthEnabled)
        _AuthProviderAction(
          label: 'متابعة بالبريد الإلكتروني',
          icon: Icons.alternate_email,
          onPressed: onEmailPressed,
        ),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('طرق الدخول', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (providers.isEmpty)
              const Text('لا توجد طرق دخول مفعّلة حاليًا.')
            else
              for (final provider in providers) ...[
                OutlinedButton.icon(
                  onPressed: isEmailBusy && provider.onPressed == onEmailPressed
                      ? null
                      : provider.onPressed ??
                            () => _showPendingProviderMessage(context),
                  icon: isEmailBusy && provider.onPressed == onEmailPressed
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(provider.icon),
                  label: Text(provider.label),
                ),
                if (provider != providers.last) const SizedBox(height: 8),
              ],
          ],
        ),
      ),
    );
  }

  void _showPendingProviderMessage(BuildContext context) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        const SnackBar(
          content: Text('يتطلب هذا المزود إعداد Firebase قبل الاستخدام.'),
        ),
      );
  }
}

class _AuthProviderAction {
  const _AuthProviderAction({
    required this.label,
    required this.icon,
    this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
}

enum _EmailAuthResult { signedIn, registered }

class _EmailAuthDialog extends StatefulWidget {
  const _EmailAuthDialog({required this.onSignIn, required this.onRegister});

  final Future<void> Function({required String email, required String password})
  onSignIn;
  final Future<void> Function({required String email, required String password})
  onRegister;

  @override
  State<_EmailAuthDialog> createState() => _EmailAuthDialogState();
}

class _EmailAuthDialogState extends State<_EmailAuthDialog> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('الدخول بالبريد الإلكتروني'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'البريد الإلكتروني',
                border: OutlineInputBorder(),
              ),
              validator: _emailValidator,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'كلمة المرور',
                border: OutlineInputBorder(),
              ),
              validator: _passwordValidator,
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 10),
              Text(
                _errorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: const Text('إلغاء'),
        ),
        TextButton(
          onPressed: _isSubmitting ? null : () => _submit(isRegister: false),
          child: const Text('دخول'),
        ),
        FilledButton(
          onPressed: _isSubmitting ? null : () => _submit(isRegister: true),
          child: _isSubmitting
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('إنشاء حساب'),
        ),
      ],
    );
  }

  Future<void> _submit({required bool isRegister}) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      if (isRegister) {
        await widget.onRegister(email: email, password: password);
      } else {
        await widget.onSignIn(email: email, password: password);
      }
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(
        isRegister ? _EmailAuthResult.registered : _EmailAuthResult.signedIn,
      );
    } on EmailAuthFailure catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = _emailAuthMessage(error.code);
        _isSubmitting = false;
      });
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'تعذر تنفيذ العملية';
        _isSubmitting = false;
      });
    }
  }

  String? _emailValidator(String? value) {
    final text = value?.trim() ?? '';
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(text)) {
      return 'أدخل بريدًا إلكترونيًا صحيحًا';
    }

    return null;
  }

  String? _passwordValidator(String? value) {
    if ((value ?? '').length < 6) {
      return 'كلمة المرور يجب ألا تقل عن 6 أحرف';
    }

    return null;
  }

  String _emailAuthMessage(String code) {
    return switch (code) {
      'invalid-email' => 'البريد الإلكتروني غير صحيح',
      'user-not-found' => 'لا يوجد حساب بهذا البريد',
      'wrong-password' => 'كلمة المرور غير صحيحة',
      'email-already-in-use' => 'يوجد حساب بهذا البريد',
      'weak-password' => 'كلمة المرور ضعيفة',
      _ => 'تعذر تنفيذ العملية',
    };
  }
}

class _ProfileTextField extends StatelessWidget {
  const _ProfileTextField({
    required this.controller,
    required this.label,
    this.maxLines = 1,
    this.keyboardType,
    this.validator,
    this.isRequired = true,
  });

  final TextEditingController controller;
  final String label;
  final int maxLines;
  final TextInputType? keyboardType;
  final FormFieldValidator<String>? validator;
  final bool isRequired;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        validator:
            validator ??
            (value) {
              if (!isRequired) {
                return null;
              }

              if (value == null || value.trim().isEmpty) {
                return 'هذا الحقل مطلوب';
              }

              return null;
            },
      ),
    );
  }
}

class _DeleteAccountButton extends StatelessWidget {
  const _DeleteAccountButton({required this.isBusy, required this.onDelete});

  final bool isBusy;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: isBusy ? null : onDelete,
      icon: isBusy
          ? const SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.delete_outline),
      label: const Text('حذف الحساب'),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 82,
          child: Text(label, style: Theme.of(context).textTheme.labelLarge),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}
