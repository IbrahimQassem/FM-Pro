import "package:flutter/foundation.dart";
import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../app/providers.dart";
import "../../../core/theme/app_colors.dart";
import "../../../core/widgets/mascot_avatar.dart";
import "../../../l10n/generated/app_localizations.dart";
import "../domain/models/account_sign_in_provider.dart";
import "../domain/models/account_user.dart";
import "../domain/repositories/account_repository.dart";
import "controllers/account_state.dart";
import "widgets/edit_profile_bottom_sheet.dart";

class ManageAccountScreen extends ConsumerStatefulWidget {
  const ManageAccountScreen({super.key});

  @override
  ConsumerState<ManageAccountScreen> createState() =>
      _ManageAccountScreenState();
}

class _ManageAccountScreenState extends ConsumerState<ManageAccountScreen> {
  final _verificationCodeController = TextEditingController();
  final _verificationEmailController = TextEditingController();

  @override
  void dispose() {
    _verificationCodeController.dispose();
    _verificationEmailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final state = ref.watch(accountControllerProvider);

    ref.listen<AccountState>(accountControllerProvider, (previous, next) {
      if (next.user == null && previous?.user != null) {
        if (mounted) {
          Navigator.of(context).pop();
        }
      }
    });

    final user = state.user;
    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text(strings.manageAccount)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(strings.manageAccount)),
      body: SafeArea(
        child: user.emailVerified
            ? _buildVerifiedDetails(strings, state, user)
            : _buildEmailVerification(strings, state, user),
      ),
    );
  }

  Widget _buildVerifiedDetails(
    AppLocalizations strings,
    AccountState state,
    AccountUser user,
  ) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: constraints.maxHeight - 40,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Card(
                      elevation: 0,
                      color: colors.surfaceContainerHighest,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            Stack(
                              alignment: Alignment.bottomRight,
                              children: [
                                MascotAvatar(
                                  imageUrl: user.photoUrl,
                                  radius: 44,
                                ),
                                Container(
                                  decoration: BoxDecoration(
                                    color: colors.primary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: IconButton(
                                    key: const Key('edit-profile-avatar-button'),
                                    iconSize: 16,
                                    padding: const EdgeInsets.all(6),
                                    constraints: const BoxConstraints(),
                                    color: colors.onPrimary,
                                    icon: const Icon(Icons.camera_alt_outlined),
                                    tooltip: strings.editProfile,
                                    onPressed: () =>
                                        EditProfileBottomSheet.show(context, user),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              user.displayName,
                              textAlign: TextAlign.center,
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            if (user.email.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                user.email,
                                textAlign: TextAlign.center,
                                style: TextStyle(color: colors.onSurfaceVariant),
                              ),
                            ],
                            const SizedBox(height: 10),
                            Chip(
                              avatar: const Icon(
                                Icons.verified_rounded,
                                size: 16,
                                color: Colors.green,
                              ),
                              label: Text(strings.verifiedAccountBadge),
                              visualDensity: VisualDensity.compact,
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              key: const Key('edit-profile-button'),
                              onPressed: () =>
                                  EditProfileBottomSheet.show(context, user),
                              icon: const Icon(Icons.edit_outlined, size: 18),
                              label: Text(strings.editProfile),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      strings.currentSignInMethod,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: user.linkedProviders
                          .map(
                            (provider) => Chip(
                              avatar: Icon(_providerIcon(provider), size: 18),
                              label: Text(_providerLabel(strings, provider)),
                            ),
                          )
                          .toList(),
                    ),
                    if (state.failure case final failure?) ...[
                      const SizedBox(height: 14),
                      _ErrorMessage(message: _failureText(strings, failure)),
                    ],
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 32, bottom: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FilledButton.tonalIcon(
                        key: const Key('account-sign-out'),
                        onPressed: state.isSubmitting
                            ? null
                            : ref.read(accountControllerProvider.notifier).signOut,
                        icon: const Icon(Icons.logout_rounded),
                        label: Text(strings.signOut),
                      ),
                      const SizedBox(height: 12),
                      Center(
                        child: TextButton.icon(
                          key: const Key('account-delete'),
                          onPressed: state.isSubmitting
                              ? null
                              : () => _confirmDeleteAccount(user),
                          icon: Icon(
                            Icons.delete_outline,
                            size: 16,
                            color: colors.outline,
                          ),
                          label: Text(
                            strings.deleteAccountDiscrete,
                            style: TextStyle(
                              fontSize: 12,
                              color: colors.outline,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmailVerification(
    AppLocalizations strings,
    AccountState state,
    AccountUser user,
  ) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Icon(
          Icons.mark_email_unread_outlined,
          size: 76,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          strings.emailVerificationTitle,
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        Text(strings.emailVerificationMessage, textAlign: TextAlign.center),
        if (user.email.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            user.email,
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ] else ...[
          const SizedBox(height: 12),
          Text(strings.emailVerificationMissingEmail),
          const SizedBox(height: 12),
          TextField(
            key: const Key('account-verification-email'),
            controller: _verificationEmailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.email],
            decoration: InputDecoration(
              labelText: strings.email,
              prefixIcon: const Icon(Icons.email_outlined),
            ),
          ),
        ],
        const SizedBox(height: 20),
        TextField(
          key: const Key('account-verification-code'),
          controller: _verificationCodeController,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(6),
          ],
          textInputAction: TextInputAction.done,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: strings.verificationCode,
            prefixIcon: const Icon(Icons.pin_outlined),
          ),
        ),
        if (state.verificationCodeSent) ...[
          const SizedBox(height: 12),
          _SuccessMessage(message: strings.verificationCodeSent),
        ],
        if (state.failure case final failure?) ...[
          const SizedBox(height: 14),
          _ErrorMessage(message: _failureText(strings, failure)),
        ],
        const SizedBox(height: 20),
        FilledButton(
          key: const Key('account-verify-email'),
          onPressed: state.isSubmitting ||
                  _verificationCodeController.text.length != 6
              ? null
              : _verifyEmailCode,
          child: state.isSubmitting
              ? const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(strings.verifyEmail),
        ),
        const SizedBox(height: 8),
        TextButton(
          key: const Key('account-resend-code'),
          onPressed: state.isSubmitting
              ? null
              : () => _requestVerificationCode(user),
          child: Text(strings.resendVerificationCode),
        ),
        const SizedBox(height: 12),
        FilledButton.tonalIcon(
          key: const Key('account-sign-out'),
          onPressed: state.isSubmitting
              ? null
              : ref.read(accountControllerProvider.notifier).signOut,
          icon: const Icon(Icons.logout_rounded),
          label: Text(strings.signOut),
        ),
      ],
    );
  }

  Future<void> _requestVerificationCode(AccountUser user) async {
    final strings = AppLocalizations.of(context);
    final candidate = _verificationEmailController.text.trim();
    if (user.email.isEmpty && !_validEmail(candidate)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(strings.emailValidation)));
      return;
    }
    await ref
        .read(accountControllerProvider.notifier)
        .requestEmailVerificationCode(
          email: user.email.isEmpty ? candidate : null,
        );
  }

  Future<void> _verifyEmailCode() async {
    if (_verificationCodeController.text.length != 6) return;
    await ref
        .read(accountControllerProvider.notifier)
        .verifyEmailCode(_verificationCodeController.text);
  }

  Future<void> _confirmDeleteAccount(AccountUser user) async {
    final requiresPassword = _requiresPasswordForDeletion(user);
    final password = await showDialog<String>(
      context: context,
      builder: (_) => _DeleteAccountDialog(requiresPassword: requiresPassword),
    );
    if (password == null || !mounted) return;
    await ref
        .read(accountControllerProvider.notifier)
        .deleteAccount(requiresPassword ? password : null);
  }

  String _failureText(AppLocalizations strings, AccountFailure failure) {
    return switch (failure) {
      AccountFailure.invalidCredentials => strings.invalidCredentials,
      AccountFailure.emailAlreadyInUse => strings.emailAlreadyInUse,
      AccountFailure.weakPassword => strings.weakPassword,
      AccountFailure.invalidEmail => strings.emailValidation,
      AccountFailure.network => strings.accountNetworkError,
      AccountFailure.reauthenticationFailed =>
        strings.accountReauthenticationFailed,
      AccountFailure.deletionFailed => strings.accountDeletionFailed,
      AccountFailure.invalidVerificationCode => strings.invalidVerificationCode,
      AccountFailure.expiredVerificationCode => strings.expiredVerificationCode,
      AccountFailure.verificationRateLimited => strings.verificationRateLimited,
      AccountFailure.verificationDeliveryFailed =>
        strings.verificationDeliveryFailed,
      AccountFailure.providerCancelled => strings.providerCancelled,
      AccountFailure.providerFailed => strings.providerFailed,
      AccountFailure.providerNotConfigured => strings.providerNotConfigured,
      AccountFailure.providerAlreadyLinked => strings.providerAlreadyLinked,
      AccountFailure.accountConflict => strings.accountConflict,
      AccountFailure.unavailable => strings.accountUnavailable,
    };
  }

  static bool _validEmail(String? value) {
    final email = value?.trim() ?? '';
    return email.contains('@') && email.contains('.');
  }

  static bool get _supportsAppleSignIn {
    return !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
  }

  static bool _requiresPasswordForDeletion(AccountUser user) {
    return user.usesPassword &&
        !(_supportsAppleSignIn &&
            user.linkedProviders.contains(AccountSignInProvider.apple));
  }

  static IconData _providerIcon(AccountSignInProvider provider) {
    return switch (provider) {
      AccountSignInProvider.password => Icons.password_rounded,
      AccountSignInProvider.google => Icons.g_mobiledata_rounded,
      AccountSignInProvider.facebook => Icons.facebook_rounded,
      AccountSignInProvider.apple => Icons.apple_rounded,
    };
  }

  static String _providerLabel(
    AppLocalizations strings,
    AccountSignInProvider provider,
  ) {
    return switch (provider) {
      AccountSignInProvider.password => strings.password,
      AccountSignInProvider.google => strings.continueWithGoogle,
      AccountSignInProvider.facebook => strings.continueWithFacebook,
      AccountSignInProvider.apple => strings.continueWithApple,
    };
  }
}

class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog({required this.requiresPassword});

  final bool requiresPassword;

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _passwordController = TextEditingController();
  bool _acknowledged = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final canConfirm = _acknowledged &&
        (!widget.requiresPassword || _passwordController.text.isNotEmpty);
    return AlertDialog(
      scrollable: true,
      title: Text(strings.deleteAccountTitle),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(strings.deleteAccountWarning),
            const SizedBox(height: 12),
            Text(
              strings.deleteAccountDataScope,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            if (widget.requiresPassword)
              TextField(
                key: const Key('account-delete-password'),
                controller: _passwordController,
                obscureText: _obscurePassword,
                autofillHints: const [AutofillHints.password],
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: strings.currentPassword,
                  suffixIcon: IconButton(
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                    tooltip: _obscurePassword
                        ? strings.showPassword
                        : strings.hidePassword,
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                  ),
                ),
              )
            else
              Text(strings.socialDeleteReauthentication),
            const SizedBox(height: 8),
            CheckboxListTile(
              key: const Key('account-delete-acknowledgement'),
              contentPadding: EdgeInsets.zero,
              value: _acknowledged,
              onChanged: (value) =>
                  setState(() => _acknowledged = value ?? false),
              title: Text(strings.deleteAccountAcknowledgement),
              controlAffinity: ListTileControlAffinity.leading,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(strings.cancel),
        ),
        FilledButton(
          key: const Key('account-confirm-delete'),
          onPressed: canConfirm
              ? () => Navigator.of(context).pop(_passwordController.text)
              : null,
          style: FilledButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
          child: Text(strings.deleteAccountConfirm),
        ),
      ],
    );
  }
}

class _ErrorMessage extends StatelessWidget {
  const _ErrorMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: TextStyle(color: colors.error),
      ),
    );
  }
}

class _SuccessMessage extends StatelessWidget {
  const _SuccessMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: TextStyle(color: context.appTheme.statusOnline),
      ),
    );
  }
}
