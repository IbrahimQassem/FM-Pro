import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/providers.dart';
import '../../../../l10n/generated/app_localizations.dart';
import '../../domain/models/audio_playback_progress.dart';
import '../controllers/station_player_state.dart';

/// Position ticks rebuild only these controls, outside StationPlayerState.
class EpisodeProgressControls extends ConsumerStatefulWidget {
  const EpisodeProgressControls({required this.episodeId, super.key});
  final String episodeId;

  @override
  ConsumerState<EpisodeProgressControls> createState() =>
      _EpisodeProgressControlsState();
}

class _EpisodeProgressControlsState
    extends ConsumerState<EpisodeProgressControls> {
  double? _draft;
  bool _seeking = false;

  @override
  void didUpdateWidget(covariant EpisodeProgressControls oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.episodeId != widget.episodeId) {
      _draft = null;
      _seeking = false;
    }
  }

  String _time(Duration value) {
    final seconds = value.inSeconds < 0 ? 0 : value.inSeconds;
    final hours = seconds ~/ 3600;
    final minutes = (seconds ~/ 60) % 60;
    final tail = (seconds % 60).toString().padLeft(2, '0');
    return hours > 0
        ? '$hours:${minutes.toString().padLeft(2, '0')}:$tail'
        : '$minutes:$tail';
  }

  Future<void> _seek(double seconds) async {
    final episodeId = widget.episodeId;
    setState(() {
      _draft = seconds;
      _seeking = true;
    });
    try {
      await ref.read(stationPlayerControllerProvider.notifier).seek(
          Duration(milliseconds: (seconds * 1000).round()),
          episodeId: episodeId);
    } finally {
      if (mounted && widget.episodeId == episodeId) {
        setState(() {
          _draft = null;
          _seeking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final playback = ref.watch(stationPlayerControllerProvider);
    final progress = ref.watch(audioPlaybackProgressProvider).asData?.value;
    final matches = playback.isEpisodeSelected(widget.episodeId) &&
        progress?.itemId == 'episode:${widget.episodeId}' &&
        progress?.isLive == false;
    final value = matches ? progress! : const AudioPlaybackProgress();
    final ready = playback.status == StationPlaybackStatus.playing ||
        playback.status == StationPlaybackStatus.paused;
    final duration = value.duration;
    final total = duration != null && duration > Duration.zero
        ? _time(duration)
        : strings.episodeDurationUnknown;
    final position = value.clampPosition(value.position);
    final displayed = _draft == null
        ? position
        : value.clampPosition(Duration(milliseconds: (_draft! * 1000).round()));
    final time = '${_time(displayed)} / $total';
    final canSeek = matches && ready && value.canSeek && !_seeking;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(time,
            textDirection: TextDirection.ltr, textAlign: TextAlign.center),
        if (matches && value.canSeek)
          MergeSemantics(
              child: Semantics(
                  label: strings.episodeProgress,
                  child: Slider(
                    value: displayed.inMilliseconds / 1000,
                    max: duration!.inMilliseconds / 1000,
                    semanticFormatterCallback: (seconds) =>
                        '${_time(Duration(milliseconds: (seconds * 1000).round()))} / $total',
                    onChangeStart: canSeek
                        ? (seconds) => setState(() => _draft = seconds)
                        : null,
                    onChanged: canSeek
                        ? (seconds) => setState(() => _draft = seconds)
                        : null,
                    onChangeEnd: canSeek ? _seek : null,
                  ))),
        if (matches && value.seekFailed)
          Text(strings.episodeSeekUnavailable, textAlign: TextAlign.center),
      ]),
    );
  }
}
