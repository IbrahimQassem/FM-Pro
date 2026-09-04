import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../app/providers.dart";
import "../../../core/services/share_service.dart";
import "../../../core/widgets/mascot_avatar.dart";
import "../../../l10n/generated/app_localizations.dart";
import "../../comments/presentation/widgets/ugc_guidelines_dialog.dart";
import "../../onboarding/presentation/onboarding_screen.dart";
import "manage_account_screen.dart";
import "register_screen.dart";
import "sign_in_screen.dart";
import "widgets/about_app_dialog.dart";
import "widgets/app_rating_dialog.dart";

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = AppLocalizations.of(context);
    final state = ref.watch(accountControllerProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.settingsTitle),
      ),
      body: SafeArea(
        child: state.isInitializing
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                children: [
                  _buildUserCard(context, strings, state, theme),
                  const SizedBox(height: 20),
                  _buildSectionHeader(theme, strings.appSectionTitle),
                  const SizedBox(height: 8),
                  _buildEngagementCard(context, strings),
                  const SizedBox(height: 20),
                  _buildSectionHeader(theme, strings.legalSectionTitle),
                  const SizedBox(height: 8),
                  _buildInfoCard(context, strings),
                  const SizedBox(height: 24),
                  Center(
                    child: Text(
                      "${strings.aboutAppTitle} • 1.0.0 (1)",
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
      ),
    );
  }

  Widget _buildSectionHeader(ThemeData theme, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Text(
        title,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w800,
          color: theme.colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildUserCard(
    BuildContext context,
    AppLocalizations strings,
    dynamic state,
    ThemeData theme,
  ) {
    final user = state.user;
    if (user == null) {
      return Card(
        elevation: 0,
        color: theme.colorScheme.primaryContainer.withAlpha(50),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: theme.colorScheme.primary.withAlpha(40)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const MascotAvatar(radius: 26),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.guestAccountTitle,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          strings.guestAccountSubtitle,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      key: const Key("open-sign-in-button"),
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const SignInScreen(),
                        ),
                      ),
                      icon: const Icon(Icons.login_rounded, size: 18),
                      label: Text(strings.signInNow),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      key: const Key("open-register-button"),
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const RegisterScreen(),
                        ),
                      ),
                      icon: const Icon(Icons.person_add_outlined, size: 18),
                      label: Text(strings.registerNow),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => const ManageAccountScreen(),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              MascotAvatar(
                imageUrl: user.photoUrl,
                radius: 28,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            user.displayName,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(
                          Icons.verified_rounded,
                          size: 16,
                          color: Colors.green,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user.email.isNotEmpty
                          ? user.email
                          : strings.verifiedAccountBadge,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              FilledButton.tonal(
                key: const Key("open-manage-account-button"),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ManageAccountScreen(),
                  ),
                ),
                child: Text(strings.manageAccount),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEngagementCard(BuildContext context, AppLocalizations strings) {
    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          ListTile(
            key: const Key("account-share-app"),
            leading: const Icon(Icons.share_rounded),
            title: Text(strings.shareAppTitle),
            subtitle: Text(strings.shareAppSubtitle),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => const ShareService().shareApp(context),
          ),
          const Divider(height: 1, indent: 56),
          ListTile(
            key: const Key("account-rate-app"),
            leading: const Icon(Icons.star_rounded, color: Colors.amber),
            title: Text(strings.rateAppTitle),
            subtitle: Text(strings.rateAppSubtitle),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => AppRatingDialog.show(context),
          ),
          const Divider(height: 1, indent: 56),
          ListTile(
            key: const Key("account-app-tour"),
            leading: Image.asset(
              "assets/images/mascot/mascot_onboarding.webp",
              height: 28,
              fit: BoxFit.contain,
              excludeFromSemantics: true,
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
        ],
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, AppLocalizations strings) {
    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          ListTile(
            key: const Key("account-about-app"),
            leading: const Icon(Icons.info_outline_rounded),
            title: Text(strings.aboutAppTitle),
            subtitle: Text(strings.aboutAppSubtitle),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => AboutAppDialog.show(context),
          ),
          const Divider(height: 1, indent: 56),
          ListTile(
            key: const Key("account-ugc-guidelines"),
            leading: Image.asset(
              "assets/images/mascot/mascot_ugc_guidelines.webp",
              height: 28,
              fit: BoxFit.contain,
              excludeFromSemantics: true,
            ),
            title: Text(strings.ugcGuidelinesMenu),
            subtitle: Text(strings.ugcGuidelinesSubtitle),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => UgcGuidelinesDialog.show(context),
          ),
        ],
      ),
    );
  }
}
