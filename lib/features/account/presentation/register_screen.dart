import "package:flutter/foundation.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../app/providers.dart";
import "../../../core/widgets/mascot_avatar.dart";
import "../../../l10n/generated/app_localizations.dart";
import "../../comments/presentation/widgets/ugc_guidelines_dialog.dart";
import "../domain/models/account_sign_in_provider.dart";
import "../domain/repositories/account_repository.dart";
import "controllers/account_state.dart";
import "sign_in_screen.dart";

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final state = ref.watch(accountControllerProvider);

    ref.listen<AccountState>(accountControllerProvider, (previous, next) {
      if (next.user != null) {
        if (mounted) {
          Navigator.of(context).pop();
        }
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.createAccountTitle),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            children: [
              const Center(child: MascotAvatar(radius: 44)),
              const SizedBox(height: 16),
              Text(
                strings.createAccountTitle,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 6),
              Text(strings.accountGuestNote, textAlign: TextAlign.center),
              const SizedBox(height: 24),
              TextFormField(
                key: const Key('account-name'),
                controller: _nameController,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: strings.displayName,
                  prefixIcon: const Icon(Icons.person_outline_rounded),
                ),
                validator: (value) => (value?.trim().length ?? 0) >= 2
                    ? null
                    : strings.displayNameValidation,
              ),
              const SizedBox(height: 14),
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
                autofillHints: const [AutofillHints.newPassword],
                onFieldSubmitted: (_) => _submit(),
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
                validator: (value) => (value?.length ?? 0) < 8
                    ? strings.passwordValidation
                    : null,
              ),
              _feedback(strings, state),
              const SizedBox(height: 20),
              FilledButton(
                key: const Key('account-submit'),
                onPressed: state.isSubmitting ? null : _submit,
                child: state.isSubmitting
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(strings.createAccount),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(strings.alreadyHaveAccount),
                  TextButton(
                    key: const Key('go-to-sign-in-button'),
                    onPressed: () => Navigator.of(context).pushReplacement(
                      MaterialPageRoute<void>(
                        builder: (_) => const SignInScreen(),
                      ),
                    ),
                    child: Text(
                      strings.signInNow,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
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
        ),
      ),
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
            child: Text(
              strings.socialSignInDivider,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const Expanded(child: Divider()),
        ],
      ),
    );
  }

  List<Widget> _providerButtons(AppLocalizations strings, AccountState state) {
    final providers = <AccountSignInProvider>[
      AccountSignInProvider.google,
      AccountSignInProvider.facebook,
      if (_supportsAppleSignIn) AccountSignInProvider.apple,
    ];
    return providers
        .map(
          (provider) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OutlinedButton.icon(
              key: Key("account-${provider.name}"),
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

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(accountControllerProvider.notifier).register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          displayName: _nameController.text.trim(),
        );
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
