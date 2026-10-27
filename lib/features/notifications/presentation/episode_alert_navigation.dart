import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../../core/config/firestore_paths.dart';
import '../../station_content/presentation/program_details_screen.dart';
import '../domain/models/episode_alert_target.dart';

final _alertNavigationBusyProvider = StateProvider<bool>((ref) => false);

Future<void> openEpisodeAlert(
    BuildContext context, WidgetRef ref, EpisodeAlertTarget target) async {
  final busy = ref.read(_alertNavigationBusyProvider.notifier);
  if (busy.state) return;
  busy.state = true;
  final contentRepository = ref.read(stationContentRepositoryProvider);
  try {
    if (target.root != FirestorePaths.root ||
        target.eventId != '${target.root}:${target.episodeId}') {
      throw const FormatException('Unavailable alert target.');
    }
    final resolved = await contentRepository.resolveEpisode(
        target.stationId, target.programId, target.episodeId);
    if (!context.mounted) return;
    if (resolved == null) {
      Navigator.of(context).popUntil((route) => route.isFirst);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(AppLocalizations.of(context).alertContentUnavailable)));
      return;
    }
    unawaited(Navigator.of(context).push(MaterialPageRoute<void>(
        builder: (_) => ProgramDetailsScreen(
            station: resolved.station,
            program: resolved.program,
            episodes: [resolved.episode],
            highlightedEpisodeId: resolved.episode.id))));
  } on Object {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(AppLocalizations.of(context).loadErrorMessage)));
    }
  } finally {
    if (busy.mounted) busy.state = false;
  }
}
