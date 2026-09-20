import 'dart:async';
import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/providers.dart';
import '../../../../core/services/share_service.dart';
import '../../../../l10n/generated/app_localizations.dart';
import '../../../station_details/presentation/station_details_screen.dart';
import '../controllers/station_player_state.dart';

class NowPlayingSheet extends ConsumerStatefulWidget {
  const NowPlayingSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: false,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (context) => const NowPlayingSheet(),
    );
  }

  @override
  ConsumerState<NowPlayingSheet> createState() => _NowPlayingSheetState();
}

class _NowPlayingSheetState extends ConsumerState<NowPlayingSheet>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (TickerMode.of(context)) {
      if (!_pulseController.isAnimating) {
        _pulseController.repeat(reverse: true);
      }
    } else {
      _pulseController.stop();
    }
  }

  void _syncCountdownTimer(bool hasSleepTimer) {
    if (hasSleepTimer) {
      _countdownTimer ??= Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) {
          final state = ref.read(stationPlayerControllerProvider);
          if (state.hasSleepTimer) {
            setState(() {});
          } else {
            _countdownTimer?.cancel();
            _countdownTimer = null;
          }
        }
      });
    } else {
      _countdownTimer?.cancel();
      _countdownTimer = null;
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _showSleepTimerDialog(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final controller = ref.read(stationPlayerControllerProvider.notifier);
    final state = ref.read(stationPlayerControllerProvider);

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: colors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (dialogContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Icon(Icons.bedtime_rounded, color: colors.primary),
                    const SizedBox(width: 10),
                    Text(
                      strings.sleepTimer,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                for (final minutes in [15, 30, 45, 60])
                  ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    title: Text(strings.sleepTimerMinutes(minutes)),
                    leading: const Icon(Icons.timer_outlined),
                    onTap: () {
                      controller.setSleepTimer(Duration(minutes: minutes));
                      Navigator.of(dialogContext).pop();
                    },
                  ),
                if (state.hasSleepTimer)
                  ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    title: Text(
                      strings.sleepTimerOff,
                      style: TextStyle(color: colors.error),
                    ),
                    leading:
                        Icon(Icons.timer_off_outlined, color: colors.error),
                    onTap: () {
                      controller.cancelSleepTimer();
                      Navigator.of(dialogContext).pop();
                    },
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(stationPlayerControllerProvider);
    final controller = ref.read(stationPlayerControllerProvider.notifier);
    final homeState = ref.watch(homeControllerProvider);
    final favoritesState = ref.watch(favoritesControllerProvider);
    final favoritesController = ref.read(favoritesControllerProvider.notifier);
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;

    if (!state.hasSelection) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
        }
      });
      return const SizedBox.shrink();
    }

    _syncCountdownTimer(state.hasSleepTimer);

    final station = state.station!;
    final isFavorite = favoritesState.isFavorite(station.id);
    final isPlaying = state.status == StationPlaybackStatus.playing;
    final isLoading = state.status == StationPlaybackStatus.loading;
    final hasFailed = state.status == StationPlaybackStatus.failure;

    final mediaSize = MediaQuery.sizeOf(context);
    final artworkSize = (mediaSize.width * 0.72).clamp(180.0, 310.0);

    return FractionallySizedBox(
      heightFactor: 0.92,
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  colors.surface.withValues(alpha: 0.94),
                  colors.surfaceContainerHighest.withValues(alpha: 0.96),
                ],
              ),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  // Apple Music style Grabber Handle
                  Container(
                    width: 38,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: colors.onSurface.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Top Navigation Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          onPressed: () => Navigator.of(context).pop(),
                          tooltip: strings.closePlayer,
                          icon: const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 32,
                          ),
                        ),
                        Expanded(
                          child: Column(
                            children: [
                              Text(
                                strings.nowPlaying,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: colors.onSurfaceVariant,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.5,
                                    ),
                              ),
                              if (station.frequency.isNotEmpty)
                                Text(
                                  station.frequency,
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelSmall
                                      ?.copyWith(
                                        color: colors.primary,
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () {
                            if (state.episode != null) {
                              ShareService().shareEpisode(
                                context,
                                state.episode!,
                                station,
                              );
                            } else {
                              ShareService().shareStation(context, station);
                            }
                          },
                          tooltip: strings.shareStation,
                          icon: const Icon(Icons.share_rounded, size: 22),
                        ),
                      ],
                    ),
                  ),

                  // Expanded Scrollable Content
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                      child: Column(
                        children: [
                          // Apple Music Spring Scaled Artwork
                          Center(
                            child: AnimatedScale(
                              scale: isPlaying ? 1.0 : 0.88,
                              duration: const Duration(milliseconds: 350),
                              curve: Curves.easeOutCubic,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 350),
                                curve: Curves.easeOutCubic,
                                width: artworkSize,
                                height: artworkSize,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                      color: colors.primary.withValues(
                                        alpha: isPlaying ? 0.35 : 0.12,
                                      ),
                                      blurRadius: isPlaying ? 32 : 14,
                                      spreadRadius: isPlaying ? 2 : 0,
                                      offset: Offset(0, isPlaying ? 14 : 6),
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(24),
                                  child: state.artworkUrl.isEmpty
                                      ? Image.asset(
                                          'assets/images/branding/station_placeholder.webp',
                                          fit: BoxFit.cover,
                                        )
                                      : CachedNetworkImage(
                                          imageUrl: state.artworkUrl,
                                          fit: BoxFit.cover,
                                          errorWidget: (c, u, e) => Image.asset(
                                            'assets/images/branding/station_placeholder.webp',
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 28),

                          // Station Info & Favorite Toggle
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              const SizedBox(width: 48),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      state.title,
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .headlineSmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      state.episode != null
                                          ? station.name
                                          : (station.cityNameAr.isNotEmpty
                                              ? '${station.cityNameAr} • ${strings.streamQualityHq}'
                                              : strings.streamQualityHq),
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            color: colors.onSurfaceVariant,
                                            fontWeight: FontWeight.w500,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: () {
                                  favoritesController.toggleFavoriteStation(
                                    station.id,
                                  );
                                },
                                tooltip: isFavorite
                                    ? strings.removeFromFavorites
                                    : strings.addToFavorites,
                                icon: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 250),
                                  child: Icon(
                                    isFavorite
                                        ? Icons.favorite_rounded
                                        : Icons.favorite_border_rounded,
                                    key: ValueKey(isFavorite),
                                    color: isFavorite
                                        ? Colors.redAccent
                                        : colors.onSurfaceVariant,
                                    size: 28,
                                  ),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 20),

                          // Live Broadcast Indicator & Stream Details
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 14,
                            ),
                            decoration: BoxDecoration(
                              color: isPlaying
                                  ? Colors.redAccent.withValues(alpha: 0.12)
                                  : colors.surfaceContainer,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isPlaying
                                    ? Colors.redAccent.withValues(alpha: 0.35)
                                    : colors.outlineVariant
                                        .withValues(alpha: 0.5),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isPlaying)
                                        AnimatedBuilder(
                                          animation: _pulseController,
                                          builder: (context, child) {
                                            return Container(
                                              width: 10,
                                              height: 10,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: Colors.redAccent
                                                    .withValues(
                                                        alpha: 0.4 +
                                                            0.6 *
                                                                _pulseController
                                                                    .value),
                                                boxShadow: [
                                                  BoxShadow(
                                                    color: Colors.redAccent
                                                        .withValues(
                                                      alpha: 0.6 *
                                                          _pulseController
                                                              .value,
                                                    ),
                                                    blurRadius: 8,
                                                    spreadRadius: 2,
                                                  ),
                                                ],
                                              ),
                                            );
                                          },
                                        )
                                      else
                                        Container(
                                          width: 10,
                                          height: 10,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: colors.onSurfaceVariant
                                                .withValues(alpha: 0.4),
                                          ),
                                        ),
                                      const SizedBox(width: 8),
                                      Flexible(
                                        child: Text(
                                          isPlaying
                                              ? '${strings.liveBroadcast} • LIVE'
                                              : isLoading
                                                  ? strings.connecting
                                                  : hasFailed
                                                      ? strings
                                                          .playbackErrorShort
                                                      : strings.playbackPaused,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: isPlaying
                                                ? Colors.redAccent
                                                : colors.onSurfaceVariant,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  station.frequency.isNotEmpty
                                      ? station.frequency
                                      : strings.onlineStation,
                                  style: TextStyle(
                                    color: colors.onSurfaceVariant,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),

                          // Primary Controls (Previous, Play/Pause Hero, Next)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              IconButton(
                                iconSize: 42,
                                onPressed: () {
                                  controller.playPreviousStation(
                                    homeState.visibleStations.isNotEmpty
                                        ? homeState.visibleStations
                                        : homeState.stations,
                                  );
                                },
                                tooltip: strings.previousStation,
                                icon: const Icon(Icons.skip_previous_rounded),
                              ),

                              // Big Hero Play/Pause Button
                              GestureDetector(
                                onTap: controller.toggleCurrent,
                                child: Container(
                                  width: 76,
                                  height: 76,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: colors.primary,
                                    boxShadow: [
                                      BoxShadow(
                                        color: colors.primary
                                            .withValues(alpha: 0.4),
                                        blurRadius: 18,
                                        offset: const Offset(0, 8),
                                      ),
                                    ],
                                  ),
                                  child: Center(
                                    child: isLoading
                                        ? SizedBox.square(
                                            dimension: 30,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 3,
                                              color: colors.onPrimary,
                                            ),
                                          )
                                        : Icon(
                                            hasFailed
                                                ? Icons.refresh_rounded
                                                : isPlaying
                                                    ? Icons.pause_rounded
                                                    : Icons.play_arrow_rounded,
                                            size: 44,
                                            color: colors.onPrimary,
                                          ),
                                  ),
                                ),
                              ),

                              IconButton(
                                iconSize: 42,
                                onPressed: () {
                                  controller.playNextStation(
                                    homeState.visibleStations.isNotEmpty
                                        ? homeState.visibleStations
                                        : homeState.stations,
                                  );
                                },
                                tooltip: strings.nextStation,
                                icon: const Icon(Icons.skip_next_rounded),
                              ),
                            ],
                          ),

                          const SizedBox(height: 24),

                          // Bottom Utility Actions (Sleep Timer, Station Details, Stop)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              // Sleep Timer
                              IconButton(
                                onPressed: () => _showSleepTimerDialog(context),
                                tooltip: state.hasSleepTimer
                                    ? '${strings.sleepTimer} (${state.remainingSleepTime?.inMinutes ?? 0}m)'
                                    : strings.sleepTimer,
                                icon: Badge(
                                  isLabelVisible: state.hasSleepTimer,
                                  label: Text(
                                    '${state.remainingSleepTime?.inMinutes ?? 0}m',
                                  ),
                                  child: Icon(
                                    state.hasSleepTimer
                                        ? Icons.bedtime_rounded
                                        : Icons.bedtime_outlined,
                                    color: state.hasSleepTimer
                                        ? colors.primary
                                        : colors.onSurfaceVariant,
                                    size: 26,
                                  ),
                                ),
                              ),

                              // View Station Details & Schedule
                              IconButton(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                  Navigator.of(context).push(
                                    MaterialPageRoute<void>(
                                      builder: (_) => StationDetailsScreen(
                                          station: station),
                                    ),
                                  );
                                },
                                tooltip: strings.viewStationDetails,
                                icon: Icon(
                                  Icons.calendar_month_outlined,
                                  color: colors.onSurfaceVariant,
                                  size: 26,
                                ),
                              ),

                              // Stop / Dismiss Button
                              IconButton(
                                onPressed: () {
                                  controller.stop();
                                  Navigator.of(context).pop();
                                },
                                tooltip: strings.stop,
                                icon: Icon(
                                  Icons.stop_circle_outlined,
                                  color: colors.onSurfaceVariant,
                                  size: 26,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
