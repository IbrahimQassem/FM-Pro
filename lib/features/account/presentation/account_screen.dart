import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
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
    final controller = ref.read(accountControllerProvider.notifier);
    final user = state.user;

    return Scaffold(
      appBar: AppBar(title: Text(strings.account)),
      body: SafeArea(
        child: state.isInitializing
            ? const Center(child: CircularProgressIndicator())
            : user != null
            ? ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  CircleAvatar(
                    radius: 42,
                    child: Text(
                      user.displayName.isEmpty
                          ? strings.listenerInitial
                          : user.displayName.characters.first,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user.displayName,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    user.email,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 28),
                  FilledButton.tonalIcon(
                    key: const Key('account-sign-out'),
                    onPressed: state.isSubmitting ? null : controller.signOut,
                    icon: state.isSubmitting
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.logout_rounded),
                    label: Text(strings.signOut),
                  ),
                  if (state.failure case final failure?) ...[
                    const SizedBox(height: 14),
                    _ErrorMessage(message: _failureText(strings, failure)),
                  ],
                ],
              )
            : Form(
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
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 6),
                    Text(strings.accountGuestNote, textAlign: TextAlign.center),
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
                        validator: (value) =>
                            value == null || value.trim().length < 2
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
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        return email.contains('@') && email.contains('.')
                            ? null
                            : strings.emailValidation;
                      },
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
                          onPressed: () => setState(
                            () => _obscurePassword = !_obscurePassword,
                          ),
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
                    if (state.failure case final failure?) ...[
                      const SizedBox(height: 14),
                      _ErrorMessage(message: _failureText(strings, failure)),
                    ],
                    if (state.passwordResetSent) ...[
                      const SizedBox(height: 14),
                      _SuccessMessage(message: strings.passwordResetSent),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      key: const Key('account-submit'),
                      onPressed: state.isSubmitting
                          ? null
                          : () => _submit(state),
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
                        onPressed: state.isSubmitting
                            ? null
                            : () => _resetPassword(),
                        child: Text(strings.forgotPassword),
                      ),
                    const SizedBox(height: 6),
                    TextButton(
                      key: const Key('account-switch-mode'),
                      onPressed: state.isSubmitting
                          ? null
                          : () => controller.setMode(
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
                  ],
                ),
              ),
      ),
    );
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

  Future<void> _resetPassword() async {
    final strings = AppLocalizations.of(context);
    final email = _emailController.text.trim();
    if (!email.contains('@') || !email.contains('.')) {
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
      AccountFailure.unavailable => strings.accountUnavailable,
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
        style: const TextStyle(color: Color(0xFF1A8F5A)),
      ),
    );
  }
}
