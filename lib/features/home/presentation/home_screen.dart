import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../player/presentation/widgets/mini_player.dart';
import '../../station_details/presentation/station_details_screen.dart';
import '../domain/models/station.dart';
import 'widgets/home_view.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(homeControllerProvider);
    final controller = ref.read(homeControllerProvider.notifier);
    final playerState = ref.watch(stationPlayerControllerProvider);
    final playerController = ref.read(stationPlayerControllerProvider.notifier);

    void openStation(Station station) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (context) => StationDetailsScreen(station: station),
        ),
      );
    }

    void showDeferredMessage() {
      final messenger = ScaffoldMessenger.of(context);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context).comingSoon)),
        );
    }

    return HomeView(
      state: state,
      onRefresh: controller.refresh,
      onSearchChanged: controller.updateSearch,
      onCitySelected: controller.selectCity,
      onViewModeChanged: controller.setViewMode,
      onNotificationsPressed: showDeferredMessage,
      onSettingsPressed: showDeferredMessage,
      onStationPressed: openStation,
      onStationPlayPressed: playerController.play,
      playerBar: !playerState.hasSelection
          ? null
          : MiniPlayer(
              state: playerState,
              onOpen: () => openStation(playerState.station!),
              onToggle: playerController.toggleCurrent,
              onStop: playerController.stop,
            ),
    );
  }
}
