import "package:flutter/foundation.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../app/providers.dart";
import "../../../core/theme/app_colors.dart";
import "../../../core/widgets/mascot_avatar.dart";
import "../../../l10n/generated/app_localizations.dart";
import "../../comments/presentation/widgets/ugc_guidelines_dialog.dart";
import "../domain/models/account_sign_in_provider.dart";
import "../domain/repositories/account_repository.dart";
import "controllers/account_state.dart";
import "register_screen.dart";

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
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
        title: Text(strings.signInTitle),
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
                strings.signInTitle,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              Text(strings.accountGuestNote, textAlign: TextAlign.center),
              if (state.accountDeleted) ...[
                const SizedBox(height: 14),
                _SuccessMessage(message: strings.accountDeleted),
              ],
              const SizedBox(height: 24),
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
                autofillHints: const [AutofillHints.password],
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
                validator: (value) =>
                    (value?.length ?? 0) < 8 ? strings.passwordValidation : null,
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
                    : Text(strings.signIn),
              ),
              TextButton(
                onPressed: state.isSubmitting ? null : _resetPassword,
                child: Text(strings.forgotPassword),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(strings.dontHaveAccount),
                  TextButton(
                    key: const Key('go-to-register-button'),
                    onPressed: () => Navigator.of(context).pushReplacement(
                      MaterialPageRoute<void>(
                        builder: (_) => const RegisterScreen(),
                      ),
                    ),
                    child: Text(
                      strings.registerNow,
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
        if (state.passwordResetSent) ...[
          const SizedBox(height: 14),
          _SuccessMessage(message: strings.passwordResetSent),
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
    await ref.read(accountControllerProvider.notifier).signIn(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
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
