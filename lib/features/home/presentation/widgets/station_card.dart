import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../l10n/generated/app_localizations.dart';
import '../../domain/models/station.dart';

class StationCard extends StatelessWidget {
  const StationCard.grid({
    required this.station,
    required this.onOpen,
    required this.onPlay,
    this.isFavorite = false,
    this.onFavoriteToggle,
    super.key,
  }) : isGrid = true;

  const StationCard.list({
    required this.station,
    required this.onOpen,
    required this.onPlay,
    this.isFavorite = false,
    this.onFavoriteToggle,
    super.key,
  }) : isGrid = false;

  final Station station;
  final VoidCallback onOpen;
  final VoidCallback onPlay;
  final bool isFavorite;
  final VoidCallback? onFavoriteToggle;
  final bool isGrid;

  @override
  Widget build(BuildContext context) {
    return isGrid ? _buildGrid(context) : _buildList(context);
  }

  Widget _buildGrid(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final strings = AppLocalizations.of(context);
    final isLargeText = MediaQuery.textScalerOf(context).scale(1) > 1.3;
    final logoSize = isLargeText ? 60.0 : 78.0;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Card(
        clipBehavior: Clip.antiAlias,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: colors.outlineVariant.withValues(alpha: 0.35),
            width: 1,
          ),
        ),
        child: InkWell(
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Align(
                        alignment: AlignmentDirectional.topStart,
                        child: _StationLogo(station: station, size: logoSize),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _StatusBadges(station: station, compact: true),
                        if (onFavoriteToggle != null) ...[
                          const SizedBox(height: 6),
                          _AnimatedFavoriteButton(
                            isFavorite: isFavorite,
                            onToggle: onFavoriteToggle!,
                            tooltip: isFavorite
                                ? strings.removeFromFavorites
                                : strings.addToFavorites,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  station.name,
                  maxLines: isLargeText ? 1 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                _StationMetadataChip(station: station),
                const Spacer(),
                _StationStats(station: station),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.tonalIcon(
                    onPressed: onPlay,
                    icon: Icon(
                      station.streamUrl.isEmpty
                          ? Icons.radio_rounded
                          : Icons.play_arrow_rounded,
                    ),
                    label: Text(
                      station.streamUrl.isEmpty
                          ? strings.terrestrialBroadcast
                          : station.streamHealthState ==
                                  StationStreamHealthState.temporarilyStopped
                              ? strings.tryListening
                              : strings.playNow,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final strings = AppLocalizations.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Card(
        clipBehavior: Clip.antiAlias,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: colors.outlineVariant.withValues(alpha: 0.35),
            width: 1,
          ),
        ),
        child: InkWell(
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StationLogo(station: station, size: 74),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              station.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          _StatusBadges(station: station, compact: true),
                        ],
                      ),
                      const SizedBox(height: 6),
                      _StationMetadataChip(station: station),
                      const SizedBox(height: 10),
                      _StationStats(station: station),
                    ],
                  ),
                ),
                const SizedBox(width: 4),
                if (onFavoriteToggle != null)
                  _AnimatedFavoriteButton(
                    isFavorite: isFavorite,
                    onToggle: onFavoriteToggle!,
                    tooltip: isFavorite
                        ? strings.removeFromFavorites
                        : strings.addToFavorites,
                  ),
                IconButton.filledTonal(
                  onPressed: onPlay,
                  tooltip: station.streamUrl.isEmpty
                      ? strings.terrestrialBroadcast
                      : station.streamHealthState ==
                              StationStreamHealthState.temporarilyStopped
                          ? strings.tryListening
                          : strings.playStation(station.name),
                  icon: Icon(
                    station.streamUrl.isEmpty
                        ? Icons.radio_rounded
                        : Icons.play_arrow_rounded,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StationLogo extends StatelessWidget {
  const _StationLogo({required this.station, required this.size});

  final Station station;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Semantics(
      image: true,
      label: AppLocalizations.of(context).stationLogo(station.name),
      child: Container(
        width: size,
        height: size,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: colors.primaryContainer,
          borderRadius: BorderRadius.circular(18),
        ),
        child: station.logoUrl.isEmpty
            ? Image.asset(
                'assets/images/branding/station_placeholder.webp',
                fit: BoxFit.cover,
              )
            : CachedNetworkImage(
                imageUrl: station.logoUrl,
                fit: BoxFit.cover,
                placeholder: (context, url) => Image.asset(
                  'assets/images/branding/station_placeholder.webp',
                  fit: BoxFit.cover,
                ),
                errorWidget: (context, url, error) => Image.asset(
                  'assets/images/branding/station_placeholder.webp',
                  fit: BoxFit.cover,
                ),
              ),
      ),
    );
  }
}

class _StatusBadges extends StatelessWidget {
  const _StatusBadges({required this.station, this.compact = false});

  final Station station;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final isCompact =
        compact || MediaQuery.textScalerOf(context).scale(1) > 1.3;
    final (icon, label, color) =
        _resolveStreamBadge(station, strings, theme.colorScheme);

    return Wrap(
      spacing: 6,
      runSpacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        if (label != null)
          isCompact
              ? Semantics(
                  label: label,
                  child: Tooltip(
                    message: label,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                        border:
                            Border.all(color: color.withValues(alpha: 0.28)),
                      ),
                      child: Icon(icon, size: 16, color: color),
                    ),
                  ),
                )
              : Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: color.withValues(alpha: 0.28)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 13, color: color),
                      const SizedBox(width: 4),
                      Text(
                        label,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: color,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
        if (station.isVerified)
          Tooltip(
            message: strings.verifiedStation,
            child: Icon(
              Icons.verified_rounded,
              size: 18,
              color: theme.colorScheme.primary,
            ),
          ),
      ],
    );
  }

  static (IconData, String?, Color) _resolveStreamBadge(
    Station station,
    AppLocalizations strings,
    ColorScheme colors,
  ) {
    switch (station.streamHealthState) {
      case StationStreamHealthState.available:
        return (Icons.podcasts_rounded, strings.streamAvailable, colors.error);
      case StationStreamHealthState.backupAvailable:
        return (
          Icons.sync_rounded,
          strings.streamAvailableBackup,
          colors.tertiary
        );
      case StationStreamHealthState.unstable:
        return (
          Icons.warning_amber_rounded,
          strings.streamUnstable,
          colors.secondary
        );
      case StationStreamHealthState.temporarilyStopped:
        return (
          Icons.pause_circle_outline_rounded,
          strings.streamTemporarilyStopped,
          colors.outline
        );
      case StationStreamHealthState.unverified:
        return (
          Icons.help_outline_rounded,
          strings.streamUnverifiedStatus,
          colors.outline
        );
      case StationStreamHealthState.noOnlineSource:
        return (
          Icons.radio_rounded,
          strings.streamNoOnlineSource,
          colors.tertiary
        );
      case StationStreamHealthState.deviceConnectionError:
        return (
          Icons.wifi_off_rounded,
          strings.streamDeviceConnectionError,
          colors.error
        );
    }
  }
}

class _StationStats extends StatelessWidget {
  const _StationStats({required this.station});

  final Station station;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final style = Theme.of(context).textTheme.labelMedium;
    return Wrap(
      spacing: 10,
      runSpacing: 6,
      children: [
        _Stat(
          icon: Icons.people_alt_outlined,
          label: strings.subscribersCount(station.subscribersCount),
          style: style,
        ),
        _Stat(
          icon: Icons.library_music_outlined,
          label: strings.programsCount(station.programsCount),
          style: style,
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label, required this.style});

  final IconData icon;
  final String label;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.onSurfaceVariant;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 4),
        Flexible(child: Text(label, style: style?.copyWith(color: color))),
      ],
    );
  }
}

class _StationMetadataChip extends StatelessWidget {
  const _StationMetadataChip({required this.station});

  final Station station;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final city = station.cityNameAr.trim();
    final freq = station.frequency.trim();

    final parts = <String>[];
    if (city.isNotEmpty) parts.add(city);
    if (freq.isNotEmpty) parts.add(freq);
    if (parts.isEmpty) return const SizedBox.shrink();

    final label = parts.join(' · ');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: colors.outlineVariant.withValues(alpha: 0.25),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.location_on_outlined,
            size: 13,
            color: colors.onSurfaceVariant,
          ),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelSmall?.copyWith(
                color: colors.onSurfaceVariant,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AnimatedFavoriteButton extends StatefulWidget {
  const _AnimatedFavoriteButton({
    required this.isFavorite,
    required this.onToggle,
    required this.tooltip,
  });

  final bool isFavorite;
  final VoidCallback onToggle;
  final String tooltip;

  @override
  State<_AnimatedFavoriteButton> createState() =>
      _AnimatedFavoriteButtonState();
}

class _AnimatedFavoriteButtonState extends State<_AnimatedFavoriteButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 240),
    );
    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.0, end: 1.25)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.25, end: 1.0)
            .chain(CurveTween(curve: Curves.easeIn)),
        weight: 50,
      ),
    ]).animate(_controller);
  }

  @override
  void didUpdateWidget(covariant _AnimatedFavoriteButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isFavorite != oldWidget.isFavorite && widget.isFavorite) {
      final disableAnimations =
          MediaQuery.maybeDisableAnimationsOf(context) ?? false;
      if (!disableAnimations) {
        _controller.forward(from: 0.0);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final disableAnimations =
        MediaQuery.maybeDisableAnimationsOf(context) ?? false;

    Widget iconWidget = Icon(
      widget.isFavorite
          ? Icons.favorite_rounded
          : Icons.favorite_border_rounded,
      color: widget.isFavorite
          ? colorScheme.primary
          : colorScheme.onSurfaceVariant,
    );

    if (!disableAnimations) {
      iconWidget = ScaleTransition(
        key: const ValueKey('favorite_button_scale'),
        scale: _scaleAnimation,
        child: iconWidget,
      );
    }

    return IconButton(
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      iconSize: 22,
      onPressed: widget.onToggle,
      tooltip: widget.tooltip,
      icon: iconWidget,
    );
  }
}
