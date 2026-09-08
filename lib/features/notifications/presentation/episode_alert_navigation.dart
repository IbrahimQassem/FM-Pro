import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../station_details/presentation/station_details_screen.dart';
import '../../station_content/presentation/program_details_screen.dart';
import '../domain/models/episode_alert_target.dart';

final _alertNavigationBusyProvider = StateProvider<bool>((ref) => false);

Future<void> openEpisodeAlert(
    BuildContext context, WidgetRef ref, EpisodeAlertTarget target) async {
  final busy = ref.read(_alertNavigationBusyProvider.notifier);
  if (busy.state) return;
  busy.state = true;
  final stationsRepository = ref.read(stationsRepositoryProvider);
  final contentRepository = ref.read(stationContentRepositoryProvider);
  try {
    final stations = await stationsRepository.refresh();
    if (!context.mounted) return;
    final matches =
        stations.items.where((station) => station.id == target.stationId);
    if (matches.isEmpty) {
      Navigator.of(context).popUntil((route) => route.isFirst);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(AppLocalizations.of(context).alertContentUnavailable)));
      return;
    }
    final station = matches.first;
    final content = await contentRepository.refresh(station.id);
    if (!context.mounted) return;
    final programs =
        content.programs.where((program) => program.id == target.programId);
    final episodes = content.episodes
        .where((episode) => episode.programId == target.programId)
        .toList();
    final available = programs.isNotEmpty &&
        episodes.any((episode) => episode.id == target.episodeId);
    unawaited(Navigator.of(context).push(MaterialPageRoute<void>(
        builder: (_) => available
            ? ProgramDetailsScreen(
                station: station,
                program: programs.first,
                episodes: episodes,
                highlightedEpisodeId: target.episodeId)
            : StationDetailsScreen(station: station))));
  } on Object {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(AppLocalizations.of(context).loadErrorMessage)));
    }
  } finally {
    if (busy.mounted) busy.state = false;
  }
}
