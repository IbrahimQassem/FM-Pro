import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/mascot_avatar.dart';
import 'package:flutter/material.dart';

import '../../../../l10n/generated/app_localizations.dart';
import '../../domain/models/app_user.dart';

class UserHeader extends StatelessWidget {
  const UserHeader({
    required this.user,
    required this.isOffline,
    required this.onNotificationsPressed,
    required this.onSettingsPressed,
    super.key,
  });

  final AppUser user;
  final bool isOffline;
  final VoidCallback onNotificationsPressed;
  final VoidCallback onSettingsPressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final displayName = user.isGuest ? strings.guestGreeting : user.displayName;

    return Row(
      children: [
        Semantics(
          image: true,
          label: strings.profileImage,
          child: MascotAvatar(
            radius: 28,
            imageUrl: user.avatarUrl,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 3),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: isOffline ? colors.error : context.appTheme.statusOnline,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      isOffline ? strings.offlineStatus : strings.onlineStatus,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
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
          tooltip: strings.settings,
          icon: const Icon(Icons.tune_rounded),
        ),
      ],
    );
  }
}
