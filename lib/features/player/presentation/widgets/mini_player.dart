import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../l10n/generated/app_localizations.dart';
import '../controllers/station_player_state.dart';

class MiniPlayer extends StatelessWidget {
  const MiniPlayer({
    required this.state,
    this.onOpen,
    required this.onToggle,
    required this.onStop,
    super.key,
  });

  final StationPlayerState state;
  final VoidCallback? onOpen;
  final VoidCallback onToggle;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    final title = state.title;
    final strings = AppLocalizations.of(context);
    final colors = Theme.of(context).colorScheme;
    final isLoading = state.status == StationPlaybackStatus.loading;
    final isPlaying = state.status == StationPlaybackStatus.playing;
    final hasFailed = state.status == StationPlaybackStatus.failure;

    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(8, 0, 8, 6),
      child: Card(
        elevation: 6,
        color: colors.surface,
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(22),
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(12, 10, 8, 10),
            child: Row(
              children: [
                _MiniArtwork(url: state.artworkUrl),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        hasFailed
                            ? strings.playbackErrorShort
                            : isLoading
                            ? strings.connecting
                            : isPlaying
                            ? strings.nowPlaying
                            : strings.playbackPaused,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: hasFailed
                              ? colors.error
                              : colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isLoading)
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: SizedBox.square(
                      dimension: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    ),
                  )
                else
                  IconButton.filled(
                    onPressed: onToggle,
                    tooltip: hasFailed
                        ? strings.retry
                        : isPlaying
                        ? strings.pause
                        : strings.resume,
                    icon: Icon(
                      hasFailed
                          ? Icons.refresh_rounded
                          : isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                    ),
                  ),
                IconButton(
                  onPressed: onStop,
                  tooltip: strings.closePlayer,
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniArtwork extends StatelessWidget {
  const _MiniArtwork({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      width: 48,
      height: 48,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: colors.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: url.isEmpty
          ? Icon(Icons.radio_rounded, color: colors.onPrimaryContainer)
          : CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.cover,
              errorWidget: (context, url, error) =>
                  Icon(Icons.radio_rounded, color: colors.onPrimaryContainer),
            ),
    );
  }
}
