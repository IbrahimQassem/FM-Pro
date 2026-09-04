import "../../../core/services/share_service.dart";
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../comments/presentation/episode_comments_screen.dart';
import '../../home/domain/models/station.dart';
import '../../player/presentation/controllers/station_player_state.dart';
import '../../player/presentation/widgets/mini_player.dart';
import '../domain/models/episode.dart';
import '../domain/models/station_program.dart';

class ProgramDetailsScreen extends ConsumerWidget {
  const ProgramDetailsScreen({
    required this.station,
    required this.program,
    required this.episodes,
    super.key,
  });

  final Station station;
  final StationProgram program;
  final List<Episode> episodes;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playerState = ref.watch(stationPlayerControllerProvider);
    final playerController = ref.read(stationPlayerControllerProvider.notifier);
    return ProgramDetailsView(
      station: station,
      program: program,
      episodes: episodes,
      playerState: playerState,
      onEpisodePlayPressed: (episode) =>
          playerController.playEpisode(episode, station),
      onEpisodeCommentsPressed: (episode) {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => EpisodeCommentsScreen(episode: episode),
          ),
        );
      },
      playerBar: !playerState.hasSelection
          ? null
          : MiniPlayer(
              state: playerState,
              onToggle: playerController.toggleCurrent,
              onStop: playerController.stop,
            ),
    );
  }
}

class ProgramDetailsView extends StatelessWidget {
  const ProgramDetailsView({
    required this.station,
    required this.program,
    required this.episodes,
    required this.playerState,
    required this.onEpisodePlayPressed,
    this.onEpisodeCommentsPressed,
    this.playerBar,
    super.key,
  });

  final Station station;
  final StationProgram program;
  final List<Episode> episodes;
  final StationPlayerState playerState;
  final ValueChanged<Episode> onEpisodePlayPressed;
  final ValueChanged<Episode>? onEpisodeCommentsPressed;
  final Widget? playerBar;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final presenter = program.presenters.join('، ');
    return Scaffold(
      appBar: AppBar(title: Text(program.title)),
      bottomNavigationBar: playerBar,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ProgramHeader(program: program),
                  const SizedBox(height: 18),
                  if (program.description.isNotEmpty) ...[
                    Text(
                      strings.aboutProgram,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      program.description,
                      style: Theme.of(
                        context,
                      ).textTheme.bodyLarge?.copyWith(height: 1.6),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (presenter.isNotEmpty)
                    _InfoLine(
                      icon: Icons.record_voice_over_rounded,
                      label: strings.presentedBy(presenter),
                    ),
                  if (program.schedule case final schedule?) ...[
                    const SizedBox(height: 8),
                    _InfoLine(
                      icon: Icons.schedule_rounded,
                      label: strings.programTime(
                        _time(context, schedule.startMinute),
                        _time(context, schedule.endMinute),
                      ),
                    ),
                  ],
                  if (program.categories.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 7,
                      runSpacing: 7,
                      children: [
                        for (final category in program.categories)
                          Chip(label: Text(category)),
                      ],
                    ),
                  ],
                  const SizedBox(height: 22),
                  Text(
                    strings.programEpisodesTitle(episodes.length),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (episodes.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Text(
                    strings.noEpisodesMessage,
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
              sliver: SliverList.separated(
                itemCount: episodes.length,
                separatorBuilder: (_, __) => const SizedBox(height: 9),
                itemBuilder: (context, index) {
                  final episode = episodes[index];
                  final isSelected = playerState.isEpisodeSelected(episode.id);
                  final status = isSelected
                      ? playerState.status
                      : StationPlaybackStatus.idle;
                  return _EpisodeCard(
                    episode: episode,
                    status: status,
                    onPlayPressed: () => onEpisodePlayPressed(episode),
                    onCommentsPressed: onEpisodeCommentsPressed == null
                        ? null
                        : () => onEpisodeCommentsPressed!(episode),
                    onSharePressed: () =>
                        const ShareService().shareEpisode(context, episode, station),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _ProgramHeader extends StatelessWidget {
  const _ProgramHeader({required this.program});

  final StationProgram program;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 104,
          height: 104,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: colors.primaryContainer,
            borderRadius: BorderRadius.circular(20),
          ),
          child: program.coverUrl.isEmpty
              ? Icon(Icons.mic_rounded, color: colors.onPrimaryContainer)
              : CachedNetworkImage(
                  imageUrl: program.coverUrl,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) =>
                      Icon(Icons.mic_rounded, color: colors.onPrimaryContainer),
                ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                program.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                AppLocalizations.of(
                  context,
                ).episodesCount(program.episodesCount),
                style: TextStyle(color: colors.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _EpisodeCard extends StatelessWidget {
  const _EpisodeCard({
    required this.episode,
    required this.status,
    required this.onPlayPressed,
    this.onCommentsPressed,
    this.onSharePressed,
  });

  final Episode episode;
  final StationPlaybackStatus status;
  final VoidCallback onPlayPressed;
  final VoidCallback? onCommentsPressed;
  final VoidCallback? onSharePressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final isLoading = status == StationPlaybackStatus.loading;
    final isPlaying = status == StationPlaybackStatus.playing;
    final hasFailed = status == StationPlaybackStatus.failure;
    final stationDate = episode.broadcastAt.toUtc().add(
      Duration(minutes: episode.utcOffsetMinutes),
    );
    final date = MaterialLocalizations.of(
      context,
    ).formatMediumDate(stationDate);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    episode.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    '$date • ${strings.minutesCount((episode.durationSeconds / 60).ceil())}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  if (episode.description.isNotEmpty) ...[
                    const SizedBox(height: 7),
                    Text(
                      episode.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: [
                      TextButton.icon(
                        key: Key('episode-comments-${episode.id}'),
                        onPressed: onCommentsPressed,
                        icon: const Icon(Icons.chat_bubble_outline_rounded),
                        label: Text(strings.commentsCount(episode.commentsCount)),
                      ),
                      IconButton(
                        key: Key('episode-share-${episode.id}'),
                        tooltip: strings.shareEpisode,
                        onPressed: onSharePressed,
                        icon: const Icon(Icons.share_outlined, size: 20),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              key: Key('episode-play-${episode.id}'),
              onPressed: isLoading ? null : onPlayPressed,
              tooltip: hasFailed
                  ? strings.retryPlayback
                  : isPlaying
                  ? strings.pause
                  : strings.playEpisode(episode.title),
              icon: isLoading
                  ? const SizedBox.square(
                      dimension: 19,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : Icon(
                      hasFailed
                          ? Icons.refresh_rounded
                          : isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 8),
        Expanded(child: Text(label)),
      ],
    );
  }
}

String _time(BuildContext context, int minuteOfDay) {
  final normalized = minuteOfDay == 1440 ? 0 : minuteOfDay;
  return TimeOfDay(
    hour: normalized ~/ 60,
    minute: normalized % 60,
  ).format(context);
}
