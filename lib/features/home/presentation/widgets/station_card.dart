import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../l10n/generated/app_localizations.dart';
import '../../domain/models/station.dart';

class StationCard extends StatelessWidget {
  const StationCard.grid({
    required this.station,
    required this.onOpen,
    required this.onPlay,
    super.key,
  }) : isGrid = true;

  const StationCard.list({
    required this.station,
    required this.onOpen,
    required this.onPlay,
    super.key,
  }) : isGrid = false;

  final Station station;
  final VoidCallback onOpen;
  final VoidCallback onPlay;
  final bool isGrid;

  @override
  Widget build(BuildContext context) {
    return isGrid ? _buildGrid(context) : _buildList(context);
  }

  Widget _buildGrid(BuildContext context) {
    final strings = AppLocalizations.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
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
                  Expanded(child: _StationLogo(station: station, size: 78)),
                  const SizedBox(width: 8),
                  _StatusBadges(station: station),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                station.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 5),
              Text(
                '${station.cityNameAr} · ${station.frequency.isEmpty ? strings.unknownFrequency : station.frequency}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              _StationStats(station: station),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.tonalIcon(
                  onPressed: onPlay,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: Text(strings.playStation(station.name)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildList(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
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
                      children: [
                        Expanded(
                          child: Text(
                            station.name,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        _StatusBadges(station: station),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      [
                        station.cityNameAr,
                        station.frequency,
                      ].where((value) => value.isNotEmpty).join(' · '),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _StationStats(station: station),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: onPlay,
                tooltip: AppLocalizations.of(context).playStation(station.name),
                icon: const Icon(Icons.play_arrow_rounded),
              ),
            ],
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
            ? Icon(
                Icons.radio_rounded,
                size: 36,
                color: colors.onPrimaryContainer,
              )
            : CachedNetworkImage(
                imageUrl: station.logoUrl,
                fit: BoxFit.cover,
                errorWidget: (context, url, error) => Icon(
                  Icons.radio_rounded,
                  size: 36,
                  color: colors.onPrimaryContainer,
                ),
              ),
      ),
    );
  }
}

class _StatusBadges extends StatelessWidget {
  const _StatusBadges({required this.station});

  final Station station;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: [
        if (station.isLive)
          Tooltip(
            message: strings.live,
            child: Icon(
              Icons.podcasts_rounded,
              size: 20,
              color: Theme.of(context).colorScheme.error,
            ),
          ),
        if (station.isVerified)
          Tooltip(
            message: strings.verifiedStation,
            child: Icon(
              Icons.verified_rounded,
              size: 20,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
      ],
    );
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
        Text(label, style: style?.copyWith(color: color)),
      ],
    );
  }
}
