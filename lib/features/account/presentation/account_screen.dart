import "../../onboarding/presentation/onboarding_screen.dart";
import "../../comments/presentation/widgets/ugc_guidelines_dialog.dart";
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/mascot_avatar.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../domain/models/account_sign_in_provider.dart';
import '../domain/models/account_user.dart';
import '../domain/repositories/account_repository.dart';
import 'controllers/account_state.dart';

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _verificationCodeController = TextEditingController();
  final _verificationEmailController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _verificationCodeController.dispose();
    _verificationEmailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final state = ref.watch(accountControllerProvider);
    return Scaffold(
      appBar: AppBar(title: Text(strings.account)),
      body: SafeArea(
        child: state.isInitializing
            ? const Center(child: CircularProgressIndicator())
            : state.user == null
            ? _buildAuthenticationForm(strings, state)
            : state.user!.emailVerified
            ? _buildVerifiedAccount(strings, state, state.user!)
            : _buildEmailVerification(strings, state, state.user!),
      ),
    );
  }

  Widget _buildAuthenticationForm(
    AppLocalizations strings,
    AccountState state,
  ) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Icon(
            Icons.account_circle_rounded,
            size: 82,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 12),
          Text(
            state.mode == AccountMode.signIn
                ? strings.signInTitle
                : strings.createAccountTitle,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(strings.accountGuestNote, textAlign: TextAlign.center),
          if (state.accountDeleted) ...[
            const SizedBox(height: 14),
            _SuccessMessage(message: strings.accountDeleted),
          ],
          const SizedBox(height: 24),
          if (state.mode == AccountMode.register) ...[
            TextFormField(
              key: const Key('account-name'),
              controller: _nameController,
              textInputAction: TextInputAction.next,
              maxLength: 120,
              autofillHints: const [AutofillHints.name],
              decoration: InputDecoration(
                labelText: strings.displayName,
                prefixIcon: const Icon(Icons.person_outline_rounded),
              ),
              validator: (value) => value == null || value.trim().length < 2
                  ? strings.displayNameValidation
                  : null,
            ),
            const SizedBox(height: 10),
          ],
          TextFormField(
            key: const Key('account-email'),
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.email],
            autocorrect: false,
            decoration: InputDecoration(
              labelText: strings.email,
              prefixIcon: const Icon(Icons.email_outlined),
            ),
            validator: (value) =>
                _validEmail(value) ? null : strings.emailValidation,
          ),
          const SizedBox(height: 14),
          TextFormField(
            key: const Key('account-password'),
            controller: _passwordController,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            autofillHints: state.mode == AccountMode.signIn
                ? const [AutofillHints.password]
                : const [AutofillHints.newPassword],
            onFieldSubmitted: (_) => _submit(state),
            decoration: InputDecoration(
              labelText: strings.password,
              prefixIcon: const Icon(Icons.lock_outline_rounded),
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
            validator: (value) =>
                (value?.length ?? 0) < 8 ? strings.passwordValidation : null,
          ),
          _feedback(strings, state),
          const SizedBox(height: 20),
          FilledButton(
            key: const Key('account-submit'),
            onPressed: state.isSubmitting ? null : () => _submit(state),
            child: state.isSubmitting
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    state.mode == AccountMode.signIn
                        ? strings.signIn
                        : strings.createAccount,
                  ),
          ),
          if (state.mode == AccountMode.signIn)
            TextButton(
              onPressed: state.isSubmitting ? null : _resetPassword,
              child: Text(strings.forgotPassword),
            ),
          TextButton(
            key: const Key('account-switch-mode'),
            onPressed: state.isSubmitting
                ? null
                : () => ref
                      .read(accountControllerProvider.notifier)
                      .setMode(
                        state.mode == AccountMode.signIn
                            ? AccountMode.register
                            : AccountMode.signIn,
                      ),
            child: Text(
              state.mode == AccountMode.signIn
                  ? strings.needAccount
                  : strings.haveAccount,
            ),
          ),
          _socialDivider(strings),
          ..._providerButtons(strings, state),
          const SizedBox(height: 16),
          TextButton.icon(
            key: const Key("account-auth-ugc-guidelines"),
            onPressed: () => UgcGuidelinesDialog.show(context),
            icon: const Icon(Icons.policy_outlined),
            label: Text(strings.ugcGuidelinesMenu),
          ),
        ],
      ),
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
            autocorrect: false,
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
          textInputAction: TextInputAction.done,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _verifyEmailCode(),
          decoration: InputDecoration(
            labelText: strings.verificationCode,
            prefixIcon: const Icon(Icons.pin_outlined),
          ),
        ),
        _feedback(strings, state),
        const SizedBox(height: 14),
        FilledButton(
          key: const Key('account-verify-email'),
          onPressed:
              state.isSubmitting || _verificationCodeController.text.length != 6
              ? null
              : _verifyEmailCode,
          child: state.isSubmitting
              ? const SizedBox.square(
                  dimension: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(strings.verifyEmail),
        ),
        TextButton(
          key: const Key('account-resend-code'),
          onPressed: state.isSubmitting
              ? null
              : () => _requestVerificationCode(user),
          child: Text(
            state.verificationCodeSent
                ? strings.resendVerificationCode
                : strings.sendVerificationCode,
          ),
        ),
        const SizedBox(height: 10),
        _socialDivider(strings),
        ..._providerButtons(
          strings,
          state,
          linkedProviders: user.linkedProviders,
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          key: const Key('account-sign-out'),
          onPressed: state.isSubmitting
              ? null
              : ref.read(accountControllerProvider.notifier).signOut,
          icon: const Icon(Icons.logout_rounded),
          label: Text(strings.signOut),
        ),
        const SizedBox(height: 20),
        TextButton.icon(
          key: const Key('account-delete'),
          onPressed: state.isSubmitting
              ? null
              : () => _confirmDeleteAccount(user),
          style: TextButton.styleFrom(
            foregroundColor: Theme.of(context).colorScheme.error,
          ),
          icon: const Icon(Icons.delete_forever_outlined),
          label: Text(strings.deleteAccount),
        ),
      ],
    );
  }

  Widget _buildVerifiedAccount(
    AppLocalizations strings,
    AccountState state,
    AccountUser user,
  ) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Center(
          child: MascotAvatar(
            radius: 44,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          user.displayName,
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        if (user.email.isNotEmpty) ...[
          const SizedBox(height: 5),
          Text(
            user.email,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 24),
        Text(
          strings.linkedSignInMethods,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
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
        if (state.providerLinked) ...[
          const SizedBox(height: 12),
          _SuccessMessage(message: strings.providerLinked),
        ],
        const SizedBox(height: 20),
        Text(
          strings.linkAnotherMethod,
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        ..._providerButtons(
          strings,
          state,
          linkedProviders: user.linkedProviders,
        ),
        const SizedBox(height: 16),
        FilledButton.tonalIcon(
          key: const Key('account-sign-out'),
          onPressed: state.isSubmitting
              ? null
              : ref.read(accountControllerProvider.notifier).signOut,
          icon: const Icon(Icons.logout_rounded),
          label: Text(strings.signOut),
        ),
        const SizedBox(height: 20),

        const Divider(),
        const SizedBox(height: 12),
        Text(
          strings.deleteAccountSectionTitle,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: Theme.of(context).colorScheme.error,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 6),
        Text(strings.deleteAccountSectionMessage),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          key: const Key('account-delete'),
          onPressed: state.isSubmitting
              ? null
              : () => _confirmDeleteAccount(user),
          style: OutlinedButton.styleFrom(
            foregroundColor: Theme.of(context).colorScheme.error,
          ),
          icon: const Icon(Icons.delete_forever_outlined),
          label: Text(strings.deleteAccount),
        ),
        if (state.failure case final failure?) ...[
          const SizedBox(height: 14),
          _ErrorMessage(message: _failureText(strings, failure)),
        ],
        const SizedBox(height: 24),
        const Divider(),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            key: const Key("account-app-tour"),
            leading: Image.asset(
              "assets/images/mascot/mascot_onboarding.webp",
              height: 36,
              fit: BoxFit.contain,
            ),
            title: Text(strings.appTour),
            subtitle: Text(strings.appTourSubtitle),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const OnboardingScreen(isAppTour: true),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            key: const Key("account-ugc-guidelines"),
            leading: Image.asset(
              "assets/images/mascot/mascot_ugc_guidelines.webp",
              height: 36,
              fit: BoxFit.contain,
            ),
            title: Text(strings.ugcGuidelinesMenu),
            subtitle: Text(strings.ugcGuidelinesSubtitle),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => UgcGuidelinesDialog.show(context),
          ),
        ),
      ],
    );
  }

  Widget _feedback(AppLocalizations strings, AccountState state) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (state.failure case final failure?) ...[
          const SizedBox(height: 14),
          _ErrorMessage(message: _failureText(strings, failure)),
        ],
        if (state.passwordResetSent) ...[
          const SizedBox(height: 14),
          _SuccessMessage(message: strings.passwordResetSent),
        ],
        if (state.verificationCodeSent) ...[
          const SizedBox(height: 14),
          _SuccessMessage(message: strings.verificationCodeSent),
        ],
      ],
    );
  }

  Widget _socialDivider(AppLocalizations strings) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        children: [
          const Expanded(child: Divider()),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(strings.socialSignInDivider),
          ),
          const Expanded(child: Divider()),
        ],
      ),
    );
  }

  List<Widget> _providerButtons(
    AppLocalizations strings,
    AccountState state, {
    Set<AccountSignInProvider> linkedProviders = const {},
  }) {
    final providers = <AccountSignInProvider>[
      AccountSignInProvider.google,
      AccountSignInProvider.facebook,
      if (_supportsAppleSignIn) AccountSignInProvider.apple,
    ];
    return providers
        .where((provider) => !linkedProviders.contains(provider))
        .map(
          (provider) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OutlinedButton.icon(
              key: Key('account-${provider.name}'),
              onPressed: state.isSubmitting
                  ? null
                  : () => ref
                        .read(accountControllerProvider.notifier)
                        .continueWithProvider(provider),
              icon: Icon(_providerIcon(provider)),
              label: Text(_providerLabel(strings, provider)),
            ),
          ),
        )
        .toList();
  }

  Future<void> _submit(AccountState state) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final controller = ref.read(accountControllerProvider.notifier);
    if (state.mode == AccountMode.signIn) {
      await controller.signIn(
        email: _emailController.text,
        password: _passwordController.text,
      );
    } else {
      await controller.register(
        displayName: _nameController.text,
        email: _emailController.text,
        password: _passwordController.text,
      );
    }
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

  Future<void> _resetPassword() async {
    final strings = AppLocalizations.of(context);
    final email = _emailController.text.trim();
    if (!_validEmail(email)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(strings.enterEmailFirst)));
      return;
    }
    await ref.read(accountControllerProvider.notifier).sendPasswordReset(email);
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
    final canConfirm =
        _acknowledged &&
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
