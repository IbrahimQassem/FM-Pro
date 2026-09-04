import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Circular avatar that displays the user profile image or falls back to
/// the official HudHud mascot avatar.
class MascotAvatar extends StatelessWidget {
  const MascotAvatar({
    this.imageUrl,
    this.radius = 20,
    this.backgroundColor,
    super.key,
  });

  /// Optional remote profile image URL.
  final String? imageUrl;

  /// Avatar radius in logical pixels.
  final double radius;

  /// Optional background color. Defaults to [ColorScheme.primaryContainer].
  final Color? backgroundColor;

  static const defaultMascotAsset =
      'assets/images/mascot/mascot_avatar_default.webp';

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final bg = backgroundColor ?? colors.primaryContainer.withValues(alpha: 0.6);
    final size = radius * 2;

    Widget fallback() => Image.asset(
          defaultMascotAsset,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Icon(
            Icons.person_rounded,
            size: radius * 1.2,
            color: colors.primary,
          ),
        );

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
        border: Border.all(
          color: colors.outlineVariant.withValues(alpha: 0.5),
          width: 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: (imageUrl != null && imageUrl!.trim().isNotEmpty)
          ? CachedNetworkImage(
              imageUrl: imageUrl!.trim(),
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => fallback(),
              placeholder: (_, __) => fallback(),
            )
          : fallback(),
    );
  }
}
