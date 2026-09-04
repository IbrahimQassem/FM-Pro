import 'package:flutter/material.dart';

/// Central brand color palette for HudHud FM.
///
/// Modifying values in this class changes the entire theme identity across the
/// application from one central location.
abstract final class AppColors {
  // Brand Primary & Gradient
  static const primary = Color(0xFF8E3E63);
  static const heroGradientStart = Color(0xFF8B2648);
  static const heroGradientEnd = Color(0xFF451222);

  // Surfaces & Backgrounds
  static const surface = Color(0xFFFCF8F8);
  static const primaryContainer = Color(0xFFFFD8E4);
  static const onPrimaryContainer = Color(0xFF3B0021);

  // Status & Utility Accents
  static const statusOnline = Color(0xFF1A8F5A);
  static const liveRed = Color(0xFFE53935);
  static const episodePlayAccent = Color(0xFFC2185B);
  static const outlineVariant = Color(0xFFD5C2C6);

  // Gradient Helper
  static const heroGradient = LinearGradient(
    begin: AlignmentDirectional.topStart,
    end: AlignmentDirectional.bottomEnd,
    colors: [heroGradientStart, heroGradientEnd],
  );
}

/// Material 3 Theme Extension providing custom theme tokens through [Theme.of(context)].
class AppThemeExtension extends ThemeExtension<AppThemeExtension> {
  const AppThemeExtension({
    required this.heroGradientStart,
    required this.heroGradientEnd,
    required this.statusOnline,
    required this.episodePlayAccent,
  });

  final Color heroGradientStart;
  final Color heroGradientEnd;
  final Color statusOnline;
  final Color episodePlayAccent;

  LinearGradient get heroGradient => LinearGradient(
        begin: AlignmentDirectional.topStart,
        end: AlignmentDirectional.bottomEnd,
        colors: [heroGradientStart, heroGradientEnd],
      );

  static const defaultTheme = AppThemeExtension(
    heroGradientStart: AppColors.heroGradientStart,
    heroGradientEnd: AppColors.heroGradientEnd,
    statusOnline: AppColors.statusOnline,
    episodePlayAccent: AppColors.episodePlayAccent,
  );

  @override
  AppThemeExtension copyWith({
    Color? heroGradientStart,
    Color? heroGradientEnd,
    Color? statusOnline,
    Color? episodePlayAccent,
  }) {
    return AppThemeExtension(
      heroGradientStart: heroGradientStart ?? this.heroGradientStart,
      heroGradientEnd: heroGradientEnd ?? this.heroGradientEnd,
      statusOnline: statusOnline ?? this.statusOnline,
      episodePlayAccent: episodePlayAccent ?? this.episodePlayAccent,
    );
  }

  @override
  AppThemeExtension lerp(
    covariant ThemeExtension<AppThemeExtension>? other,
    double t,
  ) {
    if (other is! AppThemeExtension) return this;
    return AppThemeExtension(
      heroGradientStart:
          Color.lerp(heroGradientStart, other.heroGradientStart, t) ??
              heroGradientStart,
      heroGradientEnd:
          Color.lerp(heroGradientEnd, other.heroGradientEnd, t) ??
              heroGradientEnd,
      statusOnline:
          Color.lerp(statusOnline, other.statusOnline, t) ?? statusOnline,
      episodePlayAccent:
          Color.lerp(episodePlayAccent, other.episodePlayAccent, t) ??
              episodePlayAccent,
    );
  }
}

extension AppThemeContext on BuildContext {
  AppThemeExtension get appTheme =>
      Theme.of(this).extension<AppThemeExtension>() ??
      AppThemeExtension.defaultTheme;
}
