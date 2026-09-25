import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/mascot_avatar.dart';
import '../../../../l10n/generated/app_localizations.dart';
import '../../../account/presentation/sign_in_screen.dart';
import '../../domain/models/app_user.dart';

class UserHeader extends StatelessWidget {
  const UserHeader({
    required this.user,
    required this.isOffline,
    required this.onNotificationsPressed,
    required this.onSettingsPressed,
    this.onSignInPressed,
    super.key,
  });

  final AppUser user;
  final bool isOffline;
  final VoidCallback onNotificationsPressed;
  final VoidCallback onSettingsPressed;
  final VoidCallback? onSignInPressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final displayName = user.isGuest ? strings.guestGreeting : user.displayName;

    final textScale = MediaQuery.textScalerOf(context).scale(1);

    return Row(
      children: [
        Expanded(
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onSettingsPressed,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
              child: Row(
                children: [
                  Semantics(
                    button: true,
                    label: user.isGuest ? strings.signIn : strings.account,
                    child: MascotAvatar(
                      radius: 26,
                      imageUrl: user.avatarUrl,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isOffline
                                    ? colors.error
                                    : context.appTheme.statusOnline,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                isOffline
                                    ? strings.offlineStatus
                                    : strings.onlineStatus,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: colors.onSurfaceVariant,
                                    ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (user.isGuest && textScale <= 1.2) ...[
          FilledButton.tonalIcon(
            onPressed: onSignInPressed ??
                () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const SignInScreen(),
                    ),
                  );
                },
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
              visualDensity: VisualDensity.compact,
            ),
            icon: const Icon(Icons.login_rounded, size: 16),
            label: Text(
              strings.signIn,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 2),
        ],
        IconButton(
          onPressed: onNotificationsPressed,
          tooltip: strings.notifications,
          icon: const Badge(
            isLabelVisible: false,
            child: Icon(Icons.notifications_none_rounded),
          ),
        ),
        IconButton(
          onPressed: onSettingsPressed,
          tooltip: strings.settingsTitle,
          icon: const Icon(Icons.settings_outlined),
        ),
      ],
    );
  }
}
