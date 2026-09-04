import 'package:flutter/material.dart';

/// Reusable feedback and empty-state view featuring the HudHud mascot.
///
/// Designed with responsive layout and accessibility support for RTL and
/// high text scaling.
class MascotFeedbackView extends StatelessWidget {
  const MascotFeedbackView({
    required this.imageAsset,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.imageHeight = 160,
    this.imageSemanticsLabel,
    this.padding = const EdgeInsets.all(24),
    super.key,
  });

  /// Path to the mascot asset in `assets/images/mascot/`.
  final String imageAsset;

  /// Main title describing the current state.
  final String title;

  /// Optional secondary guidance text.
  final String? subtitle;

  /// Optional label for the call-to-action button.
  final String? actionLabel;

  /// Optional callback invoked when the call-to-action button is pressed.
  final VoidCallback? onAction;

  /// Target height for the mascot illustration.
  final double imageHeight;

  /// Accessibility label for screen readers.
  final String? imageSemanticsLabel;

  /// Outer padding.
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Center(
      child: SingleChildScrollView(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Semantics(
              label: imageSemanticsLabel,
              excludeSemantics: imageSemanticsLabel == null,
              child: Image.asset(
                imageAsset,
                height: imageHeight,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Icon(
                  Icons.radio_rounded,
                  size: imageHeight * 0.5,
                  color: colors.primary.withValues(alpha: 0.5),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
                color: colors.onSurface,
              ),
            ),
            if (subtitle != null && subtitle!.isNotEmpty) ...[
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 320),
                child: Text(
                  subtitle!,
                  textAlign: TextAlign.center,
                  style: textTheme.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                    height: 1.45,
                  ),
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              FilledButton.tonal(
                onPressed: onAction,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  actionLabel!,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
