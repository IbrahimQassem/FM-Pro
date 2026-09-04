import '../../../core/theme/app_colors.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../home/domain/models/station.dart';
import '../../player/presentation/controllers/station_player_state.dart';
import '../../player/presentation/widgets/mini_player.dart';
import '../../station_content/domain/models/station_program.dart';
import '../../station_content/presentation/controllers/station_content_state.dart';
import '../../station_content/presentation/program_details_screen.dart';
import '../../station_content/presentation/widgets/station_programs_tab.dart';
import '../../station_content/presentation/widgets/station_schedule_tab.dart';

Future<void> _completedRefresh() async {}

void _ignoreProgram(StationProgram _) {}

void _ignoreWeekday(int _) {}

class StationDetailsScreen extends ConsumerWidget {
  const StationDetailsScreen({required this.station, super.key});

  final Station station;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playerState = ref.watch(stationPlayerControllerProvider);
    final playerController = ref.read(stationPlayerControllerProvider.notifier);
    final contentState = ref.watch(
      stationContentControllerProvider(station.id),
    );
    final contentController = ref.read(
      stationContentControllerProvider(station.id).notifier,
    );
    final isSelected = playerState.isSelected(station.id);
    final status = isSelected ? playerState.status : StationPlaybackStatus.idle;

    void openProgram(StationProgram program) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (context) => ProgramDetailsScreen(
            station: station,
            program: program,
            episodes: contentState.episodesFor(program.id),
          ),
        ),
      );
    }

    return StationDetailsView(
      station: station,
      playbackStatus: status,
      onPlayPressed: () {
        if (isSelected && status == StationPlaybackStatus.failure) {
          playerController.retry();
        } else {
          playerController.play(station);
        }
      },
      onStopPressed: playerController.stop,
      contentState: contentState,
      onContentRefresh: contentController.refresh,
      onProgramPressed: openProgram,
      onWeekdaySelected: contentController.selectWeekday,
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

class StationDetailsView extends StatelessWidget {
  const StationDetailsView({
    required this.station,
    required this.playbackStatus,
    required this.onPlayPressed,
    required this.onStopPressed,
    this.contentState = const StationContentState(isInitialLoading: false),
    this.onContentRefresh,
    this.onProgramPressed,
    this.onWeekdaySelected,
    this.playerBar,
    super.key,
  });

  final Station station;
  final StationPlaybackStatus playbackStatus;
  final VoidCallback onPlayPressed;
  final VoidCallback onStopPressed;
  final StationContentState contentState;
  final Future<void> Function()? onContentRefresh;
  final ValueChanged<StationProgram>? onProgramPressed;
  final ValueChanged<int>? onWeekdaySelected;
  final Widget? playerBar;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final hasFailed = playbackStatus == StationPlaybackStatus.failure;

    return DefaultTabController(
      length: 3,
      initialIndex: 2,
      child: Scaffold(
        bottomNavigationBar: playerBar,
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverAppBar(
              pinned: true,
              expandedHeight: 430,
              foregroundColor: Colors.white,
              backgroundColor: Theme.of(context).colorScheme.primary,
              title: Text(station.name),
              flexibleSpace: FlexibleSpaceBar(
                background: _StationHero(
                  station: station,
                  playbackStatus: playbackStatus,
                  onPlayPressed: onPlayPressed,
                  onStopPressed: onStopPressed,
                ),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _TabBarHeaderDelegate(
                TabBar(
                  tabs: [
                    Tab(text: strings.programs),
                    Tab(text: strings.schedule),
                    Tab(text: strings.aboutStation),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            children: [
              StationProgramsTab(
                state: contentState,
                onRefresh: onContentRefresh ?? _completedRefresh,
                onProgramPressed: onProgramPressed ?? _ignoreProgram,
              ),
              StationScheduleTab(
                state: contentState,
                now: DateTime.now(),
                onRefresh: onContentRefresh ?? _completedRefresh,
                onWeekdaySelected: onWeekdaySelected ?? _ignoreWeekday,
                onProgramPressed: onProgramPressed ?? _ignoreProgram,
              ),
              _AboutTab(station: station, hasPlaybackFailed: hasFailed),
            ],
          ),
        ),
      ),
    );
  }
}

class _StationHero extends StatelessWidget {
  const _StationHero({
    required this.station,
    required this.playbackStatus,
    required this.onPlayPressed,
    required this.onStopPressed,
  });

  final Station station;
  final StationPlaybackStatus playbackStatus;
  final VoidCallback onPlayPressed;
  final VoidCallback onStopPressed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final isLoading = playbackStatus == StationPlaybackStatus.loading;
    final isPlaying = playbackStatus == StationPlaybackStatus.playing;
    final hasFailed = playbackStatus == StationPlaybackStatus.failure;
    final subtitle = [
      station.frequency,
      station.cityNameAr,
    ].where((value) => value.isNotEmpty).join(' • ');

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: context.appTheme.heroGradient,
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 68, 20, 18),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _StationArtwork(station: station),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                station.name,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w900,
                                    ),
                              ),
                            ),
                            if (station.isVerified)
                              const Padding(
                                padding: EdgeInsetsDirectional.only(start: 6),
                                child: Icon(
                                  Icons.verified_rounded,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                          ],
                        ),
                        if (subtitle.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          DecoratedBox(
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 9,
                                vertical: 4,
                              ),
                              child: Text(
                                subtitle,
                                style: Theme.of(context).textTheme.labelMedium
                                    ?.copyWith(color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 7),
                        Text(
                          station.description.isNotEmpty
                              ? station.description
                              : station.tagline.isNotEmpty
                              ? station.tagline
                              : strings.stationDescriptionFallback,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Colors.white.withValues(alpha: 0.85),
                                height: 1.45,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      key: const Key('station-playback-button'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        backgroundColor: Colors.white,
                        foregroundColor: colors.primary,
                      ),
                      onPressed: isLoading ? null : onPlayPressed,
                      icon: isLoading
                          ? SizedBox.square(
                              dimension: 19,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: colors.primary,
                              ),
                            )
                          : Icon(
                              hasFailed
                                  ? Icons.refresh_rounded
                                  : isPlaying
                                  ? Icons.pause_rounded
                                  : Icons.play_arrow_rounded,
                            ),
                      label: Text(
                        isLoading
                            ? strings.connecting
                            : hasFailed
                            ? strings.retryPlayback
                            : isPlaying
                            ? strings.pause
                            : strings.listenLive,
                      ),
                    ),
                  ),
                  if (playbackStatus != StationPlaybackStatus.idle) ...[
                    const SizedBox(width: 10),
                    IconButton.outlined(
                      onPressed: onStopPressed,
                      tooltip: strings.stop,
                      style: IconButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(
                          color: Colors.white.withValues(alpha: 0.55),
                        ),
                      ),
                      icon: const Icon(Icons.stop_rounded),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 16),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.16),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      _HeroStat(
                        value: '${station.programsCount}',
                        label: strings.programs,
                      ),
                      const _HeroDivider(),
                      _HeroStat(
                        value: '${station.subscribersCount}',
                        label: strings.subscribers,
                      ),
                      const _HeroDivider(),
                      _HeroStat(
                        value: '${station.totalPlays}',
                        label: strings.totalPlays,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AboutTab extends StatelessWidget {
  const _AboutTab({required this.station, required this.hasPlaybackFailed});

  final Station station;
  final bool hasPlaybackFailed;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    return ListView(
      key: const PageStorageKey('station-about-tab'),
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  strings.stationInformation,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: colors.primary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  station.description.isEmpty
                      ? strings.stationDescriptionFallback
                      : station.description,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyLarge?.copyWith(height: 1.6),
                ),
                const Divider(height: 28),
                _InfoRow(
                  icon: Icons.location_on_outlined,
                  label: '${station.cityNameAr}، ${station.countryNameAr}',
                ),
                if (station.frequency.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _InfoRow(
                    icon: Icons.graphic_eq_rounded,
                    label: station.frequency,
                  ),
                ],
                const SizedBox(height: 10),
                _InfoRow(
                  icon: Icons.podcasts_rounded,
                  label: station.isLive ? strings.live : strings.onlineStation,
                ),
              ],
            ),
          ),
        ),
        if (hasPlaybackFailed) ...[
          const SizedBox(height: 14),
          Card(
            color: colors.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.error_outline_rounded, color: colors.error),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      strings.playbackErrorMessage,
                      style: TextStyle(color: colors.onErrorContainer),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _StationArtwork extends StatelessWidget {
  const _StationArtwork({required this.station});

  final Station station;

  @override
  Widget build(BuildContext context) {
    final imageUrl = station.logoUrl.isNotEmpty
        ? station.logoUrl
        : station.thumbnailUrl;
    return Semantics(
      image: true,
      label: AppLocalizations.of(context).stationLogo(station.name),
      child: Container(
        width: 88,
        height: 88,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white, width: 2),
        ),
        child: imageUrl.isEmpty
            ? const Icon(Icons.radio_rounded, size: 46, color: Colors.white)
            : CachedNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.cover,
                errorWidget: (context, url, error) => const Icon(
                  Icons.radio_rounded,
                  size: 46,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.white.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroDivider extends StatelessWidget {
  const _HeroDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 28,
      color: Colors.white.withValues(alpha: 0.18),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Row(
      children: [
        Icon(icon, size: 20, color: colors.primary),
        const SizedBox(width: 10),
        Expanded(
          child: Text(label, style: TextStyle(color: colors.onSurfaceVariant)),
        ),
      ],
    );
  }
}

class _TabBarHeaderDelegate extends SliverPersistentHeaderDelegate {
  const _TabBarHeaderDelegate(this.tabBar);

  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return ColoredBox(
      color: Theme.of(context).colorScheme.surface,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarHeaderDelegate oldDelegate) => false;
}
