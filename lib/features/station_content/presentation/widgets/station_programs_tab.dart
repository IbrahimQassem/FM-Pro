import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../l10n/generated/app_localizations.dart';
import '../../domain/models/station_program.dart';
import '../controllers/station_content_state.dart';

class StationProgramsTab extends StatelessWidget {
  const StationProgramsTab({
    required this.state,
    required this.onRefresh,
    required this.onProgramPressed,
    super.key,
  });

  final StationContentState state;
  final Future<void> Function() onRefresh;
  final ValueChanged<StationProgram> onProgramPressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    if (state.isInitialLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.failure == StationContentFailure.load) {
      return _ContentMessage(
        imageAsset: 'assets/images/mascot/mascot_offline.webp',
        icon: Icons.cloud_off_rounded,
        title: strings.mascotOfflineTitle,
        message: strings.mascotOfflineSubtitle,
        actionLabel: strings.retry,
        onAction: onRefresh,
      );
    }
    if (state.programs.isEmpty) {
      return _ContentMessage(
        icon: Icons.library_music_outlined,
        title: strings.noProgramsTitle,
        message: strings.noProgramsMessage,
        actionLabel: strings.refresh,
        onAction: onRefresh,
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        key: const PageStorageKey('station-programs-tab'),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 32),
        itemCount: state.programs.length + (state.isOffline ? 1 : 0),
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          if (state.isOffline && index == 0) {
            return _OfflineNotice(onRefresh: onRefresh);
          }
          final programIndex = index - (state.isOffline ? 1 : 0);
          final program = state.programs[programIndex];
          return _ProgramCard(
            program: program,
            onPressed: () => onProgramPressed(program),
          );
        },
      ),
    );
  }
}

class _ProgramCard extends StatelessWidget {
  const _ProgramCard({required this.program, required this.onPressed});

  final StationProgram program;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final presenter = program.presenters.join('، ');
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Artwork(
                url: program.thumbnailUrl.isEmpty
                    ? program.coverUrl
                    : program.thumbnailUrl,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            program.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        if (program.isFeatured)
                          Icon(
                            Icons.star_rounded,
                            size: 19,
                            color: colors.tertiary,
                            semanticLabel: strings.featuredProgram,
                          ),
                      ],
                    ),
                    if (presenter.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        presenter,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _MetaChip(
                          icon: Icons.podcasts_rounded,
                          label: strings.episodesCount(program.episodesCount),
                        ),
                        if (program.schedule case final schedule?)
                          _MetaChip(
                            icon: Icons.schedule_rounded,
                            label: _formatTime(context, schedule.startMinute),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_left_rounded, color: colors.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

class _Artwork extends StatelessWidget {
  const _Artwork({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      width: 76,
      height: 76,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: colors.primaryContainer,
        borderRadius: BorderRadius.circular(14),
      ),
      child: url.isEmpty
          ? Icon(Icons.mic_rounded, color: colors.onPrimaryContainer)
          : CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) =>
                  Icon(Icons.mic_rounded, color: colors.onPrimaryContainer),
            ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: colors.onSurfaceVariant),
            const SizedBox(width: 4),
            Text(label, style: Theme.of(context).textTheme.labelSmall),
          ],
        ),
      ),
    );
  }
}

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    return Material(
      color: colors.secondaryContainer,
      borderRadius: BorderRadius.circular(14),
      child: ListTile(
        leading: const Icon(Icons.offline_bolt_outlined),
        title: Text(strings.cachedContentNotice),
        trailing: IconButton(
          onPressed: onRefresh,
          tooltip: strings.retry,
          icon: const Icon(Icons.refresh_rounded),
        ),
      ),
    );
  }
}

class _ContentMessage extends StatelessWidget {
  const _ContentMessage({
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
    this.icon,
    this.imageAsset,
  });

  final IconData? icon;
  final String? imageAsset;
  final String title;
  final String message;
  final String actionLabel;
  final Future<void> Function() onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (imageAsset != null)
              Image.asset(
                imageAsset!,
                height: 130,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Icon(
                  icon ?? Icons.cloud_off_rounded,
                  size: 58,
                  color: Theme.of(context).colorScheme.primary,
                ),
              )
            else if (icon != null)
              Icon(icon, size: 58, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatTime(BuildContext context, int minuteOfDay) {
  return TimeOfDay(
    hour: minuteOfDay ~/ 60,
    minute: minuteOfDay % 60,
  ).format(context);
}
